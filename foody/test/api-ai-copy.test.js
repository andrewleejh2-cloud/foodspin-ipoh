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
