/* Foody — 通知中心
   后端动态聚合「别人赞/评论我的帖、关注我」，按时间倒序。打开即标记已读（清红点）。
   beta 用轮询刷新（每 20 秒）。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let pollTimer = null;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function setBackLabel() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }
  function actionText(type) { return type === 'like' ? t('ntLiked') : type === 'comment' ? t('ntCommented') : t('ntFollowed'); }

  $('#backBtn').innerHTML = ICONS.back;
  $('#langBtn').innerHTML = ICONS.globe;
  $('#backBtn').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'fyp.html'; });
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });
  document.addEventListener('foody:lang', () => { setBackLabel(); load(); });

  async function load() {
    $('#notifTitle').textContent = t('ntTitle');
    let data;
    try { data = await api('/api/notifications'); }
    catch (e) { if (e.code === 'auth') return void (location.href = 'index.html'); return; }
    const wrap = $('#notifWrap');
    if (!data.notifications.length) {
      wrap.innerHTML = `<div class="msg-empty"><div class="big">🔔</div>${esc(t('ntEmpty'))}</div>`;
      return;
    }
    wrap.innerHTML = '';
    for (const n of data.notifications) {
      const row = document.createElement('div');
      row.className = 'nt-row' + (n.unread ? ' unread' : '');
      const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, n.username, n.avatar);
      av.style.cursor = 'pointer';
      av.addEventListener('click', (e) => { e.stopPropagation(); location.href = 'profile.html?u=' + encodeURIComponent(n.username); });
      const body = document.createElement('div'); body.className = 'nt-body';
      const line = document.createElement('p'); line.className = 'nt-text';
      const b = document.createElement('b'); b.textContent = '@' + n.username;
      const tail = ' ' + actionText(n.type) + (n.type === 'comment' && n.text ? ' 「' + n.text + '」' : '');
      line.append(b, document.createTextNode(tail));
      const time = document.createElement('span'); time.className = 'nt-time'; time.textContent = fmtAgo(n.createdAt);
      body.append(line, time);
      row.append(av, body);
      if (n.thumb) {
        const th = document.createElement('img'); th.className = 'nt-thumb'; th.src = n.thumb; th.loading = 'lazy'; th.alt = '';
        row.appendChild(th);
      }
      row.addEventListener('click', () => {
        if (n.type === 'follow') location.href = 'profile.html?u=' + encodeURIComponent(n.username);
        else if (n.postId) location.href = 'fyp.html?start=' + encodeURIComponent(n.postId);
      });
      wrap.appendChild(row);
    }
    try { await api('/api/notifications/seen', { method: 'POST' }); } catch {}
  }

  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    setBackLabel();
    let me = null;
    try { me = (await api('/api/me')).user; } catch {}
    if (!me) return void (location.href = 'index.html');
    await load();
    pollTimer = setInterval(load, 20000);
  });
  window.addEventListener('beforeunload', () => { if (pollTimer) clearInterval(pollTimer); });
})();
