/*
 * Foody — 大马美食分享平台 (Beta)
 * 后端：Express + JSON 文件存储（data/db.json），上传文件存 uploads/
 * 无任何付费/金钱相关功能。
 */
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
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
    for (const k of ['users', 'sessions', 'posts', 'comments', 'likes', 'saves', 'messages', 'follows']) {
      if (!Array.isArray(db[k])) db[k] = [];
    }
  } else {
    db = { users: [], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [] };
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
  return { id: u.id, username: u.username, phone: u.phone, state: u.state, city: u.city, bio: u.bio || '', avatar: u.avatar || null, note: u.note || '' };
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

/* ---------------- FYP 推荐算法 ----------------
   给每个帖子打分后排序：综合「新鲜度 + 热度 + 个人口味」。
   - 新鲜度：越新分越高（约 30 小时减半），让新帖有机会被看到
   - 热度：点赞/评论/收藏，收藏和评论权重更高（更代表真喜欢），用 log 压一压避免爆款一直霸屏
   - 个人化（仅登入用户）：同地区 + 你常赞的 #标签 加分；已经赞过的、你自己发的往后排
   纯文件存储、无机器学习、不碰金钱与法律。权重都可随时调。 */
function rankPosts(posts, viewer) {
  const now = Date.now();

  // 一次遍历预统计各帖互动数，避免每个帖子都全表过滤
  const likeCount = new Map(), commentCount = new Map(), saveCount = new Map();
  for (const l of db.likes) likeCount.set(l.postId, (likeCount.get(l.postId) || 0) + 1);
  for (const c of db.comments) commentCount.set(c.postId, (commentCount.get(c.postId) || 0) + 1);
  for (const s of db.saves) saveCount.set(s.postId, (saveCount.get(s.postId) || 0) + 1);

  // 登入用户的口味画像：从他点赞过的帖子统计标签偏好
  let likedTags = null, likedPostIds = null;
  if (viewer) {
    likedPostIds = new Set();
    likedTags = new Map();
    for (const l of db.likes) {
      if (l.userId !== viewer.id) continue;
      likedPostIds.add(l.postId);
      const p = db.posts.find(x => x.id === l.postId);
      if (p) for (const tg of (p.tags || [])) likedTags.set(tg, (likedTags.get(tg) || 0) + 1);
    }
  }

  const scored = posts.map(p => {
    const likes = likeCount.get(p.id) || 0;
    const comments = commentCount.get(p.id) || 0;
    const saves = saveCount.get(p.id) || 0;

    const ageHours = (now - p.createdAt) / 3600000;
    const freshness = 1 / (1 + ageHours / 30);                 // 0~1，越新越高
    const engagement = Math.log(1 + likes + 2 * comments + 2 * saves);

    let score = freshness * 2 + engagement;

    if (viewer) {
      if (p.state && p.state === viewer.state) score += 0.5;   // 同地区：本地美食更相关
      let tagBonus = 0;
      for (const tg of (p.tags || [])) if (likedTags.has(tg)) tagBonus += 0.4;
      score += Math.min(tagBonus, 1.2);                        // 口味匹配（设上限，别失衡）
      if (likedPostIds.has(p.id)) score -= 1.0;                // 已经赞过 → 往后（你看过了）
      if (p.userId === viewer.id) score -= 0.3;                // 自己的帖子稍微往后
    }

    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score || b.p.createdAt - a.p.createdAt); // 同分时新的优先
  return scored.map(s => s.p);
}

function postJson(p, viewer) {
  const author = db.users.find(u => u.id === p.userId);
  const likes = db.likes.filter(l => l.postId === p.id);
  const saves = db.saves.filter(s => s.postId === p.id);
  const commentCount = db.comments.filter(c => c.postId === p.id).length;
  return {
    id: p.id,
    username: author ? author.username : '???',
    avatar: author ? (author.avatar || null) : null,
    mine: !!(viewer && viewer.id === p.userId),
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    media: (p.media && p.media.length) ? p.media : [{ url: p.mediaUrl, type: p.mediaType }],
    caption: p.caption,
    state: p.state,
    city: p.city,
    place: p.place || '',
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
}).array('media', 9);  // 一帖最多 9 个媒体（照片/视频混排）

// 头像上传：单张图片（不收视频），上限 20MB
const avatarUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype.startsWith('image/') && IMAGE_EXT.has(ext)) cb(null, true);
    else cb(new Error('bad_file'));
  }
}).single('avatar');

// 微站封面上传：单张图片，同样的限制
const coverUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype.startsWith('image/') && IMAGE_EXT.has(ext)) cb(null, true);
    else cb(new Error('bad_file'));
  }
}).single('cover');

/* 图片压缩：自动转正方向（读 EXIF）、限制最大边长 1600px、转 JPEG、顺带去掉 EXIF
   （省空间也保护用户隐私，如拍摄地点）。美食照片常从几 MB 压到几百 KB。
   失败则保留原图，绝不因压缩出错而丢帖。GIF 跳过以保留动画。
   返回最终文件名（扩展名可能从 .png 变为 .jpg）。 */
async function compressImage(filename) {
  if (path.extname(filename).toLowerCase() === '.gif') return filename;
  const srcPath = path.join(UPLOAD_DIR, filename);
  const outName = filename.replace(/\.[^.]+$/, '.jpg');
  const outPath = path.join(UPLOAD_DIR, outName);
  const tmpPath = outPath + '.tmp';
  try {
    const before = fs.statSync(srcPath).size;
    await sharp(srcPath, { failOn: 'none' })
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tmpPath);
    fs.renameSync(tmpPath, outPath);
    if (outPath !== srcPath) fs.unlinkSync(srcPath);
    const after = fs.statSync(outPath).size;
    console.log(`[压缩] 图片 ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(2)}MB`);
    return outName;
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch {}
    console.error('[压缩] 图片压缩失败，保留原图:', e.message);
    return filename;
  }
}

/* 头像压缩：居中方形裁剪 400x400、转 JPEG、去 EXIF。失败则保留原图。 */
async function compressAvatar(filename) {
  const srcPath = path.join(UPLOAD_DIR, filename);
  const outName = filename.replace(/\.[^.]+$/, '') + '-av.jpg';
  const outPath = path.join(UPLOAD_DIR, outName);
  try {
    await sharp(srcPath, { failOn: 'none' })
      .rotate()
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outPath);
    fs.unlinkSync(srcPath);
    return outName;
  } catch (e) {
    console.error('[头像] 压缩失败，保留原图:', e.message);
    return filename;
  }
}

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
const messageLimit = rateLimit({ windowMs: 600000, max: 150 });  // 每 IP 每 10 分钟最多 150 条私信
const aiLimit = rateLimit({ windowMs: 600000, max: 12 });        // 每 IP 每 10 分钟最多 12 次 AI 生成（控成本/防滥用）

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
  // 一个电话号码只能注册一个账号（按归一化后的号码比对，不同写法视为同一个）
  if (db.users.some(u => u.phoneWa === phoneWa)) {
    return res.status(409).json({ error: 'phone_taken' });
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

/* 编辑自己的资料（目前只有简介 bio，最多 160 字） */
app.patch('/api/me', requireAuth, (req, res) => {
  const { bio, username, note } = req.body || {};
  if (typeof username === 'string') {
    const name = username.trim();
    if (!/^[\p{L}\p{N}_]{2,20}$/u.test(name)) return res.status(400).json({ error: 'bad_username' });
    const lower = name.toLowerCase();
    // 改名只改 user 记录：帖子/点赞/评论都按 userId 关联，不受影响
    if (lower !== req.user.usernameLower && db.users.some(u => u.usernameLower === lower)) {
      return res.status(409).json({ error: 'username_taken' });
    }
    req.user.username = name;
    req.user.usernameLower = lower;
  }
  if (typeof bio === 'string') req.user.bio = bio.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (typeof note === 'string') req.user.note = note.replace(/\s+/g, ' ').trim().slice(0, 80);
  saveDb();
  res.json({ user: pubUser(req.user) });
});

/* 上传/更换头像：方形压缩后存为 user.avatar，并删掉旧头像文件 */
app.post('/api/me/avatar', requireAuth, (req, res) => {
  avatarUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_big' : 'bad_file' });
    if (!req.file) return res.status(400).json({ error: 'bad_file' });
    const name = await compressAvatar(req.file.filename);
    const old = req.user.avatar;
    req.user.avatar = '/uploads/' + name;
    if (old && old.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(old)), () => {});
    saveDb();
    res.json({ user: pubUser(req.user) });
  });
});

/* ---- 个人/商业微站（一键发布的落地页）---- */
function normLink(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u.slice(0, 300);
  if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u.slice(0, 290); // 没写 http 就补 https
  return ''; // 拒绝 javascript: 等不安全协议
}

app.get('/api/site/:username', (req, res) => {
  const viewer = currentUser(req);
  const u = db.users.find(x => x.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!u) return res.status(404).json({ error: 'not_found' });
  const isMe = !!(viewer && viewer.id === u.id);
  const s = u.site || {};
  if (!s.published && !isMe) return res.status(404).json({ error: 'not_published' });
  const posts = db.posts.filter(p => p.userId === u.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)
    .map(p => ({ id: p.id, mediaUrl: p.mediaUrl, mediaType: p.mediaType }));
  res.json({
    username: u.username,
    avatar: u.avatar || null,
    isMe,
    published: !!s.published,
    cover: s.cover || null,
    title: s.title || '',
    tagline: s.tagline || '',
    intro: s.intro || '',
    hours: s.hours || '',
    address: s.address || '',
    links: s.links || [],
    mapUrl: s.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.address) : null,
    waUrl: viewer && u.phoneWa ? `https://wa.me/${u.phoneWa}` : null,
    posts
  });
});

app.patch('/api/me/site', requireAuth, (req, res) => {
  const b = req.body || {};
  const s = req.user.site || {};
  if (typeof b.title === 'string') s.title = b.title.trim().slice(0, 60);
  if (typeof b.tagline === 'string') s.tagline = b.tagline.trim().slice(0, 120);
  if (typeof b.intro === 'string') s.intro = b.intro.replace(/\r\n/g, '\n').trim().slice(0, 1000);
  if (typeof b.hours === 'string') s.hours = b.hours.replace(/\r\n/g, '\n').trim().slice(0, 300);
  if (typeof b.address === 'string') s.address = b.address.trim().slice(0, 200);
  if (Array.isArray(b.links)) {
    s.links = b.links.slice(0, 8)
      .map(l => ({ label: String(l.label || '').trim().slice(0, 30), url: normLink(l.url) }))
      .filter(l => l.label && l.url);
  }
  if (typeof b.published === 'boolean') s.published = b.published;
  req.user.site = s;
  saveDb();
  res.json({ ok: true, site: s });
});

app.post('/api/me/site/cover', requireAuth, (req, res) => {
  coverUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_big' : 'bad_file' });
    if (!req.file) return res.status(400).json({ error: 'bad_file' });
    const name = await compressImage(req.file.filename);
    const s = req.user.site || {};
    const old = s.cover;
    s.cover = '/uploads/' + name;
    req.user.site = s;
    if (old && old.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(old)), () => {});
    saveDb();
    res.json({ ok: true, cover: s.cover });
  });
});

/* AI 一键生成微站内容：用户一句需求 → 结构化网页内容。用 Google Gemini 免费档，
   key 从环境变量 FOODY_AI_KEY 读（我不碰你的 key）；没配 key 就友好报错，不影响其它功能。
   生成结果不自动保存——返回给前端填进表单，让用户确认/微调后再发布。 */
app.post('/api/me/site/generate', requireAuth, aiLimit, async (req, res) => {
  const key = process.env.FOODY_AI_KEY || '';
  if (!key) return res.status(400).json({ error: 'ai_off' });
  const prompt = String((req.body || {}).prompt || '').trim().slice(0, 600);
  if (!prompt) return res.status(400).json({ error: 'missing' });
  const model = process.env.FOODY_AI_MODEL || 'gemini-2.0-flash';
  const sys = '你在帮一位马来西亚的美食商家或个人做一个一页式微站。根据用户的描述生成 JSON：' +
    'title（店名或名字）、tagline（一句吸引人的标语）、intro（2-3 句温暖、有食欲的介绍）、' +
    'hours（营业时间，用户没提到就留空字符串）、address（地址，没提到就留空）、' +
    'links（只在用户明确给了真实网址时才填 [{label,url}]，否则空数组）。' +
    '用与用户描述相同的语言。简洁、真诚、不浮夸。用户名 @' + req.user.username + '，地区 ' + (req.user.state || '未填') + '。';
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' }, tagline: { type: 'string' }, intro: { type: 'string' },
      hours: { type: 'string' }, address: { type: 'string' },
      links: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, url: { type: 'string' } } } }
    }
  };
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.7 }
      })
    });
    if (!r.ok) { console.error('[AI] Gemini HTTP', r.status); return res.status(502).json({ error: 'ai_fail' }); }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let g = {};
    try { g = JSON.parse(text); } catch { return res.status(502).json({ error: 'ai_fail' }); }
    res.json({
      generated: {
        title: String(g.title || '').trim().slice(0, 60),
        tagline: String(g.tagline || '').trim().slice(0, 120),
        intro: String(g.intro || '').trim().slice(0, 1000),
        hours: String(g.hours || '').trim().slice(0, 300),
        address: String(g.address || '').trim().slice(0, 200),
        links: Array.isArray(g.links) ? g.links.slice(0, 8).map(l => ({ label: String(l.label || '').trim().slice(0, 30), url: normLink(l.url) })).filter(l => l.label && l.url) : []
      }
    });
  } catch (e) {
    console.error('[AI] 调用失败:', e.message);
    res.status(502).json({ error: 'ai_fail' });
  }
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
  const placeQ = String(req.query.place || '').trim().toLowerCase();
  const sort = ['new', 'following'].includes(req.query.sort) ? req.query.sort : 'hot'; // hot=推荐算法(默认), new=最新, following=只看关注的人

  if (savedOnly && !viewer) return res.status(401).json({ error: 'auth' });

  let posts = [...db.posts];
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
  if (placeQ) posts = posts.filter(p => (p.place || '').trim().toLowerCase() === placeQ);
  if (sort === 'following') {
    if (!viewer) return res.status(401).json({ error: 'auth' });
    const followingIds = new Set(db.follows.filter(f => f.followerId === viewer.id).map(f => f.followingId));
    posts = posts.filter(p => followingIds.has(p.userId));
  }

  // 排序：收藏夹 / 最新 / 关注 → 按时间；否则走推荐算法
  if (savedOnly || sort === 'new' || sort === 'following') posts.sort((a, b) => b.createdAt - a.createdAt);
  else posts = rankPosts(posts, viewer);

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
      avatar: u.avatar || null,
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

/* 用户主页（profile）：公开资料 + 统计 + 该用户的作品。
   电话不直接返回，只在已登入时给 wa.me 链接（与帖子一致的隐私规则）。 */
app.get('/api/users/:username', (req, res) => {
  const viewer = currentUser(req);
  const uname = String(req.params.username || '').trim().toLowerCase();
  const author = db.users.find(u => u.usernameLower === uname);
  if (!author) return res.status(404).json({ error: 'not_found' });

  const myPosts = db.posts
    .filter(p => p.userId === author.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const postIds = new Set(myPosts.map(p => p.id));
  const likeTotal = db.likes.reduce((n, l) => n + (postIds.has(l.postId) ? 1 : 0), 0);
  const followerCount = db.follows.reduce((n, f) => n + (f.followingId === author.id ? 1 : 0), 0);
  const followingCount = db.follows.reduce((n, f) => n + (f.followerId === author.id ? 1 : 0), 0);

  res.json({
    user: {
      username: author.username,
      avatar: author.avatar || null,
      state: author.state,
      city: author.city,
      bio: author.bio || '',
      note: author.note || '',
      createdAt: author.createdAt
    },
    stats: { postCount: myPosts.length, likeTotal, followerCount, followingCount },
    isMe: !!(viewer && viewer.id === author.id),
    isFollowing: !!(viewer && db.follows.some(f => f.followerId === viewer.id && f.followingId === author.id)),
    sitePublished: !!(author.site && author.site.published),
    waUrl: viewer && author.phoneWa ? `https://wa.me/${author.phoneWa}` : null,
    posts: myPosts.map(p => postJson(p, viewer))
  });
});

/* ---- 关注 / 粉丝 ---- */
// 关注/取关切换：POST /api/users/:username/follow
app.post('/api/users/:username/follow', requireAuth, (req, res) => {
  const target = db.users.find(u => u.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'self' });
  const i = db.follows.findIndex(f => f.followerId === req.user.id && f.followingId === target.id);
  let following;
  if (i >= 0) { db.follows.splice(i, 1); following = false; }
  else { db.follows.push({ followerId: req.user.id, followingId: target.id, createdAt: Date.now() }); following = true; }
  saveDb();
  res.json({ following, followerCount: db.follows.reduce((n, f) => n + (f.followingId === target.id ? 1 : 0), 0) });
});

// 关注/粉丝列表里的用户卡（带 viewer 视角的 isFollowing）
function userListJson(ids, viewer) {
  return ids.map(id => db.users.find(u => u.id === id)).filter(Boolean).map(u => ({
    username: u.username,
    avatar: u.avatar || null,
    bio: u.bio || '',
    isMe: !!(viewer && viewer.id === u.id),
    isFollowing: !!(viewer && db.follows.some(f => f.followerId === viewer.id && f.followingId === u.id))
  }));
}
// 谁关注了 ta（粉丝）
app.get('/api/users/:username/followers', (req, res) => {
  const viewer = currentUser(req);
  const target = db.users.find(u => u.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  const ids = db.follows.filter(f => f.followingId === target.id).sort((a, b) => b.createdAt - a.createdAt).map(f => f.followerId);
  res.json({ users: userListJson(ids, viewer) });
});
// ta 关注了谁
app.get('/api/users/:username/following', (req, res) => {
  const viewer = currentUser(req);
  const target = db.users.find(u => u.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  const ids = db.follows.filter(f => f.followerId === target.id).sort((a, b) => b.createdAt - a.createdAt).map(f => f.followingId);
  res.json({ users: userListJson(ids, viewer) });
});

app.post('/api/posts', requireAuth, postLimit, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 'file_too_big' : 'bad_file';
      return res.status(400).json({ error: code });
    }
    const files = req.files || [];
    const cleanup = () => { for (const f of files) fs.unlink(f.path, () => {}); };

    if (!files.length) return res.status(400).json({ error: 'bad_file' });
    const { caption, state, city, place } = req.body || {};
    if (!state || !STATES.includes(state)) { cleanup(); return res.status(400).json({ error: 'bad_state' }); }

    // 逐个处理：图片压缩（省空间、去 EXIF），视频原样；组装 media 数组（保持选择顺序）
    const media = [];
    for (const f of files) {
      const ext = path.extname(f.filename).toLowerCase();
      const type = (f.mimetype.startsWith('video/') || VIDEO_EXT.has(ext)) ? 'video' : 'image';
      const name = type === 'image' ? await compressImage(f.filename) : f.filename;
      media.push({ url: '/uploads/' + name, type });
    }

    const cleanCaption = String(caption || '').trim().slice(0, 500);
    const post = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      media,
      mediaUrl: media[0].url,        // 封面：第一个媒体（兼容旧代码与缩略图）
      mediaType: media[0].type,
      caption: cleanCaption,
      tags: extractTags(cleanCaption),
      state,
      city: String(city || '').trim().slice(0, 30),
      place: String(place || '').trim().slice(0, 40),
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

  // 删除该帖所有上传的媒体文件（示范帖子的 /seed/ 文件不删）
  const urls = (post.media && post.media.length) ? post.media.map(m => m.url) : [post.mediaUrl];
  for (const u of urls) {
    if (u && u.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {});
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
        avatar: u ? (u.avatar || null) : null,
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
    comment: { id: comment.id, username: req.user.username, avatar: req.user.avatar || null, text, createdAt: comment.createdAt, mine: true },
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

/* ---- 站内私信（DM）。只有对话双方能看到自己的消息，其余人无权访问 ---- */
function dmBetween(aId, bId) {
  return db.messages
    .filter(m => (m.fromId === aId && m.toId === bId) || (m.fromId === bId && m.toId === aId))
    .sort((x, y) => x.createdAt - y.createdAt);
}

// 发私信：POST /api/messages { to: 对方用户名, text }
app.post('/api/messages', requireAuth, messageLimit, (req, res) => {
  const { to, text } = req.body || {};
  const target = db.users.find(u => u.usernameLower === String(to || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'self' });
  const clean = String(text || '').trim().slice(0, 1000);
  if (!clean) return res.status(400).json({ error: 'missing' });
  const msg = { id: crypto.randomUUID(), fromId: req.user.id, toId: target.id, text: clean, createdAt: Date.now(), readAt: null };
  db.messages.push(msg);
  saveDb();
  res.json({ message: { id: msg.id, text: msg.text, createdAt: msg.createdAt, mine: true } });
});

// 我的对话列表（收件箱）：GET /api/conversations
app.get('/api/conversations', requireAuth, (req, res) => {
  const me = req.user.id;
  const byOther = new Map();
  for (const m of db.messages) {
    if (m.fromId !== me && m.toId !== me) continue;
    const otherId = m.fromId === me ? m.toId : m.fromId;
    let c = byOther.get(otherId);
    if (!c) { c = { last: m, unread: 0 }; byOther.set(otherId, c); }
    else if (m.createdAt > c.last.createdAt) c.last = m;
    if (m.toId === me && !m.readAt) c.unread++;
  }
  const list = [];
  for (const [otherId, c] of byOther) {
    const u = db.users.find(x => x.id === otherId);
    if (!u) continue;
    list.push({ username: u.username, avatar: u.avatar || null, lastText: c.last.text, lastAt: c.last.createdAt, lastMine: c.last.fromId === me, unread: c.unread });
  }
  list.sort((a, b) => b.lastAt - a.lastAt);
  res.json({ conversations: list });
});

// 未读总数（顶栏小红点轮询用）：GET /api/me/unread
app.get('/api/me/unread', requireAuth, (req, res) => {
  const me = req.user.id;
  const count = db.messages.reduce((n, m) => n + (m.toId === me && !m.readAt ? 1 : 0), 0);
  res.json({ count });
});

// 和某人的对话：GET /api/messages/:username（顺便把对方发来的消息标记为已读）
app.get('/api/messages/:username', requireAuth, (req, res) => {
  const other = db.users.find(u => u.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!other) return res.status(404).json({ error: 'not_found' });
  const me = req.user.id;
  const msgs = dmBetween(me, other.id);
  let changed = false;
  for (const m of msgs) if (m.toId === me && !m.readAt) { m.readAt = Date.now(); changed = true; }
  if (changed) saveDb();
  res.json({
    user: { username: other.username, avatar: other.avatar || null },
    messages: msgs.map(m => ({ id: m.id, text: m.text, createdAt: m.createdAt, mine: m.fromId === me }))
  });
});

/* ---- 地点聚合页：把标了同一店名的帖子聚到一起（不是餐厅账号，是用户 UGC 聚合）---- */
app.get('/api/places/:place', (req, res) => {
  const viewer = currentUser(req);
  const key = String(req.params.place || '').trim().toLowerCase();
  if (!key) return res.status(404).json({ error: 'not_found' });
  const posts = db.posts
    .filter(p => (p.place || '').trim().toLowerCase() === key)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!posts.length) return res.status(404).json({ error: 'not_found' });
  const name = posts[0].place;
  const userIds = new Set(posts.map(p => p.userId));
  const postIds = new Set(posts.map(p => p.id));
  const likeTotal = db.likes.reduce((n, l) => n + (postIds.has(l.postId) ? 1 : 0), 0);
  // 地区 = 帖子里最常见的「城市, 州」
  const regionCount = new Map();
  for (const p of posts) {
    const r = [p.city, p.state].filter(Boolean).join(', ');
    if (r) regionCount.set(r, (regionCount.get(r) || 0) + 1);
  }
  let region = '', best = 0;
  for (const [r, c] of regionCount) if (c > best) { best = c; region = r; }
  const mapQuery = [name, region].filter(Boolean).join(' ');
  res.json({
    place: name,
    region,
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery),
    stats: { postCount: posts.length, foodieCount: userIds.size, likeTotal },
    posts: posts.map(p => postJson(p, viewer))
  });
});

/* ---- 通知中心（动态聚合：别人赞/评论我的帖、关注我；不单独存通知表）---- */
function notifItemsFor(me) {
  const myPostIds = new Set(db.posts.filter(p => p.userId === me).map(p => p.id));
  const items = [];
  for (const l of db.likes) if (l.userId !== me && myPostIds.has(l.postId)) items.push({ type: 'like', actorId: l.userId, postId: l.postId, createdAt: l.createdAt || 0 });
  for (const c of db.comments) if (c.userId !== me && myPostIds.has(c.postId)) items.push({ type: 'comment', actorId: c.userId, postId: c.postId, text: c.text, createdAt: c.createdAt || 0 });
  for (const f of db.follows) if (f.followingId === me) items.push({ type: 'follow', actorId: f.followerId, createdAt: f.createdAt || 0 });
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

app.get('/api/notifications', requireAuth, (req, res) => {
  const seenAt = req.user.notifSeenAt || 0;
  const items = notifItemsFor(req.user.id).slice(0, 60).map(it => {
    const actor = db.users.find(u => u.id === it.actorId);
    const post = it.postId ? db.posts.find(p => p.id === it.postId) : null;
    return {
      type: it.type,
      username: actor ? actor.username : '???',
      avatar: actor ? (actor.avatar || null) : null,
      text: it.text || '',
      thumb: post ? post.mediaUrl : null,
      postId: it.postId || null,
      createdAt: it.createdAt,
      unread: it.createdAt > seenAt
    };
  });
  res.json({ notifications: items });
});

app.get('/api/notifications/unread', requireAuth, (req, res) => {
  const seenAt = req.user.notifSeenAt || 0;
  const count = notifItemsFor(req.user.id).reduce((n, it) => n + (it.createdAt > seenAt ? 1 : 0), 0);
  res.json({ count });
});

app.post('/api/notifications/seen', requireAuth, (req, res) => {
  req.user.notifSeenAt = Date.now();
  saveDb();
  res.json({ ok: true });
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
