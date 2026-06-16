/* Foody — 地点聚合页
   把标了同一店名的帖子聚到一起（不是餐厅账号，是用户 UGC 聚合）。
   结构复用个人主页：头部信息 + 作品网格。导航用免费的 Google 地图搜索链接。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const PLACE = (new URLSearchParams(location.search).get('p') || '').trim();
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let DATA = null;

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function fmtN(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); }
  function setBackLabel() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }

  $('#backBtn').innerHTML = ICONS.back;
  $('#langBtn').innerHTML = ICONS.globe;
  $('#backBtn').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'fyp.html'; });
  $('#langBtn').addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
    setLang(next);
    toast({ zh: '语言：中文', ms: 'Bahasa: BM', en: 'Language: English' }[next]);
  });
  document.addEventListener('foody:lang', () => { setBackLabel(); if (DATA) render(); });

  async function load() {
    if (!PLACE) return renderEmpty(t('plNotFound'));
    try { DATA = await api('/api/places/' + encodeURIComponent(PLACE)); }
    catch (e) {
      if (e.code === 'not_found') return renderEmpty(t('plNotFound'));
      return renderEmpty(t('errNet'));
    }
    $('#topName').textContent = DATA.place;
    render();
  }

  function renderEmpty(msg) {
    $('#topName').textContent = '';
    $('#plWrap').innerHTML = `<div class="pf-empty"><div class="big">🍽️</div>${esc(msg)}</div>`;
  }

  function statBox(num, label) {
    const d = document.createElement('div');
    d.className = 'pf-stat';
    d.innerHTML = `<b>${esc(num)}</b><span>${esc(label)}</span>`;
    return d;
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
    c.addEventListener('click', () => { location.href = 'fyp.html?place=' + encodeURIComponent(DATA.place) + '&start=' + encodeURIComponent(p.id); });
    return c;
  }

  function render() {
    const d = DATA;
    const wrap = $('#plWrap');
    wrap.innerHTML = '';

    const head = document.createElement('section');
    head.className = 'pf-head';

    const av = document.createElement('div');
    av.className = 'pf-avatar pl-icon';
    av.innerHTML = ICONS.pin;

    const name = document.createElement('h1');
    name.className = 'pf-name';
    name.textContent = d.place;

    const region = document.createElement('div');
    region.className = 'pf-region';
    if (d.region) { region.innerHTML = ICONS.pin + '<span></span>'; region.querySelector('span').textContent = d.region; }
    else region.hidden = true;

    const stats = document.createElement('div');
    stats.className = 'pf-stats';
    stats.append(
      statBox(fmtN(d.stats.postCount), t('pfPosts')),
      statBox(fmtN(d.stats.foodieCount), t('plFoodies')),
      statBox(fmtN(d.stats.likeTotal), t('pfLikes'))
    );

    head.append(av, name, region, stats);

    const actions = document.createElement('div');
    actions.className = 'pf-actions';
    const map = document.createElement('a');
    map.className = 'pf-btn pf-map';
    map.href = d.mapUrl; map.target = '_blank'; map.rel = 'noopener';
    map.innerHTML = ICONS.pin + '<span>' + esc(t('plMap')) + '</span>';
    actions.appendChild(map);
    head.appendChild(actions);

    wrap.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'pf-grid';
    for (const p of d.posts) grid.appendChild(cell(p));
    wrap.appendChild(grid);

    setBackLabel();
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLang();
    setBackLabel();
    load();
  });
})();
