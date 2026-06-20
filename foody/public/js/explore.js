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

    if (!d.states.length && !d.places.length && !d.tags.length && !(d.posts && d.posts.length)) {
      w.innerHTML = `<div class="ex-empty"><div class="big">🧭</div>${esc(t('exEmpty'))}</div>`;
      return;
    }

    // 热门美食缩略图网格（TikTok Discover 式）
    if (d.posts && d.posts.length) {
      w.appendChild(section(t('exTrending')));
      const grid = document.createElement('div');
      grid.className = 'ex-grid';
      for (const p of d.posts) {
        const cell = document.createElement('a');
        cell.className = 'ex-cell';
        cell.href = 'fyp.html?start=' + encodeURIComponent(p.id);
        if (p.type === 'video') {
          // 不加载视频文件（几 MB/个会拖垮网格）——深色占位 + 居中播放标；点进去再播
          cell.classList.add('is-video');
          const play = document.createElement('span');
          play.className = 'ex-play'; play.innerHTML = ICONS.play;
          cell.appendChild(play);
        } else {
          const img = document.createElement('img');
          img.src = p.cover; img.loading = 'lazy'; img.alt = '';
          cell.appendChild(img);
        }
        if (p.likeCount > 0) {
          const like = document.createElement('span');
          like.className = 'ex-like';
          like.innerHTML = ICONS.heart + '<b>' + p.likeCount + '</b>';
          cell.appendChild(like);
        }
        grid.appendChild(cell);
      }
      w.appendChild(grid);
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
