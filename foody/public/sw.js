/* Foody PWA service worker
   策略：静态资源 network-first（在线拿最新、离线回退缓存）；API 一律不缓存（数据要实时）。
   目的：让 Foody 能加到主屏、离线也能打开壳子，不影响正常在线使用。 */
const CACHE = 'foody-v1';
const CORE = [
  '/fyp.html', '/index.html',
  '/css/style.css', '/js/shared.js', '/js/fyp.js',
  '/img/logo.svg', '/img/icon-192.png', '/img/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // 写请求直连，不碰缓存
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // 第三方（字体等）直连
  if (url.pathname.startsWith('/api/')) return;      // 动态数据不缓存
  if (url.pathname.startsWith('/uploads/')) return;  // 用户上传走浏览器自身缓存即可
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('/fyp.html')))
  );
});
