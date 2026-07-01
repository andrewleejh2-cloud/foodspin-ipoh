const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 货架预定。种子：sellerA(有货架+开预定) / sellerX(有货架、没开) / buyerB / buyerC(被 sellerA 拉黑)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-resv-'));
const dataDir = path.join(tmp, 'data'); fs.mkdirSync(dataDir, { recursive: true });
function H(pw, s) { return crypto.scryptSync(pw, s, 64).toString('hex'); }
function mk(n, extra) { const salt = crypto.randomBytes(16).toString('hex'); return Object.assign({ id: crypto.randomUUID(), username: n, usernameLower: n.toLowerCase(), salt, passHash: H('pass123', salt), phone: '01' + Math.floor(1e8 + Math.random() * 8e8), phoneWa: '60' + Math.floor(1e9 + Math.random() * 8e9), state: 'Johor', city: 'JB', createdAt: Date.now() }, extra || {}); }
const shelf = [{ name: 'Kuih', price: 'RM5' }, { name: 'Sold', price: 'RM3', soldOut: true }];
const sellerA = mk('sellera', { shelf, shelfPickup: true });
const sellerX = mk('sellerx', { shelf, shelfPickup: false });
const buyerB = mk('buyerb'), buyerC = mk('buyerc');
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [sellerA, sellerX, buyerB, buyerC], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [], blocks: [{ blockerId: sellerA.id, blockedId: buyerC.id, createdAt: Date.now() }], reservations: []
}));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
const app = require('../server');

let base, server; const ck = {};
const J = (b, cookie, method) => ({ method: method || 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: JSON.stringify(b) });
const login = async (u) => (await fetch(base + '/api/login', J({ username: u, password: 'pass123' }))).headers.get('set-cookie').split(';')[0];
const reserve = (cookie, body) => fetch(base + '/api/reservations', J(body, cookie));
const myResv = async (cookie) => (await (await fetch(base + '/api/me/reservations', { headers: { cookie } })).json()).reservations;
const pickup = Date.now() + 2 * 86400000;

before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  for (const u of ['sellera', 'sellerx', 'buyerb', 'buyerc']) ck[u] = await login(u);
});
after(() => new Promise(r => server.close(r)));

test('买家预定 → 记一笔（价格快照）', async () => {
  const r = await reserve(ck.buyerb, { seller: 'sellera', items: [{ name: 'Kuih', qty: 2 }], pickupAt: pickup, note: '少辣' });
  assert.strictEqual(r.status, 200);
  const list = await myResv(ck.sellera);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].buyer.username, 'buyerb');
  assert.deepStrictEqual(list[0].items, [{ name: 'Kuih', price: 'RM5', qty: 2 }]);
  assert.strictEqual(list[0].pickupAt, pickup);
  assert.strictEqual(list[0].note, '少辣');
  assert.strictEqual(list[0].status, 'pending');
});

test('非卖家看不到别人的预定', async () => {
  assert.strictEqual((await myResv(ck.buyerb)).length, 0);
});

test('卖家可改状态；别人不能改', async () => {
  const id = (await myResv(ck.sellera))[0].id;
  assert.strictEqual((await fetch(base + '/api/reservations/' + id, J({ status: 'done' }, ck.sellera, 'PATCH'))).status, 200);
  assert.strictEqual((await myResv(ck.sellera))[0].status, 'done');
  assert.strictEqual((await fetch(base + '/api/reservations/' + id, J({ status: 'cancelled' }, ck.buyerb, 'PATCH'))).status, 403);
});

test('没开预定的卖家 → 404', async () => {
  assert.strictEqual((await reserve(ck.buyerb, { seller: 'sellerx', items: [{ name: 'Kuih', qty: 1 }], pickupAt: pickup })).status, 404);
});

test('只有售罄商品 → empty 400', async () => {
  const r = await reserve(ck.buyerb, { seller: 'sellera', items: [{ name: 'Sold', qty: 1 }], pickupAt: pickup });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'empty');
});

test('被拉黑的买家不能预定 → 403', async () => {
  assert.strictEqual((await reserve(ck.buyerc, { seller: 'sellera', items: [{ name: 'Kuih', qty: 1 }], pickupAt: pickup })).status, 403);
});
