# 门面视觉重构 + 质量收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 公开店铺页按"品牌官网"标准重构（满幅 hero/吸顶 tab/菜单卡/瀑布流相册+lightbox/手机行动条/桌面双栏），并完成孤儿图清理、sections 纵深防御、浅色 accent 对比度三项质量收尾。

**Architecture:** 纯前端重排（site.js 重写 render 各段 + 新建 site.css 承接全部站点公开页样式）+ 两处后端小改（PATCH 孤儿清理、payload sections 过滤）。数据模型零改动，编辑器不动。

**Tech Stack:** Node/Express + JSON 存储、原生前端（shared.js 提供 `api/t/ICONS/fillAvatar/FoodyCart`）、node:test 集成测试、preview 走查视觉。

## Global Constraints

- 5 套 `.site-theme-*` + `--site-accent` 覆盖体系原样保留；**新样式只准引用主题变量**（`--bg/--surface/--surface-2/--ink/--ink-2/--line/--accent/--accent-d/--accent-soft/--wa`），不得写死颜色（渐变遮罩的黑白、`--site-accent-ink` 的兜底值除外）。
- **视频格绝不放 `<video>`**：帖子画廊视频格保持占位+播放标（`.is-video`+`.site-play`），历史上真机卡死渲染器。
- 帖子画廊点击**仍跳** `fyp.html?user=…&start=…`（导流），不接 lightbox；lightbox 只做相册 `photos[]`。
- WhatsApp 隐私模型不动：`waUrl` 仅登录访客可见；行动条仅在 `waUrl && !isMe` 时渲染。
- 三语文案齐全（`DICT` zh/ms/en 三块）；新文案优先复用现有 key。
- 非法字段静默忽略（PATCH 现有风格）；slug 400 拒绝路径**不触发**孤儿清理。
- 测试用隔离实例（临时 `FOODY_DATA_DIR`/`FOODY_UPLOAD_DIR` + `app.listen(0)`），绝不碰真实库。
- 编辑器（site-edit.html/js）与其样式**不改**；编辑器样式留在 style.css、不引 site.css。
- 动效包在 `@media (prefers-reduced-motion: no-preference)` 内。

---

## 文件结构

- **Modify** `foody/server.js` — `SECTION_KEYS` 常量 + `cleanSections()`（PATCH 与 payload 共用）+ PATCH 孤儿图清理（Task 1）
- **Create** `foody/test/api-site-quality.test.js` — 质量收尾集成测试（Task 1）
- **Create** `foody/public/css/site.css` — 站点公开页全部样式（Task 2 迁移 + Task 3/4 重构）
- **Modify** `foody/public/css/style.css` — 移走公开页样式（Task 2）
- **Modify** `foody/public/site.html` — 加载 site.css（Task 2）
- **Modify** `foody/public/js/site.js` — render 重构（Task 3/4）

---

### Task 1: 后端质量收尾（孤儿图清理 + sections 纵深防御，TDD）

**Files:**
- Modify: `foody/server.js`（`SITE_THEMES` 常量区 ~979 行；`buildSitePayload` ~984；`PATCH /api/me/site` ~1037 起）
- Test: `foody/test/api-site-quality.test.js`（新建）

**Interfaces:**
- Produces: `SECTION_KEYS = ['gallery','menu','photos','contact']`（数组常量）；`cleanSections(src) → object`（只留白名单键中布尔值）。PATCH 侧与 `buildSitePayload` 都改用它们。孤儿清理无对外接口（PATCH 内部行为）。

- [ ] **Step 1: 写失败测试** — 新建 `foody/test/api-site-quality.test.js`。fixture 预置一个已发布卖家，**site.sections 直接带脏键**（绕过 PATCH 才能测纵深防御）：

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-sitequal-'));
const dataDir = path.join(tmp, 'data');
const uploadDir = path.join(tmp, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const seller = {
  id: crypto.randomUUID(), username: 'qseller', usernameLower: 'qseller',
  salt, passHash: hashPassword('pass123', salt),
  phone: '012-555 1111', phoneWa: '60125551111', state: 'Johor', city: 'JB', createdAt: Date.now(),
  // 脏 sections 直接写进库（模拟未来某条不走 PATCH 的写路径）
  site: { published: true, title: '质检店', sections: { menu: false, hacker: true, gallery: 'yes' } }
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [seller], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = uploadDir;
const app = require('../server');

let base, server, cookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qseller', password: 'pass123' })
  });
  cookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

async function patchSite(body) {
  return fetch(base + '/api/me/site', {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body)
  });
}
function mkUpload(name) { fs.writeFileSync(path.join(uploadDir, name), 'x'); return '/uploads/' + name; }
function exists(name) { return fs.existsSync(path.join(uploadDir, name)); }
// unlink 是异步 fire-and-forget，轮询等它落地
async function waitGone(name, ms = 800) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (!exists(name)) return true; await new Promise(r => setTimeout(r, 40)); }
  return !exists(name);
}

test('sections 纵深防御：库里的脏键不出现在 payload', async () => {
  const j = await (await fetch(base + '/api/site/qseller')).json();
  assert.deepStrictEqual(j.sections, { menu: false });   // hacker/非布尔 gallery 被过滤
});

test('孤儿清理：被移除的菜单图/相册图文件被删，保留的还在', async () => {
  const m1 = mkUpload('m1.jpg'), m2 = mkUpload('m2.jpg'), p1 = mkUpload('p1.jpg');
  let r = await patchSite({
    menu: [{ name: '主食', items: [
      { name: 'A', price: 'RM1', photo: m1 },
      { name: 'B', price: 'RM2', photo: m2 }
    ] }],
    photos: [{ url: p1 }]
  });
  assert.strictEqual(r.status, 200);
  // 移除 m1 与 p1，保留 m2
  r = await patchSite({
    menu: [{ name: '主食', items: [{ name: 'B', price: 'RM2', photo: m2 }] }],
    photos: []
  });
  assert.strictEqual(r.status, 200);
  assert.ok(await waitGone('m1.jpg'), 'm1 应被清理');
  assert.ok(await waitGone('p1.jpg'), 'p1 应被清理');
  assert.ok(exists('m2.jpg'), 'm2 仍被引用、不能删');
});

test('PATCH 不带 menu/photos 字段时不清理', async () => {
  const m3 = mkUpload('m3.jpg');
  await patchSite({ menu: [{ name: '主食', items: [{ name: 'C', price: 'RM3', photo: m3 }] }] });
  const r = await patchSite({ title: '只改标题' });
  assert.strictEqual(r.status, 200);
  await new Promise(r2 => setTimeout(r2, 150));
  assert.ok(exists('m3.jpg'), '没动 menu 就不该清理');
});

test('slug 400 拒绝路径不触发清理', async () => {
  const r = await patchSite({ slug: 'ab', menu: [], photos: [] });   // slug 非法 → 整个 PATCH 拒绝
  assert.strictEqual(r.status, 400);
  await new Promise(r2 => setTimeout(r2, 150));
  assert.ok(exists('m3.jpg'), '被拒的 PATCH 不能清文件');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- test/api-site-quality.test.js`（foody 目录下）
Expected: FAIL（sections 脏键原样回传；文件未被清理）

- [ ] **Step 3: 实现** — `server.js` 三处改动：

① `const SITE_THEMES = [...]` 之后加：

```js
const SECTION_KEYS = ['gallery', 'menu', 'photos', 'contact'];
function cleanSections(src) {
  const out = {};
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    for (const k of SECTION_KEYS) if (typeof src[k] === 'boolean') out[k] = src[k];
  }
  return out;
}
```

② `buildSitePayload` 里把 `sections: (s.sections && typeof s.sections === 'object') ? s.sections : {},` 改为：

```js
    sections: cleanSections(s.sections),
```

同时 `PATCH /api/me/site` 里现有的 sections 白名单块（`if (b.sections && typeof b.sections === 'object' ...)` 那段）改用同一个函数：

```js
  if (b.sections && typeof b.sections === 'object' && !Array.isArray(b.sections)) s.sections = cleanSections(b.sections);
```

③ 孤儿清理。PATCH 处理器里，在 slug 预检**之后**、任何 `s.xxx = ...` 赋值**之前**快照旧集合：

```js
  // 孤儿图清理：快照旧的菜单图/相册图，落盘后 diff 删除被移除的文件
  const oldMenuPhotos = Array.isArray(s.menu) ? s.menu.flatMap(c => (c.items || []).map(i => i.photo).filter(Boolean)) : [];
  const oldAlbum = Array.isArray(s.photos) ? s.photos.map(p => p.url).filter(Boolean) : [];
```

在 `saveDb();` 之后、`res.json(...)` 之前加：

```js
  // 只有这次 PATCH 真的带了 menu/photos 才对对应集合做 diff；新数据整体做保留集，防止 url 在两字段间挪动被误删
  if (Array.isArray(b.menu) || Array.isArray(b.photos)) {
    const keep = new Set([
      ...(Array.isArray(s.menu) ? s.menu.flatMap(c => (c.items || []).map(i => i.photo).filter(Boolean)) : []),
      ...(Array.isArray(s.photos) ? s.photos.map(p => p.url).filter(Boolean) : [])
    ]);
    const removed = [];
    if (Array.isArray(b.menu)) for (const u of oldMenuPhotos) if (!keep.has(u)) removed.push(u);
    if (Array.isArray(b.photos)) for (const u of oldAlbum) if (!keep.has(u)) removed.push(u);
    for (const u of removed) if (u.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {});
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- test/api-site-quality.test.js`
Expected: PASS（4/4）

- [ ] **Step 5: 全套回归**

Run: `npm test`
Expected: 全绿（既有 61 + 新 4 = 65）。注意 `test/api-site.test.js` 里"sections 只认白名单键"的既有断言与 cleanSections 行为一致，不应回归。

- [ ] **Step 6: 提交**

```bash
git add foody/server.js foody/test/api-site-quality.test.js
git commit -m "feat(site): orphan photo cleanup on PATCH + sections defense-in-depth"
```

---

### Task 2: site.css 拆分（纯迁移，零视觉变化）

**Files:**
- Create: `foody/public/css/site.css`
- Modify: `foody/public/css/style.css`（删走被迁移的规则）
- Modify: `foody/public/site.html`（加 `<link>`）

**Interfaces:**
- Produces: `public/css/site.css` — 站点公开页专属样式表，`site.html` 在 `style.css` 之后加载。Task 3/4 的全部新样式写进这个文件。

- [ ] **Step 1: 建 site.css 并迁移** — 从 `style.css` 把下列**公开页专属**规则组整块剪切到新文件 `public/css/site.css`（保持原文不改一字，文件头加注释 `/* Foody — 站点公开页样式（site.html 专用，编辑器不引） */`）：

  - `.page-site` / `.site`（容器）/ `.site-bar` / `.site-icon`（含 svg 子规则）/ `.site-draft`（现 ~1143–1148 行）
  - `.site-hero*` / `.site-cover` / `.site-tagline`（~1150–1159）
  - `.site-body` / `.site-acts` / `.site-btn*`（~1161–1168）
  - `.site-sec*` / `.site-text` / `.site-grid` / `.site-cell*`（~1170–1176）
  - `.site-foot*` / `.site-pw` / `.site-fail`（~1178–1181）
  - 5 行 `.site-theme-*`（~1185–1189）
  - `.site-nav*` / `.site-panel*`（~1192–1196）
  - `.menu-cat` / `.menu-cat:first-child` / `.menu-cat-name` / `.menu-item`（含 `:last-child`）/ `.menu-item-photo` / `.menu-item-body` / `.menu-item-top` / `.menu-item-name` / `.menu-item-price` / `.menu-item-desc` / `.menu-empty`（~1199–1210）——**这些是公开页渲染样式**（site.js 生成的 DOM 用），编辑器用的是 `.mce-*`/`.mie-*` 另一套，不迁。
  - `.site-cell.is-video` + `.site-play`（~1212–1214）
  - `.menu-item.is-sold` 两行（~1483–1484）
  - `.site-status*` 全部（~1507–1512）
  - `.site-announce` / `.site-album` 两组（文件尾 ~1775–1780）

  **留在 style.css 不迁**：`.site-pill`（fyp feed 用）、`.theme-pick`/`.theme-sw`、`.mce-*`/`.mie-*`/`.menu-cat-edit`/`.menu-item-edit`、`.edit-wrap`/`.cover-pick`/`#coverInner`/`.link-row`/`.pub-row`、`.slug-*`/`.accent-row`/`.album-grid`/`.album-thumb`/`.album-del`/`.sec-toggle`（编辑器）、`.order-bar`/`.ob-*`/`.mi-buy`/`.mi-qty`（FoodyCart 共享，profile 货架也用）、`.good-card*`（profile 货架）、`.lightbox`/`body.lb-open`（fyp 的 lightbox）、`.page-profile .order-bar`。

- [ ] **Step 2: site.html 引入** — 在 `<link rel="stylesheet" href="css/style.css">` 之后加一行：

```html
  <link rel="stylesheet" href="css/site.css">
```

- [ ] **Step 3: 静态验证迁移完整** —

Run（foody 目录）:
```bash
grep -c "site-theme\|\.site-hero\|\.site-nav\|\.menu-item \|\.site-announce" public/css/site.css
grep -n "\.site-hero\|\.site-nav {\|\.site-announce\|site-theme-warm\|\.menu-cat-name" public/css/style.css
```
Expected: 第一条 ≥ 5；第二条**无输出**（都迁走了）。再确认编辑器样式还在：
```bash
grep -c "\.mie-photo\|\.slug-row\|\.sec-toggle\|\.theme-pick" public/css/style.css
```
Expected: ≥ 4。

- [ ] **Step 4: 提交**

```bash
git add foody/public/css/site.css foody/public/css/style.css foody/public/site.html
git commit -m "refactor(site): split public storefront styles into site.css (pure move)"
```

---

### Task 3: 公开页骨架重构（hero / 公告 / 吸顶 nav / 菜单卡 / accent-ink / 动效）

**Files:**
- Modify: `foody/public/js/site.js`（`render()` 全段重排；新增 `accentInk()`）
- Modify: `foody/public/css/site.css`（替换/新增对应样式）

**Interfaces:**
- Consumes: Task 2 的 site.css；payload 字段 `cover/title/tagline/status/announce/accent/avatar/username/menu/sections/posts`。
- Produces: 新 DOM 结构（Task 4 在其上加相册/行动条/双栏）：`.site-topbar`（浮于 hero）、`.site-hero`（满幅）、`.site-announce`、`.site-nav`（sticky top:0 下划线式）、`.site-body` 内 `.site-panel` 面板（结构不变）。`accentInk(hex) → '#1F1B16' | '#fff' | ''`。
- 实现视觉细节前**先调用 taste-skill**（skill 名 `taste-skill`）获取品质指导；若该 skill 不可用则按本任务代码基线执行。**本计划的结构与行为代码为准**，taste-skill 只用于微调字号/间距/阴影等 craft 值。

- [ ] **Step 1: site.js — accent-ink 与 hero 重构** — 在 `render()` 里：

① `document.body.className = ...` 与 accent 设置那段改为：

```js
    document.body.className = 'page-site site-theme-' + (D.theme || 'warm');
    if (D.accent) {
      document.body.style.setProperty('--site-accent', D.accent);
      document.body.style.setProperty('--site-accent-ink', accentInk(D.accent));
    } else {
      document.body.style.removeProperty('--site-accent');
      document.body.style.removeProperty('--site-accent-ink');
    }
```

IIFE 顶部（`esc` 旁）加：

```js
  // 浅色 accent → 深色文字（YIQ 亮度），保证公告条/激活态可读
  function accentInk(hex) {
    const m = /^#([0-9a-fA-F]{6})$/.exec(hex || ''); if (!m) return '#fff';
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return ((r * 299 + g * 587 + b * 114) / 1000) >= 160 ? '#1F1B16' : '#fff';
  }
```

② 顶部工具条：`bar.className = 'site-bar'` 改 `'site-topbar'`（按钮构建逻辑不变，仍是 back/spacer/edit(isMe)/lang，`.site-icon` 类保留）。

③ hero 重构，替换现有 hero 构建段（从 `const hero = ...` 到 `root.appendChild(hero);`）：

```js
    const hero = document.createElement('header');
    hero.className = 'site-hero' + (D.cover ? ' has-cover' : ' no-cover');
    if (D.cover) { const img = document.createElement('img'); img.className = 'site-cover'; img.src = D.cover; img.alt = ''; hero.appendChild(img); }
    const ht = document.createElement('div');
    ht.className = 'site-hero-text';
    const h1 = document.createElement('h1');
    h1.textContent = D.title || ('@' + D.username);
    ht.appendChild(h1);
    if (D.tagline) { const tg = document.createElement('p'); tg.className = 'site-tagline'; tg.textContent = D.tagline; ht.appendChild(tg); }
    const meta = document.createElement('div'); meta.className = 'site-hero-meta';
    const who = document.createElement('a');
    who.className = 'site-who'; who.href = 'profile.html?u=' + encodeURIComponent(D.username);
    const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, D.username, D.avatar);
    const wn = document.createElement('span'); wn.textContent = '@' + D.username;
    who.append(av, wn); meta.appendChild(who);
    if (D.status === 'open' || D.status === 'closed') {
      const st = document.createElement('span'); st.className = 'site-status ' + D.status;
      st.textContent = t(D.status === 'open' ? 'statusOpen' : 'statusClosed');
      meta.appendChild(st);
    }
    ht.appendChild(meta);
    hero.appendChild(ht);
    root.appendChild(hero);
```

④ 页脚：删除现有 `.site-foot`（头像+用户名已上移 hero），只留 `.site-pw`。

- [ ] **Step 2: site.js — 菜单卡重构** — 菜单循环里两处小改：分类标题带数量、售罄加标签。`const h = ...; h.textContent = cat.name;` 一段改为：

```js
      if (cat.name) {
        const h = document.createElement('div'); h.className = 'menu-cat-name';
        h.textContent = cat.name;
        const ct = document.createElement('span'); ct.className = 'mc-count'; ct.textContent = '· ' + cat.items.length;
        h.appendChild(ct); c.appendChild(h);
      }
```

菜品行里 `top.appendChild(nm);` 之后加：

```js
        if (it.soldOut) { const sd = document.createElement('span'); sd.className = 'sold-tag'; sd.textContent = t('shopSoldOut'); top.appendChild(sd); }
```

- [ ] **Step 3: site.css — 重构样式** — 用下列样式**替换**site.css 里对应旧规则（旧的 `.site-bar`/`.site-hero*`/`.site-nav*`/`.menu-*` 相关行删除，新样式如下；未列出的迁移规则保留）：

```css
/* ---- 顶部工具条：浮于 hero 上 ---- */
.site-topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px; }
.site-icon { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.28); color: #fff; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,.25); }
.site-hero.no-cover ~ * .site-icon { }  /* 占位说明：无封面时仍可读（渐变底同样是深色） */
.site-icon svg { width: 19px; height: 19px; }

/* ---- 满幅 hero ---- */
.page-site { background: var(--bg); min-height: 100%; }
.site { position: relative; min-height: 100dvh; background: var(--bg); }
.site-hero { position: relative; width: 100%; }
.site-hero.has-cover { height: min(52vw, 320px); }
.site-hero.no-cover { padding-top: 64px; background: linear-gradient(160deg, var(--accent), var(--accent-d)); }
.site-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
.site-hero.has-cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.02) 35%, rgba(0,0,0,.58)); }
.site-hero-text { position: relative; z-index: 1; padding: 18px 20px 16px; }
.site-hero.has-cover .site-hero-text { position: absolute; left: 0; right: 0; bottom: 0; }
.site-hero-text h1 { font-size: clamp(26px, 6vw, 34px); font-weight: 800; color: #fff; line-height: 1.15; text-shadow: 0 1px 8px rgba(0,0,0,.25); }
.site-tagline { font-size: 15px; color: rgba(255,255,255,.92); margin-top: 5px; font-weight: 600; }
.site-hero-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.site-who { display: inline-flex; align-items: center; gap: 7px; color: #fff; font-weight: 700; font-size: 13.5px; background: rgba(0,0,0,.28); backdrop-filter: blur(6px); padding: 4px 12px 4px 4px; border-radius: 999px; }
.site-who .avatar-sm { width: 26px; height: 26px; font-size: 12px; }

/* ---- 公告条 ---- */
.site-announce { margin: 14px 16px 0; padding: 10px 16px; border-radius: 999px; background: var(--site-accent, var(--accent)); color: var(--site-accent-ink, #fff); font-weight: 700; font-size: 14px; line-height: 1.4; text-align: center; white-space: pre-wrap; }
.site-announce::before { content: '📢 '; }

/* ---- 吸顶下划线 nav ---- */
.site-nav { position: sticky; top: 0; z-index: 15; display: flex; gap: 2px; padding: 4px 12px 0; margin: 10px 0 0; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.site-nav button { position: relative; padding: 11px 14px 12px; font-size: 14.5px; font-weight: 800; color: var(--ink-2); transition: color .15s; }
.site-nav button.on { color: var(--ink); }
.site-nav button.on::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--site-accent, var(--accent)); }

/* ---- 面板/正文 ---- */
.site-body { padding: 16px 20px 8px; }
.site-panel { display: none; }
.site-panel.on { display: block; }

/* ---- 菜单卡片 ---- */
.menu-cat { margin-top: 20px; }
.menu-cat:first-child { margin-top: 6px; }
.menu-cat-name { display: flex; align-items: baseline; gap: 7px; font-size: 17px; font-weight: 800; color: var(--ink); margin-bottom: 10px; }
.menu-cat-name .mc-count { font-size: 12.5px; color: var(--ink-2); font-weight: 700; }
.menu-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; margin-bottom: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
.menu-item:last-child { margin-bottom: 0; }
.menu-item-photo { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex: none; background: var(--surface-2); }
.menu-item-body { flex: 1; min-width: 0; }
.menu-item-top { display: flex; gap: 10px; align-items: baseline; }
.menu-item-name { font-size: 15px; font-weight: 800; color: var(--ink); }
.menu-item-price { margin-left: auto; font-size: 15px; font-weight: 800; color: var(--accent-d); flex: none; white-space: nowrap; font-variant-numeric: tabular-nums; }
.menu-item-desc { font-size: 13px; color: var(--ink-2); margin-top: 3px; line-height: 1.5; white-space: pre-line; word-break: break-word; }
.menu-item.is-sold { opacity: .55; }
.menu-item.is-sold .menu-item-photo { filter: grayscale(.7); }
.menu-item.is-sold .menu-item-name { text-decoration: line-through; }
.sold-tag { font-size: 11px; font-weight: 800; color: var(--ink-2); border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; flex: none; }

/* ---- 入场动效 & hover ---- */
@media (prefers-reduced-motion: no-preference) {
  .site-hero-text > * { animation: siteRise .5s ease both; }
  .site-hero-text > *:nth-child(2) { animation-delay: .07s; }
  .site-hero-text > *:nth-child(3) { animation-delay: .14s; }
  .site-panel.on { animation: siteFade .3s ease; }
  .menu-item { transition: transform .16s ease, box-shadow .16s ease; }
  .menu-item:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.07); }
  @keyframes siteRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes siteFade { from { opacity: 0; } to { opacity: 1; } }
}
```

注意：`.site-draft`、`.site-sec*`、`.site-text`、`.site-grid`/`.site-cell*`、`.site-status*`、`.site-acts`/`.site-btn*`、`.site-theme-*`、`.site-pw`、`.site-fail`、`.site-album`（Task 4 重做）等迁移来的规则**保留原样**；`.site-foot` 两行删除（DOM 已不生成）。`.site { max-width: 640px }` 的旧行删除（新 `.site` 满幅，正文宽度 Task 4 的 layout 收口——本任务先在 `.site-body` 上临时加 `max-width: 640px; margin: 0 auto;`，Task 4 会移到 layout 上）。`.site-nav` 同样加 `max-width: 640px; margin: 10px auto 0;`（Task 4 调整）。

- [ ] **Step 4: 手动烟测** — 启动本地实例（`node server.js` 或让控制方 preview），肉眼确认无 JS 报错、hero/公告/nav/菜单渲染。实现者无 preview 工具时跳过，控制方在 review 前走查。

- [ ] **Step 5: 提交**

```bash
git add foody/public/js/site.js foody/public/css/site.css
git commit -m "feat(site): hero/nav/menu visual restructure with accent-ink contrast"
```

---

### Task 4: 相册瀑布流 + lightbox + 手机行动条 + 桌面双栏

**Files:**
- Modify: `foody/public/js/site.js`（相册渲染、lightbox、行动条、layout/侧栏）
- Modify: `foody/public/css/site.css`（对应样式）

**Interfaces:**
- Consumes: Task 3 的 DOM 结构与 CSS；payload 字段 `photos/waUrl/isMe/status/hours/address/links/mapUrl`。
- Produces: 最终页面结构：`root > [topbar, hero, announce?, draft?, .site-layout > (.site-main > nav? + .site-body) + aside.site-side?, .site-wabar?, .site-pw]`。lightbox 类前缀 `.slb-*`（避开 fyp 的 `.lightbox`）。
- 视觉细节同样先调用 taste-skill（结构以本计划为准）。

- [ ] **Step 1: site.js — 相册瀑布流 + lightbox** — 替换现有 album 面板构建段：

```js
    const album = document.createElement('div'); album.className = 'site-panel';
    if (D.photos && D.photos.length) {
      const ag = document.createElement('div'); ag.className = 'site-album';
      D.photos.forEach((ph, i) => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'site-album-cell';
        const img = document.createElement('img'); img.src = ph.url; img.loading = 'lazy'; img.alt = '';
        btn.appendChild(img);
        btn.addEventListener('click', () => openLb(i));
        ag.appendChild(btn);
      });
      album.appendChild(ag);
    }
```

IIFE 内加 lightbox（放 `render()` 之外、与其平级）：

```js
  /* ---- 相册 lightbox（轻量自建，类前缀 slb 避开 fyp 的 .lightbox） ---- */
  let lbIdx = -1, lbEl = null;
  function buildLb() {
    lbEl = document.createElement('div'); lbEl.className = 'slb';
    lbEl.innerHTML = '<button type="button" class="slb-x">' + ICONS.close + '</button>'
      + '<button type="button" class="slb-prev">' + ICONS.back + '</button>'
      + '<img class="slb-img" alt="">'
      + '<button type="button" class="slb-next">' + ICONS.back + '</button>'
      + '<div class="slb-count"></div>';
    lbEl.addEventListener('click', (e) => { if (e.target === lbEl) closeLb(); });
    lbEl.querySelector('.slb-x').addEventListener('click', closeLb);
    lbEl.querySelector('.slb-prev').addEventListener('click', () => stepLb(-1));
    lbEl.querySelector('.slb-next').addEventListener('click', () => stepLb(1));
    let tx = null;
    lbEl.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    lbEl.addEventListener('touchend', (e) => {
      if (tx == null) return;
      const dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 40) stepLb(dx > 0 ? -1 : 1);
    }, { passive: true });
    document.body.appendChild(lbEl);
  }
  function paintLb() {
    lbEl.querySelector('.slb-img').src = D.photos[lbIdx].url;
    lbEl.querySelector('.slb-count').textContent = (lbIdx + 1) + ' / ' + D.photos.length;
    const many = D.photos.length > 1;
    lbEl.querySelector('.slb-prev').style.display = many ? '' : 'none';
    lbEl.querySelector('.slb-next').style.display = many ? '' : 'none';
  }
  function openLb(i) { if (!lbEl) buildLb(); lbIdx = i; paintLb(); lbEl.classList.add('on'); document.body.classList.add('lb-open'); }
  function closeLb() { if (lbEl) lbEl.classList.remove('on'); document.body.classList.remove('lb-open'); lbIdx = -1; }
  function stepLb(d) { if (lbIdx < 0) return; lbIdx = (lbIdx + d + D.photos.length) % D.photos.length; paintLb(); }
  document.addEventListener('keydown', (e) => {
    if (lbIdx < 0) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') stepLb(-1);
    else if (e.key === 'ArrowRight') stepLb(1);
  });
```

- [ ] **Step 2: site.js — layout/侧栏/行动条** — `render()` 尾段（tabs 构建之后）重排。现有 `if (tabs.length > 1) root.appendChild(nav); root.appendChild(body);` 替换为：

```js
    // 桌面双栏：主列（nav+面板）+ 粘性信息卡（联系摘要，≥900px 显示）
    const layout = document.createElement('div'); layout.className = 'site-layout';
    const main = document.createElement('div'); main.className = 'site-main';
    if (tabs.length > 1) main.appendChild(nav);
    main.appendChild(body);
    layout.appendChild(main);
    const side = document.createElement('aside'); side.className = 'site-side';
    if (D.status === 'open' || D.status === 'closed') {
      const st = document.createElement('div'); st.className = 'site-status ' + D.status;
      st.textContent = t(D.status === 'open' ? 'statusOpen' : 'statusClosed');
      side.appendChild(st);
    }
    if (D.hours) side.appendChild(section(t('siteHours'), textBlock(D.hours), ICONS.clock));
    if (D.address) side.appendChild(section(t('siteAddress'), textBlock(D.address), ICONS.pin));
    const sideActs = document.createElement('div'); sideActs.className = 'site-acts';
    if (D.waUrl) sideActs.appendChild(linkBtn('wa', ICONS.whatsapp, 'WhatsApp', D.waUrl));
    if (D.mapUrl) sideActs.appendChild(linkBtn('map', ICONS.pin, t('siteMap'), D.mapUrl));
    for (const l of (D.links || [])) sideActs.appendChild(linkBtn('link', ICONS.share, l.label, l.url));
    if (sideActs.children.length) side.appendChild(sideActs);
    if (side.children.length) layout.appendChild(side);
    root.appendChild(layout);

    // 手机 WhatsApp 行动条（登录访客且非本人；购物车订单条出现时 CSS 隐藏它）
    if (D.waUrl && !D.isMe) {
      const wb = document.createElement('a');
      wb.className = 'site-wabar'; wb.href = D.waUrl; wb.target = '_blank'; wb.rel = 'noopener';
      wb.innerHTML = ICONS.whatsapp + '<span>WhatsApp</span>';
      root.appendChild(wb);
      root.classList.add('has-wabar');
    }
```

（`.site-pw` 追加保持在 layout 之后；旧 `.site-foot` 构建段确认已在 Task 3 删除。）

- [ ] **Step 3: site.css — 对应样式** — 替换 `.site-album` 旧规则并新增：

```css
/* ---- 相册瀑布流 ---- */
.site-album { columns: 2; column-gap: 8px; }
.site-album-cell { display: block; width: 100%; margin-bottom: 8px; border-radius: 12px; overflow: hidden; padding: 0; break-inside: avoid; }
.site-album-cell img { width: 100%; display: block; }
@media (prefers-reduced-motion: no-preference) {
  .site-album-cell { transition: transform .16s ease; }
  .site-album-cell:hover { transform: scale(1.015); }
}

/* ---- lightbox ---- */
.slb { position: fixed; inset: 0; z-index: 120; background: rgba(0,0,0,.94); display: none; align-items: center; justify-content: center; }
.slb.on { display: flex; }
.slb-img { max-width: 94vw; max-height: 88vh; object-fit: contain; border-radius: 6px; }
.slb-x, .slb-prev, .slb-next { position: absolute; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); color: #fff; }
.slb-x { top: calc(14px + env(safe-area-inset-top)); right: 14px; }
.slb-x svg, .slb-prev svg, .slb-next svg { width: 20px; height: 20px; }
.slb-prev { left: 10px; top: 50%; transform: translateY(-50%); }
.slb-next { right: 10px; top: 50%; transform: translateY(-50%) rotate(180deg); }
.slb-count { position: absolute; bottom: calc(16px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.85); font-size: 13px; font-weight: 700; }

/* ---- 布局：手机单列 / 桌面双栏 ---- */
.site-layout { max-width: 640px; margin: 0 auto; }
.site-side { display: none; }
@media (min-width: 900px) {
  .site-layout { display: grid; grid-template-columns: minmax(0, 640px) 300px; gap: 28px; max-width: 990px; padding: 0 20px; }
  .site-side { display: block; position: sticky; top: 64px; align-self: start; margin-top: 16px; padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
  .site-side .site-status { margin-top: 0; }
  .site-side .site-sec { margin-top: 16px; }
  .site-side .site-acts { margin-top: 16px; flex-direction: column; }
  .site-side .site-btn { justify-content: center; }
}

/* ---- 手机 WhatsApp 行动条 ---- */
.site-wabar { display: none; }
@media (max-width: 759px) {
  .site-wabar { position: fixed; left: 14px; right: 14px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 55;
    display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border-radius: 999px;
    background: var(--wa); color: #fff; font-weight: 800; font-size: 15px; box-shadow: 0 6px 20px rgba(0,0,0,.18); }
  .site-wabar svg { width: 19px; height: 19px; }
  .site.has-wabar { padding-bottom: 84px; }
  body:has(.order-bar) .site-wabar { display: none; }   /* 购物车订单条出现时让位 */
}
```

同时把 Task 3 临时加在 `.site-body`/`.site-nav` 上的 `max-width: 640px; margin: … auto …` 移除（宽度统一由 `.site-layout` 收口；`.site-nav` 保持 sticky，宽度自然随 `.site-main`）。

- [ ] **Step 4: 手动烟测**（同 Task 3 Step 4，实现者无 preview 就跳过、控制方走查）。

- [ ] **Step 5: 提交**

```bash
git add foody/public/js/site.js foody/public/css/site.css
git commit -m "feat(site): album masonry + lightbox, mobile WhatsApp bar, desktop two-column"
```

---

### Task 5: 验收扫尾

**Files:** 无预设改动（走查发现的问题回对应 Task 修）

- [ ] **Step 1: 全套测试** — Run: `npm test`；Expected: 全绿（65）。
- [ ] **Step 2: preview 视觉矩阵走查**（控制方执行）：5 主题 × 手机(375)/桌面(1280)；hero 有/无封面两态；lightbox 开/切/键盘/滑动；吸顶 nav；菜单卡+售罄态；行动条（登录访客可见、本人不可见、与订单条互斥）；浅色 accent（如 `#FFE08A`）→ 公告条/激活下划线深色字；`/s/:slug` 与 `?u=` 双入口；编辑器页样式无回归（site.css 未影响）；reduced-motion。临时账号测完级联删除。
- [ ] **Step 3: 对照 spec 验收清单**（`2026-07-02-storefront-visual-refresh-design.md` §10）逐条核对。
- [ ] **Step 4: 若有修复，提交**

```bash
git add -A foody/
git commit -m "fix(site): visual refresh acceptance walkthrough findings"
```

---

## Self-Review 记录

- **Spec 覆盖**：§3 CSS 拆分→Task 2；§4.1–4.4/4.8→Task 3；§4.5–4.7→Task 4；§5 孤儿清理→Task 1；§6 sections→Task 1；§7 accent-ink→Task 3；§8 测试→Task 1/5。§4.9 taste-skill 指导已写进 Task 3/4 的 Interfaces。无缺口。
- **占位符扫描**：无 TBD；所有改动附完整代码；Task 2 是移动操作，以精确类名清单+验证 grep 代替代码块（迁移内容 = 现文件原文）。
- **命名一致性**：`SECTION_KEYS`/`cleanSections`（Task 1 内自洽）；`accentInk`（Task 3 定义、公告/nav CSS 用 `--site-accent-ink`）；`.slb-*`（Task 4 内自洽，避开 `.lightbox`）；`.site-layout/.site-main/.site-side/.site-wabar`（Task 4 定义并在 CSS 使用）；Task 3 临时 max-width 由 Task 4 收口——两处都有明示。
