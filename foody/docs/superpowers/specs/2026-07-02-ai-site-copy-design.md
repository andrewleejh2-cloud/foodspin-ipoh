# AI 一键写文案（标语 + 故事介绍）— 设计文档

- 日期：2026-07-02
- 分支：`no-payment`
- 状态：已定稿，待转实现计划
- 前史：2026-06-17 曾有「AI 一键 prompt 生成微站」（commit a1d360b），用户要求移除已 revert。本轮按当时留下的重做思路正式重建：**Gemini 免费档 + key 走 env + 结果只填表不自动保存**。

## 1. 背景与目标

「我的网站」已具备菜单/营业时间/介绍/专属链接 `/s/店名`（挂 WhatsApp/FB 简介即用）。缺口是**文案门槛**：不会写字的商家面对"标语/故事介绍"两个空框会卡住。本轮加「✨ AI 帮我写」：自动取材商家已有数据 + 可选一句提示，生成 标语 + 故事介绍，填进编辑器表单，商家检查后自己保存。

明确边界（用户拍板）：
- **只写文案**（tagline + intro），不生成菜单/价格等事实数据。
- 不做"一键预填草稿"、不做发布后挂简介引导套件、不做 profile 引导入口（brainstorm 中未选）。

## 2. 架构

**服务器代理 + 独立 lib 模块**（沿用支付轮的可测模式）：

- **Create** `foody/lib/gemini.js`：纯逻辑 Gemini 客户端，**可注入 fetch**（测试不打真 API）。参考同仓库 `stitch-studio/server.js` 的调用写法：`POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<KEY>`。
- **Modify** `foody/server.js`：`POST /api/me/site/ai-copy` 端点（requireAuth）+ 取材 + 限流 + 校验。
- **key 只存服务器**：env `FOODY_GEMINI_KEY`（命名跟 FOODY_* 惯例），**永不下发前端**。模型 env `FOODY_GEMINI_MODEL` 缺省 `gemini-2.5-flash`。
- 无 key：端点 503 `ai_disabled`；编辑器按钮隐藏（见 §5 aiReady）。

## 3. 端点与流程

### `POST /api/me/site/ai-copy`（requireAuth）

请求体：`{ hint?: string(≤120), lang?: 'zh'|'ms'|'en' }`（lang 非法/缺省按 'zh'）。

服务器侧流程：
1. **限流**（§6）。
2. **自动取材**（全部服务器侧收集，防前端伪造）：用户名、`user.bio`、`user.city`/`user.state`、`user.site.title`、已填菜单的分类名+菜名（只取名字，不取价格；上限 30 个名字）、该用户帖子的 `place` 去重前 5 个。加上商家的可选 `hint`。
3. 拼紧凑 prompt：角色=马来西亚美食小店文案；输出**目标语言 = lang**；要求**只返回 JSON** `{"tagline": "...", "intro": "..."}`；标语一句吸睛（≤50 字符提示），介绍 2–4 段有人情味的小店故事（≤700 字符提示），**不得编造**菜单里没有的具体菜品/价格/年份等事实，取材里没有的细节用泛化表述。
4. 调 `lib/gemini.js`。响应解析：剥掉可能的 ```json 围栏 → `JSON.parse` → 失败一次性重试解析（宽松提取第一个 `{...}` 块）→ 仍失败返回 502 `ai_failed`。
5. **输出校验**：`tagline` 强转 string、trim、`slice(0,120)`；`intro` 强转 string、`\r\n` 归一、trim、`slice(0,1000)`；两者皆空 → `ai_failed`。
6. 返回 `{ tagline, intro }`。**服务器绝不把结果写入 `user.site`**——只回给编辑器。

### 前端（site-edit）

- 「✨ AI 帮我写」按钮 + 一行可选提示输入（placeholder 示例文案），放在标语/介绍字段附近。
- 点击 → 按钮 loading → 调端点（带当前 `LANG`）→ 成功后：**若 fTagline 或 fIntro 已有内容，`confirm()` 确认覆盖**；填入两字段；toast「已填入，检查后记得保存」。失败 toast `errMsg(code)`。
- **绝不自动保存**：填的只是表单值，走商家自己点「保存」的既有 PATCH。

## 4. lib/gemini.js 接口

```js
// createGeminiClient({ apiKey, model, fetchImpl }) → { generate(prompt) → Promise<string> }
// generate 返回模型的原始文本（candidates[0].content.parts[].text 拼接）；HTTP 非 2xx / 无 candidates 抛错。
```

- 纯函数式、无全局状态、`fetchImpl` 缺省 `globalThis.fetch`。
- server.js 启动时若有 key 就 `app.locals.gemini = createGeminiClient(...)`（同支付 `app.locals.pay` 模式），测试可注入假 client/假 fetch。

## 5. 按钮显隐（aiReady）

`GET /api/site/:username` 的 payload 在 `isMe === true` 时多返回 `aiReady: !!process.env.FOODY_GEMINI_KEY`（实现上用启动时常量）。编辑器载入时据此显示/隐藏 AI 区块。非本人请求不含该字段。

## 6. 限流（双层）

- **每用户每天** `AI_COPY_DAILY_MAX = 10` 次：`user.aiCopy = { day: 'YYYY-MM-DD', n }`，跨天重置；超限 429 `too_many`。落盘（saveDb）随成功调用更新。
- **每 IP 突发**：复用现有 `rateLimit()` 中间件，`windowMs: 60000, max: 5`（防脚本连打）。

## 7. i18n 与错误码

- 新 key（zh/ms/en 三语）：AI 按钮文案、提示输入 placeholder、「已填入，检查后记得保存」toast、覆盖确认文案。
- `errMsg` 新增映射：`ai_disabled`（"AI 功能未开启"）、`ai_failed`（"AI 生成失败，再试一次"）；`too_many` 已有。

## 8. 测试（node:test，隔离实例）

- 注入假 fetch/假 client：成功路径返回合法 JSON → 端点回 `{tagline, intro}` 且长度钳制生效（喂超长文本断言被裁）。
- AI 返回带 ```json 围栏 / 前后杂text → 仍能解析。
- AI 返回垃圾（不含 JSON）→ 502 `ai_failed`。
- 无 key 实例 → 503 `ai_disabled`。
- 每日限流：调到上限后 429，`user.aiCopy.n` 正确累计。
- 结果不落盘：成功生成后 GET site payload 的 tagline/intro 不变。
- 未登录 401。

## 9. 部署交接（用户要做的一件事）

去 [Google AI Studio](https://aistudio.google.com) 免费拿 API key → `start-foody.bat` 里设 `FOODY_GEMINI_KEY=<key>`（`render.yaml` 也加占位 env）。没设 key 前功能整体隐藏，其它一切照常。免费档额度足够 beta（每用户每天 10 次的闸在前面挡着）。

## 10. 验收清单

- [ ] 配了 key：编辑器出现 AI 区块；点击生成 → 表单被填、未保存前公开页不变；确认覆盖逻辑生效。
- [ ] 没配 key：编辑器无 AI 区块；直连端点得 503。
- [ ] 生成语言跟随界面语言（zh/ms/en 各试一次）。
- [ ] 每用户每天 10 次限流生效；每 IP 每分钟 5 次突发限流生效。
- [ ] AI 输出超长被钳制；垃圾输出得体报错。
- [ ] 三语文案齐全；node:test 全绿（既有 65 + 新增）；隔离实例不碰真实库。
