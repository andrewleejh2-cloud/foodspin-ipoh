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
    email: 'Email（选填）', emailPh: '如：you@email.com',
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
    pwChangeTitle: '修改密码', pwOldPh: '当前密码', pwNewPh: '新密码（至少 6 位）', pwChanged: '密码已修改 ✓', pwForgot: '忘记密码？',
    pwrTitle: '找回密码', pwrStep1Hint: '输入注册时的邮箱和电话，6 位验证码会发到你的邮箱', pwrEmailPh: '注册邮箱', pwrPhonePh: '注册电话',
    pwrSendCode: '发送验证码', pwrSent: '若账号匹配，验证码已发到邮箱，请查收后填写', pwrCodePh: '6 位验证码', pwrNewPwPh: '新密码（至少 6 位）',
    pwrReset: '重置密码', pwrResend: '重新发送', pwrDone: '密码已重置，请用新密码登录', pwrNeedFields: '请填邮箱和电话',
    sessTitle: '登录设备', sessCurrent: '当前设备', sessKick: '踢出', sessRevokeOthers: '退出其它所有设备', sessUnknown: '未知设备', sessDone: '已退出其它设备',
    delAccount: '注销账号', delWarn: '注销将永久删除你的账号和全部内容（帖子 / 评论 / 赞 / 关注 / 私信），不可恢复。', delPwPh: '输入密码确认', delConfirmBtn: '确认注销', delDone: '账号已注销',
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
    share: '分享', shareText: '在 Foody 看到 @{user} 分享的美食，快来看 🍜', shareCopied: '链接已复制 ✅', more: '更多',
    soundHint: '点击开启声音 🔊',
    justNow: '刚刚', minAgo: '{n} 分钟前', hrAgo: '{n} 小时前', dayAgo: '{n} 天前',
    loadFail: '加载失败了，下拉重试',
    tapToPost: '发布你的美食',
    search: '搜索', searchPh: '搜美食、用户、#标签…',
    trendingTags: '热门标签 🔥', secTags: '标签', secUsers: '用户', secPosts: '美食',
    exploreTitle: '探索美食 🧭', exploreSub: '按地区、热门地点、标签发现', exByState: '按地区逛', exHotPlaces: '热门地点', exEmpty: '还没有内容可探索，先去发帖吧 🍜',
    noResults: '什么都没找到…换个词试试？',
    nPosts: '{n} 个帖子',
    searchTip: '试试搜 “nasi lemak”、地区，或 @用户名',
    feedForYou: '推荐', feedLatest: '最新',
    navHome: '首页', navExplore: '探索', navPost: '发帖', navInbox: '消息', navMe: '我',
    backAgainExit: '再按一次离开 Foody',
    swipeHint: '上滑看更多',
    exTrending: '热门美食', followBtn: '关注',
    siteTabHome: '首页', siteTabMenu: '菜单', siteTabContact: '联系', siteTabShelf: '货架',
    siteShelfL: '货架（商品）', siteAddGood: '+ 添加货物', siteShelfHint: '可带走/包装的货物：瓶装酱料、零食、周边等', siteStatusL: '营业状态', statusHide: '不显示', statusOpen: '营业中', statusClosed: '打烊', shelfEditTitle: '管理货架', shelfManage: '管理货架', shelfView: '看主页',
    shopAdd: '加入', shopOrder: '用 WhatsApp 下单', shopTotal: '合计', shopApprox: '约', shopItemsN: '{n} 样', shopOrderHi: '你好！我想订购：', shopFrom: '— 来自 Foody', shopLoginToOrder: '登录后即可下单 🍜', shopSoldOut: '售罄', shopBadge: '店铺', shopMine: '我的店铺', shopView: '看店铺',
    siteThemeL: '配色主题', siteMenuL: '菜单', siteAddCat: '+ 添加分类', siteAddItem: '+ 添加菜品',
    siteCatNamePh: '分类名（如 招牌）', siteItemNamePh: '菜名', siteItemPricePh: '价格 (如 RM 8)', siteItemDescPh: '描述（选填）',
    pfSales: '销量', salesDaily: '近1天', salesWeekly: '近7天', salesMonthly: '近30天', salesNoData: '暂无数据', salesOrders: '单',
    webLink: '网站',
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
    pfBlock: '拉黑', pfUnblock: '取消拉黑', pfBlocked: '已拉黑', pfUnblocked: '已取消拉黑', pfBlockConfirm: '拉黑 @{name}？你们将互相看不到对方的内容，也不能私信。', pfBlockedNote: '你已拉黑此用户，看不到其内容',
    ntTitle: '通知', ntLiked: '赞了你的帖子', ntCommented: '评论了你的帖子', ntMention: '在评论里提到你', ntFollowed: '关注了你', ntNewPost: '发布了新帖子', editPost: '编辑帖子', reply: '回复', ntEmpty: '还没有通知。有人赞你、评论或关注你时，会出现在这里 🔔',
    plFoodies: '吃货', plMap: '在 Google 地图打开', plNotFound: '还没有这个地点的帖子',
    siteAbout: '关于', siteHours: '营业时间', siteAddress: '地址', siteGallery: '我们的出品', siteMap: '地图', siteDraft: '草稿 · 未发布，只有你看得到', siteUnpub: '这个网站还没发布',
    siteEditTitle: '编辑我的网站', sitePreview: '查看', siteCover: '封面图', siteCoverAdd: '上传封面', siteTitle: '名称 / 店名', siteTaglineL: '标语（一句话）', siteHoursPh: '如：每天 10:00–22:00', siteLinks: '链接按钮', siteAddLink: '+ 加一个链接', sitePublishLabel: '公开发布（别人才看得到）', siteSaved: '已保存 ✅', siteLinkLabelPh: '按钮文字，如 看菜单', siteMine: '我的网站', siteView: '查看网站',
    /* 举报 & 审核 */
    reportTitle: '举报', reportUser: '举报用户',
    reportReasonLabel: '选择原因', reportNotePh: '补充说明（选填）…', reportSubmit: '提交举报',
    reportNeedReason: '请先选一个原因', reportSent: '已收到你的举报，谢谢 🙏', reportSelf: '不能举报自己的内容',
    reason_spam: '垃圾广告', reason_inappropriate: '不当内容', reason_harassment: '骚扰辱骂', reason_misinfo: '虚假误导', reason_other: '其他', reason_auto: '系统自动标记',
    admEntry: '审核后台', admTitle: '审核后台 🛡️', admNoAccess: '你不是管理员，无法进入审核后台', admBack: '返回 FYP',
    admStatOpen: '待处理举报', admStatUsers: '用户', admStatPosts: '帖子', admStatComments: '留言', admStatBanned: '已封禁',
    admTabOpen: '待处理', admTabResolved: '已处理', admTabDismissed: '已驳回', admTabAll: '全部',
    admEmpty: '太好了，这里没有待处理的举报 🎉', admLoadFail: '加载失败，刷新重试',
    admReporter: '举报人', admAuto: '系统自动', admGone: '（内容已不存在）', admViewPost: '查看帖子',
    admDoDelete: '删除内容', admDoBan: '封禁作者', admDoDismiss: '驳回', admDoUnban: '解封作者',
    admConfirmDelete: '确定删除这条内容？不可恢复。', admConfirmBan: '确定封禁 @{name}？对方将无法登录或发帖（之后可解封）。',
    admDoneDelete: '内容已删除', admDoneBan: '已封禁', admDoneDismiss: '已驳回', admDoneUnban: '已解封', admBannedTag: '已封禁',
    admViewReports: '举报队列', admViewUsers: '用户', admViewProfile: '看主页', admUserPosts: '发帖 {n}', admUserJoined: '注册 {date}', admUserSearchPh: '搜索用户名…', admAdminTag: '管理员', admUsersEmpty: '没有用户', admReportCount: '举报 {n} 次', admAutoHidden: '已自动隐藏',
    admDoWarn: '警告', admDoMute: '禁言', admDoUnmute: '解禁', admMutedTag: '已禁言',
    admConfirmWarn: '给 @{name} 发一条警告？', admMuteDaysPrompt: '禁言多少天？（默认 7）',
    admDoneWarn: '已警告', admDoneMute: '已禁言', admDoneUnmute: '已解禁',
    warnNotice: '⚠️ 你收到一条管理员警告', warnDismiss: '知道了',
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
    email: 'Email (pilihan)', emailPh: 'cth: you@email.com',
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
    pwChangeTitle: 'Tukar kata laluan', pwOldPh: 'Kata laluan semasa', pwNewPh: 'Kata laluan baru (min 6 aksara)', pwChanged: 'Kata laluan ditukar ✓', pwForgot: 'Lupa kata laluan?',
    pwrTitle: 'Set semula kata laluan', pwrStep1Hint: 'Masukkan email & telefon pendaftaran; kod 6 digit akan dihantar ke email anda', pwrEmailPh: 'Email pendaftaran', pwrPhonePh: 'Telefon pendaftaran',
    pwrSendCode: 'Hantar kod', pwrSent: 'Jika akaun sepadan, kod telah dihantar ke email — sila semak', pwrCodePh: 'Kod 6 digit', pwrNewPwPh: 'Kata laluan baru (min 6 aksara)',
    pwrReset: 'Set semula', pwrResend: 'Hantar semula', pwrDone: 'Kata laluan ditetapkan semula — sila log masuk', pwrNeedFields: 'Isi email dan telefon',
    sessTitle: 'Peranti log masuk', sessCurrent: 'Peranti ini', sessKick: 'Keluarkan', sessRevokeOthers: 'Log keluar peranti lain', sessUnknown: 'Peranti tak dikenali', sessDone: 'Peranti lain dilog keluar',
    delAccount: 'Padam akaun', delWarn: 'Memadam akaun akan buang akaun & semua kandungan anda (pos / komen / suka / ikutan / mesej) secara kekal. Tak boleh undo.', delPwPh: 'Masukkan kata laluan untuk sahkan', delConfirmBtn: 'Sahkan padam', delDone: 'Akaun dipadam',
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
    share: 'Kongsi', shareText: 'Tengok makanan @{user} kongsi kat Foody 🍜', shareCopied: 'Pautan disalin ✅', more: 'Lagi',
    soundHint: 'Tekan untuk bunyi 🔊',
    justNow: 'baru tadi', minAgo: '{n} minit lalu', hrAgo: '{n} jam lalu', dayAgo: '{n} hari lalu',
    loadFail: 'Gagal dimuat, cuba lagi',
    tapToPost: 'Post makanan anda',
    search: 'Cari', searchPh: 'Cari makanan, pengguna, #tag…',
    trendingTags: 'Tag hangat 🔥', secTags: 'Tag', secUsers: 'Pengguna', secPosts: 'Makanan',
    exploreTitle: 'Terokai 🧭', exploreSub: 'Cari ikut kawasan, lokasi, tag', exByState: 'Ikut negeri', exHotPlaces: 'Lokasi popular', exEmpty: 'Belum ada apa-apa, post dulu 🍜',
    noResults: 'Tiada hasil… cuba kata lain?',
    nPosts: '{n} post',
    searchTip: 'Cuba cari "nasi lemak", kawasan, atau @nama',
    feedForYou: 'Cadangan', feedLatest: 'Terbaru',
    navHome: 'Utama', navExplore: 'Terokai', navPost: 'Kirim', navInbox: 'Mesej', navMe: 'Saya',
    backAgainExit: 'Tekan sekali lagi untuk keluar',
    swipeHint: 'Leret ke atas untuk lagi',
    exTrending: 'Popular', followBtn: 'Ikut',
    siteTabHome: 'Utama', siteTabMenu: 'Menu', siteTabContact: 'Hubungi', siteTabShelf: 'Rak',
    siteShelfL: 'Rak (Produk)', siteAddGood: '+ Tambah barang', siteShelfHint: 'Barang bungkus/bawa balik: sos botol, snek, dll', siteStatusL: 'Status kedai', statusHide: 'Jangan tunjuk', statusOpen: 'Buka', statusClosed: 'Tutup', shelfEditTitle: 'Urus rak', shelfManage: 'Urus rak', shelfView: 'Lihat profil',
    shopAdd: 'Tambah', shopOrder: 'Pesan via WhatsApp', shopTotal: 'Jumlah', shopApprox: '~', shopItemsN: '{n} item', shopOrderHi: 'Hai! Saya nak pesan:', shopFrom: '— dari Foody', shopLoginToOrder: 'Log masuk untuk pesan 🍜', shopSoldOut: 'Habis', shopBadge: 'Kedai', shopMine: 'Kedai saya', shopView: 'Lihat kedai',
    siteThemeL: 'Tema', siteMenuL: 'Menu', siteAddCat: '+ Tambah kategori', siteAddItem: '+ Tambah item',
    siteCatNamePh: 'Nama kategori', siteItemNamePh: 'Nama hidangan', siteItemPricePh: 'Harga (cth RM 8)', siteItemDescPh: 'Penerangan (pilihan)',
    pfSales: 'Jualan', salesDaily: '1 hari', salesWeekly: '7 hari', salesMonthly: '30 hari', salesNoData: 'Belum ada data', salesOrders: 'pesanan',
    webLink: 'Tapak web',
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
    pfBlock: 'Sekat', pfUnblock: 'Nyahsekat', pfBlocked: 'Disekat', pfUnblocked: 'Nyahsekat selesai', pfBlockConfirm: 'Sekat @{name}? Anda takkan nampak kandungan satu sama lain & tak boleh mesej.', pfBlockedNote: 'Anda telah sekat pengguna ini',
    ntTitle: 'Notifikasi', ntLiked: 'suka kiriman anda', ntCommented: 'komen kiriman anda', ntMention: 'sebut anda dalam komen', ntFollowed: 'mula ikut anda', ntNewPost: 'siar kiriman baru', editPost: 'Edit kiriman', reply: 'Balas', ntEmpty: 'Belum ada notifikasi. Bila orang suka, komen atau ikut anda, ia muncul di sini 🔔',
    plFoodies: 'Foodie', plMap: 'Buka di Google Maps', plNotFound: 'Belum ada kiriman untuk lokasi ini',
    siteAbout: 'Tentang', siteHours: 'Waktu operasi', siteAddress: 'Alamat', siteGallery: 'Hasil kami', siteMap: 'Peta', siteDraft: 'Draf · belum terbit, hanya anda nampak', siteUnpub: 'Tapak web ini belum diterbitkan',
    siteEditTitle: 'Edit tapak web saya', sitePreview: 'Lihat', siteCover: 'Gambar kover', siteCoverAdd: 'Muat naik kover', siteTitle: 'Nama / kedai', siteTaglineL: 'Slogan (satu ayat)', siteHoursPh: 'cth: Setiap hari 10:00–22:00', siteLinks: 'Butang pautan', siteAddLink: '+ Tambah pautan', sitePublishLabel: 'Terbitkan (orang lain boleh lihat)', siteSaved: 'Disimpan ✅', siteLinkLabelPh: 'Teks butang, cth Menu', siteMine: 'Tapak web saya', siteView: 'Lihat tapak web',
    reportTitle: 'Lapor', reportUser: 'Lapor pengguna',
    reportReasonLabel: 'Pilih sebab', reportNotePh: 'Maklumat tambahan (pilihan)…', reportSubmit: 'Hantar laporan',
    reportNeedReason: 'Pilih sebab dulu', reportSent: 'Laporan diterima, terima kasih 🙏', reportSelf: 'Tak boleh lapor kandungan sendiri',
    reason_spam: 'Spam / iklan', reason_inappropriate: 'Kandungan tak sesuai', reason_harassment: 'Gangguan / buli', reason_misinfo: 'Maklumat palsu', reason_other: 'Lain-lain', reason_auto: 'Tanda automatik',
    admEntry: 'Panel moderasi', admTitle: 'Panel moderasi 🛡️', admNoAccess: 'Anda bukan admin', admBack: 'Kembali ke FYP',
    admStatOpen: 'Laporan baru', admStatUsers: 'Pengguna', admStatPosts: 'Kiriman', admStatComments: 'Komen', admStatBanned: 'Disekat',
    admTabOpen: 'Belum selesai', admTabResolved: 'Selesai', admTabDismissed: 'Ditolak', admTabAll: 'Semua',
    admEmpty: 'Tiada laporan tertunggak 🎉', admLoadFail: 'Gagal dimuat, cuba lagi',
    admReporter: 'Pelapor', admAuto: 'Automatik', admGone: '(Kandungan tiada)', admViewPost: 'Lihat kiriman',
    admDoDelete: 'Padam kandungan', admDoBan: 'Sekat penyiar', admDoDismiss: 'Tolak', admDoUnban: 'Nyahsekat',
    admConfirmDelete: 'Padam kandungan ini? Tak boleh undo.', admConfirmBan: 'Sekat @{name}? Mereka tak boleh log masuk / post (boleh nyahsekat kemudian).',
    admDoneDelete: 'Kandungan dipadam', admDoneBan: 'Telah disekat', admDoneDismiss: 'Ditolak', admDoneUnban: 'Dinyahsekat', admBannedTag: 'Disekat',
    admViewReports: 'Laporan', admViewUsers: 'Pengguna', admViewProfile: 'Lihat profil', admUserPosts: '{n} pos', admUserJoined: 'Sertai {date}', admUserSearchPh: 'Cari nama…', admAdminTag: 'Admin', admUsersEmpty: 'Tiada pengguna', admReportCount: '{n} laporan', admAutoHidden: 'Auto-sembunyi',
    admDoWarn: 'Beri amaran', admDoMute: 'Senyapkan', admDoUnmute: 'Nyahsenyap', admMutedTag: 'Disenyap',
    admConfirmWarn: 'Beri amaran kepada @{name}?', admMuteDaysPrompt: 'Senyap berapa hari? (default 7)',
    admDoneWarn: 'Amaran dihantar', admDoneMute: 'Disenyapkan', admDoneUnmute: 'Dinyahsenyap',
    warnNotice: '⚠️ Anda menerima amaran daripada admin', warnDismiss: 'Faham',
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
    email: 'Email (optional)', emailPh: 'e.g. you@email.com',
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
    pwChangeTitle: 'Change password', pwOldPh: 'Current password', pwNewPh: 'New password (min 6 chars)', pwChanged: 'Password changed ✓', pwForgot: 'Forgot password?',
    pwrTitle: 'Reset password', pwrStep1Hint: 'Enter your registered email & phone; a 6-digit code goes to your email', pwrEmailPh: 'Registered email', pwrPhonePh: 'Registered phone',
    pwrSendCode: 'Send code', pwrSent: 'If the account matches, a code was sent to the email — please check', pwrCodePh: '6-digit code', pwrNewPwPh: 'New password (min 6 chars)',
    pwrReset: 'Reset password', pwrResend: 'Resend', pwrDone: 'Password reset — please log in', pwrNeedFields: 'Enter email and phone',
    sessTitle: 'Login devices', sessCurrent: 'This device', sessKick: 'Sign out', sessRevokeOthers: 'Sign out other devices', sessUnknown: 'Unknown device', sessDone: 'Other devices signed out',
    delAccount: 'Delete account', delWarn: 'Deleting your account permanently removes it and all your content (posts / comments / likes / follows / messages). This cannot be undone.', delPwPh: 'Enter password to confirm', delConfirmBtn: 'Confirm delete', delDone: 'Account deleted',
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
    share: 'Share', shareText: "Check out @{user}'s food on Foody 🍜", shareCopied: 'Link copied ✅', more: 'More',
    soundHint: 'Tap for sound 🔊',
    justNow: 'just now', minAgo: '{n}m ago', hrAgo: '{n}h ago', dayAgo: '{n}d ago',
    loadFail: 'Failed to load — try again',
    tapToPost: 'Post your food',
    search: 'Search', searchPh: 'Search food, users, #tags…',
    trendingTags: 'Trending tags 🔥', secTags: 'Tags', secUsers: 'Users', secPosts: 'Food',
    exploreTitle: 'Explore 🧭', exploreSub: 'Discover by region, place, tags', exByState: 'By region', exHotPlaces: 'Hot places', exEmpty: 'Nothing to explore yet — post something 🍜',
    noResults: 'Nothing found — try another word?',
    nPosts: '{n} posts',
    searchTip: 'Try "nasi lemak", a region, or @username',
    feedForYou: 'For You', feedLatest: 'Latest',
    navHome: 'Home', navExplore: 'Explore', navPost: 'Post', navInbox: 'Inbox', navMe: 'Me',
    backAgainExit: 'Press back again to exit',
    swipeHint: 'Swipe up for more',
    exTrending: 'Trending', followBtn: 'Follow',
    siteTabHome: 'Home', siteTabMenu: 'Menu', siteTabContact: 'Contact', siteTabShelf: 'Shelf',
    siteShelfL: 'Shelf (Products)', siteAddGood: '+ Add product', siteShelfHint: 'Packaged/takeaway goods: bottled sauce, snacks, merch', siteStatusL: 'Status', statusHide: 'Hide', statusOpen: 'Open', statusClosed: 'Closed', shelfEditTitle: 'Manage shelf', shelfManage: 'Manage shelf', shelfView: 'View profile',
    shopAdd: 'Add', shopOrder: 'Order via WhatsApp', shopTotal: 'Total', shopApprox: '~', shopItemsN: '{n} item(s)', shopOrderHi: "Hi! I'd like to order:", shopFrom: '— via Foody', shopLoginToOrder: 'Log in to order 🍜', shopSoldOut: 'Sold out', shopBadge: 'Shop', shopMine: 'My shop', shopView: 'View shop',
    siteThemeL: 'Theme', siteMenuL: 'Menu', siteAddCat: '+ Add category', siteAddItem: '+ Add item',
    siteCatNamePh: 'Category name', siteItemNamePh: 'Dish name', siteItemPricePh: 'Price (e.g. RM 8)', siteItemDescPh: 'Description (optional)',
    pfSales: 'Sales', salesDaily: '1 day', salesWeekly: '7 days', salesMonthly: '30 days', salesNoData: 'No data yet', salesOrders: 'orders',
    webLink: 'Website',
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
    pfBlock: 'Block', pfUnblock: 'Unblock', pfBlocked: 'Blocked', pfUnblocked: 'Unblocked', pfBlockConfirm: "Block @{name}? You won't see each other's content and can't message.", pfBlockedNote: "You've blocked this user",
    ntTitle: 'Notifications', ntLiked: 'liked your post', ntCommented: 'commented on your post', ntMention: 'mentioned you in a comment', ntFollowed: 'followed you', ntNewPost: 'posted something new', editPost: 'Edit post', reply: 'Reply', ntEmpty: 'No notifications yet. When someone likes, comments or follows you, it shows up here 🔔',
    plFoodies: 'Foodies', plMap: 'Open in Google Maps', plNotFound: 'No posts for this place yet',
    siteAbout: 'About', siteHours: 'Opening hours', siteAddress: 'Address', siteGallery: 'Our dishes', siteMap: 'Map', siteDraft: 'Draft · not published, only you can see this', siteUnpub: 'This website is not published yet',
    siteEditTitle: 'Edit my website', sitePreview: 'View', siteCover: 'Cover image', siteCoverAdd: 'Upload cover', siteTitle: 'Name / shop', siteTaglineL: 'Tagline (one line)', siteHoursPh: 'e.g. Daily 10:00–22:00', siteLinks: 'Link buttons', siteAddLink: '+ Add a link', sitePublishLabel: 'Publish (others can see it)', siteSaved: 'Saved ✅', siteLinkLabelPh: 'Button text, e.g. Menu', siteMine: 'My website', siteView: 'View website',
    reportTitle: 'Report', reportUser: 'Report user',
    reportReasonLabel: 'Choose a reason', reportNotePh: 'Add details (optional)…', reportSubmit: 'Submit report',
    reportNeedReason: 'Pick a reason first', reportSent: 'Report received, thank you 🙏', reportSelf: "You can't report your own content",
    reason_spam: 'Spam / ads', reason_inappropriate: 'Inappropriate', reason_harassment: 'Harassment', reason_misinfo: 'Misleading info', reason_other: 'Other', reason_auto: 'Auto-flagged',
    admEntry: 'Moderation', admTitle: 'Moderation 🛡️', admNoAccess: 'You are not an admin', admBack: 'Back to FYP',
    admStatOpen: 'Open reports', admStatUsers: 'Users', admStatPosts: 'Posts', admStatComments: 'Comments', admStatBanned: 'Banned',
    admTabOpen: 'Open', admTabResolved: 'Resolved', admTabDismissed: 'Dismissed', admTabAll: 'All',
    admEmpty: 'All clear — no open reports 🎉', admLoadFail: 'Failed to load, try again',
    admReporter: 'Reporter', admAuto: 'Auto', admGone: '(Content no longer exists)', admViewPost: 'View post',
    admDoDelete: 'Delete content', admDoBan: 'Ban author', admDoDismiss: 'Dismiss', admDoUnban: 'Unban author',
    admConfirmDelete: 'Delete this content? Cannot be undone.', admConfirmBan: 'Ban @{name}? They cannot log in or post (you can unban later).',
    admDoneDelete: 'Content deleted', admDoneBan: 'Banned', admDoneDismiss: 'Dismissed', admDoneUnban: 'Unbanned', admBannedTag: 'Banned',
    admViewReports: 'Reports', admViewUsers: 'Users', admViewProfile: 'View profile', admUserPosts: '{n} posts', admUserJoined: 'Joined {date}', admUserSearchPh: 'Search username…', admAdminTag: 'Admin', admUsersEmpty: 'No users', admReportCount: '{n} reports', admAutoHidden: 'Auto-hidden',
    admDoWarn: 'Warn', admDoMute: 'Mute', admDoUnmute: 'Unmute', admMutedTag: 'Muted',
    admConfirmWarn: 'Send a warning to @{name}?', admMuteDaysPrompt: 'Mute for how many days? (default 7)',
    admDoneWarn: 'Warned', admDoneMute: 'Muted', admDoneUnmute: 'Unmuted',
    warnNotice: '⚠️ You have a warning from a moderator', warnDismiss: 'Got it',
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
  if (code === 'banned') return LANG === 'zh' ? '你的账号已被限制，暂时无法操作' : LANG === 'ms' ? 'Akaun anda disekat buat masa ini' : 'Your account is restricted';
  if (code === 'muted') return LANG === 'zh' ? '你被临时禁言了，暂时不能发帖 / 评论 / 私信' : LANG === 'ms' ? 'Anda disenyapkan sementara — tak boleh post / komen / mesej' : "You're temporarily muted — can't post, comment or message";
  if (code === 'wrong_password') return LANG === 'zh' ? '当前密码不对' : LANG === 'ms' ? 'Kata laluan semasa salah' : 'Current password is wrong';
  if (code === 'bad_code') return LANG === 'zh' ? '验证码不对' : LANG === 'ms' ? 'Kod salah' : 'Wrong code';
  if (code === 'expired') return LANG === 'zh' ? '验证码已过期，请重新获取' : LANG === 'ms' ? 'Kod tamat tempoh — minta semula' : 'Code expired — request a new one';
  if (code === 'no_request') return LANG === 'zh' ? '请先获取验证码' : LANG === 'ms' ? 'Sila minta kod dahulu' : 'Request a code first';
  if (code === 'bad_email') return LANG === 'zh' ? '邮箱格式不对' : LANG === 'ms' ? 'Format email tak betul' : 'Invalid email address';
  if (code === 'email_taken') return LANG === 'zh' ? '这个邮箱已经注册过账号了' : LANG === 'ms' ? 'Email ini sudah ada akaun' : 'This email already has an account';
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
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-1.6 3.6L16 11H5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.6-3 7.9-7 9-4-1.1-7-4.4-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.34 3.27a1 1 0 0 1 1.32 0l8 7a1 1 0 0 1 .34.75V20a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.4a1 1 0 0 0-1-1h-2.6a1 1 0 0 0-1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8.98a1 1 0 0 1 .34-.75l8-7Z"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M15.4 8.6 13.5 13.5 8.6 15.4 10.5 10.5 15.4 8.6Z" fill="currentColor" stroke="none"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13l6-6 6 6M6 18l6-6 6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="16" y="9" width="4" height="11" rx="1"/></svg>'
};

/* ---------------- 举报弹窗（通用：任意页面引入 shared.js 即可调用 openReport）---------------- */
let _reportTarget = null;
function ensureReportDom() {
  if (document.getElementById('reportOverlay')) return;
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'reportOverlay';
  ov.innerHTML =
    '<div class="modal report-modal">' +
    '  <h3><span id="reportTitle"></span><button class="x" id="reportClose"></button></h3>' +
    '  <div class="report-reasons" id="reportReasons"></div>' +
    '  <div class="field"><textarea id="reportNote" rows="2" maxlength="200"></textarea></div>' +
    '  <div class="modal-actions">' +
    '    <button class="btn-ghost" id="reportCancel"></button>' +
    '    <button class="btn" id="reportSubmit"></button>' +
    '  </div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.querySelector('#reportClose').innerHTML = ICONS.close;
  ov.querySelector('#reportClose').addEventListener('click', closeReport);
  ov.querySelector('#reportCancel').addEventListener('click', closeReport);
  ov.querySelector('#reportSubmit').addEventListener('click', submitReport);
  ov.addEventListener('click', (e) => { if (e.target === ov) closeReport(); });
}

/* target = { type:'post'|'comment'|'user', targetId, name? } */
function openReport(target) {
  ensureReportDom();
  _reportTarget = Object.assign({ reason: null }, target);
  const ov = document.getElementById('reportOverlay');
  ov.querySelector('#reportTitle').textContent =
    target.type === 'user' ? t('reportUser') + (target.name ? ' @' + target.name : '') : t('reportTitle');
  ov.querySelector('#reportCancel').textContent = t('cancel');
  ov.querySelector('#reportSubmit').textContent = t('reportSubmit');
  const note = ov.querySelector('#reportNote');
  note.value = '';
  note.placeholder = t('reportNotePh');
  const box = ov.querySelector('#reportReasons');
  box.innerHTML = '';
  for (const r of ['spam', 'inappropriate', 'harassment', 'misinfo', 'other']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reason-chip';
    b.textContent = t('reason_' + r);
    b.addEventListener('click', () => {
      _reportTarget.reason = r;
      box.querySelectorAll('.reason-chip').forEach(x => x.classList.toggle('on', x === b));
    });
    box.appendChild(b);
  }
  ov.classList.add('show');
}

function closeReport() {
  const ov = document.getElementById('reportOverlay');
  if (ov) ov.classList.remove('show');
  _reportTarget = null;
}

async function submitReport() {
  if (!_reportTarget) return;
  if (!_reportTarget.reason) { toast(t('reportNeedReason')); return; }
  const ov = document.getElementById('reportOverlay');
  const btn = ov.querySelector('#reportSubmit');
  btn.disabled = true;
  try {
    await api('/api/reports', {
      method: 'POST',
      body: {
        type: _reportTarget.type,
        targetId: _reportTarget.targetId,
        reason: _reportTarget.reason,
        note: ov.querySelector('#reportNote').value.trim()
      }
    });
    closeReport();
    toast(t('reportSent'));
  } catch (e) {
    if (e.code === 'self') toast(t('reportSelf'));
    else toast(errMsg(e.code));
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- 修改密码 / 找回密码 弹窗（通用，任意页面引入 shared.js 即可调用）---------------- */
function ensurePwDom() {
  if (document.getElementById('pwOverlay')) return;
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'pwOverlay';
  ov.innerHTML = '<div class="modal pw-modal"><h3><span id="pwTitle"></span><button class="x" id="pwClose"></button></h3><div id="pwBody"></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#pwClose').innerHTML = ICONS.close;
  ov.querySelector('#pwClose').addEventListener('click', closePw);
  ov.addEventListener('click', (e) => { if (e.target === ov) closePw(); });
}
function closePw() { const ov = document.getElementById('pwOverlay'); if (ov) ov.classList.remove('show'); }
function pwField(id, ph, type) { return '<div class="field"><input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '" autocomplete="off"></div>'; }

// 修改密码（登录态）
function openChangePassword() {
  ensurePwDom();
  const ov = document.getElementById('pwOverlay');
  ov.querySelector('#pwTitle').textContent = t('pwChangeTitle');
  ov.querySelector('#pwBody').innerHTML =
    pwField('pwOld', t('pwOldPh'), 'password') + pwField('pwNew', t('pwNewPh'), 'password') +
    '<div class="pw-forgot"><a id="pwForgotLink">' + t('pwForgot') + '</a></div>' +
    '<div class="modal-actions"><button class="btn-ghost" id="pwCancel">' + t('cancel') + '</button><button class="btn" id="pwSubmit">' + t('pwChangeTitle') + '</button></div>';
  ov.querySelector('#pwCancel').addEventListener('click', closePw);
  ov.querySelector('#pwForgotLink').addEventListener('click', () => { closePw(); openPasswordReset(); });
  ov.querySelector('#pwSubmit').addEventListener('click', async () => {
    const btn = ov.querySelector('#pwSubmit'); btn.disabled = true;
    try {
      await api('/api/me/password', { method: 'POST', body: { oldPassword: ov.querySelector('#pwOld').value, newPassword: ov.querySelector('#pwNew').value } });
      toast(t('pwChanged')); closePw();
    } catch (e) { toast(errMsg(e.code)); } finally { btn.disabled = false; }
  });
  ov.classList.add('show');
}

// 找回密码（两步：邮箱+电话 → 收码填新密码）
function openPasswordReset(prefillEmail) {
  ensurePwDom();
  const ov = document.getElementById('pwOverlay');
  ov.querySelector('#pwTitle').textContent = t('pwrTitle');
  pwResetStep1(ov, prefillEmail || '');
  ov.classList.add('show');
}
function pwResetStep1(ov, email) {
  ov.querySelector('#pwBody').innerHTML =
    '<p class="pw-hint">' + t('pwrStep1Hint') + '</p>' + pwField('pwrEmail', t('pwrEmailPh'), 'email') + pwField('pwrPhone', t('pwrPhonePh'), 'tel') +
    '<div class="modal-actions"><button class="btn-ghost" id="pwCancel">' + t('cancel') + '</button><button class="btn" id="pwrSend">' + t('pwrSendCode') + '</button></div>';
  ov.querySelector('#pwrEmail').value = email;
  ov.querySelector('#pwCancel').addEventListener('click', closePw);
  ov.querySelector('#pwrSend').addEventListener('click', async () => {
    const em = ov.querySelector('#pwrEmail').value.trim(), ph = ov.querySelector('#pwrPhone').value.trim();
    if (!em || !ph) { toast(t('pwrNeedFields')); return; }
    const btn = ov.querySelector('#pwrSend'); btn.disabled = true;
    try { await api('/api/auth/reset/request', { method: 'POST', body: { email: em, phone: ph } }); toast(t('pwrSent')); pwResetStep2(ov, em, ph); }
    catch (e) { toast(errMsg(e.code)); } finally { btn.disabled = false; }
  });
}
function pwResetStep2(ov, email, phone) {
  ov.querySelector('#pwBody').innerHTML =
    '<p class="pw-hint">' + t('pwrSent') + '</p>' + pwField('pwrCode', t('pwrCodePh'), 'text') + pwField('pwrNew', t('pwrNewPwPh'), 'password') +
    '<div class="pw-forgot"><a id="pwrResend">' + t('pwrResend') + '</a></div>' +
    '<div class="modal-actions"><button class="btn-ghost" id="pwCancel">' + t('cancel') + '</button><button class="btn" id="pwrReset">' + t('pwrReset') + '</button></div>';
  ov.querySelector('#pwCancel').addEventListener('click', closePw);
  ov.querySelector('#pwrResend').addEventListener('click', () => pwResetStep1(ov, email));
  ov.querySelector('#pwrReset').addEventListener('click', async () => {
    const btn = ov.querySelector('#pwrReset'); btn.disabled = true;
    try {
      await api('/api/auth/reset/confirm', { method: 'POST', body: { email, phone, code: ov.querySelector('#pwrCode').value.trim(), newPassword: ov.querySelector('#pwrNew').value } });
      toast(t('pwrDone')); closePw();
      setTimeout(() => { if (!location.pathname.endsWith('index.html') && location.pathname !== '/') location.href = 'index.html'; }, 700);
    } catch (e) { toast(errMsg(e.code)); } finally { btn.disabled = false; }
  });
}

/* ---------------- 当前用户（缓存：整页只请求一次 /api/me，多处复用）---------------- */
let _mePromise = null;
function getMe() {
  if (!_mePromise) _mePromise = api('/api/me').catch(() => ({ user: null }));
  return _mePromise;
}

/* 管理员警告提示条：登录用户若有未读警告，顶部显示一条可关闭的提示；关掉即标记已读。 */
async function maybeShowWarning() {
  let me; try { me = await getMe(); } catch { return; }
  if (!me || !me.warning || document.querySelector('.warn-banner')) return;
  const w = me.warning;
  const bar = document.createElement('div'); bar.className = 'warn-banner';
  const txt = document.createElement('span'); txt.className = 'wb-txt';
  txt.textContent = t('warnNotice') + (w.note && !String(w.note).startsWith('report:') ? '：' + w.note : '');
  const x = document.createElement('button'); x.className = 'wb-x'; x.textContent = t('warnDismiss');
  x.addEventListener('click', () => { bar.remove(); api('/api/me/warnings/seen', { method: 'POST' }).catch(() => {}); });
  bar.append(txt, x);
  document.body.appendChild(bar);
}

/* ---------------- 底部导航栏（共享组件，TikTok 式 5 格）----------------
   只在主要 app 页挂载：首页(fyp) / 探索(explore) / 主页(profile)。
   落地页、后台、微站、消息子页不挂（消息/通知是带返回键的子视图）。
   样式跟随页面主题：FYP 深色磨砂，其余暖奶油色。 */
function mountBottomNav() {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const MOUNT = { 'fyp.html': 'home', 'explore.html': 'explore', 'profile.html': 'me' };
  if (!(path in MOUNT) || document.querySelector('.bottom-nav')) return;
  const activeKey = MOUNT[path];

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Foody');
  nav.innerHTML =
    `<a class="bn-brand" href="fyp.html"><img src="img/logo.svg" alt=""><span>Foody</span></a>` +
    `<a class="bn-item bn-home" href="fyp.html"><span class="bn-ic">${ICONS.home}</span><span class="bn-tx" data-i18n="navHome">${t('navHome')}</span></a>` +
    `<a class="bn-item bn-explore" href="explore.html"><span class="bn-ic">${ICONS.compass}</span><span class="bn-tx" data-i18n="navExplore">${t('navExplore')}</span></a>` +
    `<button class="bn-item bn-create" type="button"><span class="bn-ic">${ICONS.plus}</span><span class="bn-tx" data-i18n="navPost">${t('navPost')}</span></button>` +
    `<a class="bn-item bn-inbox" href="messages.html"><span class="bn-ic">${ICONS.bubble}<span class="bn-dot" hidden></span></span><span class="bn-tx" data-i18n="navInbox">${t('navInbox')}</span></a>` +
    `<a class="bn-item bn-me" href="index.html"><span class="bn-ic bn-av"></span><span class="bn-tx" data-i18n="navMe">${t('navMe')}</span></a>`;
  document.body.appendChild(nav);
  document.body.classList.add('has-bnav');

  if (activeKey === 'home') nav.querySelector('.bn-home').classList.add('on');
  if (activeKey === 'explore') nav.querySelector('.bn-explore').classList.add('on');

  nav.querySelector('.bn-create').addEventListener('click', () => {
    if (path === 'fyp.html') document.dispatchEvent(new Event('foody:compose'));
    else location.href = 'fyp.html?compose=1';
  });

  getMe().then(({ user }) => {
    const meLink = nav.querySelector('.bn-me');
    const av = nav.querySelector('.bn-av');
    if (user) {
      fillAvatar(av, user.username, user.avatar);
      meLink.setAttribute('href', 'profile.html?u=' + encodeURIComponent(user.username));
      if (activeKey === 'me') {
        const uParam = new URLSearchParams(location.search).get('u');
        if (!uParam || uParam.toLowerCase() === user.username.toLowerCase()) meLink.classList.add('on');
      }
      pollNavUnread(nav);
      setInterval(() => pollNavUnread(nav), 20000);
    } else {
      av.innerHTML = ICONS.users;
    }
  });
}

/* 合并未读：私信 + 通知 任一有未读，消息格就亮小红点 */
async function pollNavUnread(nav) {
  const [a, b] = await Promise.all([
    api('/api/me/unread').catch(() => ({ count: 0 })),
    api('/api/notifications/unread').catch(() => ({ count: 0 }))
  ]);
  const dot = nav.querySelector('.bn-inbox .bn-dot');
  if (dot) dot.hidden = !(((a.count || 0) + (b.count || 0)) > 0);
}

/* 通用购物车（店铺菜单 / profile 货架共用）：加购 → 底部订单条 → 一键生成 WhatsApp 清单。
   不碰在线支付。各页面用 FoodyCart.setWaUrl(商家WhatsApp)，再用 FoodyCart.makeBuy(key,item) 渲染加购控件。 */
const FoodyCart = (() => {
  const cart = new Map();      // key → { name, price, qty }
  const buyPaint = new Map();  // key → 重绘该件加购按钮
  let orderBar = null;
  let waUrl = null;
  let seller = null;   // 商家用户名，用于记销量
  function parsePrice(s) { const m = String(s || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }
  function money(n) { return 'RM' + (Math.round(n * 100) / 100); }
  function totals() {
    let count = 0, total = 0, unknown = false;
    for (const it of cart.values()) { count += it.qty; const pp = parsePrice(it.price); if (isNaN(pp)) unknown = true; else total += pp * it.qty; }
    return { count, total, unknown };
  }
  function setQty(key, it, qty) {
    qty = Math.max(0, Math.min(99, qty | 0));
    if (qty <= 0) cart.delete(key); else cart.set(key, { name: it.name, price: it.price, qty });
    const p = buyPaint.get(key); if (p) p();
    refreshBar();
  }
  function makeBuy(key, it) {
    const wrap = document.createElement('div'); wrap.className = 'mi-buy';
    if (it.soldOut) { const s = document.createElement('span'); s.className = 'mi-sold'; s.textContent = t('shopSoldOut'); wrap.appendChild(s); return wrap; }
    function paint() {
      const qty = (cart.get(key) || {}).qty || 0;
      wrap.innerHTML = '';
      if (qty <= 0) {
        const add = document.createElement('button'); add.type = 'button'; add.className = 'mi-add'; add.textContent = t('shopAdd');
        add.addEventListener('click', () => setQty(key, it, 1));
        wrap.appendChild(add);
      } else {
        const minus = document.createElement('button'); minus.type = 'button'; minus.className = 'mi-step'; minus.textContent = '−';
        minus.addEventListener('click', () => setQty(key, it, qty - 1));
        const n = document.createElement('span'); n.className = 'mi-qty'; n.textContent = qty;
        const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'mi-step'; plus.textContent = '＋';
        plus.addEventListener('click', () => setQty(key, it, qty + 1));
        wrap.append(minus, n, plus);
      }
    }
    buyPaint.set(key, paint);
    paint();
    return wrap;
  }
  function refreshBar() {
    if (orderBar) { orderBar.remove(); orderBar = null; }
    const { count, total, unknown } = totals();
    if (count <= 0) return;
    const bar = document.createElement('div'); bar.className = 'order-bar';
    const info = document.createElement('div'); info.className = 'ob-info';
    const cnt = document.createElement('span'); cnt.className = 'ob-cnt'; cnt.textContent = t('shopItemsN', { n: count });
    info.appendChild(cnt);
    if (total > 0) { const tt = document.createElement('span'); tt.className = 'ob-total'; tt.textContent = t('shopTotal') + ' ' + t('shopApprox') + ' ' + money(total) + (unknown ? '+' : ''); info.appendChild(tt); }
    const send = document.createElement('button'); send.type = 'button'; send.className = 'ob-send'; send.innerHTML = ICONS.whatsapp + '<span>' + t('shopOrder') + '</span>';
    send.addEventListener('click', sendOrder);
    bar.append(info, send);
    document.body.appendChild(bar);
    orderBar = bar;
  }
  function sendOrder() {
    if (!cart.size) return;
    if (!waUrl) { toast(t('shopLoginToOrder')); setTimeout(() => { location.href = 'index.html'; }, 900); return; }
    const { count, total, unknown } = totals();
    const lines = [];
    for (const it of cart.values()) lines.push('• ' + it.name + ' ×' + it.qty + (it.price ? ' — ' + it.price : ''));
    let msg = t('shopOrderHi') + '\n' + lines.join('\n');
    if (total > 0) msg += '\n' + t('shopTotal') + ': ' + t('shopApprox') + ' ' + money(total) + (unknown ? '+' : '');
    msg += '\n' + t('shopFrom');
    if (seller) api('/api/orders', { method: 'POST', body: { seller, count, total } }).catch(() => {});   // 记一笔销量（下单量）
    window.open(waUrl + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }
  return {
    setWaUrl(u, s) { waUrl = u; seller = s || null; },
    makeBuy, refreshBar,
    reset() { cart.clear(); buyPaint.clear(); if (orderBar) { orderBar.remove(); orderBar = null; } }
  };
})();

/* 第一时间套用语言（页面各自再调一次以覆盖动态内容） */
/* ---------------- 登录设备 / 会话管理 弹窗 ---------------- */
function ensureSessDom() {
  if (document.getElementById('sessOverlay')) return;
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'sessOverlay';
  ov.innerHTML = '<div class="modal sess-modal"><h3><span id="sessTitle"></span><button class="x" id="sessClose"></button></h3><div id="sessList"></div><div class="modal-actions"><button class="btn-ghost" id="sessRevokeOthers"></button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#sessClose').innerHTML = ICONS.close;
  ov.querySelector('#sessClose').addEventListener('click', closeSess);
  ov.addEventListener('click', (e) => { if (e.target === ov) closeSess(); });
}
function closeSess() { const ov = document.getElementById('sessOverlay'); if (ov) ov.classList.remove('show'); }
function openSessions() {
  ensureSessDom();
  const ov = document.getElementById('sessOverlay');
  ov.querySelector('#sessTitle').textContent = t('sessTitle');
  const ro = ov.querySelector('#sessRevokeOthers');
  ro.textContent = t('sessRevokeOthers');
  ro.onclick = async () => { try { await api('/api/me/sessions/revoke-others', { method: 'POST' }); toast(t('sessDone')); loadSessList(); } catch (e) { toast(errMsg(e.code)); } };
  ov.classList.add('show');
  loadSessList();
}
async function loadSessList() {
  const box = document.getElementById('sessList');
  box.innerHTML = '<div class="sess-loading">…</div>';
  let data; try { data = await api('/api/me/sessions'); } catch { box.innerHTML = ''; return; }
  box.innerHTML = '';
  for (const s of data.sessions) {
    const row = document.createElement('div'); row.className = 'sess-row' + (s.current ? ' cur' : '');
    const info = document.createElement('div'); info.className = 'sess-info';
    const dev = document.createElement('div'); dev.className = 'sess-dev'; dev.textContent = s.device || t('sessUnknown');
    const sub = document.createElement('div'); sub.className = 'sess-sub';
    sub.textContent = [s.ip, s.createdAt ? new Date(s.createdAt).toLocaleString() : ''].filter(Boolean).join(' · ');
    info.append(dev, sub);
    const act = document.createElement('div'); act.className = 'sess-act';
    if (s.current) {
      const tag = document.createElement('span'); tag.className = 'sess-cur-tag'; tag.textContent = t('sessCurrent'); act.appendChild(tag);
    } else {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sess-kick'; b.textContent = t('sessKick');
      b.onclick = async () => { try { await api('/api/me/sessions/' + encodeURIComponent(s.id), { method: 'DELETE' }); loadSessList(); } catch (e) { toast(errMsg(e.code)); } };
      act.appendChild(b);
    }
    row.append(info, act);
    box.appendChild(row);
  }
}

/* ---------------- 注销账号 弹窗（复用 pwOverlay 容器）---------------- */
function openDeleteAccount() {
  ensurePwDom();
  const ov = document.getElementById('pwOverlay');
  ov.querySelector('#pwTitle').textContent = t('delAccount');
  ov.querySelector('#pwBody').innerHTML =
    '<p class="pw-hint del-warn">' + t('delWarn') + '</p>' + pwField('delPw', t('delPwPh'), 'password') +
    '<div class="modal-actions"><button class="btn-ghost" id="pwCancel">' + t('cancel') + '</button><button class="btn btn-danger" id="delGo">' + t('delConfirmBtn') + '</button></div>';
  ov.querySelector('#pwCancel').addEventListener('click', closePw);
  ov.querySelector('#delGo').addEventListener('click', async () => {
    const btn = ov.querySelector('#delGo'); btn.disabled = true;
    try {
      await api('/api/me/delete', { method: 'POST', body: { password: ov.querySelector('#delPw').value } });
      toast(t('delDone')); closePw(); setTimeout(() => { location.href = 'index.html'; }, 700);
    } catch (e) { toast(errMsg(e.code)); btn.disabled = false; }
  });
  ov.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => { applyLang(); mountBottomNav(); maybeShowWarning(); });

/* PWA：注册 service worker（让 Foody 可加到主屏、离线兜底）。失败静默，不影响正常使用。 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

/* feed/lightbox 里的图与视频：禁右键菜单 + 禁拖拽（CSS 已禁 iOS 长按 callout，这里补桌面右键、
   安卓长按、跨浏览器拖拽）。只拦媒体本身，文案/号码/输入框不受影响。 */
function _isFeedMedia(t) {
  return t && (t.tagName === 'IMG' || t.tagName === 'VIDEO') && t.closest && t.closest('#feed, #lightbox');
}
document.addEventListener('contextmenu', (e) => { if (_isFeedMedia(e.target)) e.preventDefault(); });
document.addEventListener('dragstart', (e) => { if (_isFeedMedia(e.target)) e.preventDefault(); });
