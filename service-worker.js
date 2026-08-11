const CACHE='pill-return-v22-screenshot';
const SHARE_CACHE='pill-return-shares';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE && k!==SHARE_CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);

  if(event.request.method==='POST' && url.pathname.endsWith('/share-target')){
    event.respondWith((async()=>{
      try{
        const form=await event.request.formData();
        let file=null;
        // Android screenshot share field names differ by browser/app.
        for(const [,value] of form.entries()){
          if(value instanceof File && (!value.type || value.type.startsWith('image/'))){
            file=value; break;
          }
        }
        if(!file)throw new Error('image file missing');

        const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
        const key=new Request(new URL('./shared/'+id,self.registration.scope).href);
        const cache=await caches.open(SHARE_CACHE);
        await cache.put(key,new Response(file,{headers:{'Content-Type':file.type||'image/png'}}));

        return Response.redirect('./?share='+encodeURIComponent(id),303);
      }catch(err){
        return Response.redirect('./?share_error=1',303);
      }
    })());
    return;
  }

  if(event.request.method==='GET'){
    event.respondWith(
      fetch(event.request).then(r=>{
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
        return r;
      }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
  }
});
