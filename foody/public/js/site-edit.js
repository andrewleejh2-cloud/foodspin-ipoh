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
  $('#aiGen').addEventListener('click', async () => {
    const prompt = $('#aiPrompt').value.trim();
    if (!prompt) { $('#aiPrompt').focus(); return; }
    const btn = $('#aiGen'); const label = btn.textContent; btn.disabled = true; btn.textContent = t('aiGenerating');
    try {
      const r = await api('/api/me/site/generate', { method: 'POST', body: { prompt } });
      const g = r.generated || {};
      if (g.title) $('#fTitle').value = g.title;
      if (g.tagline) $('#fTagline').value = g.tagline;
      if (g.intro) $('#fIntro').value = g.intro;
      if (g.hours) $('#fHours').value = g.hours;
      if (g.address) $('#fAddress').value = g.address;
      if (g.links && g.links.length) { $('#linkList').innerHTML = ''; g.links.forEach(l => addLinkRow(l.label, l.url)); }
      toast(t('aiDone'));
    } catch (e) {
      toast(e.code === 'ai_off' ? t('aiOff') : t('aiFail'));
    } finally { btn.disabled = false; btn.textContent = label; }
  });

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
      published: $('#fPublished').checked
    };
    const btn = $('#saveBtn'); btn.disabled = true;
    try { await api('/api/me/site', { method: 'PATCH', body }); toast(t('siteSaved')); }
    catch (err) { toast(errMsg(err.code)); }
    finally { btn.disabled = false; }
  });

  document.addEventListener('foody:lang', () => { setBackLabel(); paintCover($('#coverInner').querySelector('img') ? $('#coverInner').querySelector('img').src : null); });

  document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    setBackLabel();
    try { ME = (await api('/api/me')).user; } catch {}
    if (!ME) return void (location.href = 'index.html');
    let d = {};
    try { d = await api('/api/site/' + encodeURIComponent(ME.username)); } catch {}
    $('#fTitle').value = d.title || '';
    $('#fTagline').value = d.tagline || '';
    $('#fIntro').value = d.intro || '';
    $('#fHours').value = d.hours || '';
    $('#fAddress').value = d.address || '';
    $('#fPublished').checked = !!d.published;
    (d.links || []).forEach(l => addLinkRow(l.label, l.url));
    paintCover(d.cover || null);
  });
})();
