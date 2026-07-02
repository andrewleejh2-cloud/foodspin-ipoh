const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-sitequal-'));
const dataDir = path.join(tmp, 'data');
const uploadDir = path.join(tmp, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const seller = {
  id: crypto.randomUUID(), username: 'qseller', usernameLower: 'qseller',
  salt, passHash: hashPassword('pass123', salt),
  phone: '012-555 1111', phoneWa: '60125551111', state: 'Johor', city: 'JB', createdAt: Date.now(),
  // 脏 sections 直接写进库（模拟未来某条不走 PATCH 的写路径）
  site: { published: true, title: '质检店', sections: { menu: false, hacker: true, gallery: 'yes' } }
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [seller], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = uploadDir;
const app = require('../server');

let base, server, cookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'qseller', password: 'pass123' })
  });
  cookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

async function patchSite(body) {
  return fetch(base + '/api/me/site', {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body)
  });
}
function mkUpload(name) { fs.writeFileSync(path.join(uploadDir, name), 'x'); return '/uploads/' + name; }
function exists(name) { return fs.existsSync(path.join(uploadDir, name)); }
// unlink 是异步 fire-and-forget，轮询等它落地
async function waitGone(name, ms = 800) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (!exists(name)) return true; await new Promise(r => setTimeout(r, 40)); }
  return !exists(name);
}

test('sections 纵深防御：库里的脏键不出现在 payload', async () => {
  const j = await (await fetch(base + '/api/site/qseller')).json();
  assert.deepStrictEqual(j.sections, { menu: false });   // hacker/非布尔 gallery 被过滤
});

test('孤儿清理：被移除的菜单图/相册图文件被删，保留的还在', async () => {
  const m1 = mkUpload('m1.jpg'), m2 = mkUpload('m2.jpg'), p1 = mkUpload('p1.jpg');
  let r = await patchSite({
    menu: [{ name: '主食', items: [
      { name: 'A', price: 'RM1', photo: m1 },
      { name: 'B', price: 'RM2', photo: m2 }
    ] }],
    photos: [{ url: p1 }]
  });
  assert.strictEqual(r.status, 200);
  // 移除 m1 与 p1，保留 m2
  r = await patchSite({
    menu: [{ name: '主食', items: [{ name: 'B', price: 'RM2', photo: m2 }] }],
    photos: []
  });
  assert.strictEqual(r.status, 200);
  assert.ok(await waitGone('m1.jpg'), 'm1 应被清理');
  assert.ok(await waitGone('p1.jpg'), 'p1 应被清理');
  assert.ok(exists('m2.jpg'), 'm2 仍被引用、不能删');
});

test('PATCH 不带 menu/photos 字段时不清理', async () => {
  const m3 = mkUpload('m3.jpg');
  await patchSite({ menu: [{ name: '主食', items: [{ name: 'C', price: 'RM3', photo: m3 }] }] });
  const r = await patchSite({ title: '只改标题' });
  assert.strictEqual(r.status, 200);
  await new Promise(r2 => setTimeout(r2, 150));
  assert.ok(exists('m3.jpg'), '没动 menu 就不该清理');
});

test('slug 400 拒绝路径不触发清理', async () => {
  const r = await patchSite({ slug: 'ab', menu: [], photos: [] });   // slug 非法 → 整个 PATCH 拒绝
  assert.strictEqual(r.status, 400);
  await new Promise(r2 => setTimeout(r2, 150));
  assert.ok(exists('m3.jpg'), '被拒的 PATCH 不能清文件');
});
