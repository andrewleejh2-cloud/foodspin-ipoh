const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-site-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
// 预置一个已发布站点的卖家（seller），密码已知
const seller = {
  id: crypto.randomUUID(), username: 'seller1', usernameLower: 'seller1',
  salt, passHash: hashPassword('pass123', salt),
  phone: '012-111 1111', phoneWa: '60121111111', state: 'Johor', city: 'JB', createdAt: Date.now(),
  site: { published: true, title: '牛肉面店', theme: 'warm' }
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [seller], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server, sellerCookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'seller1', password: 'pass123' })
  });
  sellerCookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

test('已发布站点 payload 含新字段、默认为空', async () => {
  const r = await fetch(base + '/api/site/seller1');
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.strictEqual(j.title, '牛肉面店');
  assert.strictEqual(j.accent, '');
  assert.strictEqual(j.announce, '');
  assert.deepStrictEqual(j.photos, []);
  assert.deepStrictEqual(j.sections, {});
  assert.strictEqual(j.slug, '');
});

async function patchSite(cookie, body) {
  return fetch(base + '/api/me/site', {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body)
  });
}

test('slug 合法则保存、大写/空格归一化为小写', async () => {
  const r = await patchSite(sellerCookie, { slug: '  Beef-Noodle  ' });
  assert.strictEqual(r.status, 200);
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.slug, 'beef-noodle');
});

test('slug 太短 → 400 bad_slug 且不落盘', async () => {
  const r = await patchSite(sellerCookie, { slug: 'ab', title: '不该被保存' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'bad_slug');
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.title, '牛肉面店');      // title 未被这次请求改动
  assert.strictEqual(g.slug, 'beef-noodle');    // slug 仍是上一次的
});

test('slug 保留词 → 400 reserved_slug', async () => {
  const r = await patchSite(sellerCookie, { slug: 'admin' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'reserved_slug');
});

test('slug 空串 → 清空', async () => {
  await patchSite(sellerCookie, { slug: '' });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.slug, '');
  await patchSite(sellerCookie, { slug: 'beef-noodle' });   // 复原给后续测试用
});

test('accent 合法 hex 存、非法忽略、空清空', async () => {
  await patchSite(sellerCookie, { accent: '#12ab34' });
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '#12ab34');
  await patchSite(sellerCookie, { accent: 'red' });         // 非法 → 忽略，保持上一个
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '#12ab34');
  await patchSite(sellerCookie, { accent: '' });            // 空 → 清空
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).accent, '');
});

test('announce 超长截断到 200', async () => {
  await patchSite(sellerCookie, { announce: 'x'.repeat(500) });
  assert.strictEqual((await (await fetch(base + '/api/site/seller1')).json()).announce.length, 200);
});

test('photos 只收 /uploads/、超 20 截断', async () => {
  const arr = Array.from({ length: 25 }, (_, i) => ({ url: '/uploads/p' + i + '.jpg' }));
  arr.push({ url: 'https://evil.com/x.jpg' });
  await patchSite(sellerCookie, { photos: arr });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.photos.length, 20);
  assert.ok(g.photos.every(p => p.url.startsWith('/uploads/')));
});

test('sections 只认白名单键、值转布尔', async () => {
  await patchSite(sellerCookie, { sections: { menu: false, hacker: true, gallery: 'yes' } });
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.sections.menu, false);
  assert.ok(!('hacker' in g.sections));
  assert.ok(!('gallery' in g.sections));   // 非布尔值被丢弃
});

test('slug 跨用户冲突 → 400 slug_taken 且不落盘', async () => {
  const rr = await fetch(base + '/api/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'seller2', password: 'pass123', phone: '012-222 2222', state: 'Johor' })
  });
  assert.strictEqual(rr.status, 200);
  const seller2Cookie = rr.headers.get('set-cookie').split(';')[0];

  const s1 = await patchSite(seller2Cookie, { slug: 'popular-shop' });
  assert.strictEqual(s1.status, 200);

  const r = await patchSite(sellerCookie, { slug: 'popular-shop' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'slug_taken');
  const g = await (await fetch(base + '/api/site/seller1')).json();
  assert.strictEqual(g.slug, 'beef-noodle');   // slug 未被改成被占用的值
});
