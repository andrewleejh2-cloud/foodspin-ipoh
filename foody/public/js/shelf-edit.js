/* Foody — 管理货架（仅白名单卖家）。独立于「网页」，货物存 user.shelf，展示在 profile 上。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const BACK = { zh: '返回', ms: 'Kembali', en: 'Back' };
  let ME = null;

  function setBackLabel() { const l = BACK[LANG] || BACK.en; $('#backBtn').title = l; $('#backBtn').setAttribute('aria-label', l); }
  function toProfile() { location.href = ME ? 'profile.html?u=' + encodeURIComponent(ME.username) : 'fyp.html'; }

  // 一件货物的编辑行（复用 .menu-item-edit / .mie-* 样式 + 售罄开关 + 图上传）
  function addGoodRow(item) {
    item = item || {};
    const row = document.createElement('div');
    row.className = 'menu-item-edit';
    row.dataset.photo = item.photo || '';
    row.dataset.soldout = item.soldOut ? '1' : '';
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
    const sold = document.createElement('button'); sold.type = 'button'; sold.className = 'mie-sold-toggle';
    const paintSold = () => { sold.classList.toggle('on', row.dataset.soldout === '1'); sold.textContent = t('shopSoldOut'); };
    sold.addEventListener('click', () => { row.dataset.soldout = row.dataset.soldout === '1' ? '' : '1'; paintSold(); });
    paintSold();
    const del = document.createElement('button'); del.type = 'button'; del.className = 'mie-del'; del.innerHTML = ICONS.close;
    del.addEventListener('click', () => row.remove());
    row.append(photoBtn, fields, sold, del);
    $('#shelfList').appendChild(row);
  }
  function collectShelf() {
    return [...document.querySelectorAll('#shelfList .menu-item-edit')].map(row => ({
      name: row.querySelector('.mie-name').value.trim(),
      price: row.querySelector('.mie-price').value.trim(),
      desc: row.querySelector('.mie-desc').value.trim(),
      photo: row.dataset.photo || '',
      soldOut: row.dataset.soldout === '1'
    })).filter(it => it.name);
  }

  $('#backBtn').innerHTML = ICONS.back;
  $('#backBtn').addEventListener('click', toProfile);
  $('#viewBtn').addEventListener('click', toProfile);
  $('#addGood').addEventListener('click', () => addGoodRow({}));

  $('#shelfForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#saveBtn'); btn.disabled = true;
    try { await api('/api/me/shelf', { method: 'PATCH', body: { shelf: collectShelf(), shelfPickup: $('#shelfPickup').checked } }); toast(t('siteSaved')); }
    catch (err) { toast(errMsg(err.code)); }
    finally { btn.disabled = false; }
  });

  document.addEventListener('foody:lang', () => { setBackLabel(); });

  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    setBackLabel();
    let me;
    try { me = await api('/api/me'); } catch {}
    if (!me || !me.user) return void (location.href = 'index.html');
    ME = me.user;
    if (!me.canSell) return void toProfile();   // 非白名单不能摆货 → 退回主页
    $('#shelfPickup').checked = !!me.shelfPickup;
    (me.shelf || []).forEach(it => addGoodRow(it));
  });
})();
