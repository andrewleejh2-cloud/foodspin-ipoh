/* Foody — 站内私信 (DM)
   一个页面两种视图：?u=用户名 → 和某人的聊天；无参数 → 收件箱（对话列表）。
   beta 用轮询刷新（不引 WebSocket）：聊天每 4 秒、收件箱每 6 秒拉一次。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const CHAT_WITH = (new URLSearchParams(location.search).get('u') || '').trim();
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let ME = null;
  let pollTimer = null;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function setBackLabel() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }

  $('#backBtn').innerHTML = ICONS.back;
  $('#langBtn').innerHTML = ICONS.globe;
  $('#msgSend').innerHTML = ICONS.send;
  $('#backBtn').addEventListener('click', () => {
    // 聊天视图 → 回收件箱；收件箱 → 明确回 FYP（不用 history.back，否则会被送回刚才的聊天页，在私信里打转出不去）
    location.href = CHAT_WITH ? 'messages.html' : 'fyp.html';
  });
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });
  document.addEventListener('foody:lang', () => { setBackLabel(); if (CHAT_WITH) loadChat(false); else loadInbox(); });

  /* ---------------- 收件箱 ---------------- */
  async function loadInbox() {
    $('#msgTitle').textContent = t('dmTitle');
    let data;
    try { data = await api('/api/conversations'); }
    catch (e) { if (e.code === 'auth') return void (location.href = 'index.html'); return; }
    const wrap = $('#msgWrap');
    wrap.className = 'msg-wrap inbox';
    if (!data.conversations.length) {
      wrap.innerHTML = `<div class="msg-empty"><div class="big">💬</div>${esc(t('dmEmpty'))}</div>`;
      return;
    }
    wrap.innerHTML = '';
    for (const c of data.conversations) {
      const row = document.createElement('a');
      row.className = 'conv';
      row.href = 'messages.html?u=' + encodeURIComponent(c.username);
      const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, c.username, c.avatar);
      const body = document.createElement('span'); body.className = 'conv-body';
      const top = document.createElement('span'); top.className = 'conv-top';
      const nm = document.createElement('b'); nm.textContent = '@' + c.username;
      const tm = document.createElement('span'); tm.className = 'conv-time'; tm.textContent = fmtAgo(c.lastAt);
      top.append(nm, tm);
      const prev = document.createElement('span'); prev.className = 'conv-prev';
      prev.textContent = (c.lastMine ? t('dmYou') + ' ' : '') + c.lastText;
      body.append(top, prev);
      row.append(av, body);
      if (c.unread) { const b = document.createElement('span'); b.className = 'conv-badge'; b.textContent = c.unread > 99 ? '99+' : c.unread; row.appendChild(b); }
      wrap.appendChild(row);
    }
  }

  /* ---------------- 聊天 ---------------- */
  async function loadChat(forceScroll) {
    let data;
    try { data = await api('/api/messages/' + encodeURIComponent(CHAT_WITH)); }
    catch (e) {
      if (e.code === 'auth') return void (location.href = 'index.html');
      if (e.code === 'not_found') { $('#msgTitle').textContent = ''; $('#msgWrap').innerHTML = `<div class="msg-empty">${esc(t('pfNotFound'))}</div>`; }
      return;
    }
    const titleEl = $('#msgTitle');
    titleEl.textContent = '@' + data.user.username;
    titleEl.classList.add('link');
    titleEl.onclick = () => { location.href = 'profile.html?u=' + encodeURIComponent(data.user.username); };

    const wrap = $('#msgWrap');
    wrap.className = 'msg-wrap chat';
    const atBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 50;
    wrap.innerHTML = '';
    if (!data.messages.length) {
      wrap.innerHTML = `<div class="msg-empty">${esc(t('dmSayHi', { name: data.user.username }))}</div>`;
    } else {
      for (const m of data.messages) {
        const b = document.createElement('div');
        b.className = 'bubble ' + (m.mine ? 'me' : 'them');
        b.textContent = m.text;
        wrap.appendChild(b);
      }
    }
    $('#msgForm').hidden = false;
    if (forceScroll || atBottom) wrap.scrollTop = wrap.scrollHeight;
  }

  async function send(text) {
    try { await api('/api/messages', { method: 'POST', body: { to: CHAT_WITH, text } }); await loadChat(true); }
    catch (e) { toast(errMsg(e.code)); }
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    setBackLabel();
    try { ME = (await api('/api/me')).user; } catch {}
    if (!ME) return void (location.href = 'index.html');

    if (CHAT_WITH) {
      await loadChat(true);
      $('#msgForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = $('#msgInput').value.trim();
        if (!v) return;
        $('#msgInput').value = '';
        send(v);
      });
      pollTimer = setInterval(() => loadChat(false), 4000);
    } else {
      await loadInbox();
      pollTimer = setInterval(loadInbox, 6000);
    }
  });

  window.addEventListener('beforeunload', () => { if (pollTimer) clearInterval(pollTimer); });
})();
