# 「我的网站」→ 商家独立站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Foody 现有「我的网站」升级为更像商家独立站：自定义 slug 专属网址、公告栏、独立相册、版块开关、自定义主题色。

**Architecture:** 沿用现有扁平 `user.site` 对象加字段（不重构成版块数组）。后端在 `server.js` 扩展 `PATCH /api/me/site` 校验、抽出 `buildSitePayload()` 共享函数、加 slug 解析路由；前端扩展公开页 `site.js` 与编辑器 `site-edit`。货架不进网站。

**Tech Stack:** Node/Express + JSON 存储（`db.json`）、multer + sharp 图片上传、原生 `node:test` 集成测试、无框架前端（`shared.js` 提供 `api/t/toast/errMsg/ICONS/FoodyCart/fillAvatar`）。

## Global Constraints

- 三语文案齐全（`shared.js` 的 `DICT` 三个语言块 zh≈L4 / ms≈L188 / en≈L306），新文案都要加 `data-i18n` 或走 `t()`。
- beta 阶段 **JSON 存储**，不引入数据库、不加新依赖。
- 菜品图/相册图**只接受自己上传到 `/uploads/` 的路径**，拒绝注入外链（延续现有做法）。
- 非法字段值**静默忽略**（延续现有 PATCH 风格）——**唯一例外是 slug**：非法/占用/保留返回 400 且整个 PATCH 不落盘。
- 旧链接 `site.html?u=用户名` **永久兼容**，旧数据无需迁移（新字段全部可选、缺省=现状）。
- 测试用隔离实例（临时 `FOODY_DATA_DIR` + `app.listen(0)`），**绝不碰真实库**。
- 货架**不进入 `user.site`**，继续留在 `user.shelf` / profile；本计划不触碰货架代码。

---

## 文件结构

- **Modify** `foody/server.js`
  - 抽出 `buildSitePayload(u, viewer)`（Task 1）
  - slug 助手 `RESERVED_SLUGS` / `normSlug` / `slugFormatOk` / `slugTaken` / `checkSlug`（Task 2）
  - `PATCH /api/me/site` 加 slug/accent/announce/photos/sections 校验（Task 2）
  - `GET /api/me/site/slug-available`、`GET /api/site/by-slug/:slug`、`app.get('/s/:slug')`（Task 3）
- **Modify** `foody/public/js/site.js` — slug/用户名解析、公告栏、相册 tab、accent 变量、版块开关过滤（Task 4）
- **Modify** `foody/public/css/style.css` — `.site-announce`、`.site-album`、`.site-theme-*` accent 变量、编辑器新字段样式（Task 4 & 5）
- **Modify** `foody/public/site-edit.html` — slug / 主题色 / 公告 / 相册 / 版块开关 表单字段（Task 5）
- **Modify** `foody/public/js/site-edit.js` — 上述字段的读取/校验/收集，slug 实时可用性检查（Task 5）
- **Modify** `foody/public/js/shared.js` — 新增三语 i18n key（Task 4 & 5）、`errMsg` 加 slug 错误码（Task 5）
- **Create** `foody/test/api-site.test.js` — 后端集成测试（Task 1–3）

---

### Task 1: 抽出 `buildSitePayload()` 并加入新字段（纯重构）

**Files:**
- Modify: `foody/server.js`（`GET /api/site/:username` 现在在 984–1012 行附近；`SITE_THEMES` 常量在 979 行附近）
- Test: `foody/test/api-site.test.js`（新建）

**Interfaces:**
- Produces: `buildSitePayload(u, viewer)` → 返回站点公开 payload 对象，字段含（现有）`username, avatar, isMe, published, cover, title, tagline, intro, hours, address, links, theme, menu, status, mapUrl, waUrl, posts` 与（新增）`accent`(string), `announce`(string), `photos`(Array<{url}>), `sections`(object), `slug`(string)。默认值分别为 `''/''/[]/{}/''`。

- [ ] **Step 1: 写失败测试** — 新建 `foody/test/api-site.test.js`，用现有测试文件的隔离实例模式（参考 `foody/test/api-block.test.js` 开头）。先只测「已发布站点的 payload 含新字段且默认为空」：

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-site-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
// 预置一个已发布站点的卖家（seller），密码已知
const seller = {
  id: crypto.randomUUID(), username: 'seller1', usernameLower: 'seller1',
  salt, passHash: hashPassword('pass123', salt),
  phone: '012-111 1111', phoneWa: '60121111111', state: 'Johor', city: 'JB', createdAt: Date.now(),
  site: { published: true, title: '牛肉面店', theme: 'warm' }
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [seller], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server, sellerCookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'seller1', password: 'pass123' })
  });
  sellerCookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

test('已发布站点 payload 含新字段、默认为空', async () => {
  const r = await fetch(base + '/api/site/seller1');
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.strictEqual(j.title, '牛肉面店');
  assert.strictEqual(j.accent, '');
  assert.strictEqual(j.announce, '');
  assert.deepStrictEqual(j.photos, []);
  assert.deepStrictEqual(j.sections, {});
  assert.strictEqual(j.slug, '');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/api-site.test.js`（或 `node --test test/api-site.test.js`）
Expected: FAIL（`j.accent` 等为 `undefined`，断言不通过）

- [ ] **Step 3: 实现 `buildSitePayload` 并改 GET 用它** — 在 `server.js` 的 `GET /api/site/:username` 之前加函数，然后让该路由改用它：

```js
function buildSitePayload(u, viewer) {
  const isMe = !!(viewer && viewer.id === u.id);
  const s = u.site || {};
  const posts = db.posts.filter(p => p.userId === u.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)
    .map(p => ({ id: p.id, mediaUrl: p.mediaUrl, mediaType: p.mediaType }));
  return {
    username: u.username, avatar: u.avatar || null, isMe,
    published: !!s.published, cover: s.cover || null,
    title: s.title || '', tagline: s.tagline || '', intro: s.intro || '',
    hours: s.hours || '', address: s.address || '', links: s.links || [],
    theme: SITE_THEMES.includes(s.theme) ? s.theme : 'warm',
    accent: /^#[0-9a-fA-F]{6}$/.test(s.accent || '') ? s.accent : '',
    announce: s.announce || '',
    photos: Array.isArray(s.photos) ? s.photos : [],
    sections: (s.sections && typeof s.sections === 'object') ? s.sections : {},
    slug: s.slug || '',
    menu: Array.isArray(s.menu) ? s.menu : [],
    status: s.status || '',
    mapUrl: s.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address) : null,
    waUrl: viewer && u.phoneWa ? `https://wa.me/${u.phoneWa}` : null,
    posts
  };
}
```

把 `GET /api/site/:username` 的函数体替换为：

```js
app.get('/api/site/:username', (req, res) => {
  const viewer = currentUser(req);
  const u = db.users.find(x => x.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!u) return res.status(404).json({ error: 'not_found' });
  const isMe = !!(viewer && viewer.id === u.id);
  if (!(u.site && u.site.published) && !isMe) return res.status(404).json({ error: 'not_published' });
  res.json(buildSitePayload(u, viewer));
});
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- test/api-site.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add foody/server.js foody/test/api-site.test.js
git commit -m "refactor(site): extract buildSitePayload + expose new site fields"
```

---

### Task 2: `PATCH /api/me/site` 校验 slug/accent/announce/photos/sections + slug 助手

**Files:**
- Modify: `foody/server.js`（`SITE_THEMES` 常量后加 slug 助手；`PATCH /api/me/site` 现在在 1014–1046 行附近）
- Test: `foody/test/api-site.test.js`

**Interfaces:**
- Consumes: `buildSitePayload`（Task 1，读回校验结果）
- Produces:
  - `RESERVED_SLUGS: Set<string>`
  - `normSlug(raw) → string`（trim + 小写 + 去掉非 `[a-z0-9-]`）
  - `slugFormatOk(s) → bool`（长度 3–30 且 `^[a-z0-9]+(?:-[a-z0-9]+)*$`）
  - `slugTaken(slug, exceptUserId) → bool`
  - `checkSlug(raw, userId) → {ok:true, slug} | {ok:false, code:'bad_slug'|'reserved_slug'|'slug_taken'}`

- [ ] **Step 1: 写失败测试** — 追加到 `test/api-site.test.js`：

```js
async function patchSite(cookie, body) {
  return fetch(base + '/api/me/site', {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body)
  });
}

test('slug 合法则保存、大写/空格归一化为小写', async () => {
  const r = await patchSite(sellerCookie, { slug: '  Beef-Noodle  ' });
  assert.strictEqual(r.status, 200);
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.slug, 'beef-noodle');
});

test('slug 太短 → 400 bad_slug 且不落盘', async () => {
  const r = await patchSite(sellerCookie, { slug: 'ab', title: '不该被保存' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'bad_slug');
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.title, '牛肉面店');      // title 未被这次请求改动
  assert.strictEqual(g.slug, 'beef-noodle');    // slug 仍是上一次的
});

test('slug 保留词 → 400 reserved_slug', async () => {
  const r = await patchSite(sellerCookie, { slug: 'admin' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'reserved_slug');
});

test('slug 空串 → 清空', async () => {
  await patchSite(sellerCookie, { slug: '' });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.slug, '');
  await patchSite(sellerCookie, { slug: 'beef-noodle' });   // 复原给后续测试用
});

test('accent 合法 hex 存、非法忽略、空清空', async () => {
  await patchSite(sellerCookie, { accent: '#12ab34' });
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '#12ab34');
  await patchSite(sellerCookie, { accent: 'red' });         // 非法 → 忽略，保持上一个
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '#12ab34');
  await patchSite(sellerCookie, { accent: '' });            // 空 → 清空
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '');
});

test('announce 超长截断到 200', async () => {
  await patchSite(sellerCookie, { announce: 'x'.repeat(500) });
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).announce.length, 200);
});

test('photos 只收 /uploads/、超 20 截断', async () => {
  const arr = Array.from({ length: 25 }, (_, i) => ({ url: '/uploads/p' + i + '.jpg' }));
  arr.push({ url: 'https://evil.com/x.jpg' });
  await patchSite(sellerCookie, { photos: arr });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.photos.length, 20);
  assert.ok(g.photos.every(p => p.url.startsWith('/uploads/')));
});

test('sections 只认白名单键、值转布尔', async () => {
  await patchSite(sellerCookie, { sections: { menu: false, hacker: true, gallery: 'yes' } });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.sections.menu, false);
  assert.ok(!('hacker' in g.sections));
  assert.ok(!('gallery' in g.sections));   // 非布尔值被丢弃
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/api-site.test.js`
Expected: FAIL（slug 无校验、新字段未写入）

- [ ] **Step 3: 加 slug 助手** — 在 `server.js` 的 `const SITE_THEMES = [...]` 之后：

```js
const RESERVED_SLUGS = new Set(['s', 'api', 'admin', 'foody', 'uploads', 'www', 'app', 'me', 'site', 'shop', 'help', 'about']);
function normSlug(raw) { return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, ''); }
function slugFormatOk(s) { return s.length >= 3 && s.length <= 30 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s); }
function slugTaken(slug, exceptUserId) { return db.users.some(u => u.id !== exceptUserId && u.site && u.site.slug === slug); }
function checkSlug(raw, userId) {
  const s = normSlug(raw);
  if (!slugFormatOk(s)) return { ok: false, code: 'bad_slug' };
  if (RESERVED_SLUGS.has(s)) return { ok: false, code: 'reserved_slug' };
  if (slugTaken(s, userId)) return { ok: false, code: 'slug_taken' };
  return { ok: true, slug: s };
}
```

- [ ] **Step 4: 改 `PATCH /api/me/site`** — 在函数体最前面（`const b = req.body || {};` 之后、`const s = req.user.site || {};` 之前或紧随其后）加 slug 预校验，并在末尾 `if (typeof b.published ...)` 附近加其余字段。完整改法：

先在 `const s = req.user.site || {};` 之后加 slug 预检（**放在任何 `s.xxx = ...` 赋值之前**，保证 400 时未改动 `s`）：

```js
  // slug 需要明确反馈：非法/占用/保留 → 400 且整个 PATCH 不落盘
  let nextSlug;   // undefined = 本次不动 slug
  if (typeof b.slug === 'string') {
    if (b.slug.trim() === '') nextSlug = '';
    else {
      const r = checkSlug(b.slug, req.user.id);
      if (!r.ok) return res.status(400).json({ error: r.code });
      nextSlug = r.slug;
    }
  }
```

在 `if (typeof b.published === 'boolean') s.published = b.published;` 之后加其余新字段：

```js
  if (nextSlug !== undefined) s.slug = nextSlug;
  if (typeof b.accent === 'string') {
    const a = b.accent.trim();
    if (a === '') s.accent = '';
    else if (/^#[0-9a-fA-F]{6}$/.test(a)) s.accent = a;   // 非法忽略
  }
  if (typeof b.announce === 'string') s.announce = b.announce.replace(/\r\n/g, '\n').trim().slice(0, 200);
  if (Array.isArray(b.photos)) {
    s.photos = b.photos.slice(0, 20)
      .map(p => ({ url: (p && typeof p.url === 'string' && p.url.startsWith('/uploads/')) ? p.url : '' }))
      .filter(p => p.url);
  }
  if (b.sections && typeof b.sections === 'object' && !Array.isArray(b.sections)) {
    const sec = {};
    for (const k of ['gallery', 'menu', 'photos', 'contact']) if (typeof b.sections[k] === 'boolean') sec[k] = b.sections[k];
    s.sections = sec;
  }
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- test/api-site.test.js`
Expected: PASS（全部新测试绿）

- [ ] **Step 6: 提交**

```bash
git add foody/server.js foody/test/api-site.test.js
git commit -m "feat(site): validate slug/accent/announce/photos/sections on PATCH"
```

---

### Task 3: slug 解析路由（slug-available + by-slug + `/s/:slug`）

**Files:**
- Modify: `foody/server.js`（新增两个 API + 一个页面路由；静态中间件在 1946–1947 行附近）
- Test: `foody/test/api-site.test.js`

**Interfaces:**
- Consumes: `normSlug/slugFormatOk/slugTaken`（Task 2）、`buildSitePayload`（Task 1）
- Produces:
  - `GET /api/me/site/slug-available?slug=xxx`（登录态）→ `{available:true, slug}` 或 `{available:false, reason:'bad'|'reserved'|'taken'}`
  - `GET /api/site/by-slug/:slug` → 同 `buildSitePayload` 结构，404 `not_found`/`not_published`
  - `GET /s/:slug` → 返回 `public/site.html`（静态页，数据仍走鉴权 API）

- [ ] **Step 1: 写失败测试** — 追加到 `test/api-site.test.js`（此时 seller1 slug 已是 `beef-noodle`）：

```js
test('by-slug 能解析到已发布站点', async () => {
  const r = await fetch(base + '/api/site/by-slug/beef-noodle');
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).username, 'seller1');
});

test('by-slug 未知 slug → 404 not_found', async () => {
  const r = await fetch(base + '/api/site/by-slug/nope-nope');
  assert.strictEqual(r.status, 404);
  assert.strictEqual((await r.json()).error, 'not_found');
});

test('slug-available：可用 / 占用 / 保留 / 不合法', async () => {
  const ok = await (await fetch(base + '/api/me/site/slug-available?slug=fresh-cafe', { headers: { cookie: sellerCookie } })).json();
  assert.strictEqual(ok.available, true);
  const taken = await (await fetch(base + '/api/me/site/slug-available?slug=beef-noodle', { headers: { cookie: sellerCookie } })).json();
  // 自己已占用的 slug 对自己应算「可用」（排除自己）
  assert.strictEqual(taken.available, true);
  const reserved = await (await fetch(base + '/api/me/site/slug-available?slug=admin', { headers: { cookie: sellerCookie } })).json();
  assert.deepStrictEqual([reserved.available, reserved.reason], [false, 'reserved']);
  const bad = await (await fetch(base + '/api/me/site/slug-available?slug=ab', { headers: { cookie: sellerCookie } })).json();
  assert.deepStrictEqual([bad.available, bad.reason], [false, 'bad']);
});

test('/s/:slug 返回 HTML 页面', async () => {
  const r = await fetch(base + '/s/beef-noodle');
  assert.strictEqual(r.status, 200);
  assert.ok((r.headers.get('content-type') || '').includes('text/html'));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/api-site.test.js`
Expected: FAIL（路由不存在，404/无匹配）

- [ ] **Step 3: 加三个路由** — `slug-available` 与 `by-slug` 放在 `GET /api/site/:username` 附近（**`by-slug` 要在 `:username` 路由之前或用不同前缀均可**，此处两条路径段数不同不会冲突，为清晰放在 `:username` 之前）：

```js
app.get('/api/me/site/slug-available', requireAuth, (req, res) => {
  const s = normSlug(String(req.query.slug || ''));
  if (!slugFormatOk(s)) return res.json({ available: false, reason: 'bad' });
  if (RESERVED_SLUGS.has(s)) return res.json({ available: false, reason: 'reserved' });
  if (slugTaken(s, req.user.id)) return res.json({ available: false, reason: 'taken' });
  res.json({ available: true, slug: s });
});

app.get('/api/site/by-slug/:slug', (req, res) => {
  const viewer = currentUser(req);
  const slug = normSlug(req.params.slug);
  const u = slug ? db.users.find(x => x.site && x.site.slug === slug) : null;
  if (!u) return res.status(404).json({ error: 'not_found' });
  const isMe = !!(viewer && viewer.id === u.id);
  if (!(u.site && u.site.published) && !isMe) return res.status(404).json({ error: 'not_published' });
  res.json(buildSitePayload(u, viewer));
});
```

页面路由放在**静态中间件 `app.use(express.static(...public...))` 之前**：

```js
app.get('/s/:slug', (req, res) => res.sendFile(path.join(ROOT, 'public', 'site.html')));
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- test/api-site.test.js`
Expected: PASS

- [ ] **Step 5: 全套回归**

Run: `npm test`
Expected: 全部测试文件通过（含既有 46 项 + 本文件新增）

- [ ] **Step 6: 提交**

```bash
git add foody/server.js foody/test/api-site.test.js
git commit -m "feat(site): slug routes — slug-available, by-slug, /s/:slug page"
```

---

### Task 4: 公开页渲染（site.js + CSS + i18n）

**Files:**
- Modify: `foody/public/js/site.js`（`load()` 在 12–22 行、`render()` 在 41–177 行附近）
- Modify: `foody/public/css/style.css`（追加 `.site-announce`、`.site-album`；改 `.site-theme-*` 强调色用变量）
- Modify: `foody/public/js/shared.js`（三语加 `siteTabPhotos`）
- 验证方式：**preview 端到端**（本项目前端无浏览器单测，沿用 preview 走查），后端行为已由 Task 1–3 的 node:test 覆盖。

**Interfaces:**
- Consumes: `buildSitePayload` 的字段 `slug/accent/announce/photos/sections`（Task 1）、`by-slug` 路由（Task 3）

- [ ] **Step 1: slug/用户名解析** — 改 `site.js` 顶部 `U` 常量与 `load()`。把第 5 行 `const U = ...` 删掉，`load()` 改为：

```js
  async function load() {
    const m = location.pathname.match(/^\/s\/([^/]+)\/?$/);
    let endpoint;
    if (m) endpoint = '/api/site/by-slug/' + encodeURIComponent(m[1]);
    else {
      const U = (new URLSearchParams(location.search).get('u') || '').trim();
      if (!U) return fail(t('pfNotFound'));
      endpoint = '/api/site/' + encodeURIComponent(U);
    }
    try { D = await api(endpoint); }
    catch (e) {
      if (e.code === 'not_published') return fail(t('siteUnpub'));
      if (e.code === 'not_found') return fail(t('pfNotFound'));
      return fail(t('errNet'));
    }
    document.title = (D.title || ('@' + D.username)) + ' · Foody';
    render();
  }
```

- [ ] **Step 2: accent 变量** — 在 `render()` 里 `document.body.className = 'page-site site-theme-' + (D.theme || 'warm');` 之后加：

```js
    if (D.accent) document.body.style.setProperty('--site-accent', D.accent);
    else document.body.style.removeProperty('--site-accent');
```

- [ ] **Step 3: 公告栏** — 在 `render()` 里 `root.appendChild(hero);` 之后加：

```js
    if (D.announce) {
      const ann = document.createElement('div');
      ann.className = 'site-announce';
      ann.textContent = D.announce;
      root.appendChild(ann);
    }
```

- [ ] **Step 4: 相册面板 + 版块开关过滤** — 在 `render()` 里，紧接现有 `const contact = document.createElement('div'); ...` 之后加相册面板：

```js
    const album = document.createElement('div'); album.className = 'site-panel';
    if (D.photos && D.photos.length) {
      const ag = document.createElement('div'); ag.className = 'site-album';
      for (const ph of D.photos) { const img = document.createElement('img'); img.src = ph.url; img.loading = 'lazy'; img.alt = ''; ag.appendChild(img); }
      album.appendChild(ag);
    }
    const sec = D.sections || {};
```

把首页帖子画廊那段 `if (D.posts && D.posts.length) {` 改成受 `gallery` 开关控制：

```js
    if (sec.gallery !== false && D.posts && D.posts.length) {
```

把菜单收集后、构建 `tabs` 的那段（现在的 147–149 行）改为按开关过滤：

```js
    const tabs = [{ label: t('siteTabHome'), panel: home }];
    if (sec.menu !== false && hasMenu) tabs.push({ label: t('siteTabMenu'), panel: menuPanel });
    if (sec.photos !== false && D.photos && D.photos.length) tabs.push({ label: t('siteTabPhotos'), panel: album });
    if (sec.contact !== false && contact.children.length) tabs.push({ label: t('siteTabContact'), panel: contact });
```

- [ ] **Step 5: i18n `siteTabPhotos`** — 在 `shared.js` 三个语言块里，`siteTabContact` 同行加：
  - zh：`siteTabPhotos: '相册',`
  - ms：`siteTabPhotos: 'Galeri',`
  - en：`siteTabPhotos: 'Gallery',`

- [ ] **Step 6: CSS** — 在 `style.css` 末尾（或站点样式区）追加：

```css
/* 独立站：公告栏 */
.site-announce{margin:10px 16px 0;padding:10px 14px;border-radius:12px;
  background:var(--site-accent,var(--accent));color:#fff;font-weight:700;
  font-size:14px;line-height:1.4;text-align:center;white-space:pre-wrap}
/* 独立站：独立相册网格 */
.site-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.site-album img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;display:block}
```

在各 `.site-theme-*` 规则里，把强调色的定义改成引用 `--site-accent` 兜底自身默认色（示例，逐主题照改各自默认值）：

```css
.site-theme-warm{--accent:var(--site-accent,#D96A3B); /* …其余变量保持不变… */}
.site-theme-dark{--accent:var(--site-accent,#E8894B); /* … */}
.site-theme-fresh{--accent:var(--site-accent,#3E9C6B); /* … */}
.site-theme-berry{--accent:var(--site-accent,#C84E78); /* … */}
.site-theme-mono{--accent:var(--site-accent,#2B2B2B); /* … */}
```

> 若某主题当前用的强调色变量名不是 `--accent`，按该主题实际使用的变量名照此模式改（读一下现有 `.site-theme-*` 定义确认变量名，例如 `--surface-2`/`--accent` 等）。

- [ ] **Step 7: preview 走查** — 启动 preview，用 `foody_demo/foody123` 或预置 seller 数据，验证：公告栏显示、相册 tab 出现且图片正常、accent 改变强调色、把某版块开关设 false 后该 tab 消失、`/s/<slug>` 能直接打开。截图留证。

- [ ] **Step 8: 提交**

```bash
git add foody/public/js/site.js foody/public/css/style.css foody/public/js/shared.js
git commit -m "feat(site): public page renders announce, album, accent, section toggles, slug URL"
```

---

### Task 5: 编辑器（site-edit.html + site-edit.js + CSS + i18n + errMsg）

**Files:**
- Modify: `foody/public/site-edit.html`（表单在 26–59 行）
- Modify: `foody/public/js/site-edit.js`（提交在 137–158 行、载入在 162–182 行）
- Modify: `foody/public/css/style.css`（slug 提示、accent 行、相册缩略图样式）
- Modify: `foody/public/js/shared.js`（三语新 key + `errMsg` 加 slug 错误码）
- 验证方式：**preview 端到端**。

**Interfaces:**
- Consumes: `GET /api/me/site/slug-available`（Task 3）、`PATCH /api/me/site` 新字段（Task 2）、`POST /api/me/site/menu-photo`（现有，返回 `{url}`）

- [ ] **Step 1: HTML 加字段** — 在 `site-edit.html` 表单里，`fTitle` 字段之前加 slug 字段；在主题选择器 `themePick` 字段后加 accent；在 `fTagline`/`fIntro` 区合适位置加公告；在 `menuList` 字段后加相册与版块开关。具体片段：

slug（放在封面 `field` 之后、`fTitle` 之前）：
```html
      <div class="field">
        <label data-i18n="siteSlugL"></label>
        <div class="slug-row"><span class="slug-prefix">/s/</span><input id="fSlug" maxlength="30" autocomplete="off" spellcheck="false"></div>
        <div class="slug-hint" id="slugHint"></div>
      </div>
```

公告（放在 `fTagline` 之后）：
```html
      <div class="field"><label data-i18n="siteAnnounceL"></label><textarea id="fAnnounce" rows="2" maxlength="200" data-i18n-ph="siteAnnouncePh"></textarea></div>
```

accent（放在 `themePick` 的 `field` 之后）：
```html
      <div class="field">
        <label data-i18n="siteAccentL"></label>
        <div class="accent-row" id="accentRow">
          <input type="color" id="fAccent" value="#D96A3B">
          <button type="button" class="btn-ghost" id="accentClear" data-i18n="siteAccentClear"></button>
        </div>
      </div>
```

相册 + 版块开关（放在 `menuList` 字段之后、`pub-row` 之前）：
```html
      <div class="field">
        <label data-i18n="siteAlbumL"></label>
        <div class="album-grid" id="albumGrid"></div>
        <button type="button" class="btn-ghost" id="addPhoto" data-i18n="siteAddPhoto"></button>
      </div>
      <div class="field">
        <label data-i18n="siteSectionsL"></label>
        <label class="sec-toggle"><input type="checkbox" id="secGallery" checked> <span data-i18n="siteSecGallery"></span></label>
        <label class="sec-toggle"><input type="checkbox" id="secMenu" checked> <span data-i18n="siteSecMenu"></span></label>
        <label class="sec-toggle"><input type="checkbox" id="secPhotos" checked> <span data-i18n="siteSecPhotos"></span></label>
        <label class="sec-toggle"><input type="checkbox" id="secContact" checked> <span data-i18n="siteSecContact"></span></label>
      </div>
```

- [ ] **Step 2: JS — slug 实时校验 + accent 状态 + 相册 + 收集** — 在 `site-edit.js` 里加以下逻辑。

slug 归一 + 防抖可用性检查（放在事件绑定区，如 `$('#addLink')...` 附近）：
```js
  function setSlugHint(kind, msg) { const h = $('#slugHint'); h.className = 'slug-hint ' + (kind || ''); h.textContent = msg || ''; }
  let slugTimer;
  $('#fSlug').addEventListener('input', () => {
    const s = $('#fSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if ($('#fSlug').value !== s) $('#fSlug').value = s;
    clearTimeout(slugTimer);
    if (!s) return setSlugHint('', '');
    slugTimer = setTimeout(async () => {
      try {
        const r = await api('/api/me/site/slug-available?slug=' + encodeURIComponent(s));
        if (r.available) setSlugHint('ok', t('slugOk'));
        else setSlugHint('bad', t(r.reason === 'taken' ? 'slugTaken' : r.reason === 'reserved' ? 'slugReserved' : 'slugBad'));
      } catch { setSlugHint('', ''); }
    }, 350);
  });
```

accent 开/关状态（color input 无法为空，用 `accentRow` 的 `data-on` 标记）：
```js
  function accentOn() { return $('#accentRow').dataset.on === '1'; }
  function setAccentOn(on, val) {
    $('#accentRow').dataset.on = on ? '1' : '';
    if (val) $('#fAccent').value = val;
    $('#accentRow').classList.toggle('accent-active', on);
  }
  $('#fAccent').addEventListener('input', () => setAccentOn(true));
  $('#accentClear').addEventListener('click', () => setAccentOn(false));
```

相册上传/删除/收集：
```js
  function addPhotoThumb(url) {
    const cell = document.createElement('div'); cell.className = 'album-thumb'; cell.dataset.url = url;
    const img = document.createElement('img'); img.src = url; img.alt = '';
    const del = document.createElement('button'); del.type = 'button'; del.className = 'album-del'; del.innerHTML = ICONS.close;
    del.addEventListener('click', () => cell.remove());
    cell.append(img, del); $('#albumGrid').appendChild(cell);
  }
  $('#addPhoto').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.addEventListener('change', async () => {
      const cur = document.querySelectorAll('.album-thumb').length;
      for (const f of [...inp.files].slice(0, 20 - cur)) {
        const fd = new FormData(); fd.append('cover', f);
        try { const r = await api('/api/me/site/menu-photo', { method: 'POST', body: fd }); addPhotoThumb(r.url); }
        catch (e) { toast(errMsg(e.code)); }
      }
    });
    inp.click();
  });
  function collectPhotos() { return [...document.querySelectorAll('.album-thumb')].map(c => ({ url: c.dataset.url })).slice(0, 20); }
  function collectSections() {
    return { gallery: $('#secGallery').checked, menu: $('#secMenu').checked, photos: $('#secPhotos').checked, contact: $('#secContact').checked };
  }
```

- [ ] **Step 3: JS — 提交带上新字段** — 在提交处理里，`const body = { ... }` 加入新字段：

```js
      slug: $('#fSlug').value.trim(),
      accent: accentOn() ? $('#fAccent').value : '',
      announce: $('#fAnnounce').value.trim(),
      photos: collectPhotos(),
      sections: collectSections(),
```

保存失败时已有 `catch (err) { toast(errMsg(err.code)); }`——slug 错误码由 Step 6 的 `errMsg` 映射成中文/英文/马来文提示。

- [ ] **Step 4: JS — 载入回填** — 在 `DOMContentLoaded` 载入处（现有回填 `$('#fTitle').value = d.title...` 那段）加：

```js
    $('#fSlug').value = d.slug || '';
    $('#fAnnounce').value = d.announce || '';
    setAccentOn(!!d.accent, d.accent || '#D96A3B');
    (d.photos || []).forEach(p => addPhotoThumb(p.url));
    const sec = d.sections || {};
    $('#secGallery').checked = sec.gallery !== false;
    $('#secMenu').checked = sec.menu !== false;
    $('#secPhotos').checked = sec.photos !== false;
    $('#secContact').checked = sec.contact !== false;
```

- [ ] **Step 5: i18n 新 key** — 在 `shared.js` 三个语言块各加（zh / ms / en）：

```
siteSlugL          我的专属网址 / Pautan tapak saya / My site link
siteAnnounceL      公告 / 活动 / Pengumuman / Announcement
siteAnnouncePh     如：本周牛肉面买一送一 / cth: Promo minggu ini / e.g. This week: buy 1 free 1
siteAccentL        自定义主题色 / Warna tersuai / Custom accent color
siteAccentClear    用主题默认 / Guna lalai tema / Use theme default
siteAlbumL         相册（店铺展示图）/ Galeri / Photo gallery
siteAddPhoto       + 添加照片 / + Tambah foto / + Add photos
siteSectionsL      显示哪些版块 / Bahagian dipaparkan / Sections to show
siteSecGallery     帖子画廊 / Galeri pos / Post gallery
siteSecMenu        菜单 / Menu / Menu
siteSecPhotos      相册 / Galeri / Gallery
siteSecContact     联系 / Hubungi / Contact
slugOk             ✓ 可用 / ✓ Boleh guna / ✓ Available
slugTaken          已被占用 / Sudah diambil / Already taken
slugReserved       这是保留词 / Perkataan simpanan / Reserved word
slugBad            3–30 个字母/数字/连字符 / 3–30 huruf/nombor/sengkang / 3–30 letters/numbers/hyphens
```

- [ ] **Step 6: `errMsg` 加 slug 错误码** — 在 `shared.js` 的 `errMsg` 函数里（`return t(map[...])` 之前）加：

```js
  if (code === 'bad_slug') return LANG === 'zh' ? '网址格式不对（3–30 个字母/数字/连字符）' : LANG === 'ms' ? 'Format pautan salah (3–30 huruf/nombor/sengkang)' : 'Invalid link (3–30 letters/numbers/hyphens)';
  if (code === 'reserved_slug') return LANG === 'zh' ? '这个网址是保留词，换一个' : LANG === 'ms' ? 'Pautan ini disimpan, cuba lain' : 'That link is reserved, try another';
  if (code === 'slug_taken') return LANG === 'zh' ? '这个网址已被占用，换一个' : LANG === 'ms' ? 'Pautan ini sudah diambil' : 'That link is taken, try another';
```

- [ ] **Step 7: CSS** — 在 `style.css` 追加编辑器样式：

```css
.slug-row{display:flex;align-items:center;gap:0;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.slug-prefix{padding:0 8px;color:var(--muted);font-size:14px;background:var(--surface-2,#f0ece4)}
.slug-row input{border:0;flex:1;padding:10px;background:transparent;outline:none}
.slug-hint{font-size:12px;margin-top:4px;min-height:16px}
.slug-hint.ok{color:#2e9e5b}.slug-hint.bad{color:#c8442e}
.accent-row{display:flex;align-items:center;gap:10px}
.accent-row input[type=color]{width:44px;height:32px;padding:0;border:1px solid var(--line);border-radius:8px;background:none;opacity:.5}
.accent-row.accent-active input[type=color]{opacity:1}
.album-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;margin-bottom:8px}
.album-thumb{position:relative;aspect-ratio:1/1}
.album-thumb img{width:100%;height:100%;object-fit:cover;border-radius:8px;display:block}
.album-del{position:absolute;top:2px;right:2px;width:22px;height:22px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sec-toggle{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px}
```

> `--surface-2`/`--line`/`--muted` 若命名不同，读现有 `style.css` 变量名后照改。

- [ ] **Step 8: preview 走查** — 编辑器：设 slug（看实时"可用/占用"提示）、选自定义色、写公告、传相册图、关掉某版块 → 保存 → 打开 `/s/<slug>` 公开页确认全部生效；再测占用 slug 提交被拒且提示正确。截图留证。

- [ ] **Step 9: 提交**

```bash
git add foody/public/site-edit.html foody/public/js/site-edit.js foody/public/css/style.css foody/public/js/shared.js
git commit -m "feat(site): editor for slug, accent, announce, album, section toggles"
```

---

### Task 6: 验收扫尾

**Files:** 无新增改动（除非走查发现 bug）

- [ ] **Step 1: 全套测试** — Run: `npm test`；Expected: 全绿（既有 + `api-site.test.js`）。
- [ ] **Step 2: 对照 spec 验收清单** — 逐条核对 `docs/superpowers/specs/2026-07-01-independent-storefront-site-design.md` 第 11 节：slug 设置/打开、旧链接兼容、公告/相册/主题色显示、版块开关生效、未发布 by-slug 对访客 404、非法/占用/保留 slug 被拒不影响其它字段、三语齐全。
- [ ] **Step 3: preview 端到端一次性走查**（编辑器保存 → 公开页各版块 → slug 打开 → 开关生效），示范账号 foody_demo/foody123。发现问题回到对应 Task 修复。
- [ ] **Step 4: 若走查有修复，提交**

```bash
git add -A foody/
git commit -m "fix(site): address independent-storefront acceptance walkthrough findings"
```

---

## Self-Review 记录

- **Spec 覆盖**：slug（Task 2/3）、公告（Task 2 校验 + Task 4 渲染 + Task 5 编辑）、相册（同）、版块开关（同）、主题色（同）、slug 路由/兼容（Task 1/3）、校验安全（Task 2）、i18n（Task 4/5）、测试（Task 1–3/6）——spec 各节均有对应任务。
- **占位符扫描**：无 TBD/TODO；所有代码步骤含完整代码；CSS 变量名处标注"按现有命名核对"是有意的实现提示而非占位。
- **类型/命名一致**：`buildSitePayload`、`normSlug/slugFormatOk/slugTaken/checkSlug`、`RESERVED_SLUGS`、`sections` 键 `gallery/menu/photos/contact`、错误码 `bad_slug/reserved_slug/slug_taken`（后端）对应前端 `bad/reserved/taken`（slug-available 的 reason）——前后端命名差异已在 Task 5 Step 2 映射处理，一致。
