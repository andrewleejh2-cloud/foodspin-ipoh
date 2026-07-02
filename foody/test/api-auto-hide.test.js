const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 多人举报自动隐藏：种子 1 个管理员 + 1 个作者 + 5 个举报人 + 2 个帖子（POST2 预置 1 条系统举报）
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-autohide-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(name, pw) { const salt = crypto.randomBytes(16).toString('hex'); return { id: crypto.randomUUID(), username: name, usernameLower: name.toLowerCase(), salt, passHash: H(pw, salt), phone: '012-000 0000', phoneWa: '6012' + Math.floor(1e7 + Math.random() * 8e7), state: 'Johor', city: 'JB', createdAt: Date.now() }; }

const admin = mk('modadmin', 'admin123');
const author = mk('author1', 'pass123');
const reporters = [1, 2, 3, 4, 5].map(i => mk('rep' + i, 'pass123'));
const now = Date.now();
const post1 = { id: 'POST1', userId: author.id, mediaUrl: '/seed/x.svg', mediaType: 'image', media: [{ url: '/seed/x.svg', type: 'image' }], caption: 'p1', tags: [], state: 'Johor', city: 'JB', createdAt: now };
const post2 = { id: 'POST2', userId: author.id, mediaUrl: '/seed/y.svg', mediaType: 'image', media: [{ url: '/seed/y.svg', type: 'image' }], caption: 'p2', tags: [], state: 'Johor', city: 'JB', createdAt: now };
const sysReport = { id: crypto.randomUUID(), type: 'post', targetId: 'POST2', ownerId: author.id, reporterId: 'system', reason: 'auto', note: 'matched', status: 'open', action: null, createdAt: now, resolvedAt: null, resolvedBy: null };

fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [admin, author, ...reporters], sessions: [], posts: [post1, post2],
  comments: [], likes: [], saves: [], messages: [], follows: [], reports: [sysReport], modActions: [], orders: []
}));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.FOODY_ADMIN = 'modadmin';
const app = require('../server');

let base, server;
const cookies = {};
async function login(name, pw) {
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: name, password: pw }) });
  return r.headers.get('set-cookie').split(';')[0];
}
async function report(cookie, targetId) {
  return fetch(base + '/api/reports', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ type: 'post', targetId, reason: 'spam' }) });
}
async function feedIds() {
  const j = await (await fetch(base + '/api/posts?limit=30')).json();
  return j.posts.map(p => p.id);
}

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  cookies.admin = await login('modadmin', 'admin123');
  for (const rp of reporters) cookies[rp.username] = await login(rp.username, 'pass123');
});
after(() => new Promise(r => server.close(r)));

test('4 个真实举报 + 1 条系统举报 → 不隐藏（系统不计、未到 5）', async () => {
  for (const i of [1, 2, 3, 4]) await report(cookies['rep' + i], 'POST2');   // 4 human + 1 seeded system = 5 total, 4 human
  const ids = await feedIds();
  assert.ok(ids.includes('POST2'), 'POST2 应仍可见（只有 4 个真实举报）');
});

test('第 5 个不同举报人 → 自动隐藏，从 feed 消失', async () => {
  for (const i of [1, 2, 3, 4]) await report(cookies['rep' + i], 'POST1');
  let ids = await feedIds();
  assert.ok(ids.includes('POST1'), 'POST1 在第 5 个举报前应可见');
  await report(cookies.rep5, 'POST1');                                       // 第 5 个
  ids = await feedIds();
  assert.ok(!ids.includes('POST1'), 'POST1 满 5 个举报后应从 feed 消失');
});

test('管理后台显示 autoHidden + reportCount', async () => {
  const j = await (await fetch(base + '/api/admin/reports?status=open', { headers: { cookie: cookies.admin } })).json();
  const row = j.reports.find(r => r.targetId === 'POST1');
  assert.ok(row, '队列里应有 POST1 的举报');
  assert.strictEqual(row.autoHidden, true);
  assert.ok(row.reportCount >= 5, 'reportCount 应 >= 5，实际 ' + row.reportCount);
});

test('管理员驳回 → 取消隐藏，POST1 回到 feed，兄弟举报一并结案', async () => {
  const open = await (await fetch(base + '/api/admin/reports?status=open', { headers: { cookie: cookies.admin } })).json();
  const one = open.reports.find(r => r.targetId === 'POST1');
  const dr = await fetch(base + '/api/admin/reports/' + one.id, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookies.admin }, body: JSON.stringify({ action: 'dismiss' }) });
  assert.strictEqual(dr.status, 200);
  const ids = await feedIds();
  assert.ok(ids.includes('POST1'), '驳回后 POST1 应恢复可见');
  const stillOpen = await (await fetch(base + '/api/admin/reports?status=open', { headers: { cookie: cookies.admin } })).json();
  assert.strictEqual(stillOpen.reports.some(r => r.targetId === 'POST1'), false, 'POST1 的其它 open 举报应一并结案');
});
