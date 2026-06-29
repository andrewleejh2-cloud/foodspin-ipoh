const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

// 预置一个管理员用户（已知密码），让 loadDb + applyAdmins 在启动时把它标记为管理员
// （注册接口不会自动给管理员，管理员靠 FOODY_ADMIN + 启动时 applyAdmins 生效）
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-admusers-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const adminUser = {
  id: crypto.randomUUID(),
  username: 'bossadmin', usernameLower: 'bossadmin',
  salt, passHash: hashPassword('adminpass1', salt),
  phone: '012-999 9999', phoneWa: '60129999999',
  state: 'Johor', city: 'JB', createdAt: Date.now()
};
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
  users: [adminUser], sessions: [], posts: [], comments: [], likes: [], saves: [],
  messages: [], follows: [], reports: [], modActions: [], orders: []
}));

process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.FOODY_PAY_KEY = 'test-pay-key';
process.env.FOODY_ADMIN = 'bossadmin';   // 让 applyAdmins 标记 bossadmin 为管理员
const app = require('../server');

let base, server, adminCookie, userCookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const ar = await fetch(base + '/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'bossadmin', password: 'adminpass1' })
  });
  adminCookie = ar.headers.get('set-cookie').split(';')[0];
  const ur = await fetch(base + '/api/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'normaluser', password: 'pass123', phone: '0123334444', state: 'Johor', city: 'JB' })
  });
  userCookie = ur.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

test('管理员能拿到全部用户列表', async () => {
  const r = await fetch(base + '/api/admin/users', { headers: { cookie: adminCookie } });
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.ok(Array.isArray(j.users));
  const names = j.users.map(u => u.username);
  assert.ok(names.includes('bossadmin') && names.includes('normaluser'));   // 含管理员 + 普通用户
  const admin = j.users.find(u => u.username === 'bossadmin');
  assert.strictEqual(admin.isAdmin, true);
  assert.strictEqual(typeof admin.postCount, 'number');
});

test('返回不含电话/邮箱等联系方式', async () => {
  const r = await fetch(base + '/api/admin/users', { headers: { cookie: adminCookie } });
  const j = await r.json();
  const blob = JSON.stringify(j);
  assert.strictEqual(blob.includes('0123334444'), false);    // 普通用户电话
  assert.strictEqual(blob.includes('60129999999'), false);   // 管理员 phoneWa
  for (const u of j.users) {
    assert.strictEqual('phone' in u, false);
    assert.strictEqual('phoneWa' in u, false);
    assert.strictEqual('email' in u, false);
  }
});

test('非管理员被拒（403）', async () => {
  const r = await fetch(base + '/api/admin/users', { headers: { cookie: userCookie } });
  assert.strictEqual(r.status, 403);
});

test('未登录被拒（401）', async () => {
  const r = await fetch(base + '/api/admin/users');
  assert.strictEqual(r.status, 401);
});
