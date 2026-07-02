const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 找回密码（邮箱+电话 → 6 位码 → 重置）。种子：bob(有邮箱) + baddie(被封)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-reset-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(name, email, phoneWa, extra) { const salt = crypto.randomBytes(16).toString('hex'); return Object.assign({ id: crypto.randomUUID(), username: name, usernameLower: name.toLowerCase(), salt, passHash: H('whatever', salt), phone: '012-000', phoneWa, email, state: 'Johor', city: 'JB', createdAt: Date.now() }, extra || {}); }
const bob = mk('bob', 'bob@x.com', '60123456702');
const baddie = mk('baddie', 'bad@x.com', '60123456703', { banned: true });
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [bob, baddie], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [] }));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server, lastMail;
const J = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const reqReset = (email, phone) => fetch(base + '/api/auth/reset/request', J({ email, phone }));
const confirm = (body) => fetch(base + '/api/auth/reset/confirm', J(body));
const login = (u, pw) => fetch(base + '/api/login', J({ username: u, password: pw }));

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  app.locals.mailer = { configured: true, send: async (m) => { lastMail = m; } };   // 假 mailer 捕获验证码
});
after(() => new Promise(r => server.close(r)));
function codeFromMail() { return (lastMail && (lastMail.text || '').match(/\d{6}/) || [])[0]; }

test('邮箱+电话匹配 → 发码（响应永远成功）', async () => {
  lastMail = null;
  const r = await reqReset('bob@x.com', '0123456702');
  assert.strictEqual(r.status, 200);
  assert.ok(lastMail && lastMail.to === 'bob@x.com', '应给 bob 发了邮件');
  assert.ok(/^\d{6}$/.test(codeFromMail()), '邮件应含 6 位码');
});

test('不匹配的邮箱/电话 → 仍返回成功但不发码（不泄露账号是否存在）', async () => {
  lastMail = null;
  const r = await reqReset('nobody@x.com', '0119999999');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(lastMail, null, '不该发码');
});

test('被封用户不发码', async () => {
  lastMail = null;
  await reqReset('bad@x.com', '0123456703');
  assert.strictEqual(lastMail, null);
});

test('错码 → 400 bad_code；5 次后 too_many', async () => {
  lastMail = null;
  await reqReset('bob@x.com', '0123456702');
  for (let i = 0; i < 5; i++) {
    const r = await confirm({ email: 'bob@x.com', phone: '0123456702', code: '000000', newPassword: 'newpass1' });
    assert.strictEqual(r.status, 400);
  }
  const r6 = await confirm({ email: 'bob@x.com', phone: '0123456702', code: '000000', newPassword: 'newpass1' });
  assert.strictEqual((await r6.json()).error, 'too_many', '超过试错上限应 too_many');
});

test('正确码 → 重置成功，能用新密码登录，码不可复用', async () => {
  lastMail = null;
  await reqReset('bob@x.com', '0123456702');
  const code = codeFromMail();
  const r = await confirm({ email: 'bob@x.com', phone: '0123456702', code, newPassword: 'brandnew1' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await login('bob', 'brandnew1')).status, 200, '新密码应能登录');
  const reuse = await confirm({ email: 'bob@x.com', phone: '0123456702', code, newPassword: 'another1' });
  assert.strictEqual(reuse.status, 400, '同一个码不可复用');
});

test('新密码太短 → 400 bad_password（码不消耗，可重试）', async () => {
  lastMail = null;
  await reqReset('bob@x.com', '0123456702');
  const code = codeFromMail();
  const short = await confirm({ email: 'bob@x.com', phone: '0123456702', code, newPassword: '12' });
  assert.strictEqual((await short.json()).error, 'bad_password');
  const ok = await confirm({ email: 'bob@x.com', phone: '0123456702', code, newPassword: 'goodpass1' });
  assert.strictEqual(ok.status, 200, '同一个码配合合法新密码应仍可用');
});
