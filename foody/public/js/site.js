/* Foody — 公开微站（一键发布的个人/商业落地页）
   /site.html?u=用户名。未发布的微站只有本人能看到。内容来自 user.site + 用户自己的帖（画廊）。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const U = (new URLSearchParams(location.search).get('u') || '').trim();
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let D = null;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function fail(msg) { $('#siteRoot').innerHTML = `<div class="site-fail">${esc(msg)}</div>`; }

  async function load() {
    if (!U) return fail(t('pfNotFound'));
    try { D = await api('/api/site/' + encodeURIComponent(U)); }
    catch (e) {
      if (e.code === 'not_published') return fail(t('siteUnpub'));
      if (e.code === 'not_found') return fail(t('pfNotFound'));
      return fail(t('errNet'));
    }
    document.title = (D.title || ('@' + D.username)) + ' · Foody';
    render();
  }

  function linkBtn(kind, icon, label, url) {
    const a = document.createElement('a');
    a.className = 'site-btn site-btn-' + kind;
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = (icon || '') + '<span>' + esc(label) + '</span>';
    return a;
  }
  function section(title, contentEl, icon) {
    const s = document.createElement('section');
    s.className = 'site-sec';
    const h = document.createElement('h2');
    h.innerHTML = (icon || '') + '<span>' + esc(title) + '</span>';
    s.append(h, contentEl);
    return s;
  }
  function textBlock(text) { const p = document.createElement('p'); p.className = 'site-text'; p.textContent = text; return p; }

  function render() {
    const root = $('#siteRoot');
    root.innerHTML = '';
    FoodyCart.setWaUrl(D.waUrl, D.username); FoodyCart.reset();   // 重渲染先清旧订单条，末尾按购物车恢复
    document.body.className = 'page-site site-theme-' + (D.theme || 'warm');   // 套配色主题

    const bar = document.createElement('div');
    bar.className = 'site-bar';
    const back = document.createElement('button');
    back.className = 'site-icon'; back.innerHTML = ICONS.back; back.title = BACK[LANG] || BACK.en;
    back.addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'fyp.html'; });
    const sp = document.createElement('div'); sp.style.flex = '1';
    bar.append(back, sp);
    if (D.isMe) {
      const ed = document.createElement('button');
      ed.className = 'site-icon'; ed.innerHTML = ICONS.edit; ed.title = t('pfEdit');
      ed.addEventListener('click', () => { location.href = 'site-edit.html'; });
      bar.appendChild(ed);
    }
    const lg = document.createElement('button');
    lg.className = 'site-icon'; lg.innerHTML = ICONS.globe;
    lg.addEventListener('click', () => { setLang(LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]); });
    bar.appendChild(lg);
    root.appendChild(bar);

    if (D.isMe && !D.published) {
      const b = document.createElement('div');
      b.className = 'site-draft';
      b.textContent = t('siteDraft');
      root.appendChild(b);
    }

    const hero = document.createElement('header');
    hero.className = 'site-hero' + (D.cover ? ' has-cover' : '');
    if (D.cover) { const img = document.createElement('img'); img.className = 'site-cover'; img.src = D.cover; img.alt = ''; hero.appendChild(img); }
    const ht = document.createElement('div');
    ht.className = 'site-hero-text';
    const h1 = document.createElement('h1');
    h1.textContent = D.title || ('@' + D.username);
    ht.appendChild(h1);
    if (D.tagline) { const tg = document.createElement('p'); tg.className = 'site-tagline'; tg.textContent = D.tagline; ht.appendChild(tg); }
    if (D.status === 'open' || D.status === 'closed') {
      const st = document.createElement('div'); st.className = 'site-status ' + D.status;
      st.textContent = t(D.status === 'open' ? 'statusOpen' : 'statusClosed');
      ht.appendChild(st);
    }
    hero.appendChild(ht);
    root.appendChild(hero);

    // ---- 三板块：首页 / 菜单 / 联系 ----
    const home = document.createElement('div'); home.className = 'site-panel';
    const menuPanel = document.createElement('div'); menuPanel.className = 'site-panel';
    const contact = document.createElement('div'); contact.className = 'site-panel';

    // 首页：介绍 + 帖子画廊（视频格只放占位+播放标，不加载视频文件）
    if (D.intro) home.appendChild(section(t('siteAbout'), textBlock(D.intro)));
    if (D.posts && D.posts.length) {
      const grid = document.createElement('div');
      grid.className = 'site-grid';
      for (const p of D.posts) {
        const c = document.createElement('a');
        c.className = 'site-cell';
        c.href = 'fyp.html?user=' + encodeURIComponent(D.username) + '&start=' + encodeURIComponent(p.id);
        if (p.mediaType === 'video') { c.classList.add('is-video'); c.innerHTML = '<span class="site-play">' + ICONS.play + '</span>'; }
        else { const img = document.createElement('img'); img.src = p.mediaUrl; img.loading = 'lazy'; img.alt = ''; c.appendChild(img); }
        grid.appendChild(c);
      }
      home.appendChild(section(t('siteGallery'), grid));
    }

    // 菜单：分类 ▸ 菜品（图/名/价/描述 + 加购按钮）
    let hasMenu = false;
    let uid = 0;
    for (const cat of (D.menu || [])) {
      if (!cat.items || !cat.items.length) continue;
      hasMenu = true;
      const c = document.createElement('div'); c.className = 'menu-cat';
      if (cat.name) { const h = document.createElement('div'); h.className = 'menu-cat-name'; h.textContent = cat.name; c.appendChild(h); }
      for (const it of cat.items) {
        const key = 'i' + (uid++);
        const row = document.createElement('div'); row.className = 'menu-item' + (it.soldOut ? ' is-sold' : '');
        if (it.photo) { const img = document.createElement('img'); img.className = 'menu-item-photo'; img.src = it.photo; img.loading = 'lazy'; img.alt = ''; row.appendChild(img); }
        const b = document.createElement('div'); b.className = 'menu-item-body';
        const top = document.createElement('div'); top.className = 'menu-item-top';
        const nm = document.createElement('span'); nm.className = 'menu-item-name'; nm.textContent = it.name; top.appendChild(nm);
        if (it.price) { const pr = document.createElement('span'); pr.className = 'menu-item-price'; pr.textContent = it.price; top.appendChild(pr); }
        b.appendChild(top);
        if (it.desc) { const d = document.createElement('p'); d.className = 'menu-item-desc'; d.textContent = it.desc; b.appendChild(d); }
        row.appendChild(b);
        row.appendChild(FoodyCart.makeBuy(key, it));
        c.appendChild(row);
      }
      menuPanel.appendChild(c);
    }

    // 联系：行动按钮 + 营业时间 + 地址
    const acts = document.createElement('div');
    acts.className = 'site-acts';
    if (D.waUrl) acts.appendChild(linkBtn('wa', ICONS.whatsapp, 'WhatsApp', D.waUrl));
    if (D.mapUrl) acts.appendChild(linkBtn('map', ICONS.pin, t('siteMap'), D.mapUrl));
    for (const l of (D.links || [])) acts.appendChild(linkBtn('link', ICONS.share, l.label, l.url));
    if (acts.children.length) contact.appendChild(acts);
    if (D.hours) contact.appendChild(section(t('siteHours'), textBlock(D.hours), ICONS.clock));
    if (D.address) contact.appendChild(section(t('siteAddress'), textBlock(D.address), ICONS.pin));

    // 只显示有内容的板块；只有一个就不显示导航
    const tabs = [{ label: t('siteTabHome'), panel: home }];
    if (hasMenu) tabs.push({ label: t('siteTabMenu'), panel: menuPanel });
    if (contact.children.length) tabs.push({ label: t('siteTabContact'), panel: contact });

    const nav = document.createElement('div'); nav.className = 'site-nav';
    const body = document.createElement('div'); body.className = 'site-body';
    tabs.forEach((tb, i) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = tb.label;
      if (i === 0) { btn.classList.add('on'); tb.panel.classList.add('on'); }
      btn.addEventListener('click', () => {
        nav.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        body.querySelectorAll('.site-panel').forEach(x => x.classList.remove('on'));
        btn.classList.add('on'); tb.panel.classList.add('on');
      });
      nav.appendChild(btn);
      body.appendChild(tb.panel);
    });
    if (tabs.length > 1) root.appendChild(nav);
    root.appendChild(body);

    const foot = document.createElement('a');
    foot.className = 'site-foot';
    foot.href = 'profile.html?u=' + encodeURIComponent(D.username);
    const av = document.createElement('span'); av.className = 'avatar-sm'; fillAvatar(av, D.username, D.avatar);
    const fn = document.createElement('span'); fn.textContent = '@' + D.username;
    foot.append(av, fn);
    root.appendChild(foot);
    const pw = document.createElement('div'); pw.className = 'site-pw'; pw.textContent = 'Powered by Foody';
    root.appendChild(pw);
    FoodyCart.refreshBar();   // 语言切换/重渲染后，按当前购物车恢复底部订单条
  }

  document.addEventListener('foody:lang', () => { if (D) render(); });
  document.addEventListener('DOMContentLoaded', () => { applyLang(); load(); });
})();
