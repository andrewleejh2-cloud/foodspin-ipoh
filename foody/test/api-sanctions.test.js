const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 分级处置：临时禁言 + 警告
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-sanction-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(name, extra) { const salt = crypto.randomBytes(16).toString('hex'); return Object.assign({ id: crypto.randomUUID(), username: name, usernameLower: name.toLowerCase(), salt, passHash: H('pass123', salt), phone: '012-000 0000', phoneWa: '6012' + Math.floor(1e7 + Math.random() * 8e7), state: 'Johor', city: 'JB', createdAt: Date.now() }, extra || {}); }

const admin = mk('modadmin');
const alice = mk('alice');
const bob = mk('bob');
const carol = mk('carol', { mutedUntil: Date.now() - 1000 });   // 已过期的禁言 → 不应被拦
const dave = mk('dave');
const erin = mk('erin');
const now = Date.now();
const pBob = { id: 'PBOB', userId: bob.id, mediaUrl: '/seed/b.svg', mediaType: 'image', media: [{ url: '/seed/b.svg', type: 'image' }], caption: 'b', tags: [], state: 'Johor', city: 'JB', createdAt: now };
const pErin = { id: 'PERIN', userId: erin.id, mediaUrl: '/seed/e.svg', mediaType: 'image', media: [{ url: '/seed/e.svg', type: 'image' }], caption: 'e', tags: [], state: 'Johor', city: 'JB', createdAt: now };

fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [admin, alice, bob, carol, dave, erin], sessions: [], posts: [pBob, pErin],
  comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: []
}));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.FOODY_ADMIN = 'modadmin';
const app = require('../server');

let base, server; const ck = {};
async function login(name) {
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: name, password: 'pass123' }) });
  return r.headers.get('set-cookie').split(';')[0];
}
const J = (cookie, body) => ({ method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
async function comment(cookie, postId, text) { return fetch(base + '/api/posts/' + postId + '/comments', J(cookie, { text })); }
async function message(cookie, to, text) { return fetch(base + '/api/messages', J(cookie, { to, text })); }
async function adminMute(name, days) { return fetch(base + '/api/admin/users/' + name + '/mute', J(ck.admin, { days })); }

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  for (const u of ['modadmin', 'alice', 'bob', 'carol', 'dave', 'erin']) ck[u] = await login(u);
  ck.admin = ck.modadmin;
});
after(() => new Promise(r => server.close(r)));

test('禁言后：发帖/评论/私信被拒，浏览仍可', async () => {
  await adminMute('alice', 7);
  assert.strictEqual((await fetch(base + '/api/posts', J(ck.alice, {}))).status, 403, 'post 应 403');
  assert.strictEqual((await comment(ck.alice, 'PBOB', 'hi')).status, 403, 'comment 应 403');
  assert.strictEqual((await message(ck.alice, 'bob', 'hi')).status, 403, 'message 应 403');
  const c = await comment(ck.alice, 'PBOB', 'hi'); assert.strictEqual((await c.json()).error, 'muted');
  assert.strictEqual((await fetch(base + '/api/posts?limit=5')).status, 200, '浏览应正常');
});

test('未被禁言者照常评论；已过期禁言不拦', async () => {
  assert.strictEqual((await comment(ck.bob, 'PBOB', 'ok')).status, 200, 'bob 正常');
  assert.strictEqual((await comment(ck.carol, 'PBOB', 'ok')).status, 200, 'carol 过期禁言应放行');
});

test('不能禁言管理员', async () => {
  assert.strictEqual((await adminMute('modadmin', 7)).status, 400);
});

test('解禁后恢复发言', async () => {
  assert.strictEqual((await adminMute('alice', 0)).status, 200);
  assert.strictEqual((await comment(ck.alice, 'PBOB', 'back')).status, 200);
});

test('警告：写入 + /api/me 返回未读 + 标记已读后清空', async () => {
  const w = await fetch(base + '/api/admin/users/dave/warn', J(ck.admin, { reason: 'spam', note: '别刷屏' }));
  assert.strictEqual(w.status, 200);
  let me = await (await fetch(base + '/api/me', { headers: { cookie: ck.dave } })).json();
  assert.ok(me.warning && me.warning.reason === 'spam', '/api/me 应带未读警告');
  await fetch(base + '/api/me/warnings/seen', { method: 'POST', headers: { cookie: ck.dave } });
  me = await (await fetch(base + '/api/me', { headers: { cookie: ck.dave } })).json();
  assert.strictEqual(me.warning, null, '标记已读后应无未读警告');
});

test('举报队列动作「禁言」可禁言被举报作者', async () => {
  await fetch(base + '/api/reports', J(ck.carol, { type: 'post', targetId: 'PERIN', reason: 'spam' }));
  const q = await (await fetch(base + '/api/admin/reports?status=open', { headers: { cookie: ck.admin } })).json();
  const rep = q.reports.find(r => r.targetId === 'PERIN');
  assert.ok(rep, '应有 erin 帖的举报');
  const a = await fetch(base + '/api/admin/reports/' + rep.id, J(ck.admin, { action: 'mute' }));
  assert.strictEqual(a.status, 200);
  assert.strictEqual((await comment(ck.erin, 'PBOB', 'x')).status, 403, 'erin 被禁言后评论应 403');
});
