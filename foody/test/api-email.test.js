const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 邮箱验证：种子 hasmail(有邮箱) + nomail(无邮箱)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-email-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(n, email) { const salt = crypto.randomBytes(16).toString('hex'); return { id: crypto.randomUUID(), username: n, usernameLower: n.toLowerCase(), salt, passHash: H('pass123', salt), phone: '01' + Math.floor(1e8 + Math.random() * 8e8), phoneWa: '60' + Math.floor(1e9 + Math.random() * 8e9), email, state: 'Johor', city: 'JB', createdAt: Date.now() }; }
const hasmail = mk('hasmail', 'has@x.com');
const nomail = mk('nomail', '');
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [hasmail, nomail], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [], blocks: [] }));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server, lastMail; const ck = {};
const J = (b, cookie) => ({ method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: b ? JSON.stringify(b) : undefined });
const login = async (u) => (await fetch(base + '/api/login', J({ username: u, password: 'pass123' }))).headers.get('set-cookie').split(';')[0];
const me = async (cookie) => (await (await fetch(base + '/api/me', { headers: { cookie } })).json());
const codeFromMail = () => (lastMail && (lastMail.text || '').match(/\d{6}/) || [])[0];

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  app.locals.mailer = { configured: true, send: async (m) => { lastMail = m; } };
  ck.has = await login('hasmail'); ck.no = await login('nomail');
});
after(() => new Promise(r => server.close(r)));

test('无邮箱账号请求验证 → 400 no_email', async () => {
  const r = await fetch(base + '/api/me/email/verify/request', J(null, ck.no));
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'no_email');
});

test('/api/me 初始 emailVerified=false', async () => {
  assert.strictEqual((await me(ck.has)).emailVerified, false);
});

test('发码 → 错码 400 → 正确码验证成功', async () => {
  lastMail = null;
  const rq = await fetch(base + '/api/me/email/verify/request', J(null, ck.has));
  assert.strictEqual(rq.status, 200);
  assert.ok(lastMail && lastMail.to === 'has@x.com', '应给 has@x.com 发码');
  const code = codeFromMail(); assert.ok(/^\d{6}$/.test(code));

  const bad = await fetch(base + '/api/me/email/verify/confirm', J({ code: '000000' }, ck.has));
  assert.strictEqual((await bad.json()).error, 'bad_code');

  const ok = await fetch(base + '/api/me/email/verify/confirm', J({ code }, ck.has));
  assert.strictEqual(ok.status, 200);
  assert.strictEqual((await me(ck.has)).emailVerified, true, '验证后 emailVerified 应为 true');
});

test('已验证再请求 → already', async () => {
  const r = await fetch(base + '/api/me/email/verify/request', J(null, ck.has));
  assert.strictEqual((await r.json()).already, true);
});
