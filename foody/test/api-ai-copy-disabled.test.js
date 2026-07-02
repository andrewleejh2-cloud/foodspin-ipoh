const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs'); const crypto = require('crypto');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foody-ainokey-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir, { recursive: true });
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
const salt = crypto.randomBytes(16).toString('hex');
const u = { id: crypto.randomUUID(), username: 'nokey', usernameLower: 'nokey', salt, passHash: hashPassword('pass123', salt), phone: '012-321 4321', phoneWa: '60123214321', state: 'Johor', city: 'JB', createdAt: Date.now(), site: { published: true, title: '无钥店' } };
fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [u], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [] }));
process.env.FOODY_DATA_DIR = dataDir;
process.env.FOODY_UPLOAD_DIR = path.join(tmp, 'uploads');
delete process.env.FOODY_GEMINI_KEY;               // 明确无 key
const app = require('../server');

let base, server, cookie;
before(async () => {
  await new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); });
  const lr = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'nokey', password: 'pass123' }) });
  cookie = lr.headers.get('set-cookie').split(';')[0];
});
after(() => new Promise(r => server.close(r)));

test('无 key：端点 503 ai_disabled', async () => {
  const r = await fetch(base + '/api/me/site/ai-copy', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}' });
  assert.strictEqual(r.status, 503);
  assert.strictEqual((await r.json()).error, 'ai_disabled');
});

test('无 key：本人 payload aiReady 为 false', async () => {
  const mine = await (await fetch(base + '/api/site/nokey', { headers: { cookie } })).json();
  assert.strictEqual(mine.aiReady, false);
});
