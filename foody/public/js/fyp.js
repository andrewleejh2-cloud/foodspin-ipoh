/* Foody FYP：TikTok 式全屏滑动 feed */
(function () {
  const $ = (s) => document.querySelector(s);

  let ME = null;
  let STATES = [];
  const POSTS = new Map(); // id -> post 数据

  /* 播放设置（音量/亮度/静音），持久化 */
  const AV_KEY = 'foody_av';
  let AV = { vol: 70, bright: 100, muted: true };
  try { AV = { ...AV, ...(JSON.parse(localStorage.getItem(AV_KEY)) || {}) }; } catch {}
  function saveAV() { localStorage.setItem(AV_KEY, JSON.stringify(AV)); }

  const feedState = {
    offset: 0, hasMore: true, loading: false, state: '', saved: false,
    tag: '', user: '', q: '', startId: '', // 搜索筛选：标签 / 用户 / 关键词 / 起始帖子
    sort: 'hot' // hot=推荐算法, new=最新优先
  };

  const feed = $('#feed');
  const tpl = $('#tplSlide');
  let activeSlide = null;
  let userInteracted = false; // 浏览器自动播放政策：互动过才允许有声播放

  document.addEventListener('pointerdown', () => { userInteracted = true; }, { once: true, capture: true });

  /* ================= 工具 ================= */
  function fmtCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function needLogin() { $('#loginOverlay').classList.add('show'); }

  /* ================= 渲染帖子 ================= */
  function renderPost(p) {
    POSTS.set(p.id, p);
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;

    const wrap = node.querySelector('.media-wrap');
    const list = (p.media && p.media.length) ? p.media : [{ url: p.mediaUrl, type: p.mediaType }];

    // 单个媒体：全屏铺满（现状自动播放）；多个：Facebook 式网格拼图，点开看大图
    let media = null;  // 仅单媒体时存在，供声音/播放控制使用
    if (list.length === 1) {
      const m = list[0];
      if (m.type === 'video') {
        media = document.createElement('video');
        media.src = m.url;
        media.loop = true;
        media.playsInline = true;
        media.preload = 'metadata';
        media.muted = true;
      } else {
        media = document.createElement('img');
        media.src = m.url;
        media.alt = p.caption || 'Foody post';
        media.loading = 'lazy';
        node.querySelector('.media-bg').style.backgroundImage = `url("${encodeURI(m.url)}")`;
      }
      media.className = 'media';
      wrap.insertBefore(media, node.querySelector('.play-badge'));
    } else {
      node.classList.add('multi');   // 让自动播放 observer 跳过这帖
      node.querySelector('.media-bg').style.backgroundImage = `url("${encodeURI(list[0].url)}")`;
      wrap.insertBefore(buildMediaGrid(list, p), node.querySelector('.play-badge'));
    }
    applyAVTo(node);

    node.querySelector('.play-badge').innerHTML = ICONS.play;
    const soundHint = node.querySelector('.sound-hint');
    soundHint.textContent = t('soundHint');
    soundHint.addEventListener('click', (e) => {
      e.stopPropagation();
      AV.muted = false; saveAV(); syncSettingsUI(); applyAVAll();
      if (media && media.tagName === 'VIDEO') media.play().catch(() => {});
      soundHint.classList.remove('show');
    });

    // 文案
    const authorEl = node.querySelector('.author');
    authorEl.textContent = '@' + p.username;
    authorEl.addEventListener('click', (e) => {
      e.stopPropagation();
      location.href = 'profile.html?u=' + encodeURIComponent(p.username);
    });
    node.querySelector('.region-pill').innerHTML =
      ICONS.pin + '<span></span>';
    node.querySelector('.region-pill span').textContent = p.state + (p.city ? ' · ' + p.city : '');
    node.querySelector('.ago').textContent = fmtAgo(p.createdAt);
    node.querySelector('.ago').dataset.ts = p.createdAt;
    const cap = node.querySelector('.caption');
    renderCaption(cap, p.caption || '');
    cap.addEventListener('click', () => cap.classList.toggle('open'));

    // 右侧操作栏
    const avEl = node.querySelector('.avatar');
    fillAvatar(avEl, p.username, p.avatar);
    avEl.style.cursor = 'pointer';
    avEl.addEventListener('click', () => { location.href = 'profile.html?u=' + encodeURIComponent(p.username); });

    const likeBtn = node.querySelector('.like');
    likeBtn.querySelector('.ic').innerHTML = ICONS.heart;
    likeBtn.classList.toggle('liked', p.likedByMe);
    likeBtn.querySelector('.cnt').textContent = fmtCount(p.likeCount);
    likeBtn.addEventListener('click', () => toggleLike(p.id, node));

    const cmtBtn = node.querySelector('.cmt');
    cmtBtn.querySelector('.ic').innerHTML = ICONS.bubble;
    cmtBtn.querySelector('.cnt').textContent = fmtCount(p.commentCount);
    cmtBtn.addEventListener('click', () => openComments(p.id, node));

    const savBtn = node.querySelector('.sav');
    savBtn.querySelector('.ic').innerHTML = ICONS.bookmark;
    savBtn.classList.toggle('saved', p.savedByMe);
    savBtn.querySelector('.cnt').textContent = fmtCount(p.saveCount);
    savBtn.addEventListener('click', () => toggleSave(p.id, node));

    const waBtn = node.querySelector('.wa');
    waBtn.querySelector('.ic').innerHTML = ICONS.whatsapp;
    waBtn.addEventListener('click', () => {
      const post = POSTS.get(p.id);
      if (!ME || !post.waUrl) return needLogin();
      const msg = encodeURIComponent(t('waMsg', { name: post.username }));
      window.open(post.waUrl + '?text=' + msg, '_blank', 'noopener');
    });

    const mutBtn = node.querySelector('.mut');
    function paintMute() {
      mutBtn.querySelector('.ic').innerHTML = AV.muted ? ICONS.muted : ICONS.sound;
      mutBtn.querySelector('.cnt').textContent = AV.muted ? t('muteLabel') : fmtCount(Math.round(AV.vol)) + '%';
    }
    paintMute();
    mutBtn.addEventListener('click', () => {
      AV.muted = !AV.muted; saveAV(); syncSettingsUI(); applyAVAll();
      if (!AV.muted && media && media.tagName === 'VIDEO') media.play().catch(() => {});
    });
    node.paintMute = paintMute;

    if (p.mine) {
      const delBtn = node.querySelector('.del');
      delBtn.hidden = false;
      delBtn.querySelector('.ic').innerHTML = ICONS.trash;
      delBtn.querySelector('.cnt').textContent = t('confirm');
      delBtn.addEventListener('click', () => confirmDelete(p.id, node));
    }

    // 点按播放/暂停 + 双击点赞
    let tapTimer = null;
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.sound-hint') || e.target.closest('.caption')) return;
      if (tapTimer) { // 双击 → 点赞
        clearTimeout(tapTimer); tapTimer = null;
        heartBurst(wrap, e);
        const post = POSTS.get(p.id);
        if (!ME) return needLogin();
        if (!post.likedByMe) toggleLike(p.id, node);
      } else {
        tapTimer = setTimeout(() => {
          tapTimer = null;
          if (media && media.tagName === 'VIDEO') {
            if (media.paused) { media.play().catch(() => {}); node.classList.remove('paused'); }
            else { media.pause(); node.classList.add('paused'); }
          }
        }, 240);
      }
    });

    observer.observe(node);
    return node;
  }

  /* 多媒体帖：Facebook 式网格拼图（最多展示 4 格，第 4 格盖 +N）。点任意格开全屏查看器 */
  function buildMediaGrid(list, p) {
    const grid = document.createElement('div');
    grid.className = 'media-grid n' + Math.min(list.length, 4);
    list.slice(0, 4).forEach((m, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mg-cell';
      if (m.type === 'video') {
        const v = document.createElement('video');
        v.src = m.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
        const badge = document.createElement('span');
        badge.className = 'mg-play'; badge.innerHTML = ICONS.play;
        cell.append(v, badge);
      } else {
        const img = document.createElement('img');
        img.src = m.url; img.loading = 'lazy'; img.alt = '';
        cell.appendChild(img);
      }
      if (i === 3 && list.length > 4) {
        const more = document.createElement('span');
        more.className = 'mg-more';
        more.textContent = '+' + (list.length - 4);
        cell.appendChild(more);
      }
      cell.addEventListener('click', (e) => { e.stopPropagation(); openLightbox(list, i); });
      grid.appendChild(cell);
    });
    return grid;
  }

  /* ============ 多图查看器 lightbox ============ */
  const lb = $('#lightbox');
  const lbStage = $('#lbStage');
  let lbList = [], lbIdx = 0;
  $('#lbClose').innerHTML = ICONS.close;
  $('#lbPrev').innerHTML = ICONS.back;
  $('#lbNext').innerHTML = ICONS.back;   // CSS 水平翻转成向右箭头

  function openLightbox(list, index) {
    lbList = list; lbIdx = index || 0;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    paintLightbox();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    lbStage.innerHTML = '';   // 移除元素 → 停止视频播放
    lbList = [];
  }
  function lbGo(d) {
    if (lbList.length < 2) return;
    lbIdx = (lbIdx + d + lbList.length) % lbList.length;
    paintLightbox();
  }
  function paintLightbox() {
    lbStage.innerHTML = '';
    const m = lbList[lbIdx];
    let el;
    if (m.type === 'video') {
      el = document.createElement('video');
      el.src = m.url; el.controls = true; el.playsInline = true; el.autoplay = true; el.loop = true;
    } else {
      el = document.createElement('img');
      el.src = m.url; el.alt = '';
    }
    el.className = 'lb-media';
    lbStage.appendChild(el);
    const multi = lbList.length > 1;
    $('#lbCount').textContent = multi ? (lbIdx + 1) + ' / ' + lbList.length : '';
    $('#lbPrev').hidden = !multi;
    $('#lbNext').hidden = !multi;
    const dots = $('#lbDots');
    dots.hidden = !multi;
    dots.innerHTML = '';
    if (multi) lbList.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'lb-dot' + (i === lbIdx ? ' on' : '');
      dot.addEventListener('click', () => { lbIdx = i; paintLightbox(); });
      dots.appendChild(dot);
    });
  }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => lbGo(-1));
  $('#lbNext').addEventListener('click', () => lbGo(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lbGo(-1);
    else if (e.key === 'ArrowRight') lbGo(1);
  });
  let lbTouchX = null;
  lbStage.addEventListener('touchstart', (e) => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lbStage.addEventListener('touchend', (e) => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 45) lbGo(dx < 0 ? 1 : -1);
    lbTouchX = null;
  });

  /* 文案里的 #标签 渲染成可点击按钮 → 筛选该标签 */
  function renderCaption(el, text) {
    el.innerHTML = '';
    const re = /#([\p{L}\p{N}_]{1,30})/gu;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement('button');
      a.className = 'tag-link';
      a.textContent = m[0];
      const tg = m[1].toLowerCase();
      a.addEventListener('click', (e) => {
        e.stopPropagation();
        applySearchFilter({ tag: tg });
      });
      el.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  function heartBurst(wrap, e) {
    const rect = wrap.getBoundingClientRect();
    const h = document.createElement('div');
    h.className = 'heart-burst';
    h.innerHTML = ICONS.heart;
    h.style.left = (e.clientX - rect.left) + 'px';
    h.style.top = (e.clientY - rect.top) + 'px';
    wrap.appendChild(h);
    setTimeout(() => h.remove(), 800);
  }

  /* ================= 自动播放控制 ================= */
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const node = entry.target;
      const video = node.classList.contains('multi') ? null : node.querySelector('video');
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        activeSlide = node;
        if (video) {
          applyAVTo(node);
          node.classList.remove('paused');
          video.play().then(() => {
            if (!AV.muted && video.muted) showSoundHint(node);
          }).catch(() => {
            // 有声自动播放被浏览器挡 → 静音重试
            video.muted = true;
            video.play().catch(() => {});
            if (!AV.muted) showSoundHint(node);
          });
        }
      } else if (video) {
        video.pause();
        node.classList.remove('paused');
      }
    }
  }, { root: feed, threshold: [0, 0.6] });

  function showSoundHint(node) {
    if (userInteracted) return;
    node.querySelector('.sound-hint').classList.add('show');
  }

  function applyAVTo(node) {
    const media = node.querySelector('.media');
    if (!media) return;
    media.style.filter = `brightness(${AV.bright / 100})`;
    if (media.tagName === 'VIDEO') {
      media.volume = Math.min(1, Math.max(0, AV.vol / 100));
      media.muted = AV.muted || AV.vol === 0;
    }
    if (node.paintMute) node.paintMute();
    const hint = node.querySelector('.sound-hint');
    if (hint && (!AV.muted ? false : true)) hint.classList.remove('show');
  }

  function applyAVAll() {
    feed.querySelectorAll('.slide').forEach(applyAVTo);
  }

  /* ================= 加载 feed ================= */
  const sentinel = document.createElement('div');
  sentinel.className = 'feed-more';
  const moreObserver = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMore();
  }, { root: feed, rootMargin: '300px' });

  let loadingEl = null;
  function showLoading() {
    if (loadingEl) return;
    loadingEl = document.createElement('div');
    loadingEl.className = 'feed-state';
    loadingEl.innerHTML = '<div class="spinner"></div>';
    feed.appendChild(loadingEl);
  }
  function hideLoading() { if (loadingEl) { loadingEl.remove(); loadingEl = null; } }

  async function loadMore() {
    if (feedState.loading || !feedState.hasMore) return;
    feedState.loading = true;
    const first = feedState.offset === 0;
    if (first) showLoading();
    try {
      const q = new URLSearchParams({ limit: 8 });
      // 从搜索点进来：第一页用 start=帖子ID 定位，之后照常用 offset 翻页
      if (first && feedState.startId) q.set('start', feedState.startId);
      else q.set('offset', feedState.offset);
      if (feedState.state) q.set('state', feedState.state);
      if (feedState.saved) q.set('saved', '1');
      if (feedState.tag) q.set('tag', feedState.tag);
      if (feedState.user) q.set('user', feedState.user);
      if (feedState.q) q.set('q', feedState.q);
      if (feedState.sort === 'new') q.set('sort', 'new');
      const data = await api('/api/posts?' + q);
      hideLoading();
      sentinel.remove();
      for (const p of data.posts) feed.appendChild(renderPost(p));
      feedState.offset = (typeof data.offset === 'number' ? data.offset : feedState.offset) + data.posts.length;
      feedState.hasMore = data.hasMore;
      feedState.startId = '';
      if (first && data.posts.length === 0) showEmpty();
      else if (feedState.hasMore) { feed.appendChild(sentinel); moreObserver.observe(sentinel); }
    } catch (err) {
      hideLoading();
      if (first) showEmpty(true);
      else toast(t('loadFail'));
    }
    feedState.loading = false;
  }

  function showEmpty(isError) {
    const el = document.createElement('div');
    el.className = 'feed-state';
    if (isError) {
      el.innerHTML = `<div class="big">😵</div><h3>${t('loadFail')}</h3>`;
    } else if (feedState.saved) {
      el.innerHTML = `<div class="big">🔖</div><h3>${t('emptySaved')}</h3><p>${t('emptySavedSub')}</p>`;
    } else {
      el.innerHTML = `<div class="big">🍜</div><h3>${t('emptyFeed')}</h3><p>${t('emptyFeedSub')}</p>`;
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = t('tapToPost');
      btn.addEventListener('click', openUpload);
      el.appendChild(btn);
    }
    feed.appendChild(el);
  }

  function resetFeed() {
    observer.disconnect();
    moreObserver.disconnect();
    feed.innerHTML = '';
    POSTS.clear();
    Object.assign(feedState, { offset: 0, hasMore: true, loading: false });
    loadingEl = null;
    loadMore();
  }

  /* ================= 点赞 / 收藏 ================= */
  async function toggleLike(id, node) {
    if (!ME) return needLogin();
    const post = POSTS.get(id);
    const btn = node.querySelector('.like');
    // 乐观更新
    post.likedByMe = !post.likedByMe;
    post.likeCount += post.likedByMe ? 1 : -1;
    btn.classList.toggle('liked', post.likedByMe);
    btn.querySelector('.cnt').textContent = fmtCount(post.likeCount);
    try {
      const data = await api(`/api/posts/${id}/like`, { method: 'POST' });
      post.likedByMe = data.liked; post.likeCount = data.likeCount;
      btn.classList.toggle('liked', data.liked);
      btn.querySelector('.cnt').textContent = fmtCount(data.likeCount);
    } catch (err) {
      post.likedByMe = !post.likedByMe;
      post.likeCount += post.likedByMe ? 1 : -1;
      btn.classList.toggle('liked', post.likedByMe);
      btn.querySelector('.cnt').textContent = fmtCount(post.likeCount);
      if (err.code === 'auth') needLogin(); else toast(errMsg(err.code));
    }
  }

  async function toggleSave(id, node) {
    if (!ME) return needLogin();
    const post = POSTS.get(id);
    const btn = node.querySelector('.sav');
    post.savedByMe = !post.savedByMe;
    post.saveCount += post.savedByMe ? 1 : -1;
    btn.classList.toggle('saved', post.savedByMe);
    btn.querySelector('.cnt').textContent = fmtCount(post.saveCount);
    try {
      const data = await api(`/api/posts/${id}/save`, { method: 'POST' });
      post.savedByMe = data.saved; post.saveCount = data.saveCount;
      btn.classList.toggle('saved', data.saved);
      btn.querySelector('.cnt').textContent = fmtCount(data.saveCount);
      toast(data.saved ? t('savedToast') : t('unsavedToast'));
    } catch (err) {
      post.savedByMe = !post.savedByMe;
      post.saveCount += post.savedByMe ? 1 : -1;
      btn.classList.toggle('saved', post.savedByMe);
      btn.querySelector('.cnt').textContent = fmtCount(post.saveCount);
      if (err.code === 'auth') needLogin(); else toast(errMsg(err.code));
    }
  }

  /* ================= 删除 ================= */
  let pendingDelete = null;
  function confirmDelete(id, node) {
    pendingDelete = { id, node };
    $('#confirmOverlay').classList.add('show');
  }
  $('#confirmOk').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const { id, node } = pendingDelete;
    pendingDelete = null;
    $('#confirmOverlay').classList.remove('show');
    try {
      await api('/api/posts/' + id, { method: 'DELETE' });
      observer.unobserve(node);
      node.remove();
      POSTS.delete(id);
      toast(t('deleted'));
    } catch (err) { toast(errMsg(err.code)); }
  });
  $('#confirmCancel').addEventListener('click', () => { pendingDelete = null; $('#confirmOverlay').classList.remove('show'); });
  $('#confirmClose').addEventListener('click', () => { pendingDelete = null; $('#confirmOverlay').classList.remove('show'); });

  /* ================= 留言抽屉 ================= */
  let drawerPostId = null, drawerNode = null;
  const drawerWrap = $('#drawerWrap');
  const cList = $('#cList');

  async function openComments(id, node) {
    drawerPostId = id; drawerNode = node;
    drawerWrap.classList.add('show');
    cList.innerHTML = '<div class="c-empty"><div class="spinner" style="margin:0 auto"></div></div>';
    $('#cCount').textContent = fmtCount(POSTS.get(id).commentCount);
    try {
      const data = await api(`/api/posts/${id}/comments`);
      renderComments(data.comments);
    } catch { cList.innerHTML = `<div class="c-empty">${t('loadFail')}</div>`; }
  }

  function renderComments(comments) {
    cList.innerHTML = '';
    if (!comments.length) {
      cList.innerHTML = `<div class="c-empty">${t('noComments')}</div>`;
      return;
    }
    for (const c of comments) cList.appendChild(renderComment(c));
    cList.scrollTop = cList.scrollHeight;
  }

  function renderComment(c) {
    const el = document.createElement('div');
    el.className = 'c-item';
    const av = document.createElement('div');
    av.className = 'avatar-sm';
    fillAvatar(av, c.username, c.avatar);
    const body = document.createElement('div');
    body.className = 'body';
    const who = document.createElement('div');
    who.className = 'who';
    const name = document.createElement('span');
    name.textContent = '@' + c.username;
    const ago = document.createElement('span');
    ago.className = 'ago';
    ago.textContent = fmtAgo(c.createdAt);
    who.append(name, ago);
    const p = document.createElement('p');
    p.textContent = c.text;
    body.append(who, p);
    el.append(av, body);
    if (c.mine) {
      const del = document.createElement('button');
      del.className = 'del-c';
      del.innerHTML = ICONS.trash;
      del.addEventListener('click', async () => {
        try {
          const data = await api('/api/comments/' + c.id, { method: 'DELETE' });
          el.remove();
          updateCommentCount(data.commentCount);
          if (!cList.children.length) renderComments([]);
        } catch (err) { toast(errMsg(err.code)); }
      });
      el.appendChild(del);
    }
    return el;
  }

  function updateCommentCount(n) {
    const post = POSTS.get(drawerPostId);
    if (post) {
      post.commentCount = n;
      if (drawerNode) drawerNode.querySelector('.cmt .cnt').textContent = fmtCount(n);
    }
    $('#cCount').textContent = fmtCount(n);
  }

  $('#cForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ME) return needLogin();
    const input = $('#cInput');
    const text = input.value.trim();
    if (!text || !drawerPostId) return;
    $('#cSend').disabled = true;
    try {
      const data = await api(`/api/posts/${drawerPostId}/comments`, { method: 'POST', body: { text } });
      const empty = cList.querySelector('.c-empty');
      if (empty) empty.remove();
      cList.appendChild(renderComment(data.comment));
      cList.scrollTop = cList.scrollHeight;
      input.value = '';
      updateCommentCount(data.commentCount);
    } catch (err) {
      if (err.code === 'auth') needLogin(); else toast(errMsg(err.code));
    }
    $('#cSend').disabled = false;
  });

  function closeDrawer() { drawerWrap.classList.remove('show'); drawerPostId = null; drawerNode = null; }
  $('#drawerClose').addEventListener('click', closeDrawer);
  drawerWrap.addEventListener('click', (e) => { if (e.target === drawerWrap) closeDrawer(); });

  /* ================= 上传 ================= */
  const uploadOverlay = $('#uploadOverlay');
  const fileInput = $('#fileInput');
  const dropInner = $('#dropInner');
  let chosenFiles = [];
  const MAX_MEDIA = 9;

  function openUpload() {
    if (!ME) return needLogin();
    chosenFiles = [];
    paintDrop();
    $('#upCaption').value = '';
    fillStateSelect($('#upState'), false);
    $('#upState').value = ME.state || '';
    $('#upCity').value = ME.city || '';
    $('#upProgress').classList.remove('show');
    $('#upProgress i').style.width = '0';
    $('#uploadSubmit').disabled = false;
    $('#uploadSubmit').textContent = t('postBtn');
    uploadOverlay.classList.add('show');
  }

  function paintDrop() {
    dropInner.innerHTML = '';
    if (!chosenFiles.length) {
      dropInner.innerHTML = `${ICONS.image}<b>${t('chooseFile')}</b><span>${t('fromGallery')}</span>`;
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'up-grid';
    chosenFiles.forEach((file, i) => {
      const cell = document.createElement('div');
      cell.className = 'up-cell';
      const url = URL.createObjectURL(file);
      let prev;
      if (file.type.startsWith('video/')) {
        prev = document.createElement('video');
        prev.src = url; prev.muted = true; prev.playsInline = true; prev.preload = 'metadata';
      } else {
        prev = document.createElement('img');
        prev.src = url;
      }
      prev.className = 'preview';
      cell.appendChild(prev);
      if (file.type.startsWith('video/')) {
        const vb = document.createElement('span'); vb.className = 'up-vbadge'; vb.innerHTML = ICONS.play;
        cell.appendChild(vb);
      }
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'up-rm'; rm.innerHTML = ICONS.close;
      rm.addEventListener('click', (e) => { e.stopPropagation(); URL.revokeObjectURL(url); chosenFiles.splice(i, 1); paintDrop(); });
      cell.appendChild(rm);
      grid.appendChild(cell);
    });
    if (chosenFiles.length < MAX_MEDIA) {
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'up-add'; add.innerHTML = ICONS.plus;
      add.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
      grid.appendChild(add);
    }
    const hint = document.createElement('div');
    hint.className = 'up-hint';
    hint.textContent = t('nSelected', { n: chosenFiles.length });
    dropInner.append(grid, hint);
  }

  $('#dropZone').addEventListener('click', (e) => { if (!e.target.closest('.up-cell')) fileInput.click(); });
  fileInput.addEventListener('change', () => {
    for (const f of Array.from(fileInput.files || [])) {
      if (chosenFiles.length >= MAX_MEDIA) { toast(t('maxFiles', { n: MAX_MEDIA })); break; }
      chosenFiles.push(f);
    }
    fileInput.value = '';      // 清空，允许再次选同一个文件
    paintDrop();
  });

  $('#uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!ME) return needLogin();
    if (!chosenFiles.length) { $('#dropZone').style.borderColor = 'var(--accent)'; return; }
    const state = $('#upState').value;
    if (!state) { $('#upState').focus(); return; }

    const fd = new FormData();
    for (const f of chosenFiles) fd.append('media', f);
    fd.append('caption', $('#upCaption').value.trim());
    fd.append('state', state);
    fd.append('city', $('#upCity').value.trim());

    const xhr = new XMLHttpRequest();
    const progress = $('#upProgress');
    const bar = $('#upProgress i');
    const submit = $('#uploadSubmit');
    submit.disabled = true;
    submit.textContent = t('posting');
    progress.classList.add('show');

    xhr.open('POST', '/api/posts');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) bar.style.width = Math.round(ev.loaded / ev.total * 100) + '%';
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.post) {
        uploadOverlay.classList.remove('show');
        toast(t('postOk'));
        // 新帖子插到最上面并滚上去
        const emptyState = feed.querySelector('.feed-state');
        if (emptyState) emptyState.remove();
        const node = renderPost(data.post);
        feed.prepend(node);
        feed.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast(errMsg(data.error || 'net'));
        submit.disabled = false;
        submit.textContent = t('postBtn');
        progress.classList.remove('show');
      }
    };
    xhr.onerror = () => {
      toast(errMsg('net'));
      submit.disabled = false;
      submit.textContent = t('postBtn');
      progress.classList.remove('show');
    };
    xhr.send(fd);
  });

  function closeUpload() { uploadOverlay.classList.remove('show'); }
  $('#uploadClose').addEventListener('click', closeUpload);
  $('#uploadCancel').addEventListener('click', closeUpload);
  uploadOverlay.addEventListener('click', (e) => { if (e.target === uploadOverlay) closeUpload(); });

  $('#uploadBtnTop').addEventListener('click', openUpload);
  $('#uploadBtnFab').addEventListener('click', openUpload);

  /* ================= 登录提示弹窗 ================= */
  $('#loginClose').addEventListener('click', () => $('#loginOverlay').classList.remove('show'));
  $('#loginLater').addEventListener('click', () => $('#loginOverlay').classList.remove('show'));
  $('#loginOverlay').addEventListener('click', (e) => { if (e.target === $('#loginOverlay')) $('#loginOverlay').classList.remove('show'); });

  /* ================= 播放设置 ================= */
  const settingsPop = $('#settingsPop');
  $('#settingsBtn').innerHTML = ICONS.sliders;
  $('#settingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPop.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (settingsPop.classList.contains('show') && !settingsPop.contains(e.target)) {
      settingsPop.classList.remove('show');
    }
  });

  function syncSettingsUI() {
    $('#volRange').value = AV.vol;
    $('#volOut').textContent = Math.round(AV.vol) + '%';
    $('#briRange').value = AV.bright;
    $('#briOut').textContent = Math.round(AV.bright) + '%';
    $('#muteCheck').checked = AV.muted;
  }
  $('#volRange').addEventListener('input', () => {
    AV.vol = +$('#volRange').value;
    if (AV.vol > 0) AV.muted = false;
    saveAV(); syncSettingsUI(); applyAVAll();
  });
  $('#briRange').addEventListener('input', () => {
    AV.bright = +$('#briRange').value;
    saveAV(); syncSettingsUI(); applyAVAll();
  });
  $('#muteCheck').addEventListener('change', () => {
    AV.muted = $('#muteCheck').checked;
    saveAV(); applyAVAll();
  });

  /* ================= 搜索：用户 / 美食 / 标签 ================= */
  const searchPanel = $('#searchPanel');
  const searchInput = $('#searchInput');
  const searchResults = $('#searchResults');
  let searchTimer = null, searchSeq = 0;

  /* 套用搜索筛选并回到 feed；传 {} = 清除筛选 */
  function applySearchFilter(o) {
    feedState.tag = (o.tag || '').toLowerCase();
    feedState.user = o.user || '';
    feedState.q = o.q || '';
    feedState.startId = o.startId || '';
    paintFilterChip();
    closeSearch();
    resetFeed();
  }

  function paintFilterChip() {
    const chip = $('#filterChip');
    const label = feedState.tag ? '#' + feedState.tag
      : feedState.user ? '@' + feedState.user
      : feedState.q ? '“' + feedState.q + '”' : '';
    if (!label) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.innerHTML = '<span></span>' + ICONS.close;
    chip.querySelector('span').textContent = label;
  }
  $('#filterChip').addEventListener('click', () => applySearchFilter({}));

  function openSearch() {
    searchPanel.classList.add('show');
    searchInput.value = '';
    $('#searchClear').hidden = true;
    runSearch('');
    setTimeout(() => searchInput.focus(), 60);
  }
  function closeSearch() { searchPanel.classList.remove('show'); }

  $('#searchBtn').addEventListener('click', openSearch);
  $('#searchCancel').addEventListener('click', closeSearch);
  $('#searchClear').addEventListener('click', () => {
    searchInput.value = '';
    $('#searchClear').hidden = true;
    runSearch('');
    searchInput.focus();
  });

  searchInput.addEventListener('input', () => {
    $('#searchClear').hidden = !searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(searchInput.value.trim()), 250);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = searchInput.value.trim();
    if (!v) return;
    if (v.startsWith('#')) applySearchFilter({ tag: v.slice(1) });
    else if (v.startsWith('@')) applySearchFilter({ user: v.slice(1) });
    else applySearchFilter({ q: v });
  });

  async function runSearch(q) {
    const seq = ++searchSeq;
    searchResults.innerHTML = '<div class="s-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try {
      const data = await api('/api/search?q=' + encodeURIComponent(q));
      if (seq !== searchSeq) return;
      renderSearch(data);
    } catch {
      if (seq === searchSeq) searchResults.innerHTML = `<div class="s-state">${t('loadFail')}</div>`;
    }
  }

  function tagChips(tags) {
    const wrap = document.createElement('div');
    wrap.className = 's-tags';
    for (const tg of tags) {
      const b = document.createElement('button');
      b.className = 's-tag';
      const name = document.createElement('b');
      name.textContent = '#' + tg.tag;
      const cnt = document.createElement('span');
      cnt.textContent = tg.count;
      b.append(name, cnt);
      b.addEventListener('click', () => applySearchFilter({ tag: tg.tag }));
      wrap.appendChild(b);
    }
    return wrap;
  }

  function renderSearch(data) {
    searchResults.innerHTML = '';
    const frag = document.createDocumentFragment();
    const addSection = (key) => {
      const h = document.createElement('h4');
      h.className = 's-sec';
      h.textContent = t(key);
      frag.appendChild(h);
    };

    /* 空关键词 → 热门标签 + 提示 */
    if (!data.q) {
      if (data.tags.length) {
        addSection('trendingTags');
        frag.appendChild(tagChips(data.tags));
      }
      const tip = document.createElement('div');
      tip.className = 's-tip';
      tip.textContent = t('searchTip');
      frag.appendChild(tip);
      searchResults.appendChild(frag);
      return;
    }

    if (!data.tags.length && !data.users.length && !data.posts.length) {
      searchResults.innerHTML = `<div class="s-state"><div class="big">🤔</div>${t('noResults')}</div>`;
      return;
    }

    if (data.tags.length) {
      addSection('secTags');
      frag.appendChild(tagChips(data.tags));
    }

    if (data.users.length) {
      addSection('secUsers');
      for (const u of data.users) {
        const row = document.createElement('button');
        row.className = 's-user';
        const av = document.createElement('span');
        av.className = 'avatar-sm';
        fillAvatar(av, u.username, u.avatar);
        const body = document.createElement('span');
        body.className = 'body';
        const nm = document.createElement('b');
        nm.textContent = '@' + u.username;
        const meta = document.createElement('small');
        meta.textContent = (u.state || '') + (u.city ? ' · ' + u.city : '') + ' · ' + t('nPosts', { n: u.postCount });
        body.append(nm, meta);
        row.append(av, body);
        row.addEventListener('click', () => { location.href = 'profile.html?u=' + encodeURIComponent(u.username); });
        frag.appendChild(row);
      }
    }

    if (data.posts.length) {
      addSection('secPosts');
      const grid = document.createElement('div');
      grid.className = 's-grid';
      for (const p of data.posts) {
        const cell = document.createElement('button');
        cell.className = 's-cell';
        let thumb;
        if (p.mediaType === 'video') {
          thumb = document.createElement('video');
          thumb.src = p.mediaUrl;
          thumb.muted = true;
          thumb.preload = 'metadata';
          thumb.playsInline = true;
        } else {
          thumb = document.createElement('img');
          thumb.src = p.mediaUrl;
          thumb.loading = 'lazy';
          thumb.alt = '';
        }
        const where = document.createElement('span');
        where.className = 'where';
        where.textContent = p.state;
        const cap = document.createElement('span');
        cap.className = 'cap';
        cap.textContent = p.caption || '@' + p.username;
        cell.append(thumb, where, cap);
        // 点缩略图 → 用同样的关键词进 feed，并从这条帖子开始播
        cell.addEventListener('click', () => applySearchFilter({ q: data.q, startId: p.id }));
        grid.appendChild(cell);
      }
      frag.appendChild(grid);
    }

    searchResults.appendChild(frag);
  }

  /* ================= 顶栏：筛选 / 语言 / 用户 ================= */
  function fillStateSelect(sel, withAll) {
    const cur = sel.value;
    sel.innerHTML = (withAll ? `<option value="">${t('allRegions')}</option>` : `<option value="" disabled selected>${t('statePh')}</option>`) +
      STATES.map(s => `<option value="${s}">${s}</option>`).join('');
    if (cur) sel.value = cur;
  }

  $('#stateFilter').addEventListener('change', () => {
    feedState.state = $('#stateFilter').value;
    resetFeed();
  });

  // 推荐 / 最新 切换
  document.querySelectorAll('#feedSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('on')) return;
      document.querySelectorAll('#feedSeg button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      feedState.sort = btn.dataset.sort;
      resetFeed();
    });
  });

  $('#savedFilter').addEventListener('click', () => {
    feedState.saved = !feedState.saved;
    $('#savedFilter').classList.toggle('on', feedState.saved);
    resetFeed();
  });

  $('#langBtn').innerHTML = ICONS.globe;
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });

  document.addEventListener('foody:lang', () => {
    fillStateSelect($('#stateFilter'), true);
    fillStateSelect($('#upState'), false);
    paintUserChip();
    paintUploadBtns();
    syncSettingsUI();
    if (searchPanel.classList.contains('show')) runSearch(searchInput.value.trim());
    // 更新动态文本
    feed.querySelectorAll('.ago').forEach(el => { if (el.dataset.ts) el.textContent = fmtAgo(+el.dataset.ts); });
    feed.querySelectorAll('.slide').forEach(n => { if (n.paintMute) n.paintMute(); });
    feed.querySelectorAll('.sound-hint').forEach(el => { el.textContent = t('soundHint'); });
  });

  async function pollUnread() {
    if (!ME) return;
    try { const d = await api('/api/me/unread'); $('#msgDot').hidden = !(d.count > 0); } catch {}
  }

  function paintUserChip() {
    const chip = $('#userChip');
    if (ME) {
      chip.innerHTML = `<span class="avatar-sm"></span><span>@${ME.username}</span>`;
      fillAvatar(chip.querySelector('.avatar-sm'), ME.username, ME.avatar);
      chip.onclick = () => { location.href = 'profile.html?u=' + encodeURIComponent(ME.username); };
      chip.title = t('pfMine');
    } else {
      chip.textContent = t('login');
      chip.onclick = () => { location.href = 'index.html'; };
    }
  }

  function paintUploadBtns() {
    const top = $('#uploadBtnTop');
    top.innerHTML = ICONS.plus + '<span>' + t('upload') + '</span>';
    top.querySelector('svg').style.width = '18px';
    top.querySelector('svg').style.height = '18px';
    $('#uploadBtnFab').innerHTML = ICONS.plus;
  }

  /* ================= 键盘上下滑 ================= */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (searchPanel.classList.contains('show')) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const slides = [...feed.querySelectorAll('.slide')];
    if (!slides.length) return;
    const idx = activeSlide ? slides.indexOf(activeSlide) : -1;
    const next = e.key === 'ArrowDown' ? Math.min(slides.length - 1, idx + 1) : Math.max(0, idx - 1);
    slides[next].scrollIntoView({ behavior: 'smooth' });
  });

  /* ================= 初始化 ================= */
  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    document.querySelectorAll('.x').forEach(b => { b.innerHTML = ICONS.close; });
    $('#cSend').innerHTML = ICONS.send;
    $('#searchBtn').innerHTML = ICONS.search;
    $('#msgBtn').insertAdjacentHTML('afterbegin', ICONS.bubble);
    $('#msgBtn').addEventListener('click', () => { location.href = 'messages.html'; });
    document.querySelector('.s-ic').innerHTML = ICONS.search;
    $('#searchClear').innerHTML = ICONS.close;
    $('#feedSeg button[data-sort="hot"] .sg-ic').innerHTML = ICONS.spark;
    $('#feedSeg button[data-sort="new"] .sg-ic').innerHTML = ICONS.clock;
    paintUploadBtns();
    syncSettingsUI();
    try {
      const data = await api('/api/me');
      ME = data.user;
      STATES = data.states || [];
    } catch {}
    fillStateSelect($('#stateFilter'), true);
    fillStateSelect($('#upState'), false);
    paintUserChip();
    $('#savedFilter').hidden = !ME;
    $('#msgBtn').hidden = !ME;
    if (ME) { pollUnread(); setInterval(pollUnread, 15000); }
    $('#uploadBtnTop').style.display = '';
    // 从 profile / 分享链接进来：?user= / ?tag= / ?q=（可带 ?start=帖子ID）直接进对应 feed
    const sp = new URLSearchParams(location.search);
    if (sp.get('user') || sp.get('tag') || sp.get('q')) {
      feedState.user = sp.get('user') || '';
      feedState.tag = (sp.get('tag') || '').toLowerCase();
      feedState.q = sp.get('q') || '';
      feedState.startId = sp.get('start') || '';
      paintFilterChip();
    }
    loadMore();
  });
})();
