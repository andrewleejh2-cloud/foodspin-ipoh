const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-sess-'));
process.env.FOODY_DATA_DIR = path.join(tmp, 'data');
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E Safari/604.1'
};
let base, server;
function J(body, ua, cookie) {
  const headers = { 'content-type': 'application/json' };
  if (ua) headers['user-agent'] = ua;
  if (cookie) headers.cookie = cookie;
  return { method: 'POST', headers, body: JSON.stringify(body) };
}
async function register(u, ua) {
  const r = await fetch(base + '/api/register', J({ username: u, password: 'pass123', phone: '01' + Math.floor(1e8 + Math.random() * 8e8), state: 'Johor', city: 'JB' }, ua));
  return r.headers.get('set-cookie').split(';')[0];
}
async function login(u, ua) {
  const r = await fetch(base + '/api/login', J({ username: u, password: 'pass123' }, ua));
  return r.headers.get('set-cookie').split(';')[0];
}
const meOk = async (cookie) => !!(await (await fetch(base + '/api/me', { headers: { cookie } })).json()).user;
const listSessions = async (cookie) => (await (await fetch(base + '/api/me/sessions', { headers: { cookie } })).json()).sessions;

let aChrome, aFirefox, aSafari, bobCookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  aChrome = await register('alice', UA.chromeWin);     // 当前这台
  aFirefox = await login('alice', UA.firefox);
  aSafari = await login('alice', UA.safariIphone);
  bobCookie = await register('bob', UA.chromeWin);
});
after(() => new Promise(r => server.close(r)));

test('列出我的会话：3 台，当前标记 + 设备解析', async () => {
  const ss = await listSessions(aChrome);
  assert.strictEqual(ss.length, 3);
  assert.strictEqual(ss.filter(s => s.current).length, 1, '应恰有一台是当前');
  const devices = ss.map(s => s.device);
  assert.ok(devices.some(d => d === 'Chrome · Windows'), '应识别 Chrome · Windows，实际 ' + JSON.stringify(devices));
  assert.ok(devices.some(d => d === 'Firefox · Linux'));
  assert.ok(devices.some(d => d === 'Safari · iOS'));
});

test('踢掉某一台 → 该会话 token 立即失效', async () => {
  const ss = await listSessions(aChrome);
  const fox = ss.find(s => s.device === 'Firefox · Linux');
  assert.ok(fox && !fox.current);
  const r = await fetch(base + '/api/me/sessions/' + fox.id, { method: 'DELETE', headers: { cookie: aChrome } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await meOk(aFirefox), false, 'firefox 会话应失效');
  assert.strictEqual(await meOk(aChrome), true, '当前会话仍有效');
  assert.strictEqual((await listSessions(aChrome)).length, 2);
});

test('不能踢别人的会话', async () => {
  const bobSessions = await listSessions(bobCookie);
  const bobId = bobSessions[0].id;
  await fetch(base + '/api/me/sessions/' + bobId, { method: 'DELETE', headers: { cookie: aChrome } });   // alice 试踢 bob
  assert.strictEqual(await meOk(bobCookie), true, 'bob 会话不该被别人踢掉');
});

test('退出其它所有设备：只留当前', async () => {
  const r = await fetch(base + '/api/me/sessions/revoke-others', { method: 'POST', headers: { cookie: aChrome } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await meOk(aSafari), false, 'safari 会话应被踢');
  assert.strictEqual(await meOk(aChrome), true, '当前仍有效');
  const ss = await listSessions(aChrome);
  assert.strictEqual(ss.length, 1);
  assert.strictEqual(ss[0].current, true);
});
