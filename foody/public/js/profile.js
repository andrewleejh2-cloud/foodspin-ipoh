/* Foody — 用户主页 (profile)
   查看自己 / 别人的资料、作品集，一键 WhatsApp 联系。复用 shared.js 的
   三语字典、API、Toast、图标。点作品 → 跳回 FYP 该用户的 feed 从该帖播起。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  let UNAME = (new URLSearchParams(location.search).get('u') || '').trim();

  // backBtn 的本地化标签（字典里没有这个词，单独映射）
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };

  let DATA = null; // /api/users 返回的数据
  let LOGGED = false; // 访客是否已登录（决定列表里要不要显示关注按钮）

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function fmtN(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  /* ---------------- 顶栏 ---------------- */
  $('#backBtn').innerHTML = ICONS.back;
  $('#shareBtn').innerHTML = ICONS.share;
  $('#langBtn').innerHTML = ICONS.globe;

  $('#backBtn').addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.href = 'fyp.html';
  });
  $('#shareBtn').addEventListener('click', share);
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });

  // 语言切换：静态文案由 applyLang 处理；动态渲染的头部/按钮需重绘
  document.addEventListener('foody:lang', () => {
    setBackLabel();
    if (DATA) render();
  });

  function setBackLabel() {
    const lbl = BACK[LANG] || BACK.en;
    $('#backBtn').title = lbl;
    $('#backBtn').setAttribute('aria-label', lbl);
  }

  async function share() {
    const url = location.origin + '/profile.html?u=' + encodeURIComponent(UNAME);
    if (navigator.share) {
      try { await navigator.share({ title: '@' + UNAME + ' · Foody', url }); return; } catch { return; }
    }
    try { await navigator.clipboard.writeText(url); toast(t('pfShareCopied')); }
    catch { window.prompt('', url); }
  }

  /* ---------------- 加载 ---------------- */
  async function load() {
    if (!UNAME) return renderNotFound();
    try {
      DATA = await api('/api/users/' + encodeURIComponent(UNAME));
    } catch (e) {
      if (e.code === 'not_found') return renderNotFound();
      $('#pfWrap').innerHTML = `<div class="pf-empty"><div class="big">😵</div>${esc(t('errNet'))}</div>`;
      return;
    }
    $('#topName').textContent = '@' + DATA.user.username;
    LOGGED = DATA.isMe || !!DATA.waUrl;
    render();
  }

  function renderNotFound() {
    $('#topName').textContent = '';
    $('#pfWrap').innerHTML = `<div class="pf-empty"><div class="big">🤔</div>${esc(t('pfNotFound'))}</div>`;
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    const u = DATA.user, st = DATA.stats;
    const wrap = $('#pfWrap');
    wrap.innerHTML = '';
    FoodyCart.setWaUrl(DATA.waUrl, DATA.user.username); FoodyCart.reset();   // 货架下单购物车（重渲染先清，末尾恢复）

    const head = document.createElement('section');
    head.className = 'pf-head';

    const av = document.createElement('div');
    av.className = 'pf-avatar';
    fillAvatar(av, u.username, u.avatar);

    const name = document.createElement('h1');
    name.className = 'pf-name';
    name.textContent = '@' + u.username;
    // 管理员本人主页：用户名旁显示醒目的 ADMIN 徽章，点击直接进审核后台（仅本人可见，不暴露给访客）
    if (DATA.isAdmin) {
      const badge = document.createElement('button');
      badge.className = 'pf-admin-badge';
      badge.innerHTML = ICONS.shield + '<span>ADMIN</span>';
      badge.title = t('admEntry');
      badge.addEventListener('click', () => { location.href = 'admin.html'; });
      name.appendChild(badge);
    }

    const region = document.createElement('div');
    region.className = 'pf-region';
    region.innerHTML = ICONS.pin + '<span></span>';
    region.querySelector('span').textContent = u.state + (u.city ? ' · ' + u.city : '');

    const stats = document.createElement('div');
    stats.className = 'pf-stats';
    stats.append(
      statBox(fmtN(st.postCount), t('pfPosts')),
      statBox(fmtN(st.followingCount), t('pfFollowing'), () => openUserList('following')),
      statBox(fmtN(st.followerCount), t('pfFollowers'), () => openUserList('followers')),
      statBox(fmtN(st.likeTotal), t('pfLikes'))
    );

    // 个人留言气泡（IG Note 风格）：访客可见；自己未填时显示「+ 留言」入口
    const note = document.createElement('div');
    note.className = 'pf-note';
    if (u.note) {
      note.textContent = u.note;
    } else if (DATA.isMe) {
      note.classList.add('empty');
      note.textContent = '+ ' + t('pfNote');
      note.addEventListener('click', openEdit);
    } else {
      note.hidden = true;
    }
    head.append(av, name, region);
    if (DATA.shopOpen) {   // 店铺标识：已发布且有菜品 → 显示「🛍 店铺」徽章，点进店铺页
      const shopTag = document.createElement('div');
      shopTag.className = 'pf-shoptag';
      shopTag.innerHTML = ICONS.bag + '<span>' + t('shopBadge') + '</span>';
      shopTag.addEventListener('click', () => { location.href = 'site.html?u=' + encodeURIComponent(u.username); });
      head.appendChild(shopTag);
    }
    head.append(note, stats);

    // 简介
    const bio = document.createElement('p');
    bio.className = 'pf-bio';
    if (u.bio) {
      bio.textContent = u.bio;
    } else if (DATA.isMe) {
      bio.classList.add('empty');
      bio.textContent = t('pfBioEmptyMe');
      bio.addEventListener('click', openEdit);
    } else {
      bio.hidden = true;
    }
    head.appendChild(bio);

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'pf-actions';
    if (DATA.isMe) {
      const site = mkBtn('pf-site', DATA.shopOpen ? ICONS.bag : ICONS.globe, t(DATA.shopOpen ? 'shopMine' : 'siteMine'));
      site.addEventListener('click', () => { location.href = 'site-edit.html'; });
      const edit = mkBtn('pf-ghost', ICONS.edit, t('pfEdit'));
      edit.addEventListener('click', openEdit);
      const out = mkBtn('pf-ghost pf-logout', null, t('logout'));
      out.addEventListener('click', logout);
      actions.append(site, edit, out);
      if (DATA.canSell) {   // 白名单卖家：管理货架入口
        const mg = mkBtn('pf-ghost pf-shelf-btn', ICONS.bag, t('shelfManage'));
        mg.addEventListener('click', () => { location.href = 'shelf-edit.html'; });
        actions.append(mg);
      }
      if (DATA.isAdmin) {
        const adm = mkBtn('pf-ghost pf-admin', ICONS.shield, t('admEntry'));
        adm.addEventListener('click', () => { location.href = 'admin.html'; });
        actions.append(adm);
      }
    } else {
      const loginThen = (go) => DATA.waUrl ? go() : (toast(t('errAuth')), setTimeout(() => { location.href = 'index.html'; }, 900));
      const fol = mkBtn(DATA.isFollowing ? 'pf-following' : 'pf-follow', null, t(DATA.isFollowing ? 'pfFollowed' : 'pfFollow'));
      fol.addEventListener('click', () => loginThen(() => toggleFollow()));
      const msg = mkBtn('pf-msg', ICONS.send, t('pfMessage'));
      msg.addEventListener('click', () => loginThen(() => { location.href = 'messages.html?u=' + encodeURIComponent(u.username); }));
      const wa = mkBtn('pf-wa', ICONS.whatsapp, t('pfWa'));
      wa.addEventListener('click', () => loginThen(() => { location.href = DATA.waUrl; }));
      if (DATA.sitePublished) {
        const site = mkBtn('pf-site', DATA.shopOpen ? ICONS.bag : ICONS.globe, t(DATA.shopOpen ? 'shopView' : 'siteView'));
        site.addEventListener('click', () => { location.href = 'site.html?u=' + encodeURIComponent(u.username); });
        actions.append(fol, site, msg, wa);
      } else {
        actions.append(fol, msg, wa);
      }
    }
    head.appendChild(actions);
    wrap.appendChild(head);

    // 货架（商品）：访客在主页直接看商品 + 加购 + WhatsApp 下单（货物只有白名单卖家会有）
    if (DATA.shelf && DATA.shelf.length) {
      const shop = document.createElement('section');
      shop.className = 'pf-shelf';
      const sh = document.createElement('div'); sh.className = 'pf-shelf-h';
      sh.innerHTML = ICONS.bag + '<span>' + esc(t('siteShelfL')) + '</span>';
      shop.appendChild(sh);
      const grid = document.createElement('div'); grid.className = 'shelf-grid';
      let gid = 0;
      for (const it of DATA.shelf) {
        const key = 'g' + (gid++);
        const card = document.createElement('div'); card.className = 'good-card' + (it.soldOut ? ' is-sold' : '');
        if (it.photo) { const img = document.createElement('img'); img.className = 'good-photo'; img.src = it.photo; img.loading = 'lazy'; img.alt = ''; card.appendChild(img); }
        const gb = document.createElement('div'); gb.className = 'good-body';
        const gn = document.createElement('div'); gn.className = 'good-name'; gn.textContent = it.name; gb.appendChild(gn);
        if (it.desc) { const gd = document.createElement('p'); gd.className = 'good-desc'; gd.textContent = it.desc; gb.appendChild(gd); }
        const bottom = document.createElement('div'); bottom.className = 'good-bottom';
        if (it.price) { const pr = document.createElement('span'); pr.className = 'good-price'; pr.textContent = it.price; bottom.appendChild(pr); }
        bottom.appendChild(FoodyCart.makeBuy(key, it));
        gb.appendChild(bottom);
        card.appendChild(gb);
        grid.appendChild(card);
      }
      shop.appendChild(grid);
      wrap.appendChild(shop);
    }

    // 销量（近 1/7/30 天）：仅卖家本人可见，统计经 WhatsApp 的下单量 + 约总额
    if (DATA.isMe && (DATA.canSell || DATA.sitePublished)) {
      const sales = document.createElement('section');
      sales.className = 'pf-sales';
      const sh = document.createElement('div');
      sh.className = 'pf-sales-h';
      sh.innerHTML = ICONS.chart + '<span>' + esc(t('pfSales')) + '</span>';
      const seg = document.createElement('div');
      seg.className = 'pf-sales-seg';
      const sv = document.createElement('div');
      sv.className = 'pf-sales-val';
      let salesData = null, cur = 'daily';
      function paintVal() {
        if (!salesData) { sv.textContent = '…'; return; }
        const d = salesData[cur] || { orders: 0, total: 0 };
        sv.innerHTML = '<b>' + fmtN(d.orders) + '</b> ' + esc(t('salesOrders')) + (d.total > 0 ? ' <span class="pf-sales-rm">≈ RM' + d.total + '</span>' : '');
      }
      [['daily', t('salesDaily')], ['weekly', t('salesWeekly')], ['monthly', t('salesMonthly')]].forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-sales-btn' + (i === 0 ? ' on' : '');
        b.textContent = p[1];
        b.addEventListener('click', () => {
          seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on'); cur = p[0]; paintVal();
        });
        seg.appendChild(b);
      });
      sales.append(sh, seg, sv);
      wrap.appendChild(sales);
      paintVal();
      api('/api/me/sales').then(r => { salesData = r; paintVal(); }).catch(() => { sv.textContent = t('salesNoData'); });
    }

    // 作品网格
    if (!DATA.posts.length) {
      const empty = document.createElement('div');
      empty.className = 'pf-empty';
      empty.innerHTML = `<div class="big">🍽️</div>${esc(t('pfNoPosts'))}`;
      wrap.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'pf-grid';
      for (const p of DATA.posts) grid.appendChild(cell(p));
      wrap.appendChild(grid);
    }

    // 顶栏「举报用户」：看别人主页且自己已登录时显示
    const rb = $('#reportBtn');
    if (!DATA.isMe && DATA.viewerLoggedIn) {
      rb.hidden = false;
      rb.onclick = () => openReport({ type: 'user', targetId: DATA.user.username, name: DATA.user.username });
    } else {
      rb.hidden = true;
    }

    FoodyCart.refreshBar();   // 货架购物车：按当前选购恢复底部订单条
    setBackLabel();
  }

  function statBox(num, label, onClick) {
    const d = document.createElement('div');
    d.className = 'pf-stat' + (onClick ? ' tap' : '');
    d.innerHTML = `<b>${esc(num)}</b><span>${esc(label)}</span>`;
    if (onClick) d.addEventListener('click', onClick);
    return d;
  }

  async function toggleFollow() {
    try {
      const r = await api('/api/users/' + encodeURIComponent(DATA.user.username) + '/follow', { method: 'POST' });
      DATA.isFollowing = r.following;
      DATA.stats.followerCount = r.followerCount;
      render();
    } catch (e) { toast(errMsg(e.code)); }
  }

  /* 粉丝 / 关注列表（点统计数字打开） */
  async function openUserList(type) {
    $('#listTitle').textContent = t(type === 'followers' ? 'pfFollowers' : 'pfFollowing');
    const wrap = $('#userList');
    wrap.innerHTML = '';
    $('#listOverlay').classList.add('show');
    let data;
    try { data = await api('/api/users/' + encodeURIComponent(DATA.user.username) + '/' + type); }
    catch { wrap.innerHTML = `<div class="ul-empty">${esc(t('errNet'))}</div>`; return; }
    if (!data.users.length) { wrap.innerHTML = `<div class="ul-empty">${esc(t('pfNobody'))}</div>`; return; }
    for (const u of data.users) {
      const row = document.createElement('div');
      row.className = 'ul-row';
      const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, u.username, u.avatar);
      const body = document.createElement('a'); body.className = 'ul-body';
      body.href = 'profile.html?u=' + encodeURIComponent(u.username);
      const nm = document.createElement('b'); nm.textContent = '@' + u.username;
      const bio = document.createElement('small'); bio.textContent = u.bio || '';
      body.append(nm, bio);
      row.append(av, body);
      if (LOGGED && !u.isMe) {
        const fb = document.createElement('button');
        fb.className = 'ul-follow' + (u.isFollowing ? ' on' : '');
        fb.textContent = t(u.isFollowing ? 'pfFollowed' : 'pfFollow');
        fb.addEventListener('click', async () => {
          try {
            const r = await api('/api/users/' + encodeURIComponent(u.username) + '/follow', { method: 'POST' });
            u.isFollowing = r.following;
            fb.className = 'ul-follow' + (r.following ? ' on' : '');
            fb.textContent = t(r.following ? 'pfFollowed' : 'pfFollow');
          } catch (e) { toast(errMsg(e.code)); }
        });
        row.appendChild(fb);
      }
      wrap.appendChild(row);
    }
  }
  function closeList() { $('#listOverlay').classList.remove('show'); }
  $('#listClose').addEventListener('click', closeList);
  $('#listOverlay').addEventListener('click', (e) => { if (e.target === $('#listOverlay')) closeList(); });

  function mkBtn(cls, icon, label) {
    const b = document.createElement('button');
    b.className = 'pf-btn ' + cls;
    b.innerHTML = (icon || '') + '<span>' + esc(label) + '</span>';
    return b;
  }

  function cell(p) {
    const c = document.createElement('button');
    c.className = 'pf-cell';
    let thumb;
    if (p.mediaType === 'video') {
      thumb = document.createElement('video');
      thumb.src = p.mediaUrl; thumb.muted = true; thumb.preload = 'metadata'; thumb.playsInline = true;
    } else {
      thumb = document.createElement('img');
      thumb.src = p.mediaUrl; thumb.loading = 'lazy'; thumb.alt = '';
    }
    const likes = document.createElement('span');
    likes.className = 'pf-cell-likes';
    likes.innerHTML = ICONS.heart + '<span>' + esc(fmtN(p.likeCount)) + '</span>';
    c.append(thumb, likes);
    c.addEventListener('click', () => {
      location.href = 'fyp.html?user=' + encodeURIComponent(DATA.user.username) + '&start=' + encodeURIComponent(p.id);
    });
    return c;
  }

  /* ---------------- 编辑资料（仅自己）：头像 + 用户名 + 简介 ---------------- */
  let pendingAvatar = null;   // 待上传的新头像文件（保存时才真正上传）
  function openEdit() {
    pendingAvatar = null;
    $('#editUsername').value = DATA.user.username;
    $('#editNote').value = DATA.user.note || '';
    fillAvatar($('#editAvatar'), DATA.user.username, DATA.user.avatar);
    const ta = $('#editBio');
    ta.value = DATA.user.bio || '';
    $('#bioCount').textContent = ta.value.length;
    $('#editOverlay').classList.add('show');
    setTimeout(() => $('#editUsername').focus(), 50);
  }
  function closeEdit() { $('#editOverlay').classList.remove('show'); }

  $('#editClose').addEventListener('click', closeEdit);
  $('#editCancel').addEventListener('click', closeEdit);
  $('#editOverlay').addEventListener('click', (e) => { if (e.target === $('#editOverlay')) closeEdit(); });
  $('#editBio').addEventListener('input', () => { $('#bioCount').textContent = $('#editBio').value.length; });
  $('#editAvatarBtn').addEventListener('click', () => $('#editAvatarInput').click());
  $('#editAvatarInput').addEventListener('change', () => {
    const f = $('#editAvatarInput').files && $('#editAvatarInput').files[0];
    if (!f) return;
    pendingAvatar = f;
    const av = $('#editAvatar');
    av.textContent = '';
    const img = document.createElement('img');
    img.className = 'av-img'; img.src = URL.createObjectURL(f); img.alt = '';
    av.appendChild(img);
    $('#editAvatarInput').value = '';
  });
  $('#editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const save = $('#editSave');
    save.disabled = true;
    try {
      // 1) 先传头像（若选了新的）
      if (pendingAvatar) {
        const fd = new FormData();
        fd.append('avatar', pendingAvatar);
        const ar = await api('/api/me/avatar', { method: 'POST', body: fd });
        DATA.user.avatar = ar.user.avatar;
        pendingAvatar = null;
      }
      // 2) 改用户名 + 简介
      const res = await api('/api/me', { method: 'PATCH', body: { username: $('#editUsername').value.trim(), note: $('#editNote').value.trim(), bio: $('#editBio').value.trim() } });
      const renamed = res.user.username !== DATA.user.username;
      DATA.user.username = res.user.username;
      DATA.user.bio = res.user.bio;
      DATA.user.note = res.user.note;
      closeEdit();
      toast(t('pfSaved'));
      // 改名后同步页面 URL / 顶栏 / 分享链接里的用户名
      if (renamed) {
        UNAME = res.user.username;
        history.replaceState(null, '', '?u=' + encodeURIComponent(UNAME));
        $('#topName').textContent = '@' + UNAME;
      }
      render();
    } catch (err) {
      toast(errMsg(err.code));
    } finally {
      save.disabled = false;
    }
  });

  async function logout() {
    if (!window.confirm(t('logout') + '?')) return;
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    location.href = 'index.html';
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    applyLang();
    document.querySelectorAll('.x').forEach(b => { b.innerHTML = ICONS.close; });
    $('#reportBtn').innerHTML = ICONS.flag;
    setBackLabel();
    load();
  });
})();
