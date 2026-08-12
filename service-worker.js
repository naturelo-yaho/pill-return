
const CACHE_NAME = 'pill-return-v49';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === 'POST' && url.searchParams.get('share') === '1') {
    event.respondWith((async()=>{
      const form = await req.formData();
      const files = form.getAll('files').filter(x => x && x.type && x.type.startsWith('image/'));
      const cache = await caches.open('pill-return-share-v49');

      const keys = [];
      for (let i=0;i<files.length;i++){
        const key = new Request('./__shared_image_' + Date.now() + '_' + i);
        await cache.put(key, new Response(files[i], {headers:{'Content-Type':files[i].type}}));
        keys.push(key.url);
      }

      const clientList = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      if (clientList.length) {
        for (const c of clientList) {
          c.postMessage({type:'PILL_RETURN_SHARED_IMAGES', keys});
        }
      }

      const redirect = './?shared=' + encodeURIComponent(keys.join('|'));
      return Response.redirect(redirect, 303);
    })());
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (req.method === 'GET' && resp && resp.status === 200) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return resp;
    }))
  );
});
