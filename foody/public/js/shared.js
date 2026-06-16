/* Foody 共用：三语字典、图标、API、Toast */

/* ---------------- 三语字典 ---------------- */
const DICT = {
  zh: {
    langName: '中文',
    tagline: '大马美食，刷着刷着就饿了 🍜',
    heroSub: 'Foody 是给大马人分享 & 发现美食的小天地。看到喜欢的，点赞收藏，还能一键 WhatsApp 找到分享的人。',
    feat1t: '像刷 TikTok 一样刷美食', feat1d: '全屏 FYP，一滑一道大马好料',
    feat2t: '每个帖子都标明地区', feat2d: '看到哪里好吃，跟着去吃就对了',
    feat3t: '一键 WhatsApp', feat3d: '直接联系分享美食的人，问地点问价钱',
    browseGuest: '先随便逛逛（不用账号）',
    login: '登录', register: '注册',
    username: 'Foody 用户名', usernamePh: '如：Oscar',
    password: 'Foody 密码', passwordPh: '至少 6 位',
    phone: '电话号码（WhatsApp）', phonePh: '如：011-1901 9070',
    state: '州属', statePh: '选择州属', city: '城市 / 地区', cityPh: '如：新山', placePh: '📍 店名 / 地点（选填，如 金莲记）',
    loginBtn: '登录', registerBtn: '创建账号',
    welcomeBack: '欢迎回来', goFyp: '进入 FYP 刷美食 →', logout: '退出登录',
    yourRegion: '你的地区',
    footerNote: 'Foody Beta · 为大马吃货而做 ❤️ 免费、无广告',
    errMissing: '请把资料填完整哦',
    errBadUsername: '用户名 2-20 位，可用中文、字母、数字、下划线',
    errBadPassword: '密码至少要 6 位',
    errBadPhone: '电话号码格式不对（例：011-1901 9070）',
    errUsernameTaken: '这个用户名已经被人用了，换一个吧',
    errPhoneTaken: '这个电话号码已经注册过账号了，一个号码只能开一个账号',
    errBadLogin: '用户名或密码不对',
    errTooMany: '尝试太多次了，休息 10 分钟再来',
    errNet: '网络出了点问题，再试一次',
    errAuth: '请先登录',
    /* FYP */
    fypTitle: 'FYP', home: '首页',
    upload: '发布', uploadTitle: '分享美食 🍜',
    chooseFile: '点这里选择照片或视频', changeFile: '换一个文件',
    fromGallery: '支持手机相册 / 电脑文件',
    captionPh: '这家有多好吃？说说看…',
    regionLabel: '地区（必填）',
    postBtn: '发布', posting: '上传中… 请别关闭页面',
    postOk: '发布成功！🎉',
    allRegions: '全部地区', savedFilter: '我的收藏',
    comments: '留言', commentPh: '说点什么…', send: '发送',
    noComments: '还没有留言，抢个沙发 😎',
    emptyFeed: '这里还空空的…', emptyFeedSub: '成为第一个分享美食的人吧！',
    emptySaved: '你还没收藏任何美食', emptySavedSub: '看到喜欢的，点一下书签就收进来了',
    needAccount: '需要一个 Foody 账号',
    needAccountDesc: '注册 / 登录后就可以点赞、留言、收藏、发布美食，还能一键 WhatsApp 哦 😋',
    goLogin: '去登录 / 注册', keepBrowsing: '继续逛逛',
    volume: '音量', brightness: '亮度', muteLabel: '静音', playerSettings: '播放设置',
    deletePost: '删除帖子', confirmDelPost: '确定要删除这个帖子吗？删了就找不回来咯。',
    confirm: '删除', cancel: '取消',
    deleted: '已删除', savedToast: '已收藏 ⭐', unsavedToast: '已取消收藏',
    likeHint: '双击也可以点赞 ❤️',
    waMsg: 'Hi {name}！我在 Foody 看到你分享的美食，想了解一下 😋',
    soundHint: '点击开启声音 🔊',
    justNow: '刚刚', minAgo: '{n} 分钟前', hrAgo: '{n} 小时前', dayAgo: '{n} 天前',
    loadFail: '加载失败了，下拉重试',
    tapToPost: '发布你的美食',
    search: '搜索', searchPh: '搜美食、用户、#标签…',
    trendingTags: '热门标签 🔥', secTags: '标签', secUsers: '用户', secPosts: '美食',
    noResults: '什么都没找到…换个词试试？',
    nPosts: '{n} 个帖子',
    searchTip: '试试搜 “nasi lemak”、地区，或 @用户名',
    feedForYou: '推荐', feedLatest: '最新',
    /* Profile 主页 */
    pfPosts: '作品', pfLikes: '获赞',
    pfEdit: '编辑资料', pfSave: '保存', pfBioPh: '介绍一下你的美食 / 店…',
    pfBioEmptyMe: '写个简介，让大家认识你 →', pfBioSaved: '简介更新好啦 ✅',
    pfWa: 'WhatsApp 联系', pfShare: '分享主页', pfShareCopied: '主页链接已复制 ✅',
    pfNoPosts: '还没有发布作品', pfNotFound: '找不到这个用户', pfMine: '我的主页',
    nSelected: '已选 {n} 个', maxFiles: '最多 {n} 个，多出的没加上',
    pfUsername: '用户名', pfChangePhoto: '换头像', pfSaved: '资料更新好啦 ✅',
    pfNote: '留言', pfNotePh: '发条留言…（如：今天招牌菜半价 🦐）',
    pfMessage: '发消息', dmTitle: '私信', dmPh: '输入消息…', dmYou: '你：',
    dmEmpty: '还没有私信。去别人主页点「发消息」就能开聊啦 💬', dmSayHi: '给 @{name} 发条消息，打个招呼吧 👋',
    pfFollow: '关注', pfFollowed: '已关注', pfFollowers: '粉丝', pfFollowing: '关注中', pfNobody: '还没有人', feedFollowing: '关注', feedEmptyFollow: '你还没关注谁。去逛逛、点别人头像关注，这里就有他们的新帖啦 👀',
    ntTitle: '通知', ntLiked: '赞了你的帖子', ntCommented: '评论了你的帖子', ntFollowed: '关注了你', ntEmpty: '还没有通知。有人赞你、评论或关注你时，会出现在这里 🔔',
    plFoodies: '吃货', plMap: '在 Google 地图打开', plNotFound: '还没有这个地点的帖子',
    siteAbout: '关于', siteHours: '营业时间', siteAddress: '地址', siteGallery: '我们的出品', siteMap: '地图', siteDraft: '草稿 · 未发布，只有你看得到', siteUnpub: '这个网页还没发布',
    siteEditTitle: '编辑我的网页', sitePreview: '查看', siteCover: '封面图', siteCoverAdd: '上传封面', siteTitle: '名称 / 店名', siteTaglineL: '标语（一句话）', siteHoursPh: '如：每天 10:00–22:00', siteLinks: '链接按钮', siteAddLink: '+ 加一个链接', sitePublishLabel: '公开发布（别人才看得到）', siteSaved: '已保存 ✅', siteLinkLabelPh: '按钮文字，如 看菜单', siteMine: '我的网页', siteView: '查看网页'
  },
  ms: {
    langName: 'BM',
    tagline: 'Makanan Malaysia, scroll sampai lapar 🍜',
    heroSub: 'Foody ialah platform untuk rakyat Malaysia kongsi & jumpa makanan sedap. Suka? Like, simpan, terus WhatsApp orang yang share.',
    feat1t: 'Scroll macam TikTok', feat1d: 'FYP penuh skrin, satu swipe satu makanan power',
    feat2t: 'Setiap post ada lokasi', feat2d: 'Nampak sedap kat mana, terus pergi makan',
    feat3t: 'Terus ke WhatsApp', feat3d: 'Tanya lokasi & harga dengan orang yang share',
    browseGuest: 'Jalan-jalan dulu (tanpa akaun)',
    login: 'Log Masuk', register: 'Daftar',
    username: 'Nama pengguna Foody', usernamePh: 'cth: Oscar',
    password: 'Kata laluan Foody', passwordPh: 'sekurang-kurangnya 6 aksara',
    phone: 'Nombor telefon (WhatsApp)', phonePh: 'cth: 011-1901 9070',
    state: 'Negeri', statePh: 'Pilih negeri', city: 'Bandar / kawasan', cityPh: 'cth: Skudai', placePh: '📍 Nama kedai / lokasi (pilihan)',
    loginBtn: 'Log Masuk', registerBtn: 'Buat Akaun',
    welcomeBack: 'Selamat kembali', goFyp: 'Masuk FYP →', logout: 'Log keluar',
    yourRegion: 'Kawasan anda',
    footerNote: 'Foody Beta · Dibuat untuk foodie Malaysia ❤️ Percuma, tiada iklan',
    errMissing: 'Sila isi semua maklumat ya',
    errBadUsername: 'Nama pengguna 2-20 aksara (huruf, nombor, _)',
    errBadPassword: 'Kata laluan mesti sekurang-kurangnya 6 aksara',
    errBadPhone: 'Format nombor telefon tak betul (cth: 011-1901 9070)',
    errUsernameTaken: 'Nama ini dah diambil, cuba yang lain',
    errPhoneTaken: 'Nombor telefon ini sudah ada akaun — satu nombor satu akaun',
    errBadLogin: 'Nama pengguna atau kata laluan salah',
    errTooMany: 'Terlalu banyak percubaan, rehat 10 minit dulu',
    errNet: 'Ada masalah sambungan, cuba lagi',
    errAuth: 'Sila log masuk dulu',
    fypTitle: 'FYP', home: 'Utama',
    upload: 'Post', uploadTitle: 'Kongsi makanan 🍜',
    chooseFile: 'Tekan untuk pilih gambar atau video', changeFile: 'Tukar fail',
    fromGallery: 'Dari galeri telefon / komputer',
    captionPh: 'Sedap macam mana? Cerita sikit…',
    regionLabel: 'Kawasan (wajib)',
    postBtn: 'Post', posting: 'Memuat naik… jangan tutup halaman',
    postOk: 'Berjaya dipost! 🎉',
    allRegions: 'Semua kawasan', savedFilter: 'Simpanan saya',
    comments: 'Komen', commentPh: 'Tulis komen…', send: 'Hantar',
    noComments: 'Belum ada komen, jadi yang pertama 😎',
    emptyFeed: 'Masih kosong lagi…', emptyFeedSub: 'Jadilah orang pertama kongsi makanan!',
    emptySaved: 'Belum ada simpanan', emptySavedSub: 'Nampak yang best, tekan bookmark untuk simpan',
    needAccount: 'Perlukan akaun Foody',
    needAccountDesc: 'Daftar / log masuk untuk like, komen, simpan, post makanan & terus WhatsApp 😋',
    goLogin: 'Log masuk / Daftar', keepBrowsing: 'Tengok dulu',
    volume: 'Kelantangan', brightness: 'Kecerahan', muteLabel: 'Bisukan', playerSettings: 'Tetapan main',
    deletePost: 'Padam post', confirmDelPost: 'Padam post ini? Tak boleh undo tau.',
    confirm: 'Padam', cancel: 'Batal',
    deleted: 'Dah dipadam', savedToast: 'Disimpan ⭐', unsavedToast: 'Simpanan dibuang',
    likeHint: 'Double tap pun boleh like ❤️',
    waMsg: 'Hi {name}! Nampak post makanan awak kat Foody, nak tanya sikit 😋',
    soundHint: 'Tekan untuk bunyi 🔊',
    justNow: 'baru tadi', minAgo: '{n} minit lalu', hrAgo: '{n} jam lalu', dayAgo: '{n} hari lalu',
    loadFail: 'Gagal dimuat, cuba lagi',
    tapToPost: 'Post makanan anda',
    search: 'Cari', searchPh: 'Cari makanan, pengguna, #tag…',
    trendingTags: 'Tag hangat 🔥', secTags: 'Tag', secUsers: 'Pengguna', secPosts: 'Makanan',
    noResults: 'Tiada hasil… cuba kata lain?',
    nPosts: '{n} post',
    searchTip: 'Cuba cari "nasi lemak", kawasan, atau @nama',
    feedForYou: 'Cadangan', feedLatest: 'Terbaru',
    /* Profile */
    pfPosts: 'Kiriman', pfLikes: 'Suka',
    pfEdit: 'Edit profil', pfSave: 'Simpan', pfBioPh: 'Cerita pasal makanan / kedai anda…',
    pfBioEmptyMe: 'Tulis bio, biar orang kenal anda →', pfBioSaved: 'Bio dikemas kini ✅',
    pfWa: 'Hubungi WhatsApp', pfShare: 'Kongsi profil', pfShareCopied: 'Pautan profil disalin ✅',
    pfNoPosts: 'Belum ada kiriman', pfNotFound: 'Pengguna tidak dijumpai', pfMine: 'Profil saya',
    nSelected: '{n} dipilih', maxFiles: 'Maksimum {n} sahaja',
    pfUsername: 'Nama pengguna', pfChangePhoto: 'Tukar foto', pfSaved: 'Profil dikemas kini ✅',
    pfNote: 'Nota', pfNotePh: 'Tulis nota… (cth: spesial separuh harga 🦐)',
    pfMessage: 'Mesej', dmTitle: 'Mesej', dmPh: 'Taip mesej…', dmYou: 'Anda:',
    dmEmpty: 'Belum ada mesej. Buka profil orang & tekan「Mesej」untuk mula 💬', dmSayHi: 'Hantar mesej kepada @{name} 👋',
    pfFollow: 'Ikut', pfFollowed: 'Mengikut', pfFollowers: 'Pengikut', pfFollowing: 'Mengikuti', pfNobody: 'Tiada lagi', feedFollowing: 'Ikutan', feedEmptyFollow: 'Anda belum ikut sesiapa. Tekan avatar orang untuk ikut, kiriman mereka akan muncul di sini 👀',
    ntTitle: 'Notifikasi', ntLiked: 'suka kiriman anda', ntCommented: 'komen kiriman anda', ntFollowed: 'mula ikut anda', ntEmpty: 'Belum ada notifikasi. Bila orang suka, komen atau ikut anda, ia muncul di sini 🔔',
    plFoodies: 'Foodie', plMap: 'Buka di Google Maps', plNotFound: 'Belum ada kiriman untuk lokasi ini',
    siteAbout: 'Tentang', siteHours: 'Waktu operasi', siteAddress: 'Alamat', siteGallery: 'Hasil kami', siteMap: 'Peta', siteDraft: 'Draf · belum terbit, hanya anda nampak', siteUnpub: 'Laman ini belum diterbitkan',
    siteEditTitle: 'Edit laman saya', sitePreview: 'Lihat', siteCover: 'Gambar kover', siteCoverAdd: 'Muat naik kover', siteTitle: 'Nama / kedai', siteTaglineL: 'Slogan (satu ayat)', siteHoursPh: 'cth: Setiap hari 10:00–22:00', siteLinks: 'Butang pautan', siteAddLink: '+ Tambah pautan', sitePublishLabel: 'Terbitkan (orang lain boleh lihat)', siteSaved: 'Disimpan ✅', siteLinkLabelPh: 'Teks butang, cth Menu', siteMine: 'Laman saya', siteView: 'Lihat laman'
  },
  en: {
    langName: 'EN',
    tagline: "Malaysian food you can't stop scrolling 🍜",
    heroSub: 'Foody is a little corner for Malaysians to share & discover great food. Like it? Save it, or WhatsApp the person who shared it in one tap.',
    feat1t: 'Scroll like TikTok', feat1d: 'Full-screen FYP — one swipe, one delicious find',
    feat2t: 'Every post is tagged by region', feat2d: 'See where it is, go eat it',
    feat3t: 'One-tap WhatsApp', feat3d: 'Ask the sharer where it is and how much',
    browseGuest: 'Just browse (no account needed)',
    login: 'Log In', register: 'Sign Up',
    username: 'Foody username', usernamePh: 'e.g. Oscar',
    password: 'Foody password', passwordPh: 'at least 6 characters',
    phone: 'Phone number (WhatsApp)', phonePh: 'e.g. 011-1901 9070',
    state: 'State', statePh: 'Choose a state', city: 'City / area', cityPh: 'e.g. JB', placePh: '📍 Shop / place name (optional)',
    loginBtn: 'Log In', registerBtn: 'Create Account',
    welcomeBack: 'Welcome back', goFyp: 'Go to FYP →', logout: 'Log out',
    yourRegion: 'Your region',
    footerNote: 'Foody Beta · Made for Malaysian foodies ❤️ Free, no ads',
    errMissing: 'Please fill in everything',
    errBadUsername: 'Username must be 2-20 chars (letters, numbers, _)',
    errBadPassword: 'Password must be at least 6 characters',
    errBadPhone: 'Invalid phone number (e.g. 011-1901 9070)',
    errUsernameTaken: 'That username is taken — try another',
    errPhoneTaken: 'This phone number already has an account — one number, one account',
    errBadLogin: 'Wrong username or password',
    errTooMany: 'Too many attempts — take a 10 min break',
    errNet: 'Network hiccup — try again',
    errAuth: 'Please log in first',
    fypTitle: 'FYP', home: 'Home',
    upload: 'Post', uploadTitle: 'Share some food 🍜',
    chooseFile: 'Tap to choose a photo or video', changeFile: 'Change file',
    fromGallery: 'From your phone gallery / computer',
    captionPh: 'How good is it? Tell us…',
    regionLabel: 'Region (required)',
    postBtn: 'Post', posting: 'Uploading… please keep this page open',
    postOk: 'Posted! 🎉',
    allRegions: 'All regions', savedFilter: 'My saves',
    comments: 'Comments', commentPh: 'Add a comment…', send: 'Send',
    noComments: 'No comments yet — be the first 😎',
    emptyFeed: 'Nothing here yet…', emptyFeedSub: 'Be the first to share some food!',
    emptySaved: 'No saves yet', emptySavedSub: 'Tap the bookmark on posts you love',
    needAccount: 'You need a Foody account',
    needAccountDesc: 'Sign up / log in to like, comment, save, post food and WhatsApp sharers 😋',
    goLogin: 'Log in / Sign up', keepBrowsing: 'Keep browsing',
    volume: 'Volume', brightness: 'Brightness', muteLabel: 'Mute', playerSettings: 'Player settings',
    deletePost: 'Delete post', confirmDelPost: "Delete this post? This can't be undone.",
    confirm: 'Delete', cancel: 'Cancel',
    deleted: 'Deleted', savedToast: 'Saved ⭐', unsavedToast: 'Removed from saves',
    likeHint: 'Double-tap to like ❤️',
    waMsg: 'Hi {name}! Saw your food post on Foody — would love to know more 😋',
    soundHint: 'Tap for sound 🔊',
    justNow: 'just now', minAgo: '{n}m ago', hrAgo: '{n}h ago', dayAgo: '{n}d ago',
    loadFail: 'Failed to load — try again',
    tapToPost: 'Post your food',
    search: 'Search', searchPh: 'Search food, users, #tags…',
    trendingTags: 'Trending tags 🔥', secTags: 'Tags', secUsers: 'Users', secPosts: 'Food',
    noResults: 'Nothing found — try another word?',
    nPosts: '{n} posts',
    searchTip: 'Try "nasi lemak", a region, or @username',
    feedForYou: 'For You', feedLatest: 'Latest',
    /* Profile */
    pfPosts: 'Posts', pfLikes: 'Likes',
    pfEdit: 'Edit profile', pfSave: 'Save', pfBioPh: 'Tell people about your food / shop…',
    pfBioEmptyMe: 'Add a bio so people get to know you →', pfBioSaved: 'Bio updated ✅',
    pfWa: 'Contact on WhatsApp', pfShare: 'Share profile', pfShareCopied: 'Profile link copied ✅',
    pfNoPosts: 'No posts yet', pfNotFound: 'User not found', pfMine: 'My profile',
    nSelected: '{n} selected', maxFiles: 'Up to {n} only',
    pfUsername: 'Username', pfChangePhoto: 'Change photo', pfSaved: 'Profile updated ✅',
    pfNote: 'Note', pfNotePh: 'Leave a note… (e.g. half-price special 🦐)',
    pfMessage: 'Message', dmTitle: 'Messages', dmPh: 'Type a message…', dmYou: 'You:',
    dmEmpty: 'No messages yet. Open a profile and tap "Message" to start 💬', dmSayHi: 'Say hi to @{name} 👋',
    pfFollow: 'Follow', pfFollowed: 'Following', pfFollowers: 'Followers', pfFollowing: 'Following', pfNobody: 'Nobody yet', feedFollowing: 'Following', feedEmptyFollow: 'You are not following anyone yet. Tap a profile avatar to follow, and their posts show up here 👀',
    ntTitle: 'Notifications', ntLiked: 'liked your post', ntCommented: 'commented on your post', ntFollowed: 'followed you', ntEmpty: 'No notifications yet. When someone likes, comments or follows you, it shows up here 🔔',
    plFoodies: 'Foodies', plMap: 'Open in Google Maps', plNotFound: 'No posts for this place yet',
    siteAbout: 'About', siteHours: 'Opening hours', siteAddress: 'Address', siteGallery: 'Our dishes', siteMap: 'Map', siteDraft: 'Draft · not published, only you can see this', siteUnpub: 'This page is not published yet',
    siteEditTitle: 'Edit my page', sitePreview: 'View', siteCover: 'Cover image', siteCoverAdd: 'Upload cover', siteTitle: 'Name / shop', siteTaglineL: 'Tagline (one line)', siteHoursPh: 'e.g. Daily 10:00–22:00', siteLinks: 'Link buttons', siteAddLink: '+ Add a link', sitePublishLabel: 'Publish (others can see it)', siteSaved: 'Saved ✅', siteLinkLabelPh: 'Button text, e.g. Menu', siteMine: 'My page', siteView: 'View page'
  }
};

const LANGS = ['zh', 'ms', 'en'];

function detectLang() {
  const saved = localStorage.getItem('foody_lang');
  if (saved && LANGS.includes(saved)) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ms') || nav.startsWith('id')) return 'ms';
  return 'en';
}

let LANG = detectLang();

function t(key, vars) {
  let s = (DICT[LANG] && DICT[LANG][key]) || DICT.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  LANG = lang;
  localStorage.setItem('foody_lang', lang);
  applyLang();
  document.dispatchEvent(new CustomEvent('foody:lang'));
}

/* 把 data-i18n / data-i18n-ph / data-i18n-title 的元素翻译一遍 */
function applyLang() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : (LANG === 'ms' ? 'ms-MY' : 'en');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', t(el.dataset.i18nTitle));
  });
}

function errMsg(code) {
  const map = {
    missing: 'errMissing', bad_username: 'errBadUsername', bad_password: 'errBadPassword',
    bad_phone: 'errBadPhone', bad_state: 'errMissing', username_taken: 'errUsernameTaken',
    phone_taken: 'errPhoneTaken',
    bad_login: 'errBadLogin', too_many: 'errTooMany', auth: 'errAuth',
    file_too_big: 'errNet', bad_file: 'errNet', net: 'errNet'
  };
  if (code === 'file_too_big') return LANG === 'zh' ? '文件太大了（最多 150MB）' : LANG === 'ms' ? 'Fail terlalu besar (max 150MB)' : 'File too large (max 150MB)';
  if (code === 'bad_file') return LANG === 'zh' ? '只支持照片和视频哦' : LANG === 'ms' ? 'Gambar & video sahaja' : 'Photos & videos only';
  return t(map[code] || 'errNet');
}

function fmtAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('justNow');
  if (min < 60) return t('minAgo', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('hrAgo', { n: hr });
  return t('dayAgo', { n: Math.floor(hr / 24) });
}

/* ---------------- API ---------------- */
async function api(url, opts = {}) {
  const init = { credentials: 'same-origin', ...opts };
  if (init.body && !(init.body instanceof FormData)) {
    init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
    init.body = JSON.stringify(init.body);
  }
  let res;
  try { res = await fetch(url, init); }
  catch { throw Object.assign(new Error('net'), { code: 'net' }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'net'), { code: data.error || 'net', status: res.status });
  return data;
}

/* ---------------- 头像 ---------------- */
/* 有头像就放图，没有就显示用户名首字母（圆形外观由 CSS 控制） */
function fillAvatar(el, username, avatarUrl) {
  if (!el) return;
  if (avatarUrl) {
    el.textContent = '';
    const img = document.createElement('img');
    img.className = 'av-img';
    img.src = avatarUrl;
    img.alt = '';
    el.appendChild(img);
  } else {
    el.textContent = (username || '?').slice(0, 1).toUpperCase();
  }
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------------- 图标 ---------------- */
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.2S3 15.6 3 9.6C3 6.5 5.4 4.3 8 4.3c1.6 0 3.1.8 4 2.2.9-1.4 2.4-2.2 4-2.2 2.6 0 5 2.2 5 5.3 0 6-9 11.6-9 11.6Z"/></svg>',
  bubble: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8c-5.3 0-9.5 3.8-9.5 8.4 0 2.6 1.3 4.9 3.4 6.4-.1 1.2-.7 2.5-1.9 3.4 1.9.3 3.9-.4 5.1-1.2.9.2 1.9.3 2.9.3 5.3 0 9.5-3.8 9.5-8.4S17.3 2.8 12 2.8Z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 2.8h11c.6 0 1 .4 1 1v17.4l-6.5-4-6.5 4V3.8c0-.6.4-1 1-1Z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.1c-5.4 0-9.8 4.3-9.8 9.7 0 1.8.5 3.5 1.4 5L2.1 22l5.3-1.4c1.4.8 2.9 1.2 4.6 1.2 5.4 0 9.8-4.3 9.8-9.7S17.4 2.1 12 2.1Zm0 17.7c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3a7.6 7.6 0 0 1-1.2-4.2c0-4.3 3.6-7.8 8-7.8s8 3.5 8 7.8-3.6 7.9-8 7.9Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.2v5.6h3.6L13 19V5L7.6 9.2H4Z"/><path d="M15.5 8.4a4.6 4.6 0 0 1 0 7.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M17.8 5.6a8.2 8.2 0 0 1 0 12.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.2v5.6h3.6L13 19V5L7.6 9.2H4Z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7M6.5 7l.8 13c0 .6.5 1 1 1h7.4c.5 0 1-.4 1-1l.8-13M10 11v6M14 11v6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.4"/><circle cx="9" cy="17" r="2.4"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 11.1 20 3.8c.7-.3 1.4.4 1.1 1.1l-7.3 16.6c-.3.8-1.4.7-1.7-.1l-1.9-5.6c-.1-.3-.3-.5-.6-.6l-5.6-1.9c-.8-.3-.9-1.4-.1-1.7Z" opacity=".9"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.4 3.9 5.4 3.9 9S14.6 18.6 12 21c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.8S5.4 15.6 5.4 10a6.6 6.6 0 1 1 13.2 0c0 5.6-6.6 11.8-6.6 11.8Zm0-9.3a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.4c0-.8.9-1.3 1.6-.9l10 6.6c.6.4.6 1.3 0 1.7l-10 6.6c-.7.5-1.6 0-1.6-.9V5.4Z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 12S6 5.8 12 5.8c1.6 0 3 .4 4.3 1M21.5 12S18 18.2 12 18.2c-1.6 0-3-.4-4.3-1M4 20 20 4"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="M5 18.5 10.5 13l3 3 2.5-2.5 3.5 3.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.3l1.75 5.1a1 1 0 0 0 .62.62L19.5 9.8l-5.13 1.78a1 1 0 0 0-.62.62L12 17.3l-1.75-5.1a1 1 0 0 0-.62-.62L4.5 9.8l5.13-1.78a1 1 0 0 0 .62-.62L12 2.3Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l2.8 1.8"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2V20Z"/><path d="M14 7l3 3"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="M8.1 11 14.9 7.2M8.1 13l6.8 3.8"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16.5 5.4a3.2 3.2 0 0 1 0 6.1M17.5 19a5.5 5.5 0 0 0-2.4-4.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>'
};

/* 第一时间套用语言（页面各自再调一次以覆盖动态内容） */
document.addEventListener('DOMContentLoaded', applyLang);
