/* Foody — 探索页：按州 / 热门地点 / 热门标签浏览发现美食。复用 shared.js。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function setBack() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }

  $('#backBtn').innerHTML = ICONS.back;
  $('#langBtn').innerHTML = ICONS.globe;
  $('#backBtn').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'fyp.html'; });
  $('#langBtn').addEventListener('click', () => {
    const n = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(n);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[n]);
  });
  document.addEventListener('foody:lang', () => { setBack(); load(); });

  function section(title) { const h = document.createElement('h3'); h.className = 'ex-sec'; h.textContent = title; return h; }

  async function load() {
    $('#exTitle').textContent = t('exploreTitle');
    let d;
    try { d = await api('/api/explore'); }
    catch { $('#exWrap').innerHTML = `<div class="ex-empty">${esc(t('loadFail'))}</div>`; return; }
    const w = $('#exWrap');
    w.innerHTML = '';

    if (!d.states.length && !d.places.length && !d.tags.length) {
      w.innerHTML = `<div class="ex-empty"><div class="big">🧭</div>${esc(t('exEmpty'))}</div>`;
      return;
    }

    // 按州浏览
    if (d.states.length) {
      w.appendChild(section(t('exByState')));
      const box = document.createElement('div');
      box.className = 'ex-chips';
      for (const s of d.states) {
        const b = document.createElement('button');
        b.className = 'ex-chip';
        b.innerHTML = '<b>' + esc(s.state) + '</b><span>' + t('nPosts', { n: s.count }) + '</span>';
        b.addEventListener('click', () => { location.href = 'fyp.html?state=' + encodeURIComponent(s.state); });
        box.appendChild(b);
      }
      w.appendChild(box);
    }

    // 热门地点
    if (d.places.length) {
      w.appendChild(section(t('exHotPlaces')));
      const box = document.createElement('div');
      box.className = 'ex-places';
      for (const p of d.places) {
        const b = document.createElement('button');
        b.className = 'ex-place';
        b.innerHTML = ICONS.pin + '<b>' + esc(p.place) + '</b><span>' + t('nPosts', { n: p.count }) + '</span>';
        b.addEventListener('click', () => { location.href = 'place.html?p=' + encodeURIComponent(p.place); });
        box.appendChild(b);
      }
      w.appendChild(box);
    }

    // 热门标签
    if (d.tags.length) {
      w.appendChild(section(t('trendingTags')));
      const box = document.createElement('div');
      box.className = 'ex-chips';
      for (const tg of d.tags) {
        const b = document.createElement('button');
        b.className = 'ex-chip';
        b.innerHTML = '<b>#' + esc(tg.tag) + '</b><span>' + tg.count + '</span>';
        b.addEventListener('click', () => { location.href = 'fyp.html?tag=' + encodeURIComponent(tg.tag); });
        box.appendChild(b);
      }
      w.appendChild(box);
    }
  }

  document.addEventListener('DOMContentLoaded', () => { applyLang(); setBack(); load(); });
})();
