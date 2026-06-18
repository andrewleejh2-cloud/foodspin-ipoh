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
  document.addEventListener('foody:lang', () => { paintStatic(); if (ME && ME.isAdmin) { paintTabs(); loadAll(); } });

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
      if (r.exists && r.ownerUsername && !r.ownerIsAdmin && !r.ownerBanned) {
        acts.appendChild(actBtn('warn', t('admDoBan'), () => act(r.id, 'ban', t('admConfirmBan', { name: r.ownerUsername }))));
      }
      if (r.ownerBanned && r.ownerUsername) {
        acts.appendChild(actBtn('ghost', t('admDoUnban'), () => unban(r.ownerUsername)));
      }
      acts.appendChild(actBtn('ghost', t('admDoDismiss'), () => act(r.id, 'dismiss')));
    } else {
      const done = document.createElement('span');
      done.className = 'adm-done-tag';
      done.textContent = r.action === 'delete' ? t('admDoneDelete') : r.action === 'ban' ? t('admDoneBan') : t('admDoneDismiss');
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
      toast(action === 'delete' ? t('admDoneDelete') : action === 'ban' ? t('admDoneBan') : t('admDoneDismiss'));
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

  /* ---------------- 启动：先确认是管理员 ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    paintStatic();
    try { const d = await api('/api/me'); ME = d.user; } catch {}
    if (!ME || !ME.isAdmin) {
      $('#admWrap').innerHTML = `<div class="adm-state"><div class="big">🔒</div>${esc(t('admNoAccess'))}</div>`;
      return;
    }
    paintTabs();
    loadAll();
  });
})();
