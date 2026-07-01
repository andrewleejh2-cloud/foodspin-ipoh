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
