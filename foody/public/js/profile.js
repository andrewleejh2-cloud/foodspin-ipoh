/* Foody — 用户主页 (profile)
   查看自己 / 别人的资料、作品集，一键 WhatsApp 联系。复用 shared.js 的
   三语字典、API、Toast、图标。点作品 → 跳回 FYP 该用户的 feed 从该帖播起。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const UNAME = (new URLSearchParams(location.search).get('u') || '').trim();

  // backBtn 的本地化标签（字典里没有这个词，单独映射）
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };

  let DATA = null; // /api/users 返回的数据

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

    const head = document.createElement('section');
    head.className = 'pf-head';

    const av = document.createElement('div');
    av.className = 'pf-avatar';
    av.textContent = u.username.slice(0, 1).toUpperCase();

    const name = document.createElement('h1');
    name.className = 'pf-name';
    name.textContent = '@' + u.username;

    const region = document.createElement('div');
    region.className = 'pf-region';
    region.innerHTML = ICONS.pin + '<span></span>';
    region.querySelector('span').textContent = u.state + (u.city ? ' · ' + u.city : '');

    const stats = document.createElement('div');
    stats.className = 'pf-stats';
    stats.append(statBox(fmtN(st.postCount), t('pfPosts')), statBox(fmtN(st.likeTotal), t('pfLikes')));

    head.append(av, name, region, stats);

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
      const edit = mkBtn('pf-ghost', ICONS.edit, t('pfEdit'));
      edit.addEventListener('click', openEdit);
      const out = mkBtn('pf-ghost pf-logout', null, t('logout'));
      out.addEventListener('click', logout);
      actions.append(edit, out);
    } else {
      const wa = mkBtn('pf-wa', ICONS.whatsapp, t('pfWa'));
      if (DATA.waUrl) wa.addEventListener('click', () => { location.href = DATA.waUrl; });
      else wa.addEventListener('click', () => { toast(t('errAuth')); setTimeout(() => { location.href = 'index.html'; }, 900); });
      actions.appendChild(wa);
    }
    head.appendChild(actions);
    wrap.appendChild(head);

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

    setBackLabel();
  }

  function statBox(num, label) {
    const d = document.createElement('div');
    d.className = 'pf-stat';
    d.innerHTML = `<b>${esc(num)}</b><span>${esc(label)}</span>`;
    return d;
  }

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

  /* ---------------- 编辑简介（仅自己） ---------------- */
  function openEdit() {
    const ta = $('#editBio');
    ta.value = DATA.user.bio || '';
    $('#bioCount').textContent = ta.value.length;
    $('#editOverlay').classList.add('show');
    setTimeout(() => ta.focus(), 50);
  }
  function closeEdit() { $('#editOverlay').classList.remove('show'); }

  $('#editClose').addEventListener('click', closeEdit);
  $('#editCancel').addEventListener('click', closeEdit);
  $('#editOverlay').addEventListener('click', (e) => { if (e.target === $('#editOverlay')) closeEdit(); });
  $('#editBio').addEventListener('input', () => { $('#bioCount').textContent = $('#editBio').value.length; });
  $('#editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await api('/api/me', { method: 'PATCH', body: { bio: $('#editBio').value.trim() } });
      DATA.user.bio = res.user.bio;
      closeEdit();
      toast(t('pfBioSaved'));
      render();
    } catch (err) {
      toast(t(err.code === 'auth' ? 'errAuth' : 'errNet'));
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
    setBackLabel();
    load();
  });
})();
