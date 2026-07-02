/* Foody — 审核后台（仅管理员可进）。复用 shared.js 的三语字典 / API / Toast / 图标。
   举报队列：删内容 / 封禁作者 / 驳回；顶部是平台概览统计。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  const REASON_KEY = {
    spam: 'reason_spam', inappropriate: 'reason_inappropriate', harassment: 'reason_harassment',
    misinfo: 'reason_misinfo', other: 'reason_other', auto: 'reason_auto'
  };
  let ME = null;
  let curStatus = 'open';
  let curView = 'reports';   // 'reports' | 'users'
  let allUsers = [];         // /api/admin/users 缓存（前端按用户名搜索）

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  /* ---------------- 顶栏 ---------------- */
  $('#backBtn').innerHTML = ICONS.back;
  $('#langBtn').innerHTML = ICONS.globe;
  $('#backBtn').addEventListener('click', () => { location.href = 'fyp.html'; });
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });
  document.addEventListener('foody:lang', () => {
    paintStatic();
    if (ME && ME.isAdmin) {
      paintViewToggle(); paintTabs(); applyUserSearchPh(); loadAll();
      if (curView === 'users') loadUsers();
    }
  });

  function paintStatic() {
    $('#admTitle').textContent = t('admTitle');
    const lbl = BACK[LANG] || BACK.en;
    $('#backBtn').title = lbl;
    $('#backBtn').setAttribute('aria-label', lbl);
  }

  /* ---------------- 加载 ---------------- */
  async function loadAll() { await Promise.all([loadSummary(), loadReports()]); }

  async function loadSummary() {
    let s;
    try { s = await api('/api/admin/summary'); } catch { return; }
    const cards = [
      ['admStatOpen', s.openReports, true],
      ['admStatUsers', s.users],
      ['admStatPosts', s.posts],
      ['admStatComments', s.comments],
      ['admStatBanned', s.banned]
    ];
    const wrap = $('#admStats');
    wrap.innerHTML = '';
    for (const [key, val, hot] of cards) {
      const c = document.createElement('div');
      c.className = 'adm-stat' + (hot && val > 0 ? ' hot' : '');
      c.innerHTML = `<b>${esc(String(val))}</b><span>${esc(t(key))}</span>`;
      wrap.appendChild(c);
    }
  }

  function paintTabs() {
    const tabs = [['open', 'admTabOpen'], ['resolved', 'admTabResolved'], ['dismissed', 'admTabDismissed'], ['all', 'admTabAll']];
    const wrap = $('#admTabs');
    wrap.innerHTML = '';
    for (const [st, key] of tabs) {
      const b = document.createElement('button');
      b.className = 'adm-tab' + (st === curStatus ? ' on' : '');
      b.textContent = t(key);
      b.addEventListener('click', () => { if (curStatus === st) return; curStatus = st; paintTabs(); loadReports(); });
      wrap.appendChild(b);
    }
  }

  async function loadReports() {
    const list = $('#admList');
    list.innerHTML = '<div class="adm-state"><div class="spinner" style="margin:0 auto"></div></div>';
    let data;
    try { data = await api('/api/admin/reports?status=' + curStatus); }
    catch { list.innerHTML = `<div class="adm-state">${esc(t('admLoadFail'))}</div>`; return; }
    if (!data.reports.length) {
      list.innerHTML = `<div class="adm-state"><div class="big">🎉</div>${esc(t('admEmpty'))}</div>`;
      return;
    }
    list.innerHTML = '';
    for (const r of data.reports) list.appendChild(card(r));
  }

  /* ---------------- 举报卡片 ---------------- */
  function card(r) {
    const el = document.createElement('div');
    el.className = 'adm-card' + (r.status !== 'open' ? ' done' : '');

    // 头部：类型徽章 + 原因 + 时间
    const head = document.createElement('div');
    head.className = 'adm-card-head';
    const badge = document.createElement('span');
    badge.className = 'adm-badge ' + r.type;
    badge.textContent = ({ post: '🍜', comment: '💬', user: '👤' }[r.type] || '') + ' ' + r.type;
    const reason = document.createElement('span');
    reason.className = 'adm-reason' + (r.reason === 'auto' ? ' auto' : '');
    reason.textContent = t(REASON_KEY[r.reason] || 'reason_other');
    const ago = document.createElement('span');
    ago.className = 'adm-ago';
    ago.textContent = fmtAgo(r.createdAt);
    head.append(badge, reason, ago);
    if (r.reportCount > 1) {   // 被举报多次 → 热度徽章
      const rc = document.createElement('span');
      rc.className = 'adm-rcount';
      rc.textContent = t('admReportCount', { n: r.reportCount });
      head.appendChild(rc);
    }
    if (r.autoHidden) {        // 已达阈值自动暂隐
      const ah = document.createElement('span');
      ah.className = 'adm-autohidden';
      ah.textContent = '🙈 ' + t('admAutoHidden');
      head.appendChild(ah);
    }
    el.appendChild(head);

    // 目标内容快照
    const body = document.createElement('div');
    body.className = 'adm-card-body';
    if (!r.exists) {
      body.innerHTML = `<span class="adm-gone">${esc(t('admGone'))}</span>`;
    } else if (r.type === 'post') {
      const thumb = document.createElement('div');
      thumb.className = 'adm-thumb';
      if (r.target.mediaType === 'video') { const v = document.createElement('video'); v.src = r.target.thumb; v.muted = true; v.preload = 'metadata'; thumb.appendChild(v); }
      else { const img = document.createElement('img'); img.src = r.target.thumb; img.alt = ''; thumb.appendChild(img); }
      const txt = document.createElement('div'); txt.className = 'adm-txt';
      txt.innerHTML = `<b>@${esc(r.ownerUsername || '?')}</b><p>${esc(r.target.caption || '')}</p>`;
      body.append(thumb, txt);
    } else if (r.type === 'comment') {
      const txt = document.createElement('div'); txt.className = 'adm-txt';
      txt.innerHTML = `<b>@${esc(r.ownerUsername || '?')}</b><p>“${esc(r.target.text || '')}”</p>`;
      body.appendChild(txt);
    } else {
      const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, r.ownerUsername, r.target.avatar);
      const txt = document.createElement('div'); txt.className = 'adm-txt';
      txt.innerHTML = `<b>@${esc(r.ownerUsername || '?')}</b><p>${esc(r.target.bio || '')}</p>`;
      body.append(av, txt);
    }
    if (r.ownerBanned) {
      const tag = document.createElement('span');
      tag.className = 'adm-banned-tag';
      tag.textContent = t('admBannedTag');
      body.appendChild(tag);
    }
    if (r.ownerMuted && !r.ownerBanned) {
      const tag = document.createElement('span');
      tag.className = 'adm-tag banned';
      tag.textContent = t('admMutedTag');
      body.appendChild(tag);
    }
    el.appendChild(body);

    // 举报人 + 备注
    const meta = document.createElement('div');
    meta.className = 'adm-meta';
    const who = r.reporter === 'system' ? t('admAuto') : '@' + r.reporter;
    meta.innerHTML = `<span>${esc(t('admReporter'))}: ${esc(who)}</span>` + (r.note ? `<span class="adm-note">“${esc(r.note)}”</span>` : '');
    el.appendChild(meta);

    // 处置按钮
    const acts = document.createElement('div');
    acts.className = 'adm-acts';
    if (r.status === 'open') {
      if (r.exists && (r.type === 'post' || r.type === 'comment')) {
        acts.appendChild(actBtn('danger', t('admDoDelete'), () => act(r.id, 'delete', t('admConfirmDelete'))));
      }
      if (r.ownerUsername && !r.ownerIsAdmin && !r.ownerBanned) {
        acts.appendChild(actBtn('ghost', t('admDoWarn'), () => act(r.id, 'warn', t('admConfirmWarn', { name: r.ownerUsername }))));
        if (!r.ownerMuted) acts.appendChild(actBtn('warn', t('admDoMute'), () => act(r.id, 'mute', t('admDoMute') + ' @' + r.ownerUsername + ' (7d)?')));
        acts.appendChild(actBtn('warn', t('admDoBan'), () => act(r.id, 'ban', t('admConfirmBan', { name: r.ownerUsername }))));
      }
      if (r.ownerMuted && r.ownerUsername) {
        acts.appendChild(actBtn('ghost', t('admDoUnmute'), () => unmute(r.ownerUsername)));
      }
      if (r.ownerBanned && r.ownerUsername) {
        acts.appendChild(actBtn('ghost', t('admDoUnban'), () => unban(r.ownerUsername)));
      }
      acts.appendChild(actBtn('ghost', t('admDoDismiss'), () => act(r.id, 'dismiss')));
    } else {
      const done = document.createElement('span');
      done.className = 'adm-done-tag';
      done.textContent = ({ delete: t('admDoneDelete'), ban: t('admDoneBan'), mute: t('admDoneMute'), warn: t('admDoneWarn') }[r.action]) || t('admDoneDismiss');
      acts.appendChild(done);
      if (r.ownerBanned && r.ownerUsername) acts.appendChild(actBtn('ghost', t('admDoUnban'), () => unban(r.ownerUsername)));
    }
    if (r.type === 'post' && r.exists) {
      acts.appendChild(actBtn('link', t('admViewPost'), () => { location.href = 'fyp.html?start=' + encodeURIComponent(r.targetId); }));
    }
    el.appendChild(acts);
    return el;
  }

  function actBtn(kind, label, onClick) {
    const b = document.createElement('button');
    b.className = 'adm-btn ' + kind;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  async function act(id, action, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await api('/api/admin/reports/' + id, { method: 'POST', body: { action } });
      toast(({ delete: t('admDoneDelete'), ban: t('admDoneBan'), mute: t('admDoneMute'), warn: t('admDoneWarn') }[action]) || t('admDoneDismiss'));
      loadAll();
    } catch (e) { toast(errMsg(e.code)); }
  }

  async function unban(username) {
    try {
      await api('/api/admin/users/' + encodeURIComponent(username) + '/ban', { method: 'POST', body: { ban: false } });
      toast(t('admDoneUnban'));
      loadAll();
    } catch (e) { toast(errMsg(e.code)); }
  }

  /* ---------------- 用户列表视图 ---------------- */
  // 主切换：举报队列 / 用户
  function paintViewToggle() {
    const views = [['reports', 'admViewReports'], ['users', 'admViewUsers']];
    const wrap = $('#admViewToggle');
    wrap.innerHTML = '';
    for (const [v, key] of views) {
      const b = document.createElement('button');
      b.className = 'adm-vt' + (v === curView ? ' on' : '');
      b.textContent = t(key);
      b.addEventListener('click', () => switchView(v));
      wrap.appendChild(b);
    }
  }

  function switchView(v) {
    if (curView === v) return;
    curView = v;
    paintViewToggle();
    $('#admReportView').hidden = v !== 'reports';
    $('#admUsersView').hidden = v !== 'users';
    if (v === 'users') { applyUserSearchPh(); loadUsers(); }
  }

  function applyUserSearchPh() {
    const s = $('#admUserSearch');
    if (s) s.placeholder = t('admUserSearchPh');
  }

  async function loadUsers() {
    const list = $('#admUserList');
    list.innerHTML = '<div class="adm-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try { const d = await api('/api/admin/users'); allUsers = d.users || []; }
    catch { list.innerHTML = `<div class="adm-state">${esc(t('admLoadFail'))}</div>`; return; }
    renderUsers();
  }

  function renderUsers() {
    const list = $('#admUserList');
    const q = ($('#admUserSearch').value || '').trim().toLowerCase();
    const rows = q ? allUsers.filter(u => u.username.toLowerCase().includes(q)) : allUsers;
    if (!rows.length) { list.innerHTML = `<div class="adm-state">${esc(t('admUsersEmpty'))}</div>`; return; }
    list.innerHTML = '';
    for (const u of rows) list.appendChild(userRow(u));
  }

  function userRow(u) {
    const el = document.createElement('div');
    el.className = 'adm-user' + (u.banned ? ' banned' : '');

    const av = document.createElement('span'); av.className = 'avatar-sm';
    fillAvatar(av, u.username, u.avatar);

    const info = document.createElement('div'); info.className = 'adm-user-info';
    const nameRow = document.createElement('div'); nameRow.className = 'adm-user-name';
    nameRow.innerHTML = `<b>@${esc(u.username)}</b>`;
    if (u.isAdmin) { const tg = document.createElement('span'); tg.className = 'adm-tag admin'; tg.textContent = t('admAdminTag'); nameRow.appendChild(tg); }
    if (u.banned) { const tg = document.createElement('span'); tg.className = 'adm-tag banned'; tg.textContent = t('admBannedTag'); nameRow.appendChild(tg); }
    if (u.mutedUntil && !u.banned) { const tg = document.createElement('span'); tg.className = 'adm-tag banned'; tg.textContent = t('admMutedTag'); nameRow.appendChild(tg); }
    const sub = document.createElement('div'); sub.className = 'adm-user-sub';
    const region = [u.city, u.state].filter(Boolean).join(', ');
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '';
    sub.textContent = [region, t('admUserPosts', { n: u.postCount }), t('admUserJoined', { date: joined })].filter(Boolean).join(' · ');
    info.append(nameRow, sub);

    const acts = document.createElement('div'); acts.className = 'adm-user-acts';
    if (!u.isAdmin) {   // 管理员账号不可处置（沿用现有保护）
      acts.appendChild(actBtn('ghost', t('admDoWarn'), () => userWarn(u.username)));
      if (u.mutedUntil) acts.appendChild(actBtn('ghost', t('admDoUnmute'), () => userMute(u.username, 0)));
      else acts.appendChild(actBtn('warn', t('admDoMute'), () => userMute(u.username)));
      if (u.banned) acts.appendChild(actBtn('ghost', t('admDoUnban'), () => userBan(u.username, false)));
      else acts.appendChild(actBtn('warn', t('admDoBan'), () => userBan(u.username, true)));
    }
    acts.appendChild(actBtn('link', t('admViewProfile'), () => { location.href = 'profile.html?u=' + encodeURIComponent(u.username); }));

    el.append(av, info, acts);
    return el;
  }

  async function userBan(username, ban) {
    if (ban && !window.confirm(t('admConfirmBan', { name: username }))) return;
    try {
      await api('/api/admin/users/' + encodeURIComponent(username) + '/ban', { method: 'POST', body: { ban } });
      toast(ban ? t('admDoneBan') : t('admDoneUnban'));
      loadSummary(); loadUsers();   // 刷新概览统计 + 用户列表
    } catch (e) { toast(errMsg(e.code)); }
  }

  async function userWarn(username) {
    if (!window.confirm(t('admConfirmWarn', { name: username }))) return;
    try {
      await api('/api/admin/users/' + encodeURIComponent(username) + '/warn', { method: 'POST', body: { reason: 'other' } });
      toast(t('admDoneWarn'));
    } catch (e) { toast(errMsg(e.code)); }
  }

  // days 省略 = 弹窗问天数（默认 7）；days===0 = 解禁
  async function userMute(username, days) {
    if (days === undefined) {
      const ans = window.prompt(t('admMuteDaysPrompt'), '7');
      if (ans === null) return;
      days = parseInt(ans, 10); if (!(days > 0)) days = 7;
    }
    try {
      await api('/api/admin/users/' + encodeURIComponent(username) + '/mute', { method: 'POST', body: { days } });
      toast(days > 0 ? t('admDoneMute') : t('admDoneUnmute'));
      loadUsers();
    } catch (e) { toast(errMsg(e.code)); }
  }

  // 举报卡片上的「解禁」用（解禁后刷新举报队列）
  async function unmute(username) {
    try {
      await api('/api/admin/users/' + encodeURIComponent(username) + '/mute', { method: 'POST', body: { days: 0 } });
      toast(t('admDoneUnmute'));
      loadAll();
    } catch (e) { toast(errMsg(e.code)); }
  }

  /* ---------------- 启动：先确认是管理员 ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    paintStatic();
    try { const d = await api('/api/me'); ME = d.user; } catch {}
    if (!ME || !ME.isAdmin) {
      $('#admWrap').innerHTML = `<div class="adm-state"><div class="big">🔒</div>${esc(t('admNoAccess'))}</div>`;
      return;
    }
    paintViewToggle();
    paintTabs();
    applyUserSearchPh();
    $('#admUserSearch').addEventListener('input', renderUsers);
    loadAll();
  });
})();
