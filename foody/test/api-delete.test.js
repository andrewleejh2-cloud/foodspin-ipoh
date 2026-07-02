const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 账号注销：连带清理。种子 alice/bob/carol + 帖子/评论/赞/关注/私信/举报
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-del-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(name) { const salt = crypto.randomBytes(16).toString('hex'); return { id: crypto.randomUUID(), username: name, usernameLower: name.toLowerCase(), salt, passHash: H('pass123', salt), phone: '01' + Math.floor(1e8 + Math.random() * 8e8), phoneWa: '60' + Math.floor(1e9 + Math.random() * 8e9), state: 'Johor', city: 'JB', createdAt: Date.now() }; }
const alice = mk('alice'), bob = mk('bob'), carol = mk('carol');
const now = Date.now();
const pAlice = { id: 'PA', userId: alice.id, mediaUrl: '/seed/a.svg', mediaType: 'image', media: [{ url: '/seed/a.svg', type: 'image' }], caption: 'alice post', tags: [], state: 'Johor', city: 'JB', createdAt: now };
const pBob = { id: 'PB', userId: bob.id, mediaUrl: '/seed/b.svg', mediaType: 'image', media: [{ url: '/seed/b.svg', type: 'image' }], caption: 'bob post', tags: [], state: 'Johor', city: 'JB', createdAt: now };
const db = {
  users: [alice, bob, carol], sessions: [], posts: [pAlice, pBob],
  comments: [{ id: 'c1', postId: 'PB', userId: alice.id, text: 'alice on bob', createdAt: now }, { id: 'c2', postId: 'PA', userId: bob.id, text: 'bob on alice', createdAt: now }],
  likes: [{ postId: 'PB', userId: alice.id, createdAt: now }, { postId: 'PA', userId: carol.id, createdAt: now }],
  saves: [{ postId: 'PB', userId: alice.id, createdAt: now }],
  follows: [{ followerId: alice.id, followingId: bob.id, createdAt: now }, { followerId: carol.id, followingId: alice.id, createdAt: now }],
  messages: [{ id: 'm1', fromId: alice.id, toId: bob.id, text: 'hi bob', createdAt: now, readAt: null }],
  reports: [{ id: 'r1', type: 'post', targetId: 'PB', ownerId: bob.id, reporterId: alice.id, reason: 'spam', status: 'open', action: null, createdAt: now }], modActions: [], orders: []
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server, aliceCookie;
const J = (b, cookie) => ({ method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: JSON.stringify(b) });
const login = async (u) => (await fetch(base + '/api/login', J({ username: u, password: 'pass123' }))).headers.get('set-cookie').split(';')[0];
const feedIds = async () => (await (await fetch(base + '/api/posts?limit=30')).json()).posts.map(p => p.id);
const meOk = async (cookie) => !!(await (await fetch(base + '/api/me', { headers: { cookie } })).json()).user;

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  aliceCookie = await login('alice');
});
after(() => new Promise(r => server.close(r)));

test('密码错 → 400，账号还在', async () => {
  const r = await fetch(base + '/api/me/delete', J({ password: 'WRONG' }, aliceCookie));
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await fetch(base + '/api/users/alice')).status, 200);
});

test('密码对 → 删除成功，连带清理彻底', async () => {
  const r = await fetch(base + '/api/me/delete', J({ password: 'pass123' }, aliceCookie));
  assert.strictEqual(r.status, 200);

  // 用户没了 + 当前会话失效
  assert.strictEqual((await fetch(base + '/api/users/alice')).status, 404, 'alice 主页应 404');
  assert.strictEqual(await meOk(aliceCookie), false, 'alice 会话应失效');

  // alice 的帖子从 feed 消失；bob 的帖子还在
  const ids = await feedIds();
  assert.ok(!ids.includes('PA'), 'alice 帖应没了');
  assert.ok(ids.includes('PB'), 'bob 帖应还在');

  // alice 在 bob 帖下的评论没了
  const comments = (await (await fetch(base + '/api/posts/PB/comments')).json()).comments;
  assert.strictEqual(comments.some(c => c.id === 'c1'), false, 'alice 的评论应清掉');

  // 关注关系清掉：bob 的粉丝数应为 0（alice 关注 bob 已删）
  const bobProfile = await (await fetch(base + '/api/users/bob')).json();
  assert.strictEqual(bobProfile.stats.followerCount, 0, 'alice→bob 关注应清掉');

  // bob 仍在
  assert.strictEqual((await fetch(base + '/api/users/bob')).status, 200);
});
