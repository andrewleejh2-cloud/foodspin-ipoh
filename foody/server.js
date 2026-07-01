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
// 管理员账号：环境变量 FOODY_ADMIN 指定（逗号分隔可多个用户名，大小写/中文都行，会自动归一化比对）。
// 没设 FOODY_ADMIN 时：开发模式默认下面 DEFAULT_ADMINS 里的账号（= 当前你的两个账号）；
// 生产模式（NODE_ENV=production 部署）绝不默认任何人，必须显式 FOODY_ADMIN，否则无管理员并在启动时告警。
// 注：管理员账号需在服务器启动时已存在；新注册的管理员要重启一次才生效。
const DEFAULT_ADMINS = PROD ? '' : 'FOODY_ADMIN,安德鲁';
const ADMIN_USERNAMES = (process.env.FOODY_ADMIN || DEFAULT_ADMINS).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

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
    for (const k of ['users', 'sessions', 'posts', 'comments', 'likes', 'saves', 'messages', 'follows', 'reports', 'modActions', 'orders', 'blocks']) {
      if (!Array.isArray(db[k])) db[k] = [];
    }
  } else {
    db = { users: [], sessions: [], posts: [], comments: [], likes: [], saves: [], messages: [], follows: [], reports: [], modActions: [], orders: [], blocks: [] };
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

function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({
    id: crypto.randomUUID(), token, userId,
    createdAt: Date.now(),
    ua: String(req.headers['user-agent'] || '').slice(0, 200),   // 设备/浏览器（解析成友好名给用户看）
    ip: clientIp(req),                                            // 只给本人看自己的登录来源
    expires: Date.now() + SESSION_DAYS * 86400000
  });
  // 清理过期 session
  db.sessions = db.sessions.filter(s => s.expires > Date.now());
  setSessionCookie(res, token, SESSION_DAYS * 86400);
}

/* User-Agent → 友好设备名（如 "Chrome · Windows"）。纯函数、尽力而为、品牌名语言中立。 */
function deviceLabel(ua) {
  ua = String(ua || '');
  let browser = '', osName = '';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  if (/Windows/.test(ua)) osName = 'Windows';
  else if (/iPhone|iPad|iPod|iOS/.test(ua)) osName = 'iOS';
  else if (/Android/.test(ua)) osName = 'Android';
  else if (/Mac OS X|Macintosh/.test(ua)) osName = 'Mac';
  else if (/Linux/.test(ua)) osName = 'Linux';
  return [browser, osName].filter(Boolean).join(' · ');
}

/* ---- 找回密码（邮箱+电话核身 → 6 位验证码 → 重置）---- */
const RESET_TTL = 10 * 60 * 1000;     // 验证码有效期 10 分钟
const RESET_MAX_ATTEMPTS = 5;          // 同一码最多试错 5 次
function genCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
function hashCode(userId, code) { return crypto.createHash('sha256').update(userId + ':' + String(code)).digest('hex'); }
// 必须邮箱（不区分大小写）和电话（归一化）都匹配同一个账号
function findByEmailPhone(email, phone) {
  const e = String(email || '').trim().toLowerCase();
  const ph = normPhone(phone);
  if (!e || !ph) return null;
  return db.users.find(u => (u.email || '').toLowerCase() === e && u.phoneWa === ph) || null;
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

/* 允许注册多个账号的电话号码（归一化后比对）。默认所有号码一号一账号；
   下面列出的号码豁免此限制，可重复注册（例如共用同一号码的多个摊位、或测试账号）。 */
const MULTI_ACCOUNT_PHONES = new Set(['011-16768374'].map(normPhone).filter(Boolean));

function pubUser(u) {
  // 只用于返回「当前登入用户自己」的资料，所以 isAdmin 不会泄露给别人
  return { id: u.id, username: u.username, phone: u.phone, email: u.email || '', state: u.state, city: u.city, bio: u.bio || '', avatar: u.avatar || null, note: u.note || '', isAdmin: !!u.isAdmin };
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
  const commentCount = db.comments.filter(c => c.postId === p.id && !c.hidden).length;
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
    // 是否已关注作者（给 feed 里的「+关注」按钮用；未登录或自己的帖都为 false）
    isFollowing: !!(viewer && author && viewer.id !== p.userId && db.follows.some(f => f.followerId === viewer.id && f.followingId === author.id)),
    // 作者是否发布了「我的网站」——给 feed 帖子上的网站按钮用（所有人可见）
    sitePublished: !!(author && author.site && author.site.published),
    // 电话/WhatsApp 只给已登入的用户（保护隐私 + 符合“注册后才能用 WhatsApp 按钮”）
    waUrl: viewer && author && author.phoneWa ? `https://wa.me/${author.phoneWa}` : null
  };
}

/* ---------------- 审核 / 管理 ---------------- */
// 管理员名单生效：每次启动按 ADMIN_USERNAMES 重设所有用户的 isAdmin（改名单后重启即生效）
function applyAdmins() {
  let changed = false;
  for (const u of db.users) {
    const should = ADMIN_USERNAMES.includes(u.usernameLower);
    if (!!u.isAdmin !== should) { u.isAdmin = should; changed = true; }
  }
  if (changed) saveDb();
}

// 删帖核心逻辑（连带删点赞/收藏/留言 + 上传的媒体文件），owner 删除与管理员删除共用
function removePostById(id) {
  const post = db.posts.find(p => p.id === id);
  if (!post) return false;
  const urls = (post.media && post.media.length) ? post.media.map(m => m.url) : [post.mediaUrl];
  for (const u of urls) {
    if (u && u.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {});
  }
  db.posts = db.posts.filter(p => p.id !== id);
  db.likes = db.likes.filter(l => l.postId !== id);
  db.saves = db.saves.filter(s => s.postId !== id);
  db.comments = db.comments.filter(c => c.postId !== id);
  return true;
}

function removeCommentById(id) {
  if (!db.comments.some(c => c.id === id)) return false;
  db.comments = db.comments.filter(c => c.id !== id);
  return true;
}

/* 账号注销：硬删该用户及其全部关联数据 + 上传文件（不可恢复，PDPA 被遗忘权）。 */
function deleteUserCascade(u) {
  // 1) 删他的帖子（removePostById 连带删媒体文件 + 该帖的赞/收藏/评论）
  for (const p of db.posts.filter(p => p.userId === u.id)) removePostById(p.id);
  // 2) 删他在别人帖下的评论、给别人点的赞/收藏
  db.comments = db.comments.filter(c => c.userId !== u.id);
  db.likes = db.likes.filter(l => l.userId !== u.id);
  db.saves = db.saves.filter(s => s.userId !== u.id);
  // 3) 关注关系（双向）
  db.follows = db.follows.filter(f => f.followerId !== u.id && f.followingId !== u.id);
  // 4) 收发的私信
  db.messages = db.messages.filter(m => m.fromId !== u.id && m.toId !== u.id);
  // 5) 与他相关的举报（他举报的 + 关于他的）
  db.reports = db.reports.filter(r => r.reporterId !== u.id && r.ownerId !== u.id && !(r.type === 'user' && r.targetId === u.id));
  // 6) 上传文件：头像 + 网站封面/菜品图 + 货架图
  const files = [];
  if (u.avatar) files.push(u.avatar);
  if (u.site) {
    if (u.site.cover) files.push(u.site.cover);
    for (const cat of (u.site.menu || [])) for (const it of (cat.items || [])) if (it.photo) files.push(it.photo);
  }
  for (const it of (u.shelf || [])) if (it.photo) files.push(it.photo);
  for (const f of files) if (f && f.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(f)), () => {});
  // 7) 全部会话 + 8) 用户本身
  db.sessions = db.sessions.filter(s => s.userId !== u.id);
  db.users = db.users.filter(x => x.id !== u.id);
}

/* 拉黑：相互不可见 + 不可互动。blockedSet(viewer) = 我拉黑的 + 拉黑我的（双向），用于过滤内容作者。 */
function blockedSet(viewerId) {
  const s = new Set();
  if (!viewerId) return s;
  for (const b of db.blocks) {
    if (b.blockerId === viewerId) s.add(b.blockedId);
    if (b.blockedId === viewerId) s.add(b.blockerId);
  }
  return s;
}
function isBlockedPair(a, b) {
  return db.blocks.some(x => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

// 封禁 / 解封一个用户。封禁会踢掉其所有登入 session；不动历史内容（可逆，按需另行删除）
function banUser(u, ban, reason, byId) {
  if (ban) {
    u.banned = true;
    u.bannedAt = Date.now();
    u.banReason = String(reason || '').trim().slice(0, 200);
    u.bannedBy = byId || null;
    db.sessions = db.sessions.filter(s => s.userId !== u.id);
  } else {
    u.banned = false;
    delete u.bannedAt; delete u.banReason; delete u.bannedBy;
  }
}

/* 分级处置（封号之外的中间手段）：
   - 临时禁言：user.mutedUntil（时间戳）。被禁言者仍可浏览/登录，但不能发帖/评论/私信（自动过期）。
   - 警告：user.warnings=[{reason,note,by,at,seen}]，用户登录后看到一条未读警告提示。 */
const MUTE_DAYS = 7;   // 举报队列「禁言」默认天数（管理员在用户列表可自定天数）
function isMuted(u) { return !!(u && u.mutedUntil && u.mutedUntil > Date.now()); }
// 禁言守卫中间件：放在 requireAuth 之后，拦截被禁言者的写操作
function muteGuard(req, res, next) {
  if (isMuted(req.user)) return res.status(403).json({ error: 'muted', until: req.user.mutedUntil });
  next();
}
// 设/解禁言（days>0 设禁言，≤0 解禁）。返回新的 mutedUntil（0 表示未禁言）
function setMute(u, days) {
  if (days > 0) u.mutedUntil = Date.now() + days * 86400000;
  else delete u.mutedUntil;
  return u.mutedUntil || 0;
}
// 给用户加一条警告（未读）
function warnUser(u, reason, note, byId) {
  if (!Array.isArray(u.warnings)) u.warnings = [];
  u.warnings.push({ reason: String(reason || 'other').slice(0, 30), note: String(note || '').trim().slice(0, 200), by: byId || null, at: Date.now(), seen: false });
}
// 最新一条未读警告（给 /api/me 用）
function latestUnseenWarning(u) {
  const ws = Array.isArray(u && u.warnings) ? u.warnings : [];
  for (let i = ws.length - 1; i >= 0; i--) if (!ws[i].seen) return { reason: ws[i].reason, note: ws[i].note, at: ws[i].at };
  return null;
}

// 管理操作审计：记录谁在何时对谁做了什么（删除/封号/驳回），只留最近 1000 条，出纠纷时可查
function logMod(adminId, action, detail) {
  if (!Array.isArray(db.modActions)) db.modActions = [];
  db.modActions.push({ id: crypto.randomUUID(), adminId, action, detail: detail || {}, createdAt: Date.now() });
  if (db.modActions.length > 1000) db.modActions = db.modActions.slice(-1000);
}

/* 举报原因（用户可选）。'auto' 是系统敏感词自动标记，不在此列表 */
const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'misinfo', 'other'];

/* 敏感词自动标记：发帖/留言命中即自动生成一条「系统举报」进队列，交管理员复核
   （不直接拦截用户，避免误杀体验）。下面只是示范词，运营时按需在这里增删，支持中英巫文、统一小写比对。 */
const BANNED_WORDS = ['fuck', 'bitch', 'cunt', 'asshole', 'retard', '傻逼', '操你妈', '婊子', 'pukimak'];
function autoFlag(type, targetId, ownerId, text) {
  const low = String(text || '').toLowerCase();
  const hit = BANNED_WORDS.find(w => w && low.includes(w));
  if (!hit) return;
  db.reports.push({
    id: crypto.randomUUID(), type, targetId, ownerId,
    reporterId: 'system', reason: 'auto', note: 'matched: ' + hit,
    status: 'open', action: null, createdAt: Date.now(), resolvedAt: null, resolvedBy: null
  });
}

/* 多人举报自动隐藏：同一帖/评论累计被这么多「不同真实用户」举报（仍未处理的 open 举报，
   系统敏感词标记不计）就自动暂隐，从 feed/搜索/探索/主页/地点/评论区消失，等管理员复核。
   管理员驳回 → 取消隐藏；删除/封号走原逻辑。阈值随时可调。 */
const AUTO_HIDE_THRESHOLD = 5;
function maybeAutoHide(type, targetId) {
  const n = db.reports.filter(r =>
    r.type === type && r.targetId === targetId && r.status === 'open' && r.reporterId !== 'system'
  ).length;
  if (n < AUTO_HIDE_THRESHOLD) return;
  const obj = type === 'post' ? db.posts.find(p => p.id === targetId)
            : type === 'comment' ? db.comments.find(c => c.id === targetId) : null;
  if (obj && !obj.hidden) { obj.hidden = true; obj.hiddenAt = Date.now(); }
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

/* 发信器：配了 FOODY_BREVO_KEY 就用 Brevo 邮件 API（免费档、fetch 直调、无新依赖）；
   没配 → 开发模式只打日志（找回密码逻辑照常可用、可测，真发邮件等你设 key）。挂 app.locals 便于测试注入。 */
function makeMailer() {
  const key = process.env.FOODY_BREVO_KEY;
  const from = process.env.FOODY_MAIL_FROM || 'no-reply@foody.local';
  if (key) {
    return {
      configured: true,
      async send({ to, subject, text }) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sender: { email: from, name: 'Foody' }, to: [{ email: to }], subject, textContent: text })
        });
      }
    };
  }
  return { configured: false, async send({ to, subject, text }) { console.log('[mail:dev] →', to, '|', subject, '\n', text); } };
}
app.locals.mailer = makeMailer();
app.use(express.json({ limit: '1mb' }));

/* 安全响应头（手写，不引入额外依赖）。CSP 允许 Google Fonts 与同源资源。 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // 仅在 HTTPS 部署时强制
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self'",
    "worker-src 'self'",
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
  if (user.banned) return res.status(403).json({ error: 'banned' }); // 被封号 → 禁止所有写操作（仍可浏览）
  req.user = user;
  next();
}

/* 同源校验（轻量 CSRF 防护）：浏览器发起的跨站请求一定带 Origin；同源请求 Origin 必与本站 host 一致。
   无 Origin/Referer 的非浏览器客户端放行，避免误伤。代理/隧道下用 X-Forwarded-Host 比对真实域名。 */
function sameOrigin(req) {
  const src = req.headers.origin || req.headers.referer;
  if (!src) return true;
  const host = (TRUST_PROXY && req.headers['x-forwarded-host']) || req.headers.host || '';
  try { return new URL(src).host === host; } catch { return false; }
}

/* 管理员中间件：必须登入且 isAdmin（管理员由 FOODY_ADMIN 指定，见 applyAdmins）。
   会改状态的请求额外做同源校验，保护封号/删除等高权限操作不被跨站伪造。 */
function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'auth' });
  if (!user.isAdmin) return res.status(403).json({ error: 'forbidden' });
  if (req.method !== 'GET' && !sameOrigin(req)) return res.status(403).json({ error: 'csrf' });
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
  // 一个电话号码只能注册一个账号（按归一化后的号码比对，不同写法视为同一个）；
  // 但 MULTI_ACCOUNT_PHONES 里的号码豁免此限制，可注册多个账号
  if (!MULTI_ACCOUNT_PHONES.has(phoneWa) && db.users.some(u => u.phoneWa === phoneWa)) {
    return res.status(409).json({ error: 'phone_taken' });
  }

  // Email 选填；填了才校验格式 + 一邮箱一账号（不发验证邮件，仅记录绑定）
  const email = String((req.body || {}).email || '').trim().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  if (email && db.users.some(u => (u.email || '').toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'email_taken' });
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
    email,
    createdAt: Date.now()
  };
  db.users.push(user);
  createSession(req, res, user.id);
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
  if (user.banned) return res.status(403).json({ error: 'banned' }); // 账号已被审核封禁
  createSession(req, res, user.id);
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

/* ---- 找回密码（登出态）---- */
const resetReqLimit = rateLimit({ windowMs: 600000, max: 10 });     // 每 IP 每 10 分钟最多请求 10 次验证码（防刷发信；真正发信还要邮箱+电话都匹配）
const resetConfirmLimit = rateLimit({ windowMs: 600000, max: 30 }); // 提交验证码限流

// 第一步：邮箱+电话核身 → 生成 6 位码并发到邮箱。永远返回成功，不泄露账号是否存在。
app.post('/api/auth/reset/request', resetReqLimit, async (req, res) => {
  const { email, phone } = req.body || {};
  const u = findByEmailPhone(email, phone);
  if (u && !u.banned) {
    const code = genCode();
    u.reset = { codeHash: hashCode(u.id, code), expires: Date.now() + RESET_TTL, attempts: 0 };
    saveDb();
    try {
      await req.app.locals.mailer.send({
        to: u.email,
        subject: 'Foody 密码重置验证码',
        text: `你好 @${u.username}，\n你的 Foody 密码重置验证码是：${code}\n10 分钟内有效。如果不是你本人操作，请忽略此邮件。`
      });
    } catch (e) { console.error('[reset] 发码失败:', e.message); }
  }
  res.json({ ok: true });
});

// 第二步：核验证码 → 重置密码（重置后该用户所有会话失效）
app.post('/api/auth/reset/confirm', resetConfirmLimit, (req, res) => {
  const { email, phone, code, newPassword } = req.body || {};
  const u = findByEmailPhone(email, phone);
  if (!u || !u.reset) return res.status(400).json({ error: 'no_request' });
  if (Date.now() > u.reset.expires) { delete u.reset; saveDb(); return res.status(400).json({ error: 'expired' }); }
  if (u.reset.attempts >= RESET_MAX_ATTEMPTS) { delete u.reset; saveDb(); return res.status(400).json({ error: 'too_many' }); }
  if (hashCode(u.id, code) !== u.reset.codeHash) {
    u.reset.attempts++; saveDb();
    return res.status(400).json({ error: 'bad_code' });
  }
  // 码对了；再校验新密码（不合法不消耗码，可用同一码重试）
  if (String(newPassword || '').length < 6) return res.status(400).json({ error: 'bad_password' });
  const salt = crypto.randomBytes(16).toString('hex');
  u.salt = salt; u.passHash = hashPassword(String(newPassword), salt);
  delete u.reset;
  db.sessions = db.sessions.filter(s => s.userId !== u.id);   // 重置后所有会话失效
  saveDb();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? pubUser(user) : null, states: STATES, canSell: canSellGoods(user), shelf: (user && user.shelf) || [], muted: isMuted(user) ? user.mutedUntil : 0, warning: user ? latestUnseenWarning(user) : null, emailVerified: !!(user && user.emailVerified) });
});

/* 编辑自己的资料（目前只有简介 bio，最多 160 字） */
// 改密码（登录态）：校验旧密码 → 重设 → 踢掉该用户其它会话（保留当前这台，安全）
app.post('/api/me/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!verifyPassword(String(oldPassword || ''), req.user.salt, req.user.passHash)) return res.status(400).json({ error: 'wrong_password' });
  if (String(newPassword || '').length < 6) return res.status(400).json({ error: 'bad_password' });
  const salt = crypto.randomBytes(16).toString('hex');
  req.user.salt = salt;
  req.user.passHash = hashPassword(String(newPassword), salt);
  const cur = getCookie(req, 'foody_session');
  db.sessions = db.sessions.filter(s => s.userId !== req.user.id || s.token === cur);  // 其它会话失效
  saveDb();
  res.json({ ok: true });
});

// 把自己的警告全部标记为已读（看过提示条后调用）
app.post('/api/me/warnings/seen', requireAuth, (req, res) => {
  if (Array.isArray(req.user.warnings)) { for (const w of req.user.warnings) w.seen = true; saveDb(); }
  res.json({ ok: true });
});

/* ---- 登录设备 / 会话管理 ---- */
// 我的活跃会话（不返回 token）：设备名 + 登录时间 + 是否当前这台
app.get('/api/me/sessions', requireAuth, (req, res) => {
  const cur = getCookie(req, 'foody_session');
  const mine = db.sessions.filter(s => s.userId === req.user.id);
  let changed = false;
  for (const s of mine) if (!s.id) { s.id = crypto.randomUUID(); changed = true; }   // 给老会话补 id
  if (changed) saveDb();
  const sessions = mine
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map(s => ({ id: s.id, device: deviceLabel(s.ua), ip: s.ip || '', createdAt: s.createdAt || 0, current: s.token === cur }));
  res.json({ sessions });
});

// 踢掉自己的某一台会话（按 id；只能踢自己的）
app.delete('/api/me/sessions/:id', requireAuth, (req, res) => {
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(s => !(s.userId === req.user.id && s.id === req.params.id));
  if (db.sessions.length !== before) saveDb();
  res.json({ ok: true });
});

// 退出其它所有设备（保留当前这台）
app.post('/api/me/sessions/revoke-others', requireAuth, (req, res) => {
  const cur = getCookie(req, 'foody_session');
  db.sessions = db.sessions.filter(s => s.userId !== req.user.id || s.token === cur);
  saveDb();
  res.json({ ok: true });
});

// 注销账号（需重新输密码确认）：硬删本人及全部关联数据，不可恢复
app.post('/api/me/delete', requireAuth, (req, res) => {
  if (!verifyPassword(String((req.body || {}).password || ''), req.user.salt, req.user.passHash)) return res.status(400).json({ error: 'wrong_password' });
  deleteUserCascade(req.user);
  saveDb();
  setSessionCookie(res, '', 0);   // 清当前 cookie
  res.json({ ok: true });
});

/* ---- 邮箱验证（复用 mailer + 6 位码）---- */
const emailVerifyLimit = rateLimit({ windowMs: 600000, max: 10 });
app.post('/api/me/email/verify/request', requireAuth, emailVerifyLimit, async (req, res) => {
  const u = req.user;
  if (!u.email) return res.status(400).json({ error: 'no_email' });
  if (u.emailVerified) return res.json({ ok: true, already: true });
  const code = genCode();
  u.emailVerify = { codeHash: hashCode(u.id, code), expires: Date.now() + RESET_TTL, attempts: 0 };
  saveDb();
  try {
    await req.app.locals.mailer.send({ to: u.email, subject: 'Foody 邮箱验证码', text: `你好 @${u.username}，\n你的 Foody 邮箱验证码是：${code}\n10 分钟内有效。` });
  } catch (e) { console.error('[email-verify] 发码失败:', e.message); }
  res.json({ ok: true });
});
app.post('/api/me/email/verify/confirm', requireAuth, (req, res) => {
  const u = req.user;
  if (!u.emailVerify) return res.status(400).json({ error: 'no_request' });
  if (Date.now() > u.emailVerify.expires) { delete u.emailVerify; saveDb(); return res.status(400).json({ error: 'expired' }); }
  if (u.emailVerify.attempts >= RESET_MAX_ATTEMPTS) { delete u.emailVerify; saveDb(); return res.status(400).json({ error: 'too_many' }); }
  if (hashCode(u.id, (req.body || {}).code) !== u.emailVerify.codeHash) { u.emailVerify.attempts++; saveDb(); return res.status(400).json({ error: 'bad_code' }); }
  u.emailVerified = true; delete u.emailVerify; saveDb();
  res.json({ ok: true });
});

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

const SITE_THEMES = ['warm', 'dark', 'fresh', 'berry', 'mono'];
// 货架（商品）摆货权限：暂时只允许指定账号；以后放开就往名单里加用户名（小写），或改成用户 flag
const SHELF_SELLERS = new Set(['安德鲁']);
function canSellGoods(u) { return !!(u && SHELF_SELLERS.has(u.usernameLower)); }

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
    theme: SITE_THEMES.includes(s.theme) ? s.theme : 'warm',
    menu: Array.isArray(s.menu) ? s.menu : [],
    status: s.status || '',   // 仅本人且在摆货白名单 → 编辑器显示「货架」摆货区
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
  if (typeof b.theme === 'string' && SITE_THEMES.includes(b.theme)) s.theme = b.theme;
  if (Array.isArray(b.menu)) {
    s.menu = b.menu.slice(0, 12).map(cat => ({
      name: String(cat.name || '').trim().slice(0, 40),
      items: (Array.isArray(cat.items) ? cat.items : []).slice(0, 40).map(it => ({
        name: String(it.name || '').trim().slice(0, 60),
        price: String(it.price || '').trim().slice(0, 20),
        desc: String(it.desc || '').replace(/\r\n/g, '\n').trim().slice(0, 200),
        // 菜品图只接受自己上传到 /uploads/ 的路径，杜绝注入外链
        photo: (typeof it.photo === 'string' && it.photo.startsWith('/uploads/')) ? it.photo : '',
        soldOut: !!it.soldOut
      })).filter(it => it.name)
    })).filter(cat => cat.name || cat.items.length);
  }
  if (typeof b.published === 'boolean') s.published = b.published;
  if (typeof b.status === 'string' && ['', 'open', 'closed'].includes(b.status)) s.status = b.status;  // 营业状态：空=不显示
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

// 菜单菜品图 / 货架商品图：单独上传压缩后返回 url，前端放进 photo 再随 PATCH 保存
app.post('/api/me/site/menu-photo', requireAuth, (req, res) => {
  coverUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_big' : 'bad_file' });
    if (!req.file) return res.status(400).json({ error: 'bad_file' });
    const name = await compressImage(req.file.filename);
    res.json({ ok: true, url: '/uploads/' + name });
  });
});

// 货架（商品）：独立于「网页」，存 user.shelf。暂时只允许白名单账号（canSellGoods）摆货
app.patch('/api/me/shelf', requireAuth, (req, res) => {
  if (!canSellGoods(req.user)) return res.status(403).json({ error: 'forbidden' });
  const b = req.body || {};
  if (Array.isArray(b.shelf)) {
    req.user.shelf = b.shelf.slice(0, 60).map(it => ({
      name: String(it.name || '').trim().slice(0, 60),
      price: String(it.price || '').trim().slice(0, 20),
      desc: String(it.desc || '').replace(/\r\n/g, '\n').trim().slice(0, 200),
      photo: (typeof it.photo === 'string' && it.photo.startsWith('/uploads/')) ? it.photo : '',
      soldOut: !!it.soldOut
    })).filter(it => it.name);
    saveDb();
  }
  res.json({ ok: true, shelf: req.user.shelf || [] });
});

// 销量：顾客经 WhatsApp 下单时记一笔（不碰支付，记的是「下单量」）。需登录，自己点自己不计
app.post('/api/orders', requireAuth, (req, res) => {
  const b = req.body || {};
  const seller = db.users.find(u => u.usernameLower === String(b.seller || '').trim().toLowerCase());
  if (!seller) return res.status(404).json({ error: 'not_found' });
  if (seller.id === req.user.id) return res.json({ ok: true });
  const count = Math.max(1, Math.min(999, parseInt(b.count, 10) || 1));
  const total = Math.max(0, Math.min(1e7, Number(b.total) || 0));
  db.orders.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 8), sellerId: seller.id, buyerId: req.user.id, count, total, createdAt: Date.now() });
  saveDb();
  res.json({ ok: true });
});

// 销量汇总（仅本人）：按 近1天/7天/30天 统计下单数 + 约总额
app.get('/api/me/sales', requireAuth, (req, res) => {
  const now = Date.now(), DAY = 86400000;
  const mine = db.orders.filter(o => o.sellerId === req.user.id);
  const agg = (since) => {
    let orders = 0, total = 0;
    for (const o of mine) if ((o.createdAt || 0) >= since) { orders++; total += (o.total || 0); }
    return { orders, total: Math.round(total * 100) / 100 };
  };
  res.json({ daily: agg(now - DAY), weekly: agg(now - 7 * DAY), monthly: agg(now - 30 * DAY) });
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
  // 被封禁用户的内容从 feed 隐藏（解封后自动恢复）
  const bannedIds = new Set(db.users.filter(u => u.banned).map(u => u.id));
  if (bannedIds.size) posts = posts.filter(p => !bannedIds.has(p.userId));
  posts = posts.filter(p => !p.hidden);   // 多人举报自动隐藏的内容不进 feed
  const blockedIds = blockedSet(viewer && viewer.id);   // 拉黑对的内容相互不可见
  if (blockedIds.size) posts = posts.filter(p => !blockedIds.has(p.userId));
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
  const bannedIds = new Set(db.users.filter(u => u.banned).map(u => u.id)); // 被封用户不出现在搜索结果
  const blockedIds = blockedSet((currentUser(req) || {}).id);               // 拉黑对不出现在搜索结果

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
    .filter(u => u.usernameLower.includes(q) && !u.banned && !blockedIds.has(u.id))
    .slice(0, 8)
    .map(u => ({
      username: u.username,
      avatar: u.avatar || null,
      state: u.state,
      city: u.city,
      postCount: db.posts.filter(p => p.userId === u.id).length
    }));

  const posts = [...db.posts]
    .filter(p => !bannedIds.has(p.userId) && !p.hidden && !blockedIds.has(p.userId))
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

/* ---- 探索：按州 / 热门地点 / 热门标签聚合，给「探索页」浏览发现用（被封用户的内容不计入）---- */
app.get('/api/explore', (req, res) => {
  const bannedIds = new Set(db.users.filter(u => u.banned).map(u => u.id));
  const blockedIds = blockedSet((currentUser(req) || {}).id);   // 拉黑对不计入探索
  const stateCount = new Map(), placeCount = new Map(), tagCount = new Map();
  let total = 0;
  for (const p of db.posts) {
    if (bannedIds.has(p.userId) || p.hidden || blockedIds.has(p.userId)) continue;
    total++;
    if (p.state) stateCount.set(p.state, (stateCount.get(p.state) || 0) + 1);
    const place = (p.place || '').trim();
    if (place) placeCount.set(place, (placeCount.get(place) || 0) + 1);
    for (const tg of (p.tags || [])) tagCount.set(tg, (tagCount.get(tg) || 0) + 1);
  }
  const states = STATES.filter(s => stateCount.has(s)).map(s => ({ state: s, count: stateCount.get(s) })).sort((a, b) => b.count - a.count);
  const places = [...placeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([place, count]) => ({ place, count }));
  const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([tag, count]) => ({ tag, count }));
  // 热门帖（探索页缩略图网格用）：按点赞数排、新鲜度做次序，排除封号作者
  const likeCountByPost = new Map();
  for (const l of db.likes) likeCountByPost.set(l.postId, (likeCountByPost.get(l.postId) || 0) + 1);
  const posts = db.posts
    .filter(p => !bannedIds.has(p.userId) && !p.hidden && !blockedIds.has(p.userId))
    .map(p => ({ p, likes: likeCountByPost.get(p.id) || 0 }))
    .sort((a, b) => b.likes - a.likes || b.p.createdAt - a.p.createdAt)
    .slice(0, 30)
    .map(({ p, likes }) => {
      const m = (p.media && p.media.length) ? p.media[0] : { url: p.mediaUrl, type: p.mediaType };
      return { id: p.id, cover: m.url, type: m.type, likeCount: likes };
    });
  res.json({ totalPosts: total, states, places, tags, posts });
});

/* 用户主页（profile）：公开资料 + 统计 + 该用户的作品。
   电话不直接返回，只在已登入时给 wa.me 链接（与帖子一致的隐私规则）。 */
app.get('/api/users/:username', (req, res) => {
  const viewer = currentUser(req);
  const uname = String(req.params.username || '').trim().toLowerCase();
  const author = db.users.find(u => u.usernameLower === uname);
  if (!author) return res.status(404).json({ error: 'not_found' });

  const iBlocked = !!(viewer && db.blocks.some(b => b.blockerId === viewer.id && b.blockedId === author.id));
  const pairBlocked = !!(viewer && viewer.id !== author.id && isBlockedPair(viewer.id, author.id));
  const myPosts = pairBlocked ? [] : db.posts   // 拉黑对之间：主页不显示对方帖子
    .filter(p => p.userId === author.id && !p.hidden)
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
    isAdmin: !!(viewer && viewer.id === author.id && author.isAdmin), // 本人且是管理员 → profile 显示「审核后台」入口
    viewerLoggedIn: !!viewer,
    isFollowing: !!(viewer && db.follows.some(f => f.followerId === viewer.id && f.followingId === author.id)),
    blocked: iBlocked,   // 我是否拉黑了 ta（给「取消拉黑」按钮）
    sitePublished: !!(author.site && author.site.published),
    shopOpen: !!(author.site && author.site.published && Array.isArray(author.site.menu) && author.site.menu.some(c => Array.isArray(c.items) && c.items.length)),
    shelf: Array.isArray(author.shelf) ? author.shelf : [],   // 货架商品（profile 上展示，访客可见）
    canSell: !!(viewer && viewer.id === author.id && canSellGoods(author)),   // 本人且白名单 → 显示「管理货架」
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
  if (isBlockedPair(req.user.id, target.id)) return res.status(403).json({ error: 'blocked' });   // 拉黑对之间不能关注
  const i = db.follows.findIndex(f => f.followerId === req.user.id && f.followingId === target.id);
  let following;
  if (i >= 0) { db.follows.splice(i, 1); following = false; }
  else { db.follows.push({ followerId: req.user.id, followingId: target.id, createdAt: Date.now() }); following = true; }
  saveDb();
  res.json({ following, followerCount: db.follows.reduce((n, f) => n + (f.followingId === target.id ? 1 : 0), 0) });
});

// 拉黑 / 取消拉黑切换：POST /api/users/:username/block。拉黑时双向解除现有关注。
app.post('/api/users/:username/block', requireAuth, (req, res) => {
  const target = db.users.find(u => u.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'self' });
  const i = db.blocks.findIndex(b => b.blockerId === req.user.id && b.blockedId === target.id);
  let blocked;
  if (i >= 0) { db.blocks.splice(i, 1); blocked = false; }
  else {
    db.blocks.push({ blockerId: req.user.id, blockedId: target.id, createdAt: Date.now() });
    // 拉黑即双向解除关注
    db.follows = db.follows.filter(f => !((f.followerId === req.user.id && f.followingId === target.id) || (f.followerId === target.id && f.followingId === req.user.id)));
    blocked = true;
  }
  saveDb();
  res.json({ blocked });
});

// 我拉黑的人
app.get('/api/me/blocks', requireAuth, (req, res) => {
  const users = db.blocks.filter(b => b.blockerId === req.user.id)
    .map(b => db.users.find(u => u.id === b.blockedId)).filter(Boolean)
    .map(u => ({ username: u.username, avatar: u.avatar || null, bio: u.bio || '' }));
  res.json({ users });
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

app.post('/api/posts', requireAuth, postLimit, muteGuard, (req, res) => {
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
    autoFlag('post', post.id, req.user.id, cleanCaption); // 敏感词命中 → 自动进审核队列
    saveDb();
    res.json({ post: postJson(post, req.user) });
  });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  // 本人或管理员都可删（管理员审核下架违规内容）
  if (post.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'forbidden' });
  removePostById(post.id);
  saveDb();
  res.json({ ok: true });
});

// 编辑帖子（本人或管理员）：只改文案/地点/地区，不动图片。改文案会重新解析 #标签
app.patch('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (post.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'forbidden' });
  const b = req.body || {};
  if (typeof b.caption === 'string') { post.caption = b.caption.trim().slice(0, 500); post.tags = extractTags(post.caption); }
  if (typeof b.place === 'string') post.place = b.place.trim().slice(0, 40);
  if (typeof b.city === 'string') post.city = b.city.trim().slice(0, 30);
  if (typeof b.state === 'string' && STATES.includes(b.state)) post.state = b.state;
  saveDb();
  res.json({ post: postJson(post, req.user) });
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
  const blockedC = blockedSet(viewer && viewer.id);   // 拉黑对的评论相互不可见
  const comments = db.comments
    .filter(c => c.postId === post.id && !c.hidden && !blockedC.has(c.userId))
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

app.post('/api/posts/:id/comments', requireAuth, commentLimit, muteGuard, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  const text = String((req.body || {}).text || '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ error: 'missing' });
  const comment = { id: crypto.randomUUID(), postId: post.id, userId: req.user.id, text, createdAt: Date.now() };
  db.comments.push(comment);
  autoFlag('comment', comment.id, req.user.id, text); // 敏感词命中 → 自动进审核队列
  saveDb();
  res.json({
    comment: { id: comment.id, username: req.user.username, avatar: req.user.avatar || null, text, createdAt: comment.createdAt, mine: true },
    commentCount: db.comments.filter(c => c.postId === post.id && !c.hidden).length
  });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.comments.find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'not_found' });
  if (comment.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'forbidden' });
  const postId = comment.postId;
  removeCommentById(comment.id);
  saveDb();
  res.json({ ok: true, commentCount: db.comments.filter(c => c.postId === postId).length });
});

/* ---- 站内私信（DM）。只有对话双方能看到自己的消息，其余人无权访问 ---- */
function dmBetween(aId, bId) {
  return db.messages
    .filter(m => (m.fromId === aId && m.toId === bId) || (m.fromId === bId && m.toId === aId))
    .sort((x, y) => x.createdAt - y.createdAt);
}

// 发私信：POST /api/messages { to: 对方用户名, text }
app.post('/api/messages', requireAuth, messageLimit, muteGuard, (req, res) => {
  const { to, text } = req.body || {};
  const target = db.users.find(u => u.usernameLower === String(to || '').trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'self' });
  if (isBlockedPair(req.user.id, target.id)) return res.status(403).json({ error: 'blocked' });   // 拉黑对之间不能私信
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
  const blockedP = blockedSet(viewer && viewer.id);
  const posts = db.posts
    .filter(p => (p.place || '').trim().toLowerCase() === key && !p.hidden && !blockedP.has(p.userId))
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

/* ---- 通知中心（动态聚合：别人赞/评论我的帖、@提到我、关注我；不单独存通知表）---- */
// 文案里是否 @ 了某用户名（大小写不敏感）
function mentionsUser(text, unameLower) {
  if (!unameLower) return false;
  const re = /@([\p{L}\p{N}_]{2,20})/gu;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) if (m[1].toLowerCase() === unameLower) return true;
  return false;
}

function notifItemsFor(me) {
  const myPostIds = new Set(db.posts.filter(p => p.userId === me).map(p => p.id));
  const meUser = db.users.find(u => u.id === me);
  const meLower = meUser ? meUser.usernameLower : '';
  const items = [];
  for (const l of db.likes) if (l.userId !== me && myPostIds.has(l.postId)) items.push({ type: 'like', actorId: l.userId, postId: l.postId, createdAt: l.createdAt || 0 });
  for (const c of db.comments) {
    if (c.userId === me) continue;
    // 我帖子下的评论 → 评论通知（即使也 @ 了我）；别人帖里 @ 我 → 提及通知（不重复）
    if (myPostIds.has(c.postId)) items.push({ type: 'comment', actorId: c.userId, postId: c.postId, text: c.text, createdAt: c.createdAt || 0 });
    else if (mentionsUser(c.text, meLower)) items.push({ type: 'mention', actorId: c.userId, postId: c.postId, text: c.text, createdAt: c.createdAt || 0 });
  }
  for (const f of db.follows) if (f.followingId === me) items.push({ type: 'follow', actorId: f.followerId, createdAt: f.createdAt || 0 });
  // 关注的人在「我关注之后」发的新帖 → 新帖通知（不含关注前的旧帖，避免一次涌入刷屏）
  const followMap = new Map();
  for (const f of db.follows) if (f.followerId === me) followMap.set(f.followingId, f.createdAt || 0);
  for (const p of db.posts) {
    const fAt = followMap.get(p.userId);
    if (fAt !== undefined && (p.createdAt || 0) >= fAt) items.push({ type: 'newpost', actorId: p.userId, postId: p.id, text: p.caption || '', createdAt: p.createdAt || 0 });
  }
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

/* ---------------- 举报 & 管理员审核 ---------------- */

// 用户举报：POST /api/reports { type:'post'|'comment'|'user', targetId, reason, note }
const reportLimit = rateLimit({ windowMs: 600000, max: 30 }); // 每 IP 每 10 分钟最多 30 次举报
app.post('/api/reports', requireAuth, reportLimit, (req, res) => {
  const { type, reason } = req.body || {};
  if (!['post', 'comment', 'user'].includes(type)) return res.status(400).json({ error: 'bad_type' });
  if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ error: 'bad_reason' });
  const raw = String((req.body || {}).targetId || '').trim();
  if (!raw) return res.status(400).json({ error: 'missing' });

  // 定位目标 + 找出内容作者（targetId 统一存成稳定 id）
  let targetId = raw, ownerId = null;
  if (type === 'post') {
    const p = db.posts.find(x => x.id === raw);
    if (!p) return res.status(404).json({ error: 'not_found' });
    ownerId = p.userId;
  } else if (type === 'comment') {
    const c = db.comments.find(x => x.id === raw);
    if (!c) return res.status(404).json({ error: 'not_found' });
    ownerId = c.userId;
  } else { // user：前端传用户名或 id 都接受，统一存成 user.id
    const u = db.users.find(x => x.id === raw || x.usernameLower === raw.toLowerCase());
    if (!u) return res.status(404).json({ error: 'not_found' });
    targetId = u.id; ownerId = u.id;
  }
  if (ownerId === req.user.id) return res.status(400).json({ error: 'self' }); // 不能举报自己

  // 幂等：同一举报人对同一目标已有未处理举报 → 不重复堆积
  const dup = db.reports.find(r => r.reporterId === req.user.id && r.type === type && r.targetId === targetId && r.status === 'open');
  if (dup) return res.json({ ok: true, already: true });

  db.reports.push({
    id: crypto.randomUUID(), type, targetId, ownerId,
    reporterId: req.user.id, reason,
    note: String((req.body || {}).note || '').trim().slice(0, 200),
    status: 'open', action: null, createdAt: Date.now(), resolvedAt: null, resolvedBy: null
  });
  if (type === 'post' || type === 'comment') maybeAutoHide(type, targetId); // 满阈值自动暂隐
  saveDb();
  res.json({ ok: true });
});

/* ---- 管理员 ---- */
// 平台概览统计
app.get('/api/admin/summary', requireAdmin, (req, res) => {
  res.json({
    users: db.users.length,
    posts: db.posts.length,
    comments: db.comments.length,
    openReports: db.reports.filter(r => r.status === 'open').length,
    banned: db.users.filter(u => u.banned).length
  });
});

// 全部用户列表（仅管理员）：管理/封号用。只给管理相关字段，不含电话/邮箱等联系方式（保护隐私）
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const postCount = new Map();
  for (const p of db.posts) postCount.set(p.userId, (postCount.get(p.userId) || 0) + 1);
  const users = db.users
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))   // 最新注册在前
    .map(u => ({
      username: u.username,
      avatar: u.avatar || null,
      state: u.state || '',
      city: u.city || '',
      createdAt: u.createdAt || 0,
      postCount: postCount.get(u.id) || 0,
      banned: !!u.banned,
      isAdmin: !!u.isAdmin,
      mutedUntil: isMuted(u) ? u.mutedUntil : 0,
      warnings: Array.isArray(u.warnings) ? u.warnings.length : 0
    }));
  res.json({ users });
});

// 举报队列（带目标内容快照）：GET /api/admin/reports?status=open|resolved|dismissed|all
app.get('/api/admin/reports', requireAdmin, (req, res) => {
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(req.query.status) ? req.query.status : 'open';
  let list = db.reports.slice().sort((a, b) => b.createdAt - a.createdAt);
  if (status !== 'all') list = list.filter(r => r.status === status);
  const reports = list.slice(0, 200).map(r => {
    const reporter = r.reporterId === 'system' ? 'system' : ((db.users.find(u => u.id === r.reporterId) || {}).username || '???');
    let target = null, exists = false, owner = null, autoHidden = false;
    if (r.type === 'post') {
      const p = db.posts.find(x => x.id === r.targetId);
      if (p) { exists = true; owner = db.users.find(u => u.id === p.userId); autoHidden = !!p.hidden; target = { caption: p.caption || '', thumb: p.mediaUrl, mediaType: p.mediaType }; }
    } else if (r.type === 'comment') {
      const c = db.comments.find(x => x.id === r.targetId);
      if (c) { exists = true; owner = db.users.find(u => u.id === c.userId); autoHidden = !!c.hidden; target = { text: c.text, postId: c.postId }; }
    } else {
      const u = db.users.find(x => x.id === r.targetId);
      if (u) { exists = true; owner = u; target = { avatar: u.avatar || null, bio: u.bio || '' }; }
    }
    // 该目标被举报的总次数（含各状态），让管理员看到热度
    const reportCount = db.reports.reduce((n, x) => n + (x.type === r.type && x.targetId === r.targetId ? 1 : 0), 0);
    return {
      id: r.id, type: r.type, targetId: r.targetId, reason: r.reason, note: r.note || '',
      status: r.status, action: r.action || null, createdAt: r.createdAt, reporter,
      target, exists, reportCount, autoHidden,
      ownerUsername: owner ? owner.username : null,
      ownerBanned: owner ? !!owner.banned : false,
      ownerMuted: owner ? isMuted(owner) : false,
      ownerIsAdmin: owner ? !!owner.isAdmin : false
    };
  });
  res.json({ status, reports });
});

// 处理一条举报：POST /api/admin/reports/:id { action:'dismiss'|'delete'|'ban' }
app.post('/api/admin/reports/:id', requireAdmin, (req, res) => {
  const r = db.reports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  const action = (req.body || {}).action;

  if (action === 'dismiss') {
    r.status = 'dismissed';
    // 内容判定没问题：取消自动隐藏，并把该目标其它未处理举报一并结案
    if (r.type === 'post' || r.type === 'comment') {
      const obj = r.type === 'post' ? db.posts.find(p => p.id === r.targetId) : db.comments.find(c => c.id === r.targetId);
      if (obj && obj.hidden) { obj.hidden = false; delete obj.hiddenAt; }
      for (const o of db.reports) {
        if (o.status === 'open' && o.type === r.type && o.targetId === r.targetId) {
          o.status = 'dismissed'; o.resolvedAt = Date.now(); o.resolvedBy = req.user.id;
        }
      }
    }
  } else if (action === 'delete') {
    if (r.type === 'post') removePostById(r.targetId);
    else if (r.type === 'comment') removeCommentById(r.targetId);
    else return res.status(400).json({ error: 'bad_action' }); // 用户类型不能「删除」，请用 ban
    r.action = 'delete'; r.status = 'resolved';
    // 同一目标的其它未处理举报一并结案
    for (const o of db.reports) {
      if (o.status === 'open' && o.type === r.type && o.targetId === r.targetId) {
        o.status = 'resolved'; o.action = o.action || 'delete'; o.resolvedAt = Date.now(); o.resolvedBy = req.user.id;
      }
    }
  } else if (action === 'ban') {
    const owner = db.users.find(u => u.id === r.ownerId);
    if (!owner) return res.status(404).json({ error: 'not_found' });
    if (owner.isAdmin) return res.status(400).json({ error: 'cant_ban_admin' });
    banUser(owner, true, 'report:' + r.reason, req.user.id);
    r.action = 'ban'; r.status = 'resolved';
  } else if (action === 'mute' || action === 'warn') {
    const owner = db.users.find(u => u.id === r.ownerId);
    if (!owner) return res.status(404).json({ error: 'not_found' });
    if (owner.isAdmin) return res.status(400).json({ error: 'cant_ban_admin' });
    if (action === 'mute') setMute(owner, MUTE_DAYS);
    else warnUser(owner, r.reason, 'report:' + r.reason, req.user.id);
    r.action = action; r.status = 'resolved';
  } else {
    return res.status(400).json({ error: 'bad_action' });
  }
  r.resolvedAt = Date.now(); r.resolvedBy = req.user.id;
  logMod(req.user.id, 'report_' + action, { reportId: r.id, type: r.type, targetId: r.targetId, owner: r.ownerId });
  saveDb();
  res.json({ ok: true });
});

// 封禁 / 解封用户：POST /api/admin/users/:username/ban { ban:true|false, reason }
app.post('/api/admin/users/:username/ban', requireAdmin, (req, res) => {
  const u = db.users.find(x => x.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!u) return res.status(404).json({ error: 'not_found' });
  if (u.isAdmin) return res.status(400).json({ error: 'cant_ban_admin' });
  const ban = (req.body || {}).ban !== false; // 默认封禁；传 ban:false 解封
  banUser(u, ban, (req.body || {}).reason, req.user.id);
  logMod(req.user.id, ban ? 'ban' : 'unban', { user: u.username });
  saveDb();
  res.json({ ok: true, banned: !!u.banned });
});

// 临时禁言 / 解禁：POST /api/admin/users/:username/mute { days }  （days>0 禁言、≤0 解禁）
app.post('/api/admin/users/:username/mute', requireAdmin, (req, res) => {
  const u = db.users.find(x => x.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!u) return res.status(404).json({ error: 'not_found' });
  if (u.isAdmin) return res.status(400).json({ error: 'cant_ban_admin' });
  const days = Math.max(0, Math.min(365, parseInt((req.body || {}).days, 10) || 0));
  const mutedUntil = setMute(u, days);
  logMod(req.user.id, days > 0 ? 'mute' : 'unmute', { user: u.username, days });
  saveDb();
  res.json({ ok: true, mutedUntil });
});

// 警告：POST /api/admin/users/:username/warn { reason, note }
app.post('/api/admin/users/:username/warn', requireAdmin, (req, res) => {
  const u = db.users.find(x => x.usernameLower === String(req.params.username || '').trim().toLowerCase());
  if (!u) return res.status(404).json({ error: 'not_found' });
  if (u.isAdmin) return res.status(400).json({ error: 'cant_ban_admin' });
  warnUser(u, (req.body || {}).reason, (req.body || {}).note, req.user.id);
  logMod(req.user.id, 'warn', { user: u.username });
  saveDb();
  res.json({ ok: true });
});

/* ---- 静态文件 ---- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

/* ---------------- 启动 ---------------- */
loadDb();
applyAdmins();                       // 按 FOODY_ADMIN（默认 foody_demo）设定管理员
// 一次性迁移：旧的 user.site.shelf 搬到顶层 user.shelf（货架已从「网页」独立到 profile）
(function migrateShelf() {
  let changed = false;
  for (const u of db.users) {
    if (u.site && Array.isArray(u.site.shelf)) {
      if (u.site.shelf.length && !(Array.isArray(u.shelf) && u.shelf.length)) { u.shelf = u.site.shelf; }
      delete u.site.shelf; changed = true;
    }
  }
  if (changed) saveDb();
})();
backupDb();                          // 启动时先备份一份
setInterval(backupDb, 6 * 3600000).unref();  // 之后每 6 小时自动备份（unref：测试进程不被它挂住）
// 直接 `node server.js` 时才监听端口；被 require（测试）时只导出 app、不开监听
if (require.main === module) {
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
  if (ADMIN_USERNAMES.length) console.log(`  审核管理员: ${ADMIN_USERNAMES.join(', ')}  →  打开 /admin.html`);
  else console.log('  ⚠ 未设管理员！部署上线前请设置环境变量 FOODY_ADMIN=你的用户名（管理后台在 /admin.html）');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('');
});
}

module.exports = app;
