const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 拉黑：相互不可见 + 不可互动。种子 alice/bob/carol + 各一帖 + alice→bob 关注
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-block-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(n) { const salt = crypto.randomBytes(16).toString('hex'); return { id: crypto.randomUUID(), username: n, usernameLower: n.toLowerCase(), salt, passHash: H('pass123', salt), phone: '01' + Math.floor(1e8 + Math.random() * 8e8), phoneWa: '60' + Math.floor(1e9 + Math.random() * 8e9), state: 'Johor', city: 'JB', createdAt: Date.now() }; }
const alice = mk('alice'), bob = mk('bob'), carol = mk('carol');
const now = Date.now();
const post = (id, u) => ({ id, userId: u.id, mediaUrl: '/seed/x.svg', mediaType: 'image', media: [{ url: '/seed/x.svg', type: 'image' }], caption: id, tags: [], state: 'Johor', city: 'JB', createdAt: now });
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [alice, bob, carol], sessions: [], posts: [post('PA', alice), post('PB', bob), post('PC', carol)],
  comments: [], likes: [{ postId: 'PA', userId: bob.id, createdAt: now - 1000 }], saves: [],
  messages: [{ id: 'm0', fromId: bob.id, toId: alice.id, text: 'old msg', createdAt: now - 1000, readAt: null }],
  follows: [{ followerId: alice.id, followingId: bob.id, createdAt: now }], reports: [], modActions: [], orders: []
}));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server; const ck = {};
const J = (b, cookie) => ({ method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: JSON.stringify(b) });
const login = async (u) => (await fetch(base + '/api/login', J({ username: u, password: 'pass123' }))).headers.get('set-cookie').split(';')[0];
const feedIds = async (cookie) => (await (await fetch(base + '/api/posts?limit=30', { headers: cookie ? { cookie } : {} })).json()).posts.map(p => p.id);
const block = (cookie, u) => fetch(base + '/api/users/' + u + '/block', { method: 'POST', headers: { cookie } });
const dm = (cookie, to) => fetch(base + '/api/messages', J({ to, text: 'hi' }, cookie));
const userView = async (cookie, u) => (await fetch(base + '/api/users/' + u, { headers: { cookie } })).json();

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  ck.alice = await login('alice'); ck.bob = await login('bob'); ck.carol = await login('carol');
});
after(() => new Promise(r => server.close(r)));

test('拉黑前：alice 能看到 bob 的帖', async () => {
  assert.ok((await feedIds(ck.alice)).includes('PB'));
});

test('拉黑后：相互从 feed 消失，第三者不受影响', async () => {
  const r = await block(ck.alice, 'bob');
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).blocked, true);
  assert.ok(!(await feedIds(ck.alice)).includes('PB'), 'alice 不该看到 bob');
  assert.ok(!(await feedIds(ck.bob)).includes('PA'), 'bob 不该看到 alice（相互）');
  assert.ok((await feedIds(ck.carol)).includes('PB'), 'carol 不受影响');
});

test('拉黑后不能互相私信', async () => {
  assert.strictEqual((await dm(ck.alice, 'bob')).status, 403);
  assert.strictEqual((await dm(ck.bob, 'alice')).status, 403);
  assert.strictEqual((await dm(ck.carol, 'bob')).status, 200);
});

test('拉黑后：通知和收件箱里不再出现 ta', async () => {
  const notifs = (await (await fetch(base + '/api/notifications', { headers: { cookie: ck.alice } })).json()).notifications;
  assert.strictEqual(notifs.some(n => n.username === 'bob'), false, '通知里不该有 bob 的赞');
  const convos = (await (await fetch(base + '/api/conversations', { headers: { cookie: ck.alice } })).json()).conversations;
  assert.strictEqual(convos.some(c => c.username === 'bob'), false, '收件箱里不该有和 bob 的会话');
});

test('拉黑解除了现有关注，且不能再关注', async () => {
  const bobP = await userView(ck.carol, 'bob');
  assert.strictEqual(bobP.stats.followerCount, 0, 'alice→bob 关注应被解除');
  assert.strictEqual((await fetch(base + '/api/users/bob/follow', { method: 'POST', headers: { cookie: ck.alice } })).status, 403);
});

test('/api/users 显示 blocked；取消拉黑后恢复可见', async () => {
  assert.strictEqual((await userView(ck.alice, 'bob')).blocked, true);
  const r = await block(ck.alice, 'bob');   // 再点一次 = 取消
  assert.strictEqual((await r.json()).blocked, false);
  assert.ok((await feedIds(ck.alice)).includes('PB'), '取消拉黑后应重新看到 bob');
  assert.strictEqual((await userView(ck.alice, 'bob')).blocked, false);
});
