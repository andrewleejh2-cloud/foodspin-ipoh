/* Foody — 微站编辑器（仅本人）。填表单 → PATCH /api/me/site；封面单独上传；一键发布开关。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let ME = null;

  function setBackLabel() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }
  function paintCover(url) {
    const inner = $('#coverInner');
    if (url) { inner.innerHTML = ''; const img = document.createElement('img'); img.src = url; img.alt = ''; inner.appendChild(img); }
    else inner.innerHTML = ICONS.image + '<span>' + t('siteCoverAdd') + '</span>';
  }
  function addLinkRow(label, url) {
    const row = document.createElement('div');
    row.className = 'link-row';
    const a = document.createElement('input'); a.className = 'lk-label'; a.maxLength = 30; a.placeholder = t('siteLinkLabelPh'); a.value = label || '';
    const b = document.createElement('input'); b.className = 'lk-url'; b.maxLength = 300; b.placeholder = 'https://…'; b.value = url || '';
    const del = document.createElement('button'); del.type = 'button'; del.className = 'lk-del'; del.innerHTML = ICONS.close;
    del.addEventListener('click', () => row.remove());
    row.append(a, b, del);
    $('#linkList').appendChild(row);
  }

  /* ---- 配色主题选择器 ---- */
  const THEMES = [
    { key: 'warm', label: { zh: '暖橙', ms: 'Oren', en: 'Warm' }, bg: '#FAF4EA', accent: '#D96A3B' },
    { key: 'dark', label: { zh: '深夜', ms: 'Gelap', en: 'Dark' }, bg: '#17130F', accent: '#E8894B' },
    { key: 'fresh', label: { zh: '清新', ms: 'Segar', en: 'Fresh' }, bg: '#EEF6EF', accent: '#3E9C6B' },
    { key: 'berry', label: { zh: '莓粉', ms: 'Beri', en: 'Berry' }, bg: '#FBF0F3', accent: '#C84E78' },
    { key: 'mono', label: { zh: '简约', ms: 'Mono', en: 'Mono' }, bg: '#F4F4F3', accent: '#2B2B2B' }
  ];
  let curTheme = 'warm';
  function paintThemePick() {
    const box = $('#themePick'); box.innerHTML = '';
    for (const th of THEMES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'theme-sw' + (curTheme === th.key ? ' on' : '');
      b.innerHTML = '<span class="ts-dot" style="background:' + th.bg + ';border-color:' + th.accent + '"></span><span class="ts-name">' + (th.label[LANG] || th.label.en) + '</span>';
      b.addEventListener('click', () => { curTheme = th.key; paintThemePick(); });
      box.appendChild(b);
    }
  }

  /* ---- 菜单编辑器（分类 ▸ 菜品） ---- */
  function addItemRow(itemsEl, item) {
    item = item || {};
    const row = document.createElement('div');
    row.className = 'menu-item-edit';
    row.dataset.photo = item.photo || '';
    const photoBtn = document.createElement('button');
    photoBtn.type = 'button'; photoBtn.className = 'mie-photo';
    const paintPhoto = () => {
      if (row.dataset.photo) { photoBtn.innerHTML = ''; const img = document.createElement('img'); img.src = row.dataset.photo; img.alt = ''; photoBtn.appendChild(img); }
      else photoBtn.innerHTML = ICONS.image;
    };
    paintPhoto();
    photoBtn.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const fd = new FormData(); fd.append('cover', f);
        photoBtn.classList.add('loading');
        try { const r = await api('/api/me/site/menu-photo', { method: 'POST', body: fd }); row.dataset.photo = r.url; paintPhoto(); }
        catch (e) { toast(errMsg(e.code)); }
        finally { photoBtn.classList.remove('loading'); }
      });
      inp.click();
    });
    const fields = document.createElement('div'); fields.className = 'mie-fields';
    const nm = document.createElement('input'); nm.className = 'mie-name'; nm.maxLength = 60; nm.placeholder = t('siteItemNamePh'); nm.value = item.name || '';
    const pr = document.createElement('input'); pr.className = 'mie-price'; pr.maxLength = 20; pr.placeholder = t('siteItemPricePh'); pr.value = item.price || '';
    const ds = document.createElement('input'); ds.className = 'mie-desc'; ds.maxLength = 200; ds.placeholder = t('siteItemDescPh'); ds.value = item.desc || '';
    fields.append(nm, pr, ds);
    const del = document.createElement('button'); del.type = 'button'; del.className = 'mie-del'; del.innerHTML = ICONS.close;
    del.addEventListener('click', () => row.remove());
    row.dataset.soldout = item.soldOut ? '1' : '';
    const sold = document.createElement('button'); sold.type = 'button'; sold.className = 'mie-sold-toggle';
    const paintSold = () => { sold.classList.toggle('on', row.dataset.soldout === '1'); sold.textContent = t('shopSoldOut'); };
    sold.addEventListener('click', () => { row.dataset.soldout = row.dataset.soldout === '1' ? '' : '1'; paintSold(); });
    paintSold();
    row.append(photoBtn, fields, sold, del);
    itemsEl.appendChild(row);
  }
  function addCat(name, items) {
    const cat = document.createElement('div');
    cat.className = 'menu-cat-edit';
    const head = document.createElement('div'); head.className = 'mce-head';
    const nameInp = document.createElement('input'); nameInp.className = 'mce-name'; nameInp.maxLength = 40; nameInp.placeholder = t('siteCatNamePh'); nameInp.value = name || '';
    const delCat = document.createElement('button'); delCat.type = 'button'; delCat.className = 'mce-del'; delCat.innerHTML = ICONS.trash;
    delCat.addEventListener('click', () => cat.remove());
    head.append(nameInp, delCat);
    const itemsEl = document.createElement('div'); itemsEl.className = 'mce-items';
    const addItemBtn = document.createElement('button'); addItemBtn.type = 'button'; addItemBtn.className = 'mce-additem'; addItemBtn.textContent = t('siteAddItem');
    addItemBtn.addEventListener('click', () => addItemRow(itemsEl, {}));
    cat.append(head, itemsEl, addItemBtn);
    $('#menuList').appendChild(cat);
    (items || []).forEach(it => addItemRow(itemsEl, it));
  }
  function collectMenu() {
    return [...document.querySelectorAll('.menu-cat-edit')].map(cat => ({
      name: cat.querySelector('.mce-name').value.trim(),
      items: [...cat.querySelectorAll('.menu-item-edit')].map(row => ({
        name: row.querySelector('.mie-name').value.trim(),
        price: row.querySelector('.mie-price').value.trim(),
        desc: row.querySelector('.mie-desc').value.trim(),
        photo: row.dataset.photo || '',
        soldOut: row.dataset.soldout === '1'
      })).filter(it => it.name)
    })).filter(cat => cat.name || cat.items.length);
  }
  function fillStatusSelect() {
    const sel = $('#fStatus'); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '';
    [['', t('statusHide')], ['open', t('statusOpen')], ['closed', t('statusClosed')]].forEach(([v, label]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = label; sel.appendChild(o);
    });
    sel.value = cur;
  }

  $('#backBtn').innerHTML = ICONS.back;
  $('#backBtn').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'fyp.html'; });
  $('#viewBtn').addEventListener('click', () => { if (ME) location.href = 'site.html?u=' + encodeURIComponent(ME.username); });
  $('#coverPick').addEventListener('click', () => $('#coverInput').click());
  $('#coverInput').addEventListener('change', async () => {
    const f = $('#coverInput').files && $('#coverInput').files[0];
    if (!f) return;
    paintCover(URL.createObjectURL(f)); // 先本地预览
    const fd = new FormData(); fd.append('cover', f);
    try { const r = await api('/api/me/site/cover', { method: 'POST', body: fd }); paintCover(r.cover); }
    catch (e) { toast(errMsg(e.code)); }
    $('#coverInput').value = '';
  });
  $('#addLink').addEventListener('click', () => addLinkRow('', ''));
  $('#addCat').addEventListener('click', () => addCat('', []));

  function setSlugHint(kind, msg) { const h = $('#slugHint'); h.className = 'slug-hint ' + (kind || ''); h.textContent = msg || ''; }
  let slugTimer, slugSeq = 0;
  $('#fSlug').addEventListener('input', () => {
    const s = $('#fSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if ($('#fSlug').value !== s) $('#fSlug').value = s;
    clearTimeout(slugTimer);
    const seq = ++slugSeq;                  // 只允许最新一次请求绘制提示（防慢响应回填旧结果）
    if (!s) return setSlugHint('', '');
    slugTimer = setTimeout(async () => {
      try {
        const r = await api('/api/me/site/slug-available?slug=' + encodeURIComponent(s));
        if (seq !== slugSeq) return;        // 已有更新输入，丢弃过期结果
        if (r.available) setSlugHint('ok', t('slugOk'));
        else setSlugHint('bad', t(r.reason === 'taken' ? 'slugTaken' : r.reason === 'reserved' ? 'slugReserved' : 'slugBad'));
      } catch { if (seq === slugSeq) setSlugHint('', ''); }
    }, 350);
  });

  function accentOn() { return $('#accentRow').dataset.on === '1'; }
  function setAccentOn(on, val) {
    $('#accentRow').dataset.on = on ? '1' : '';
    if (val) $('#fAccent').value = val;
    $('#accentRow').classList.toggle('accent-active', on);
  }
  $('#fAccent').addEventListener('input', () => setAccentOn(true));
  $('#accentClear').addEventListener('click', () => setAccentOn(false));

  function addPhotoThumb(url) {
    const cell = document.createElement('div'); cell.className = 'album-thumb'; cell.dataset.url = url;
    const img = document.createElement('img'); img.src = url; img.alt = '';
    const del = document.createElement('button'); del.type = 'button'; del.className = 'album-del'; del.innerHTML = ICONS.close;
    del.addEventListener('click', () => cell.remove());
    cell.append(img, del); $('#albumGrid').appendChild(cell);
  }
  $('#addPhoto').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.addEventListener('change', async () => {
      const cur = document.querySelectorAll('.album-thumb').length;
      for (const f of [...inp.files].slice(0, 20 - cur)) {
        const fd = new FormData(); fd.append('cover', f);
        try { const r = await api('/api/me/site/menu-photo', { method: 'POST', body: fd }); addPhotoThumb(r.url); }
        catch (e) { toast(errMsg(e.code)); }
      }
    });
    inp.click();
  });
  function collectPhotos() { return [...document.querySelectorAll('.album-thumb')].map(c => ({ url: c.dataset.url })).slice(0, 20); }
  function collectSections() {
    return { gallery: $('#secGallery').checked, menu: $('#secMenu').checked, photos: $('#secPhotos').checked, contact: $('#secContact').checked };
  }

  $('#siteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const links = [...document.querySelectorAll('.link-row')]
      .map(r => ({ label: r.querySelector('.lk-label').value.trim(), url: r.querySelector('.lk-url').value.trim() }))
      .filter(l => l.label && l.url);
    const body = {
      title: $('#fTitle').value.trim(),
      tagline: $('#fTagline').value.trim(),
      intro: $('#fIntro').value.trim(),
      hours: $('#fHours').value.trim(),
      address: $('#fAddress').value.trim(),
      links,
      theme: curTheme,
      menu: collectMenu(),
      status: $('#fStatus').value,
      published: $('#fPublished').checked,
      slug: $('#fSlug').value.trim(),
      accent: accentOn() ? $('#fAccent').value : '',
      announce: $('#fAnnounce').value.trim(),
      photos: collectPhotos(),
      sections: collectSections()
    };
    const btn = $('#saveBtn'); btn.disabled = true;
    try { await api('/api/me/site', { method: 'PATCH', body }); toast(t('siteSaved')); }
    catch (err) { toast(errMsg(err.code)); }
    finally { btn.disabled = false; }
  });

  document.addEventListener('foody:lang', () => { setBackLabel(); paintThemePick(); fillStatusSelect(); paintCover($('#coverInner').querySelector('img') ? $('#coverInner').querySelector('img').src : null); });

  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    setBackLabel();
    try { ME = (await api('/api/me')).user; } catch {}
    if (!ME) return void (location.href = 'index.html');
    let d = {};
    try { d = await api('/api/site/' + encodeURIComponent(ME.username)); } catch {}
    $('#fSlug').value = d.slug || '';
    $('#fTitle').value = d.title || '';
    $('#fTagline').value = d.tagline || '';
    $('#fAnnounce').value = d.announce || '';
    $('#fIntro').value = d.intro || '';
    $('#fHours').value = d.hours || '';
    $('#fAddress').value = d.address || '';
    $('#fPublished').checked = !!d.published;
    (d.links || []).forEach(l => addLinkRow(l.label, l.url));
    curTheme = d.theme || 'warm';
    paintThemePick();
    setAccentOn(!!d.accent, d.accent || '#D96A3B');
    (d.menu || []).forEach(cat => addCat(cat.name, cat.items));
    (d.photos || []).forEach(p => addPhotoThumb(p.url));
    const sec = d.sections || {};
    $('#secGallery').checked = sec.gallery !== false;
    $('#secMenu').checked = sec.menu !== false;
    $('#secPhotos').checked = sec.photos !== false;
    $('#secContact').checked = sec.contact !== false;
    fillStatusSelect();
    $('#fStatus').value = d.status || '';
    paintCover(d.cover || null);
  });
})();
