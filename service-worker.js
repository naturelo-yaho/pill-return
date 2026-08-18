const CACHE_NAME = 'pill-return-v74';
const SHARED_IMAGE_CACHE = 'pill-return-shared-images';
const APP_SHELL = ['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME && k!==SHARED_IMAGE_CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req=event.request;
  const url=new URL(req.url);
  if(req.method==='POST' && url.searchParams.get('share')==='1'){
    event.respondWith((async()=>{
      try{
        const form=await req.formData();
        let files=form.getAll('files').filter(x=>x && x.type && x.type.startsWith('image/'));
        if(!files.length){
          for(const [,v] of form.entries()) if(v && v.type && v.type.startsWith('image/')) files.push(v);
        }
        const cache=await caches.open(SHARED_IMAGE_CACHE);
        const keys=[];
        for(let i=0;i<files.length;i++){
          const key=new Request(new URL('./__shared_image_'+Date.now()+'_'+i, self.registration.scope).href);
          await cache.put(key,new Response(files[i],{headers:{'Content-Type':files[i].type||'image/jpeg'}}));
          keys.push(key.url);
        }
        return Response.redirect('./?shared='+encodeURIComponent(keys.join('|')),303);
      }catch(e){
        return Response.redirect('./?share_error=1',303);
      }
    })());
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
    if(req.method==='GET' && resp && resp.status===200){
      const copy=resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy));
    }
    return resp;
  })));
});
