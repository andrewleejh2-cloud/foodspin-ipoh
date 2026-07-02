# 商家独立站「门面视觉重构 + 质量收尾」— 设计文档

- 日期：2026-07-02
- 分支：`no-payment`
- 状态：已定稿，待转实现计划
- 前置：2026-07-01 独立站升级已落地（slug `/s/:slug`、公告、相册、版块开关、自定义主题色，commits `403cdd8..fe2f251`）

## 1. 背景与目标

上一轮把「我的网站」升级成了商家独立站（功能层）。本轮用户要「全面优化」，经 brainstorm 定为两块：

- **门面视觉升级（重构型）**：公开页按"品牌官网"标准重排，摆脱模板感。
- **质量收尾**：上一轮最终审查留下的非阻塞优化。

明确不做（用户未选）：分享传播套件（OG/二维码/复制按钮）、管理体验（版块排序/拖拽/实时预览）。编辑器 UI 不动。

## 2. 范围

### 本轮要做

| 块 | 内容 |
|---|---|
| A. 视觉重构 | 公开页 `site.html`/`site.js` 全面重排（详见 §4） |
| B. CSS 拆分 | 新建 `public/css/site.css`，迁移全部 `.site-*` 与 `.site-theme-*` 样式 |
| C. 孤儿图清理 | PATCH 保存时删除被移除的菜单图/相册图文件 |
| D. sections 纵深防御 | `buildSitePayload` 输出前再过白名单 |
| E. 浅色 accent 对比度 | 公开页自动深色文字兜底 |

### 本轮不做

编辑器改版、OG/SEO、二维码、版块排序、货架图清理（属货架范围）、评价、去 Foody 化。

## 3. 架构决定

### CSS 拆分（B）

- 新建 `public/css/site.css`：站点公开页专属样式。内容 = 现有 `style.css` 里所有 `.site-*`、`.menu-item*`、`.menu-cat*`（公开页渲染用的那部分，编辑器的 `.mie-*`/`.mce-*`/`.slug-*`/`.accent-*`/`.album-*`/`.sec-toggle` 留在 style.css）+ 5 套 `.site-theme-*` 主题变量块 + 本轮重构新样式。
- `site.html` 引入顺序：`style.css`（通用件：按钮/头像/toast/lightbox 基础）→ `site.css`（覆盖层）。
- **迁移原则**：公开页专用的搬走并删源，编辑器/共享的留下。`page-site` 相关的 body 级规则一并搬。
- 编辑器页（site-edit.html）**不引** site.css。

### 主题体系保留

5 套 `.site-theme-*`（warm/dark/fresh/berry/mono）+ `--site-accent` 覆盖机制原样保留；本轮全部新样式只准引用主题变量（`--accent`/`--surface`/`--ink` 等），不得写死颜色（渐变遮罩里的黑白除外）。

## 4. 视觉重构设计（A）

页面自上而下的新结构：

### 4.1 满幅 Hero
- 封面图全宽（视口宽），高度手机 ~52vw（上限 320px）、桌面 320–380px；底部叠黑色渐变（`linear-gradient(transparent → rgba(0,0,0,.55))`）。
- 店名（大号粗体）、标语、营业状态徽章**叠在渐变上**（白字）；头像（`fillAvatar`）+ `@username` 一并放 hero 左下、点击进 profile（替代现在页底的 foot 链接位置——页底仍保留 Powered by Foody）。
- **无封面时**：主题色渐变兜底（`--accent` → 加深 20%），文字仍白字叠放。
- 顶部工具条（返回/编辑/语言）改为悬浮在 hero 上的半透明圆钮（现有 `.site-icon` 升级）。

### 4.2 公告条
- 紧贴 hero 下方，胶囊式、居中、📢 前缀（i18n 无需新 key，emoji 直接放），背景 `--site-accent` 兜底 `--accent`，文字色用 §7 的对比度变量。

### 4.3 吸顶 tab 导航
- tab 条 `position: sticky; top: 0`，滚动吸顶时带磨砂背景（`backdrop-filter: blur` + 主题 surface 半透明）。
- 样式改**下划线式**（激活项 accent 下划线 + 加粗），替代现在的胶囊填充。
- 面板切换逻辑不变（仍是显隐 `.site-panel`，非锚点滚动）；`tabs.length > 1` 才显示导航的判断保留。

### 4.4 菜单重设
- 菜品卡片化：图（有则显示，左侧方形圆角）、名称+描述中间、**价格右对齐**（等宽数字 `font-variant-numeric: tabular-nums`）。
- 售罄态：整卡降透明度 + 名称删除线 + 「售罄」小标（现有 i18n `shopSoldOut`）；加购按钮照旧不渲染。
- 分类标题右侧带菜品数量小字（如「主食 · 3」）。
- `FoodyCart.makeBuy` 加购按钮/订单条逻辑**完全不动**，只重排容器样式。

### 4.5 相册瀑布流 + lightbox
- `.site-album` 改 CSS columns 瀑布流（手机 2 列、桌面 3 列），图片保持原比例。
- 点击任意相册图开**轻量 lightbox**（site.js 自建）：全屏遮罩 + 大图 + 左右切换 + 键盘 ←/→/Esc + 触摸滑动 + 计数「2/8」。只做相册图（纯 `<img>`，无视频坑）。
- **帖子画廊不接 lightbox**：保持点击跳 `fyp.html?user=…&start=…` 导流；视频格继续占位+播放标、绝不放 `<video>`。

### 4.6 底部 WhatsApp 行动条（手机端）
- `waUrl` 存在（= 登录访客）且非本人页时，手机端（<760px）固定底部一条 WhatsApp 绿色行动条（图标+「WhatsApp」，i18n 用现有 key）。
- 隐私模型不动：未登录没有 waUrl 就不渲染，无登录引导（联系 tab 里已有按钮，行动条只是快捷方式）。
- 出现时给页面底部加 padding 防遮挡；`FoodyCart` 订单条出现时行动条隐藏（避免叠两条）。

### 4.7 桌面双栏（≥900px）
- 主内容列（tab 面板）+ 右侧**粘性信息卡**（`position: sticky`）：营业状态、营业时间、地址+地图链接、WhatsApp/自定义链接按钮。
- 信息卡内容 = 联系 tab 的内容子集；**联系 tab 桌面端也保留**（与侧栏轻度重复可接受——若按视口隐藏 tab 需重算 `tabs.length > 1` 导航逻辑，不值得）。
- 内容列最大宽 ~640px，整体居中，hero 仍满幅。

### 4.8 动效
- 入场：hero 文字与各版块淡入+上移（CSS animation，延续 app 的 `pageRise` 手感）。
- hover：菜品卡/相册图/链接按钮轻微提升（translateY + 阴影）。
- 全部包在 `@media (prefers-reduced-motion: no-preference)` 里。

### 4.9 实现指导
- 实现视觉部分时使用 **taste-skill**（design-taste-frontend）把关方向，避免模板脸；但本 spec 的结构决定（§4.1–4.8）为准，taste-skill 负责细节品质（字体层级/间距节奏/阴影分寸）。
- 三语：新增文案尽量复用现有 key；确需新增的按老规矩进 `DICT` 三语块。

## 5. 孤儿图清理（C）

- 位置：`PATCH /api/me/site` 成功落盘**之后**（slug 400 拒绝路径不受影响）。
- 逻辑：保存前收集旧 `site.menu[].items[].photo` + 旧 `site.photos[].url` 集合，保存后收集新集合；`旧集合 − 新集合` 中以 `/uploads/` 开头的文件逐个 `fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {})`（与现有封面清理同款容错写法）。
- 只在本次 PATCH **带了** `menu` 或 `photos` 字段时才对对应集合做 diff（没带 = 没动，不清）。
- 上传文件名全局唯一（时间戳+uuid），不存在跨用户/跨字段共用一个文件的情况；`user.site.cover` 已有同款逻辑不动；账号注销级联删除已覆盖、不重复处理。

## 6. sections 纵深防御（D）

`buildSitePayload` 里 sections 不再原样回传，改为只拷贝白名单四键中值为布尔的项（与 PATCH 侧同一套键表，抽常量 `SECTION_KEYS = ['gallery','menu','photos','contact']` 两处共用）。

## 7. 浅色 accent 对比度（E）

- site.js 套 accent 时计算 YIQ 亮度：`yiq = (r*299 + g*587 + b*114) / 1000`；`yiq >= 160` 视为浅色。
- 浅色时 `document.body` 额外设 `--site-accent-ink: #1F1B16`（深墨色），否则 `--site-accent-ink: #fff`。
- 公告条、激活 tab 下划线配文字、行动条等**所有"accent 当底色"的地方**文字色一律引用 `var(--site-accent-ink, #fff)`。
- 无自定义 accent（用主题默认）时不设该变量——5 套主题默认 accent 都够深，白字兜底安全。
- 编辑器不拦截取色，纯公开页自适应。

## 8. 测试

- **node:test**（追加到 `test/api-site.test.js`）：
  - 孤儿清理：预置两个 `/uploads/` 假文件 + 存进 menu/photos → PATCH 移除其一 → 被移除的文件消失、保留的还在；PATCH 不带 photos 字段时不清理。
  - slug 400 拒绝路径不触发清理（文件原封不动）。
  - sections 纵深防御：直接往 db 写脏键（绕过 PATCH）→ GET payload 只回白名单布尔键。
- **preview 走查**（视觉）：5 主题 × 手机(375)/桌面(1280)；hero 有/无封面；lightbox 开关/切换/键盘；吸顶 tab；菜单卡/售罄态；行动条与订单条互斥；浅色 accent 深字生效;`/s/:slug` 与 `?u=` 两种入口;reduced-motion。

## 9. 兼容

- 数据模型零改动；纯前端重排 + 两处后端小改（C/D）。
- 旧链接、主题、accent、购物车、画廊跳转全部行为不变。
- `site.css` 拆分后编辑器页面样式不受影响（编辑器样式留在 style.css）。

## 10. 验收清单

- [ ] 公开页新结构在 5 套主题 × 手机/桌面下渲染正常、无写死颜色破主题。
- [ ] 满幅 hero（有/无封面两态）、吸顶 tab、菜单卡、瀑布流相册 + lightbox、手机 WhatsApp 行动条、桌面双栏信息卡全部生效。
- [ ] 行动条与购物车订单条不同时出现。
- [ ] 帖子画廊仍跳 fyp、视频格无 `<video>`。
- [ ] 孤儿图清理按 §5 生效（node:test 证明），slug 拒绝不误删。
- [ ] sections 脏键不出现在 payload（node:test 证明）。
- [ ] 浅色 accent 下公告条/激活态文字自动变深色。
- [ ] `site.css` 拆分后编辑器与其它页面样式无回归。
- [ ] 全套 node:test 绿；preview 走查通过；临时测试数据清理干净。
