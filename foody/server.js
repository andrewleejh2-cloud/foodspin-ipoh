/*
 * Foody — 大马美食分享平台 (Beta)
 * 后端：Express + JSON 文件存储（data/db.json），上传文件存 uploads/
 * 无任何付费/金钱相关功能。
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
// 数据/上传目录可用环境变量覆盖（部署到云端时指向挂载的持久磁盘，重启不丢数据）
const DATA_DIR = process.env.FOODY_DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.FOODY_UPLOAD_DIR || path.join(ROOT, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 3000;
const SESSION_DAYS = 180; // 自动登入有效期
// 生产模式（部署在 HTTPS + 反向代理后面）：Cookie 加 Secure、限流按 X-Forwarded-For 取真实 IP
const PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = PROD || process.env.TRUST_PROXY === '1';

const STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan'
];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

/* ---------------- 数据库（JSON 文件，原子写入） ---------------- */
let db;

function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

/* 自动备份：复制一份带时间戳的 db，保留最近若干份。
   万一硬盘故障 / 文件写坏，可以从 data/backups/ 里恢复。 */
const BACKUP_KEEP = 24;
function backupDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `db-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('db-') && f.endsWith('.json'))
      .sort();
    while (files.length > BACKUP_KEEP) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  } catch (e) {
    console.error('  ⚠ 备份失败:', e.message);
  }
}

/* 旧的示范帖子没有标签 → 补上，让搜索/热门标签有内容可看 */
const SEED_TAGS = {
  '/seed/nasi-lemak.svg': '#NasiLemak #JB #sambal',
  '/seed/teh-tarik.svg': '#TehTarik #mamak #RotiCanai',
  '/seed/satay.svg': '#satay #Kajang'
};

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of ['users', 'sessions', 'posts', 'comments', 'likes', 'saves']) {
      if (!Array.isArray(db[k])) db[k] = [];
    }
  } else {
    db = { users: [], sessions: [], posts: [], comments: [], likes: [], saves: [] };
    seed();
  }
  let changed = !fs.existsSync(DB_FILE);
  for (const p of db.posts) {
    if (SEED_TAGS[p.mediaUrl] && !p.caption.includes('#')) {
      p.caption += ' ' + SEED_TAGS[p.mediaUrl];
      changed = true;
    }
    if (!Array.isArray(p.tags)) { p.tags = extractTags(p.caption); changed = true; }
  }
  if (changed) saveDb();
}

/* 首次运行：建立一个示范账号 + 3 个示范帖子，让 FYP 不会是空的 */
function seed() {
  const now = Date.now();
  const salt = crypto.randomBytes(16).toString('hex');
  const demo = {
    id: crypto.randomUUID(),
    username: 'foody_demo',
    usernameLower: 'foody_demo',
    salt,
    passHash: hashPassword('foody123', salt),
    phone: '011-0000 0000',
    phoneWa: '60110000000',
    state: 'Johor',
    city: '新山 JB',
    createdAt: now
  };
  db.users.push(demo);

  const seedPosts = [
    {
      media: '/seed/nasi-lemak.svg', state: 'Johor', city: '新山 JB', age: 3,
      caption: 'JB 老街这家 nasi lemak，sambal 香到隔壁桌都探头来问 🔥 椰浆饭粒粒分明，加 RM2 的 telur mata 绝配！'
    },
    {
      media: '/seed/teh-tarik.svg', state: 'Kuala Lumpur', city: 'Brickfields', age: 2,
      caption: 'Mamak 档的 teh tarik kaw kaw ☕ 配酥到飞起的 roti canai 蘸 dhal，这就是大马人的下午茶天花板。'
    },
    {
      media: '/seed/satay.svg', state: 'Selangor', city: 'Kajang', age: 1,
      caption: 'Kajang satay 排队 40 分钟 🍢 炭香满满，蘸上厚厚的 kuah kacang 一口下去，值了！'
    }
  ];

  for (const sp of seedPosts) {
    const post = {
      id: crypto.randomUUID(),
      userId: demo.id,
      mediaUrl: sp.media,
      mediaType: 'image',
      caption: sp.caption,
      state: sp.state,
      city: sp.city,
      createdAt: now - sp.age * 86400000
    };
    db.posts.push(post);
  }

  const newest = db.posts[db.posts.length - 1];
  db.comments.push({
    id: crypto.randomUUID(),
    postId: newest.id,
    userId: demo.id,
    text: '欢迎来到 Foody！把你身边的美食发上来吧 😋 Jom share makanan sedap!',
    createdAt: now - 3600000
  });
}

/* ---------------- 工具函数 ---------------- */
function hashPassword(pw, salt) {
  return crypto.scryptSync(pw, salt, 64).toString('hex');
}

function verifyPassword(pw, salt, hash) {
  const calc = Buffer.from(hashPassword(pw, salt), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return calc.length === stored.length && crypto.timingSafeEqual(calc, stored);
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setSessionCookie(res, token, maxAgeSec) {
  const secure = PROD ? '; Secure' : ''; // HTTPS 下加 Secure，防止 Cookie 明文泄露
  res.setHeader('Set-Cookie',
    `foody_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`);
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({ token, userId, expires: Date.now() + SESSION_DAYS * 86400000 });
  // 清理过期 session
  db.sessions = db.sessions.filter(s => s.expires > Date.now());
  setSessionCookie(res, token, SESSION_DAYS * 86400);
}

function currentUser(req) {
  const token = getCookie(req, 'foody_session');
  if (!token) return null;
  const sess = db.sessions.find(s => s.token === token);
  if (!sess || sess.expires < Date.now()) return null;
  return db.users.find(u => u.id === sess.userId) || null;
}

/* 马来西亚电话号码 → WhatsApp 国际格式 (60...) */
function normPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (/^60\d{8,11}$/.test(d)) return d;
  if (/^0\d{8,10}$/.test(d)) return '6' + d;
  return null;
}

function pubUser(u) {
  return { id: u.id, username: u.username, phone: u.phone, state: u.state, city: u.city };
}

/* 从文案抽出 #标签（支持中文），统一小写存储 */
function extractTags(caption) {
  const tags = new Set();
  const re = /#([\p{L}\p{N}_]{1,30})/gu;
  let m;
  while ((m = re.exec(String(caption || ''))) !== null) tags.add(m[1].toLowerCase());
  return [...tags].slice(0, 10);
}

/* 关键词是否命中帖子（文案/地区/作者/标签） */
function matchQ(p, q) {
  const author = db.users.find(u => u.id === p.userId);
  const hay = [
    p.caption, p.state, p.city,
    author ? author.username : '',
    (p.tags || []).join(' ')
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function postJson(p, viewer) {
  const author = db.users.find(u => u.id === p.userId);
  const likes = db.likes.filter(l => l.postId === p.id);
  const saves = db.saves.filter(s => s.postId === p.id);
  const commentCount = db.comments.filter(c => c.postId === p.id).length;
  return {
    id: p.id,
    username: author ? author.username : '???',
    mine: !!(viewer && viewer.id === p.userId),
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    caption: p.caption,
    state: p.state,
    city: p.city,
    createdAt: p.createdAt,
    likeCount: likes.length,
    saveCount: saves.length,
    commentCount,
    likedByMe: !!(viewer && likes.some(l => l.userId === viewer.id)),
    savedByMe: !!(viewer && saves.some(s => s.userId === viewer.id)),
    // 电话/WhatsApp 只给已登入的用户（保护隐私 + 符合“注册后才能用 WhatsApp 按钮”）
    waUrl: viewer && author && author.phoneWa ? `https://wa.me/${author.phoneWa}` : null
  };
}

/* ---------------- 上传设置 ---------------- */
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 最大 150MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const okType = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (okType && (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext))) cb(null, true);
    else cb(new Error('bad_file'));
  }
}).single('media');

/* ---------------- App ---------------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

/* 安全响应头（手写，不引入额外依赖）。CSP 允许 Google Fonts 与同源资源。 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self'",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  next();
});

/* 健康检查：给监控 / 部署平台探活用 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, users: db.users.length, posts: db.posts.length, uptime: Math.round(process.uptime()) });
});

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'auth' });
  req.user = user;
  next();
}

/* 取真实客户端 IP：部署在反向代理 / CDN 后面时读 X-Forwarded-For */
function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '?';
}

/* 登录防爆破：每个 IP 10 分钟内最多错 20 次 */
const loginFails = new Map();
function tooManyFails(ip) {
  const rec = loginFails.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.t > 600000) { loginFails.delete(ip); return false; }
  return rec.n >= 20;
}
function recordFail(ip) {
  const rec = loginFails.get(ip);
  if (rec && Date.now() - rec.t <= 600000) rec.n++;
  else loginFails.set(ip, { n: 1, t: Date.now() });
}

/* 通用限流中间件：windowMs 时间窗内每个 IP 最多 max 次（防刷注册 / 发帖 / 留言） */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const ip = clientIp(req);
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now - rec.t > windowMs) hits.set(ip, { n: 1, t: now });
    else if (rec.n >= max) return res.status(429).json({ error: 'too_many' });
    else rec.n++;
    if (hits.size > 5000) { // 顺手清理过期项，避免 Map 无限增长
      for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
    }
    next();
  };
}
const registerLimit = rateLimit({ windowMs: 3600000, max: 10 }); // 每 IP 每小时最多注册 10 个
const postLimit = rateLimit({ windowMs: 600000, max: 30 });      // 每 IP 每 10 分钟最多发 30 帖
const commentLimit = rateLimit({ windowMs: 600000, max: 60 });   // 每 IP 每 10 分钟最多 60 条留言

/* ---- 账号 ---- */
app.post('/api/register', registerLimit, (req, res) => {
  const { username, password, phone, state, city } = req.body || {};
  if (!username || !password || !phone || !state) return res.status(400).json({ error: 'missing' });

  const name = String(username).trim();
  if (!/^[\p{L}\p{N}_]{2,20}$/u.test(name)) return res.status(400).json({ error: 'bad_username' });
  if (String(password).length < 6) return res.status(400).json({ error: 'bad_password' });

  const phoneWa = normPhone(phone);
  if (!phoneWa) return res.status(400).json({ error: 'bad_phone' });
  if (!STATES.includes(state)) return res.status(400).json({ error: 'bad_state' });

  if (db.users.some(u => u.usernameLower === name.toLowerCase())) {
    return res.status(409).json({ error: 'username_taken' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: crypto.randomUUID(),
    username: name,
    usernameLower: name.toLowerCase(),
    salt,
    passHash: hashPassword(String(password), salt),
    phone: String(phone).trim().slice(0, 20),
    phoneWa,
    state,
    city: String(city || '').trim().slice(0, 30),
    createdAt: Date.now()
  };
  db.users.push(user);
  createSession(res, user.id);
  saveDb();
  res.json({ user: pubUser(user) });
});

app.post('/api/login', (req, res) => {
  const ip = clientIp(req);
  if (tooManyFails(ip)) return res.status(429).json({ error: 'too_many' });

  const { username, password } = req.body || {};
  const user = db.users.find(u => u.usernameLower === String(username || '').trim().toLowerCase());
  if (!user || !verifyPassword(String(password || ''), user.salt, user.passHash)) {
    recordFail(ip);
    return res.status(401).json({ error: 'bad_login' });
  }
  createSession(res, user.id);
  saveDb();
  res.json({ user: pubUser(user) });
});

app.post('/api/logout', (req, res) => {
  const token = getCookie(req, 'foody_session');
  if (token) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb();
  }
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? pubUser(user) : null, states: STATES });
});

/* ---- 帖子 ---- */
app.get('/api/posts', (req, res) => {
  const viewer = currentUser(req);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 8));
  const state = req.query.state || '';
  const savedOnly = req.query.saved === '1';
  const tag = String(req.query.tag || '').trim().toLowerCase();
  const userQ = String(req.query.user || '').trim().toLowerCase();
  const q = String(req.query.q || '').trim().toLowerCase();

  if (savedOnly && !viewer) return res.status(401).json({ error: 'auth' });

  let posts = [...db.posts].sort((a, b) => b.createdAt - a.createdAt);
  if (state && STATES.includes(state)) posts = posts.filter(p => p.state === state);
  if (savedOnly) {
    const savedIds = new Set(db.saves.filter(s => s.userId === viewer.id).map(s => s.postId));
    posts = posts.filter(p => savedIds.has(p.id));
  }
  if (tag) posts = posts.filter(p => (p.tags || []).includes(tag));
  if (userQ) {
    const u = db.users.find(x => x.usernameLower === userQ);
    posts = u ? posts.filter(p => p.userId === u.id) : [];
  }
  if (q) posts = posts.filter(p => matchQ(p, q));

  /* start=帖子ID：从该帖子开始返回（搜索结果点进 feed 用） */
  let offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  if (req.query.start && req.query.offset === undefined) {
    const i = posts.findIndex(p => p.id === req.query.start);
    if (i >= 0) offset = i;
  }

  const page = posts.slice(offset, offset + limit);
  res.json({
    posts: page.map(p => postJson(p, viewer)),
    hasMore: offset + limit < posts.length,
    total: posts.length,
    offset
  });
});

/* ---- 搜索：用户 / 美食帖子 / 标签；空关键词 = 热门标签 ---- */
app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().replace(/^[#@]/, '');

  const tagCount = new Map();
  for (const p of db.posts) {
    for (const tg of (p.tags || [])) tagCount.set(tg, (tagCount.get(tg) || 0) + 1);
  }
  const allTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);

  if (!q) {
    return res.json({
      q: '',
      tags: allTags.slice(0, 12).map(([tag, count]) => ({ tag, count })),
      users: [],
      posts: []
    });
  }

  const tags = allTags
    .filter(([tg]) => tg.includes(q))
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  /* 用户：只给公开资料（用户名/地区/帖子数），不带电话 */
  const users = db.users
    .filter(u => u.usernameLower.includes(q))
    .slice(0, 8)
    .map(u => ({
      username: u.username,
      state: u.state,
      city: u.city,
      postCount: db.posts.filter(p => p.userId === u.id).length
    }));

  const posts = [...db.posts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter(p => matchQ(p, q))
    .slice(0, 18)
    .map(p => {
      const author = db.users.find(u => u.id === p.userId);
      return {
        id: p.id,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        state: p.state,
        city: p.city,
        username: author ? author.username : '???',
        likeCount: db.likes.filter(l => l.postId === p.id).length
      };
    });

  res.json({ q, tags, users, posts });
});

app.post('/api/posts', requireAuth, postLimit, (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 'file_too_big' : 'bad_file';
      return res.status(400).json({ error: code });
    }
    const cleanup = () => { if (req.file) fs.unlink(req.file.path, () => {}); };

    if (!req.file) return res.status(400).json({ error: 'bad_file' });
    const { caption, state, city } = req.body || {};
    if (!state || !STATES.includes(state)) { cleanup(); return res.status(400).json({ error: 'bad_state' }); }

    const ext = path.extname(req.file.filename).toLowerCase();
    const mediaType = (req.file.mimetype.startsWith('video/') || VIDEO_EXT.has(ext)) ? 'video' : 'image';

    const cleanCaption = String(caption || '').trim().slice(0, 500);
    const post = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      mediaUrl: '/uploads/' + req.file.filename,
      mediaType,
      caption: cleanCaption,
      tags: extractTags(cleanCaption),
      state,
      city: String(city || '').trim().slice(0, 30),
      createdAt: Date.now()
    };
    db.posts.push(post);
    saveDb();
    res.json({ post: postJson(post, req.user) });
  });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (post.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

  // 删除上传的媒体文件（示范帖子的 /seed/ 文件不删）
  if (post.mediaUrl.startsWith('/uploads/')) {
    const file = path.join(UPLOAD_DIR, path.basename(post.mediaUrl));
    fs.unlink(file, () => {});
  }
  db.posts = db.posts.filter(p => p.id !== post.id);
  db.likes = db.likes.filter(l => l.postId !== post.id);
  db.saves = db.saves.filter(s => s.postId !== post.id);
  db.comments = db.comments.filter(c => c.postId !== post.id);
  saveDb();
  res.json({ ok: true });
});

/* ---- 点赞 / 收藏 ---- */
function toggle(list, postId, userId) {
  const i = list.findIndex(x => x.postId === postId && x.userId === userId);
  if (i >= 0) { list.splice(i, 1); return false; }
  list.push({ postId, userId, createdAt: Date.now() });
  return true;
}

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  const liked = toggle(db.likes, post.id, req.user.id);
  saveDb();
  res.json({ liked, likeCount: db.likes.filter(l => l.postId === post.id).length });
});

app.post('/api/posts/:id/save', requireAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  const saved = toggle(db.saves, post.id, req.user.id);
  saveDb();
  res.json({ saved, saveCount: db.saves.filter(s => s.postId === post.id).length });
});

/* ---- 留言 ---- */
app.get('/api/posts/:id/comments', (req, res) => {
  const viewer = currentUser(req);
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  const comments = db.comments
    .filter(c => c.postId === post.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(c => {
      const u = db.users.find(x => x.id === c.userId);
      return {
        id: c.id,
        username: u ? u.username : '???',
        text: c.text,
        createdAt: c.createdAt,
        mine: !!(viewer && viewer.id === c.userId)
      };
    });
  res.json({ comments });
});

app.post('/api/posts/:id/comments', requireAuth, commentLimit, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  const text = String((req.body || {}).text || '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ error: 'missing' });
  const comment = { id: crypto.randomUUID(), postId: post.id, userId: req.user.id, text, createdAt: Date.now() };
  db.comments.push(comment);
  saveDb();
  res.json({
    comment: { id: comment.id, username: req.user.username, text, createdAt: comment.createdAt, mine: true },
    commentCount: db.comments.filter(c => c.postId === post.id).length
  });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.comments.find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'not_found' });
  if (comment.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  db.comments = db.comments.filter(c => c.id !== comment.id);
  saveDb();
  res.json({ ok: true, commentCount: db.comments.filter(c => c.postId === comment.postId).length });
});

/* ---- 静态文件 ---- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

/* ---------------- 启动 ---------------- */
loadDb();
backupDb();                          // 启动时先备份一份
setInterval(backupDb, 6 * 3600000);  // 之后每 6 小时自动备份
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🍜 Foody (Beta) 已启动!');
  console.log('  ----------------------------------------');
  console.log(`  本机访问:        http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  手机(同一WiFi):  http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('  ----------------------------------------');
  console.log(`  自动备份: 每6小时一次, 保留最近${BACKUP_KEEP}份`);
  if (PROD) console.log('  模式: 生产 (HTTPS Secure Cookie 已开启)');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('');
});
