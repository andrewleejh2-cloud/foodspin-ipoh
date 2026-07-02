# AI 一键写文案（标语+故事介绍）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 商家在网站编辑器点「✨ AI 帮我写」，服务器自动取材（简介/城市/菜名/地点）+ 可选一句提示，Gemini 生成 标语+故事介绍 填进表单（绝不自动保存）。

**Architecture:** 新建 `foody/lib/gemini.js` 纯逻辑客户端（可注入 fetch），server.js 加 `POST /api/me/site/ai-copy` 代理端点（取材/prompt/解析/钳制/双层限流），key 只存 env 永不下发；编辑器按 `aiReady` 显隐 AI 区块。复刻支付轮的 lib+注入测试模式。

**Tech Stack:** Node/Express + JSON 存储、Gemini `v1beta generateContent`（免费档，参考 stitch-studio 写法）、node:test 集成测试、无框架前端。

## Global Constraints

- key 只存服务器 env `FOODY_GEMINI_KEY`；模型 env `FOODY_GEMINI_MODEL` 缺省 `gemini-2.5-flash`；**永不下发前端**。
- 无 key：端点 503 `ai_disabled`；编辑器隐藏 AI 区块（payload 的 `aiReady` 仅 isMe 时返回）。
- **AI 结果绝不落盘**——服务器只回给编辑器，商家自己点保存走既有 PATCH。
- 输出钳制：tagline ≤120、intro ≤1000（`\r\n` 归一）；两者皆空 → `ai_failed`。
- prompt 明确**禁止编造**资料外的具体事实（菜品/价格/年份/地址）。
- 限流：每用户每天 `AI_COPY_DAILY_MAX = 10`（只有成功才计数）+ 每 IP 每分钟 5 次突发（env `FOODY_AI_IP_MAX` 可调，缺省 5——为测试留口，语义与 spec §6 一致）。
- 三语文案齐全（DICT zh/ms/en）；`errMsg` 加 `ai_disabled`/`ai_failed`。
- 测试隔离实例（临时 FOODY_DATA_DIR + listen(0) + 假 fetch/假 client），**绝不打真 Gemini API、绝不碰真实库**。
- 取材上限：菜名 30 个、帖子地点去重前 5 个、hint ≤120。

---

## 文件结构

- **Create** `foody/lib/gemini.js` — 纯 Gemini 客户端（Task 1）
- **Create** `foody/test/gemini.test.js` — 客户端单测（Task 1）
- **Modify** `foody/server.js` — require、AI_READY/wiring、`aiHarvest`/`aiPrompt`/`aiParseCopy`、端点、buildSitePayload 加 aiReady（Task 2）
- **Create** `foody/test/api-ai-copy.test.js`（有 key + 假 client）、`foody/test/api-ai-copy-disabled.test.js`（无 key）（Task 2）
- **Modify** `foody/render.yaml`(仓库根 `render.yaml`)、`foody/start-foody.bat` — env 占位/注释（Task 2）
- **Modify** `foody/public/site-edit.html`、`foody/public/js/site-edit.js`、`foody/public/js/shared.js`、`foody/public/css/style.css` — AI 区块 UI + i18n + errMsg（Task 3）

---

### Task 1: lib/gemini.js 纯客户端（TDD）

**Files:**
- Create: `foody/lib/gemini.js`
- Test: `foody/test/gemini.test.js`

**Interfaces:**
- Produces: `createGeminiClient({ apiKey, model, fetchImpl }) → { generate(prompt) → Promise<string> }`。`generate` 返回模型文本（candidates[0].content.parts[].text 拼接）；HTTP 非 2xx 抛 `gemini_http_<status>`、空输出抛 `gemini_empty`、缺 apiKey 构造时抛。`fetchImpl` 缺省 `globalThis.fetch`。

- [ ] **Step 1: 写失败测试** — 新建 `foody/test/gemini.test.js`：

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { createGeminiClient } = require('../lib/gemini');

function fakeFetch(handler) { return async (url, opts) => handler(url, opts); }
function okResp(json) { return { ok: true, json: async () => json, text: async () => JSON.stringify(json) }; }

test('generate 拼对 URL/header/body 并抽出文本', async () => {
  let seen;
  const client = createGeminiClient({ apiKey: 'k1', model: 'gemini-2.5-flash', fetchImpl: fakeFetch((url, opts) => {
    seen = { url, opts };
    return okResp({ candidates: [{ content: { parts: [{ text: '你好' }, { text: '世界' }] } }] });
  }) });
  const out = await client.generate('写个标语');
  assert.strictEqual(out, '你好世界');
  assert.ok(seen.url.includes('/models/gemini-2.5-flash:generateContent'));
  assert.strictEqual(seen.opts.headers['x-goog-api-key'], 'k1');
  const body = JSON.parse(seen.opts.body);
  assert.strictEqual(body.contents[0].parts[0].text, '写个标语');
  assert.strictEqual(body.generationConfig.thinkingConfig.thinkingBudget, 0);   // flash 必须关思考，否则可能吐空
});

test('HTTP 非 2xx 抛错', async () => {
  const client = createGeminiClient({ apiKey: 'k', fetchImpl: fakeFetch(() => ({ ok: false, status: 429, text: async () => 'quota' })) });
  await assert.rejects(() => client.generate('x'), /gemini_http_429/);
});

test('无 candidates / 空文本抛错', async () => {
  const client = createGeminiClient({ apiKey: 'k', fetchImpl: fakeFetch(() => okResp({ candidates: [] })) });
  await assert.rejects(() => client.generate('x'), /gemini_empty/);
});

test('缺 apiKey 构造即抛', () => {
  assert.throws(() => createGeminiClient({}), /apiKey/);
});
```

- [ ] **Step 2: 运行确认失败**

Run（foody 目录）: `npm test -- test/gemini.test.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现** — 新建 `foody/lib/gemini.js`：

```js
/* Foody — Gemini 客户端（纯逻辑、可注入 fetch 便于测试；调用方式参考同仓库 stitch-studio） */
'use strict';

function createGeminiClient({ apiKey, model, fetchImpl } = {}) {
  if (!apiKey) throw new Error('apiKey required');
  const mdl = model || 'gemini-2.5-flash';
  const doFetch = fetchImpl || globalThis.fetch;

  async function generate(prompt) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(mdl) + ':generateContent';
    const generationConfig = { temperature: 0.8, maxOutputTokens: 2048 };
    // flash 默认“思考”可能把输出额度耗光导致空返回 → 关掉
    if (/flash/i.test(mdl)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const resp = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: String(prompt) }] }], generationConfig })
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error('gemini_http_' + resp.status + ': ' + t.slice(0, 200));
    }
    const data = await resp.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const text = Array.isArray(parts) ? parts.map(p => p.text || '').join('') : '';
    if (!text.trim()) throw new Error('gemini_empty');
    return text;
  }

  return { generate };
}

module.exports = { createGeminiClient };
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- test/gemini.test.js`
Expected: PASS（4/4）

- [ ] **Step 5: 提交**

```bash
git add foody/lib/gemini.js foody/test/gemini.test.js
git commit -m "feat(site): gemini client lib with injectable fetch"
```

---

### Task 2: 服务器端点 ai-copy + aiReady + 限流 + env 交接（TDD）

**Files:**
- Modify: `foody/server.js`（顶部 require 区；`rateLimit` 定义在 ~709；`buildSitePayload` ~984+；`SITE_THEMES`/slug 助手区 ~979+；端点放 `/api/me/site` 一族附近）
- Modify: `render.yaml`（仓库根）、`foody/start-foody.bat`
- Test: `foody/test/api-ai-copy.test.js`、`foody/test/api-ai-copy-disabled.test.js`（均新建）

**Interfaces:**
- Consumes: `createGeminiClient`（Task 1）；现有 `requireAuth`/`rateLimit`/`db`/`saveDb`/`buildSitePayload`。
- Produces: `POST /api/me/site/ai-copy {hint?, lang?}` → `{tagline, intro}` | 401 | 429 `too_many` | 502 `ai_failed` | 503 `ai_disabled`；`buildSitePayload` 在 isMe 时多返回 `aiReady: boolean`；常量 `AI_COPY_DAILY_MAX = 10`；函数 `aiHarvest(u)`/`aiPrompt(h, hint, lang)`/`aiParseCopy(text)`；启动 wiring `app.locals.gemini`。

- [ ] **Step 1: 写失败测试（有 key 文件）** — 新建 `foody/test/api-ai-copy.test.js`。fixture 预置两个用户：`aiseller`（干净）和 `aicapped`（`aiCopy` 预置 n=9 测每日限流）：

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-aicopy-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const today = new Date().toISOString().slice(0, 10);
function mkUser(name, extra) {
  return Object.assign({
    id: crypto.randomUUID(), username: name, usernameLower: name,
    salt, passHash: hashPassword('pass123', salt),
    phone: '012-000 ' + name.length + '111', phoneWa: '6012000' + name.length + '111',
    state: 'Perak', city: 'Ipoh', createdAt: Date.now(), bio: '爱做面食的小店主'
  }, extra || {});
}
const seller = mkUser('aiseller', { site: { published: true, title: '阿明面家', menu: [{ name: '面', items: [{ name: '牛肉面', price: 'RM12' }] }] } });
const capped = mkUser('aicapped', { aiCopy: { day: today, n: 9 } });
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [seller, capped], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.FOODY_GEMINI_KEY = 'test-key';        // 有 key → AI_READY
process.env.FOODY_AI_IP_MAX = '100';              // 测试放宽 IP 突发限流，专测每日限流
const app = require('../server');

let base, server, sellerCookie, cappedCookie;
async function login(u) {
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'pass123' }) });
  return r.headers.get('set-cookie').split(';')[0];
}
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  sellerCookie = await login('aiseller');
  cappedCookie = await login('aicapped');
});
after(() => new Promise(r => server.close(r)));

function setAi(text) { app.locals.gemini = { generate: async () => text }; }
function setAiThrow() { app.locals.gemini = { generate: async () => { throw new Error('gemini_http_500'); } }; }
async function callAi(cookie, body) {
  return fetch(base + '/api/me/site/ai-copy', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {}) });
}

test('成功：带 json 围栏也能解析，长度钳制生效', async () => {
  setAi('```json\n{"tagline":"' + 'x'.repeat(300) + '","intro":"第一段\\n\\n第二段"}\n```');
  const r = await callAi(sellerCookie, { hint: '老字号', lang: 'zh' });
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.strictEqual(j.tagline.length, 120);        // 300 被钳到 120
  assert.strictEqual(j.intro, '第一段\n\n第二段');
});

test('结果不落盘：生成后站点 tagline 不变', async () => {
  const g = await (await fetch(base + '/api/site/aiseller')).json();
  assert.strictEqual(g.tagline, '');                // fixture 没填过 tagline，生成也不该写库
});

test('payload aiReady：本人 true、访客不带', async () => {
  const mine = await (await fetch(base + '/api/site/aiseller', { headers: { cookie: sellerCookie } })).json();
  assert.strictEqual(mine.aiReady, true);
  const anon = await (await fetch(base + '/api/site/aiseller')).json();
  assert.ok(!('aiReady' in anon));
});

test('AI 返回垃圾 → 502 ai_failed 且不消耗次数', async () => {
  setAi('对不起我不会 JSON');
  const r1 = await callAi(cappedCookie, {});        // n=9，失败不该计数
  assert.strictEqual(r1.status, 502);
  assert.strictEqual((await r1.json()).error, 'ai_failed');
  setAi('{"tagline":"ok","intro":"ok"}');
  const r2 = await callAi(cappedCookie, {});        // 成功 → n=10
  assert.strictEqual(r2.status, 200);
  const r3 = await callAi(cappedCookie, {});        // 超限
  assert.strictEqual(r3.status, 429);
  assert.strictEqual((await r3.json()).error, 'too_many');
});

test('client 抛错 → 502 ai_failed', async () => {
  setAiThrow();
  const r = await callAi(sellerCookie, {});
  assert.strictEqual(r.status, 502);
});

test('未登录 401', async () => {
  const r = await fetch(base + '/api/me/site/ai-copy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.strictEqual(r.status, 401);
});
```

- [ ] **Step 2: 写失败测试（无 key 文件）** — 新建 `foody/test/api-ai-copy-disabled.test.js`：

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-ainokey-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const u = { id: crypto.randomUUID(), username: 'nokey', usernameLower: 'nokey', salt, passHash: hashPassword('pass123', salt), phone: '012-321 4321', phoneWa: '60123214321', state: 'Johor', city: 'JB', createdAt: Date.now(), site: { published: true, title: '无钥店' } };
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [u], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [] }));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.FOODY_GEMINI_KEY;               // 明确无 key
const app = require('../server');

let base, server, cookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'nokey', password: 'pass123' }) });
  cookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

test('无 key：端点 503 ai_disabled', async () => {
  const r = await fetch(base + '/api/me/site/ai-copy', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}' });
  assert.strictEqual(r.status, 503);
  assert.strictEqual((await r.json()).error, 'ai_disabled');
});

test('无 key：本人 payload aiReady 为 false', async () => {
  const mine = await (await fetch(base + '/api/site/nokey', { headers: { cookie } })).json();
  assert.strictEqual(mine.aiReady, false);
});
```

> ⚠️ 两个测试文件必须分开——env 在 `require('../server')` 时定死，一个进程只能测一种 key 状态。node --test 会按文件起独立进程，互不污染。

- [ ] **Step 3: 运行确认失败**

Run: `npm test -- test/api-ai-copy.test.js test/api-ai-copy-disabled.test.js`
Expected: FAIL（端点 404、aiReady 不存在）

- [ ] **Step 4: 实现 server.js** — 五处改动：

① 顶部 require 区（其它 require 旁）加：

```js
const { createGeminiClient } = require('./lib/gemini');
```

② `SITE_THEMES`/slug 助手常量区之后加常量与启动 wiring（`app` 已存在的位置之后即可，与 `SECTION_KEYS` 同区）：

```js
/* ---- AI 写文案（标语+故事介绍）：Gemini 免费档，key 只在服务器 ---- */
const AI_COPY_DAILY_MAX = 10;   // 每用户每天成功生成次数上限
const GEMINI_KEY = (process.env.FOODY_GEMINI_KEY || '').trim();
const AI_READY = !!GEMINI_KEY;
if (AI_READY) app.locals.gemini = createGeminiClient({ apiKey: GEMINI_KEY, model: (process.env.FOODY_GEMINI_MODEL || 'gemini-2.5-flash').trim() });
```

③ `buildSitePayload` 返回对象里加一行（任意位置，建议 `slug:` 之后）：

```js
    aiReady: isMe ? AI_READY : undefined,   // 仅本人可见；undefined 会被 JSON 序列化剔除
```

④ 取材/prompt/解析三个助手（放端点前）：

```js
/* AI 取材：全部服务器侧收集，防前端伪造 */
function aiHarvest(u) {
  const s = u.site || {};
  const menuNames = [];
  outer: for (const cat of (Array.isArray(s.menu) ? s.menu : [])) {
    if (cat.name) menuNames.push(cat.name);
    for (const it of (cat.items || [])) {
      if (it.name) menuNames.push(it.name);
      if (menuNames.length >= 30) break outer;
    }
    if (menuNames.length >= 30) break;
  }
  const places = [...new Set(db.posts.filter(p => p.userId === u.id && p.place).map(p => p.place))].slice(0, 5);
  return { username: u.username, bio: u.bio || '', city: u.city || '', state: u.state || '', title: s.title || '', menuNames, places };
}

const AI_LANG_NAME = { zh: '简体中文', ms: 'Bahasa Melayu', en: 'English' };
function aiPrompt(h, hint, lang) {
  const L = AI_LANG_NAME[lang] || AI_LANG_NAME.zh;
  return [
    '你是马来西亚本地美食小店的文案助手。根据下面的真实资料，为这家小店写宣传文案。',
    '只能依据给出的资料；资料里没有的具体事实（菜品、价格、年份、地址等）一律不得编造，可以用泛化的暖心表述。',
    '输出语言：' + L + '。',
    '只返回一个 JSON 对象，不要任何其它文字或代码围栏，格式：{"tagline":"一句吸睛标语(50字符内)","intro":"2-4段有人情味的小店故事(700字符内，段落用\\n分隔)"}',
    '',
    '资料：',
    '店名/标题：' + (h.title || h.username),
    '店主用户名：' + h.username,
    h.bio ? '店主简介：' + h.bio : '',
    (h.city || h.state) ? '所在地：' + [h.city, h.state].filter(Boolean).join(', ') : '',
    h.menuNames.length ? '菜单（名字）：' + h.menuNames.join('、') : '',
    h.places.length ? '常出现的地点标签：' + h.places.join('、') : '',
    hint ? '店主补充提示：' + hint : ''
  ].filter(Boolean).join('\n');
}

/* 从模型输出挖 JSON：剥 ``` 围栏 → 直接 parse → 失败取第一个 {...} 块重试 */
function aiParseCopy(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  let obj = null;
  try { obj = JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch {} }
  }
  if (!obj || typeof obj !== 'object') return null;
  const tagline = String(obj.tagline || '').trim().slice(0, 120);
  const intro = String(obj.intro || '').replace(/\r\n/g, '\n').trim().slice(0, 1000);
  if (!tagline && !intro) return null;
  return { tagline, intro };
}
```

⑤ 端点（放 `/api/me/site` 一族附近；IP 突发限流用 env 可调 max）：

```js
const aiCopyIpLimit = rateLimit({ windowMs: 60000, max: Number(process.env.FOODY_AI_IP_MAX || 5) });   // 每 IP 每分钟（默认 5）
app.post('/api/me/site/ai-copy', requireAuth, aiCopyIpLimit, async (req, res) => {
  if (!AI_READY || !req.app.locals.gemini) return res.status(503).json({ error: 'ai_disabled' });
  const today = new Date().toISOString().slice(0, 10);
  const rec = (req.user.aiCopy && req.user.aiCopy.day === today) ? req.user.aiCopy : { day: today, n: 0 };
  if (rec.n >= AI_COPY_DAILY_MAX) return res.status(429).json({ error: 'too_many' });
  const b = req.body || {};
  const hint = String(b.hint || '').trim().slice(0, 120);
  const lang = ['zh', 'ms', 'en'].includes(b.lang) ? b.lang : 'zh';
  try {
    const text = await req.app.locals.gemini.generate(aiPrompt(aiHarvest(req.user), hint, lang));
    const copy = aiParseCopy(text);
    if (!copy) return res.status(502).json({ error: 'ai_failed' });
    rec.n += 1; req.user.aiCopy = rec; saveDb();   // 只有成功才计数；结果绝不写入 user.site
    res.json(copy);
  } catch {
    res.status(502).json({ error: 'ai_failed' });
  }
});
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- test/api-ai-copy.test.js test/api-ai-copy-disabled.test.js`
Expected: PASS（6+2）

- [ ] **Step 6: env 交接文件** — `start-foody.bat` 里现有注释区加一行（不改逻辑）：

```
REM 可选：AI 写文案。去 https://aistudio.google.com 免费拿 key 填这里并去掉 REM
REM set FOODY_GEMINI_KEY=你的key
```

仓库根 `render.yaml` 的 foody 服务 envVars 里加：

```yaml
      - key: FOODY_GEMINI_KEY
        sync: false   # 部署时手动填（可留空=功能隐藏）
```

- [ ] **Step 7: 全套回归**

Run: `npm test`
Expected: 全绿（既有 65 + 新 12 = 77）

- [ ] **Step 8: 提交**

```bash
git add foody/server.js foody/test/api-ai-copy.test.js foody/test/api-ai-copy-disabled.test.js foody/start-foody.bat render.yaml
git commit -m "feat(site): AI copy endpoint — harvest, prompt, parse, dual rate limits"
```

---

### Task 3: 编辑器 UI + i18n + errMsg

**Files:**
- Modify: `foody/public/site-edit.html`（`fIntro` 的 `.field` 之后插入）
- Modify: `foody/public/js/site-edit.js`（事件绑定区 + DOMContentLoaded 回填区）
- Modify: `foody/public/js/shared.js`（DICT 三语块 + errMsg）
- Modify: `foody/public/css/style.css`（编辑器样式区追加）
- 验证：控制方 preview（无自动测试）。

**Interfaces:**
- Consumes: `POST /api/me/site/ai-copy {hint, lang}` → `{tagline, intro}`（Task 2）；`GET /api/site/:username` 的 `aiReady`（Task 2）；shared.js 的 `api/t/LANG/toast/errMsg`。

- [ ] **Step 1: HTML** — `site-edit.html` 里 `fIntro` 那个 `.field` div 之后插入：

```html
      <div class="field ai-field" id="aiField" hidden>
        <label data-i18n="aiCopyL"></label>
        <div class="ai-row">
          <input id="aiHint" maxlength="120" autocomplete="off" data-i18n-ph="aiHintPh">
          <button type="button" class="btn-ghost ai-btn" id="aiGo" data-i18n="aiGo"></button>
        </div>
        <div class="ai-note" data-i18n="aiNote"></div>
      </div>
```

- [ ] **Step 2: JS** — `site-edit.js` 事件绑定区（`$('#addLink')...` 附近）加：

```js
  /* ---- AI 帮我写（标语+故事介绍）：结果只填表单，商家自己保存 ---- */
  $('#aiGo').addEventListener('click', async () => {
    const btn = $('#aiGo');
    if (($('#fTagline').value.trim() || $('#fIntro').value.trim()) && !confirm(t('aiOverwrite'))) return;
    btn.disabled = true; btn.classList.add('loading');
    try {
      const r = await api('/api/me/site/ai-copy', { method: 'POST', body: { hint: $('#aiHint').value.trim(), lang: LANG } });
      if (r.tagline) $('#fTagline').value = r.tagline;
      if (r.intro) $('#fIntro').value = r.intro;
      toast(t('aiFilled'));
    } catch (e) { toast(errMsg(e.code)); }
    finally { btn.disabled = false; btn.classList.remove('loading'); }
  });
```

`DOMContentLoaded` 回填区（`$('#fSlug').value = d.slug || '';` 附近）加：

```js
    $('#aiField').hidden = !d.aiReady;
```

- [ ] **Step 3: i18n** — `shared.js` 三个语言块各加（与其它 site key 同行风格）：

```
zh: aiCopyL: '✨ AI 帮我写', aiHintPh: '一句提示（可选），如：怡保老字号牛肉面 10 年', aiGo: '生成标语和介绍', aiNote: '生成结果只填进表单，检查满意后记得点保存', aiFilled: '已填入，检查后记得保存 ✨', aiOverwrite: '会覆盖你已填的标语/介绍，继续？',
ms: aiCopyL: '✨ AI tulis untuk saya', aiHintPh: 'Petunjuk ringkas (pilihan), cth: mee lembu Ipoh 10 tahun', aiGo: 'Jana slogan & cerita', aiNote: 'Hasil diisi ke borang sahaja — semak & tekan simpan', aiFilled: 'Telah diisi — semak dan simpan ✨', aiOverwrite: 'Ini akan menggantikan slogan/cerita sedia ada. Teruskan?',
en: aiCopyL: '✨ AI write for me', aiHintPh: 'One-line hint (optional), e.g. Ipoh beef noodles since 2015', aiGo: 'Generate tagline & story', aiNote: 'Fills the form only — review, then hit Save', aiFilled: 'Filled in — review & save ✨', aiOverwrite: 'This will overwrite your current tagline/intro. Continue?',
```

`errMsg` 函数里（既有 slug 错误码那几行之后）加：

```js
  if (code === 'ai_disabled') return LANG === 'zh' ? 'AI 功能未开启' : LANG === 'ms' ? 'Ciri AI belum diaktifkan' : 'AI is not enabled';
  if (code === 'ai_failed') return LANG === 'zh' ? 'AI 生成失败，再试一次' : LANG === 'ms' ? 'AI gagal jana — cuba lagi' : 'AI generation failed — try again';
```

- [ ] **Step 4: CSS** — `style.css` 编辑器样式区（`.slug-row` 那片之后）追加：

```css
.ai-row { display: flex; gap: 8px; }
.ai-row input { flex: 1; min-width: 0; }
.ai-btn { flex: none; white-space: nowrap; }
.ai-btn.loading { opacity: .55; pointer-events: none; }
.ai-note { font-size: 12px; color: var(--ink-2); margin-top: 5px; }
```

- [ ] **Step 5: 提交**

```bash
git add foody/public/site-edit.html foody/public/js/site-edit.js foody/public/js/shared.js foody/public/css/style.css
git commit -m "feat(site): AI copy button in site editor with hint, confirm, i18n"
```

---

### Task 4: 验收扫尾

**Files:** 无预设改动（发现问题回对应 Task 修）

- [ ] **Step 1: 全套测试** — Run: `npm test`；Expected: 77/77 绿。
- [ ] **Step 2: preview 走查（控制方）** — 本地无 key，策略：
  - **无 key 态**：编辑器 AI 区块隐藏（`aiField.hidden === true`）；直连端点 503。
  - **UI 全流程（页内 fetch 拦截）**：preview eval 里包一层 `window.fetch`——`GET /api/site/<me>` 响应注入 `aiReady:true`、`POST /api/me/site/ai-copy` 返回假 `{tagline, intro}` → 重跑编辑器载入 → 验证区块显示、点击生成→字段被填、confirm 覆盖分支、toast 文案；再让拦截器返回 `{error:'ai_failed'}` status 502 → 验证错误 toast。
  - 服务器真实成功/失败/限流路径已由 node:test 全覆盖（注入假 client），preview 不重复。
  - 临时账号测完级联删除。
- [ ] **Step 3: 对照 spec 验收清单**（`2026-07-02-ai-site-copy-design.md` §10）逐条核对（"配了 key 生成语言跟随界面语言"一条在本地无 key 环境改为由 node:test 的 lang 传参 + prompt 构造覆盖，真实端到端留给用户拿到 key 后自验——在总结里明示）。
- [ ] **Step 4: 若有修复，提交**

```bash
git add -A foody/ render.yaml
git commit -m "fix(site): AI copy acceptance walkthrough findings"
```

---

## Self-Review 记录

- **Spec 覆盖**：§2 架构→Task 1/2；§3 端点与流程→Task 2（服务器）+ Task 3（前端）；§4 lib 接口→Task 1；§5 aiReady→Task 2③+Task 3 Step 2；§6 双层限流→Task 2⑤（env 可调 IP max，缺省 5 与 spec 一致）；§7 i18n/errMsg→Task 3；§8 测试→Task 1/2（12 项）；§9 部署交接→Task 2 Step 6；§10 验收→Task 4。无缺口。
- **占位符扫描**：无 TBD；所有步骤含完整代码/精确文案。
- **类型/命名一致**：`createGeminiClient`/`generate`（Task 1 定义、Task 2 wiring 使用）；`aiHarvest/aiPrompt/aiParseCopy/AI_COPY_DAILY_MAX/AI_READY`（Task 2 内自洽）；错误码 `ai_disabled/ai_failed/too_many`（Task 2 端点 ↔ Task 3 errMsg）；`aiReady`（Task 2 payload ↔ Task 3 显隐）；`{hint, lang}` 请求体（Task 2 ↔ Task 3）。一致。
- **测试环境注意**：两个 key 状态分两个测试文件（env 随 require 定死）；`FOODY_AI_IP_MAX=100` 只在测试环境设置，生产缺省 5。
