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
    hero.appendChild(ht);
    root.appendChild(hero);

    const body = document.createElement('div');
    body.className = 'site-body';

    const acts = document.createElement('div');
    acts.className = 'site-acts';
    if (D.waUrl) acts.appendChild(linkBtn('wa', ICONS.whatsapp, 'WhatsApp', D.waUrl));
    if (D.mapUrl) acts.appendChild(linkBtn('map', ICONS.pin, t('siteMap'), D.mapUrl));
    for (const l of (D.links || [])) acts.appendChild(linkBtn('link', ICONS.share, l.label, l.url));
    if (acts.children.length) body.appendChild(acts);

    if (D.intro) body.appendChild(section(t('siteAbout'), textBlock(D.intro)));
    if (D.hours) body.appendChild(section(t('siteHours'), textBlock(D.hours), ICONS.clock));
    if (D.address) body.appendChild(section(t('siteAddress'), textBlock(D.address), ICONS.pin));

    if (D.posts && D.posts.length) {
      const grid = document.createElement('div');
      grid.className = 'site-grid';
      for (const p of D.posts) {
        const c = document.createElement('a');
        c.className = 'site-cell';
        c.href = 'fyp.html?user=' + encodeURIComponent(D.username) + '&start=' + encodeURIComponent(p.id);
        let th;
        if (p.mediaType === 'video') { th = document.createElement('video'); th.src = p.mediaUrl; th.muted = true; th.preload = 'metadata'; th.playsInline = true; }
        else { th = document.createElement('img'); th.src = p.mediaUrl; th.loading = 'lazy'; th.alt = ''; }
        c.appendChild(th);
        grid.appendChild(c);
      }
      body.appendChild(section(t('siteGallery'), grid));
    }

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
  }

  document.addEventListener('foody:lang', () => { if (D) render(); });
  document.addEventListener('DOMContentLoaded', () => { applyLang(); load(); });
})();
