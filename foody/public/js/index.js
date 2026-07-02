/* Foody 首页：注册 / 登录 / 自动登入 / 语言切换 */
(function () {
  const $ = (s) => document.querySelector(s);

  let STATES = [];

  /* ---- 语言切换（分段按钮） ---- */
  function paintLangSeg() {
    document.querySelectorAll('#langSeg button').forEach(b => {
      b.classList.toggle('on', b.dataset.lang === LANG);
    });
  }
  document.querySelectorAll('#langSeg button').forEach(b => {
    b.addEventListener('click', () => { setLang(b.dataset.lang); paintLangSeg(); fillStates(); });
  });

  /* ---- 州属下拉 ---- */
  function fillStates() {
    const sel = $('#rgState');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="" disabled selected>${t('statePh')}</option>` +
      STATES.map(s => `<option value="${s}">${s}</option>`).join('');
    if (cur) sel.value = cur;
  }

  /* ---- 密码显示切换 ---- */
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.innerHTML = ICONS.eye;
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.for);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
    });
  });

  /* ---- 登录/注册 tab ---- */
  const tabLogin = $('#tabLogin'), tabRegister = $('#tabRegister');
  const formLogin = $('#formLogin'), formRegister = $('#formRegister');
  function switchTab(login) {
    tabLogin.classList.toggle('on', login);
    tabRegister.classList.toggle('on', !login);
    formLogin.classList.toggle('on', login);
    formRegister.classList.toggle('on', !login);
    hideErr();
  }
  tabLogin.addEventListener('click', () => switchTab(true));
  tabRegister.addEventListener('click', () => switchTab(false));

  const errBox = $('#authErr');
  function showErr(code) { errBox.textContent = errMsg(code); errBox.classList.add('show'); }
  function hideErr() { errBox.classList.remove('show'); }

  /* ---- 已登录欢迎卡 ---- */
  function showWelcome(user) {
    $('#authForms').hidden = true;
    const card = $('#welcomeCard');
    card.hidden = false;
    $('#wcAvatar').textContent = user.username.slice(0, 1).toUpperCase();
    $('#wcName').textContent = user.username;
    $('#wcRegion').innerHTML =
      ICONS.pin + ' <span>' + escapeHtml(user.state + (user.city ? ' · ' + user.city : '')) + '</span>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('#logoutLink').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    location.reload();
  });

  /* ---- 提交 ---- */
  const forgotLink = document.getElementById('forgotLink');
  if (forgotLink) forgotLink.addEventListener('click', () => openPasswordReset($('#liName').value.includes('@') ? $('#liName').value.trim() : ''));

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); hideErr();
    const username = $('#liName').value.trim();
    const password = $('#liPass').value;
    if (!username || !password) return showErr('missing');
    const btn = formLogin.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api('/api/login', { method: 'POST', body: { username, password } });
      location.href = 'fyp.html';
    } catch (err) { showErr(err.code); btn.disabled = false; }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault(); hideErr();
    const body = {
      username: $('#rgName').value.trim(),
      password: $('#rgPass').value,
      phone: $('#rgPhone').value.trim(),
      email: $('#rgEmail').value.trim(),
      state: $('#rgState').value,
      city: $('#rgCity').value.trim()
    };
    if (!body.username || !body.password || !body.phone || !body.state) return showErr('missing');
    const btn = formRegister.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api('/api/register', { method: 'POST', body });
      location.href = 'fyp.html';
    } catch (err) { showErr(err.code); btn.disabled = false; }
  });

  /* ---- 初始化 ---- */
  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    paintLangSeg();
    try {
      const data = await api('/api/me');
      STATES = data.states || [];
      fillStates();
      if (data.user) showWelcome(data.user); // 自动登入
    } catch { /* 服务器没开时静默 */ }
  });
})();
