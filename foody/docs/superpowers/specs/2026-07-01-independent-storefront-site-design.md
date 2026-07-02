# 「我的网站」升级为商家独立站 — 设计文档

- 日期：2026-07-01
- 分支：`no-payment`
- 状态：已定稿，待转实现计划

## 1. 背景与目标

Foody 现有「我的网站」（`user.site`）已是一个不错的商家落地页：封面、标题、标语、介绍、营业时间、地址、自定义链接、5 套配色主题、菜单（分类▸菜品）、营业状态、发布开关；公开页 `site.html?u=用户名` 有三个标签页（首页/菜单/联系）、主题、帖子画廊、WhatsApp 购物车，底部 "Powered by Foody"。

用户要把它**偏向"商家自己发布的独立站"**。经 brainstorm 明确了三个主方向和排除项：

- **要**：更独立的链接、更完整的店铺版块、发布/管理更自主。
- **不要**（本轮明确排除）：去 Foody 化/换 Logo（保留 Foody 外壳 OK）、真·自定义域名、版块排序/拖拽、评价/口碑、货架搬进网站（货架继续留在 profile）。

## 2. 范围

### 本轮要做

| 能力 | 说明 |
|---|---|
| ① 自定义 slug 专属网址 | `/s/店名`，全站唯一，旧链接 `site.html?u=用户名` 永久兼容 |
| ② 公告/活动栏 | hero 下方置顶一条高亮 bar，单段文本 |
| ③ 独立相册画廊（非帖子） | 商家单独上传店铺展示图，与帖子无关，≤20 张 |
| ④ 版块开关 | gallery / menu / photos / contact 每块可显隐 |
| ⑤ 自定义主题色 | 取色器，叠加在 5 套预设主题之上，覆盖强调色 |

### 本轮不做

真·自定义域名、去 Foody 化、版块排序、评价/口碑、货架入网站、分享预览/SEO(OG)。

### 架构决定

沿用现有**扁平 `user.site` 对象加字段**（方案 A），不重构成"版块数组"模型。理由：本轮不做排序，"版块数组 + order" 属过度设计（YAGNI）。等将来真要拖拽排版再重构。

## 3. 数据模型

在 `user.site` 上新增字段（现有字段全保留、不改）：

```js
user.site = {
  /* 现有: cover, title, tagline, intro, hours, address, links[], theme, menu[], status, published */
  slug,        // string，专属网址。小写 [a-z0-9-]，3–30 字符，全站唯一，选填（空=无专属网址）
  accent,      // string，自定义主题色 hex（'#RRGGBB'）。空=用 theme 默认强调色
  announce,    // string，公告文本一段，≤200 字。空=不显示公告栏
  photos: [],  // [{ url }]，独立相册，url 只接受 /uploads/ 路径，≤20 张
  sections,    // { gallery, menu, photos, contact } 布尔开关；键缺省 = 有内容就显示
}
```

- **版块"是否显示"** = `sections[key] !== false && 该版块有内容`。开关只是"即使有内容也强制隐藏"的覆盖，不影响"没内容不显示"的原有逻辑。
- 货架**不进入 `user.site`**，继续存 `user.shelf`、留在 profile。网站完全不引用货架。
- `showShelf` 字段不存在（brainstorm 中砍掉）。

## 4. slug 路由与解析

### 路由

- 新增 `app.get('/s/:slug', …)`，放在**静态中间件之前**（当前静态在 server.js:1946-1947），直接 `res.sendFile(path.join(ROOT, 'public', 'site.html'))`。
- slug 处在独立的 `/s/` 命名空间下，**不会与** `/api/*`、`/uploads`、`public/*.html` 冲突，只需保证 slug 之间唯一 + 挡保留词。

### 前端解析（site.js）

- 若 `location.pathname` 形如 `/s/xxx` → 取 slug，调 `GET /api/site/by-slug/:slug`。
- 否则读 `?u=用户名` → 调现有 `GET /api/site/:username`（**旧链接永久兼容**）。
- 返回错误 `not_found` / `not_published` 的处理沿用现有 `fail()` 逻辑。

### 后端解析

- 把现有 `GET /api/site/:username` 的响应体构建抽成共享函数 **`buildSitePayload(u, viewer)`**，返回统一 payload（含新字段 announce/photos/accent/sections/slug）。
- `GET /api/site/:username`、`GET /api/site/by-slug/:slug` 两条路都调它。by-slug 先按 `user.site.slug === slug`（小写比对）找用户，找不到 → 404 `not_found`；未发布且非本人 → 404 `not_published`（与现有一致）。

### slug 可用性检查（编辑器实时提示）

- 新增 `GET /api/me/site/slug-available?slug=xxx`（登录态）：返回 `{ available: bool, reason?: 'bad'|'taken'|'reserved' }`。供编辑器输入时即时提示"可用/已被占用"。
- **`normSlug(raw)`**：`trim().toLowerCase()`，只保留 `[a-z0-9-]`。
- **合法性**：正则 `^[a-z0-9]+(?:-[a-z0-9]+)*$` + 长度 3–30（不允许首尾连字符、连续连字符）。
- **保留词** `RESERVED_SLUGS = new Set(['s','api','admin','foody','uploads','www','app','me','site','shop','help','about'])`。
- **唯一**：不存在其它用户（排除自己）的 `site.slug` 等于该 slug（小写比对）。

## 5. 各版块行为（公开页 site.js）

- **公告栏**：`announce` 非空 → 在 hero 下方、导航之上渲染一条高亮 bar（`.site-announce`）。不是 tab，无需开关（空即隐藏）。
- **首页 tab**：始终存在。含 `intro`（有则显示）+ 帖子画廊（`sections.gallery !== false && posts.length`）。视频格沿用现有"占位+播放标、不加载 video 文件"的做法（避免探索页那个渲染卡死坑）。
- **菜单 tab**：`sections.menu !== false && hasMenu`。渲染与购物车逻辑不变（`FoodyCart.makeBuy`）。
- **相册 tab**：`sections.photos !== false && photos.length`。网格展示 `photos[]` 里的真实图片（纯图片、无视频加载坑）。
- **联系 tab**：`sections.contact !== false && 有联系内容`（WhatsApp/地图/自定义链接/营业时间/地址任一）。
- tab 只对"要显示"的版块生成；只剩一个 tab 时不显示导航（沿用现有 `tabs.length > 1` 判断）。

### 主题色叠加

- 公开页在套 `site-theme-X` class 之后，若 `accent` 非空，给 `document.body` 设内联 CSS 变量 `--site-accent`，并让主题 CSS 里强调色引用它（`--wa` 绿色不受影响）。
- 具体做法：`.site-theme-*` 已定义强调色变量，改为 `var(--site-accent, <主题默认强调色>)`，`site.js` 只在有 accent 时 `document.body.style.setProperty('--site-accent', accent)`。

## 6. 编辑器（site-edit.html / site-edit.js）

在现有表单 `.field` 风格中加入：

- **slug 输入框**：输入时 normSlug 归一 + 防抖调 slug-available，下方显示"可用 / 已被占用 / 不合法 / 保留词"提示。展示完整链接预览 `…/s/<slug>`。
- **主题色取色器**：`<input type=color>`，可清空回退主题默认。与现有 5 套主题选择器并列。
- **公告文本框**：`<textarea maxlength=200>`。
- **相册上传**：多图上传，复用 `POST /api/me/site/menu-photo`（通用压缩返回 url），收集 url 存入 `photos`，可删缩略图。
- **版块开关**：gallery/menu/photos/contact 各一个勾选框（`switch` 复用现有样式）。

保存仍走 `PATCH /api/me/site`，body 增加 `slug/accent/announce/photos/sections`。

## 7. 校验与安全（server.js）

`PATCH /api/me/site` 新增字段校验：

- **slug**：若 body 带 `slug`：空串 → 清空 slug；否则 `normSlug` 后校验合法/保留/唯一，**任一不过 → 返回 `400 { error: 'bad_slug' | 'slug_taken' | 'reserved_slug' }` 且整个 PATCH 不落盘**（slug 需要明确反馈，不走"静默忽略"）。合法 → 存小写。
- **accent**：`/^#[0-9a-fA-F]{6}$/` 校验；空串清空；非法忽略。
- **announce**：`String(...).replace(/\r\n/g,'\n').trim().slice(0,200)`。
- **photos**：`Array`，每项取 `url`，只接受 `startsWith('/uploads/')`，`slice(0,20)`（延续菜单图防注入外链的做法）。
- **sections**：只认白名单键 `gallery/menu/photos/contact`，值强制布尔；其余键丢弃。
- 其余现有字段校验不变。

其它安全点：
- slug 命名空间隔离已避免路由冲突；`/s/:slug` 只 sendFile 静态页，不泄露数据（数据仍走鉴权 API）。
- 未发布站点经 by-slug 访问同样 404（非本人）。

## 8. i18n

为所有新文案补 zh/ms/en 三语 key（`shared.js` 的字典）：slug 标签/提示（可用/占用/不合法/保留）、主题色标签、公告标签、相册标签+上传按钮、四个版块开关标签、链接预览等。沿用现有 `data-i18n` / `t()` 机制。

## 9. 测试

`node:test` 集成测试（隔离实例 + 临时 `FOODY_DATA_DIR`，不碰真实库），覆盖：

- slug：合法保存、归一化（大写/空格→小写）、非法/保留/占用被拒（PATCH 返回对应 error 且不落盘）、`by-slug` 能解析到用户、未发布 by-slug 对非本人 404。
- slug-available 端点：available/taken/reserved/bad 各分支。
- accent：合法 hex 存、非法忽略、空清空。
- announce：超长截断、`\r\n` 归一。
- photos：非 `/uploads/` 被过滤、超 20 截断。
- sections：白名单外键丢弃、值转布尔；payload 含新字段；开关为 false 时该版块从 payload 判定为隐藏（payload 仍返回内容，隐藏在前端按 sections 判定——测试断言 sections 值正确回传）。

## 10. 兼容与迁移

- 无需数据迁移：新字段全部可选，缺省行为 = 现状（无 slug/无公告/无相册/无自定义色/所有版块按有内容显示）。
- 旧链接 `site.html?u=用户名` 与新链接 `/s/slug` 并存。
- 现有 `site.html` 页面文件、`GET /api/site/:username`、`PATCH /api/me/site`、封面/菜单图上传接口全部保留，只做扩展。

## 11. 验收清单

- [ ] 商家能在编辑器设 slug，实时看到"可用/占用"提示，保存后 `/s/slug` 能打开自己的网站。
- [ ] 旧 `site.html?u=用户名` 仍可访问。
- [ ] 公告栏、相册 tab、自定义主题色在公开页正确显示。
- [ ] 四个版块开关能各自隐藏对应版块（即使有内容）。
- [ ] 未发布站点 by-slug 对访客 404、对本人可见（草稿提示）。
- [ ] 非法/占用/保留 slug 被后端拒绝且不影响其它字段（PATCH 整体不落盘 + 前端提示）。
- [ ] accent/announce/photos/sections 服务器校验按 §7 生效。
- [ ] 三语文案齐全。
- [ ] `node:test` 全绿，隔离实例验证、未碰真实库。
- [ ] preview 端到端走查（编辑器保存 → 公开页各版块 → slug 打开 → 开关生效），示范账号 foody_demo/foody123。
