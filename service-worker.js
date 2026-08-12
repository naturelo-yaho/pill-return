
const CACHE_NAME = 'pill-return-v65';
// index.html과 반드시 동일한 이름을 써야 공유받은 스크린샷을 앱이 찾을 수 있다. 버전이 올라가도 바뀌지 않는 고정 이름.
const SHARED_IMAGE_CACHE = 'pill-return-shared-images';

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
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
    // 앱 셸 캐시는 새 버전 것만 남기고, 공유 이미지 캐시는 버전이 바뀌어도 지우지 않는다(공유 직후 앱 업데이트가 겹치면 사진이 사라지는 것을 방지).
    await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== SHARED_IMAGE_CACHE).map(k => caches.delete(k)));
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
      const cache = await caches.open(SHARED_IMAGE_CACHE);

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
