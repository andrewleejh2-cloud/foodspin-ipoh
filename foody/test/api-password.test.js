const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-pw-'));
process.env.FOODY_DATA_DIR = path.join(tmp, 'data');
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server;
const J = (cookie, body) => ({ method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: JSON.stringify(body) });
async function register(u, pw, phone) {
  const r = await fetch(base + '/api/register', J(null, { username: u, password: pw, phone, state: 'Johor', city: 'JB' }));
  return r.headers.get('set-cookie').split(';')[0];
}
async function login(u, pw) {
  const r = await fetch(base + '/api/login', J(null, { username: u, password: pw }));
  return { status: r.status, cookie: r.status === 200 ? r.headers.get('set-cookie').split(';')[0] : null };
}
async function changePw(cookie, oldPassword, newPassword) {
  return fetch(base + '/api/me/password', J(cookie, { oldPassword, newPassword }));
}
async function meOk(cookie) {
  const j = await (await fetch(base + '/api/me', { headers: { cookie } })).json();
  return !!(j.user);
}

let c1, c2;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  c1 = await register('alice', 'oldpass1', '0123456701');     // 当前会话
  c2 = (await login('alice', 'oldpass1')).cookie;             // 另一台设备的会话
});
after(() => new Promise(r => server.close(r)));

test('旧密码错 → 400 wrong_password', async () => {
  const r = await changePw(c1, 'NOPE', 'newpass1');
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'wrong_password');
});

test('新密码太短 → 400 bad_password', async () => {
  const r = await changePw(c1, 'oldpass1', '123');
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'bad_password');
});

test('改密码成功：新密码能登录、旧密码失效', async () => {
  const r = await changePw(c1, 'oldpass1', 'newpass1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await login('alice', 'newpass1')).status, 200, '新密码应能登录');
  assert.strictEqual((await login('alice', 'oldpass1')).status, 401, '旧密码应失效');
});

test('改密码后：当前会话仍有效，其它会话被踢', async () => {
  assert.strictEqual(await meOk(c1), true, '当前会话应仍有效');
  assert.strictEqual(await meOk(c2), false, '其它会话应被踢掉');
});
