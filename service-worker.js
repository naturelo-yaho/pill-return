
const CACHE='pill-return-v27-ptp3fields';
const SHARE_CACHE='pill-return-shares';
const ASSETS=['./manifest.webmanifest','./icon-192.png','./icon-512.png','./ptp-v27.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==SHARE_CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

async function injectPatch(req){
  const r=await fetch(req,{cache:'no-store'});
  const ct=r.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return r;
  let text=await r.text();
  // 표시 버전도 v27로 보이게 변경
  text=text.replace(/(<span id="appVersion"[^>]*>)v\d+(<\/span>)/,'$1v27$2');
  if(!text.includes('ptp-v27.js'))text=text.replace('</body>','<script src="./ptp-v27.js?v=27"></script></body>');
  const h=new Headers(r.headers);h.set('content-type','text/html; charset=utf-8');h.delete('content-length');
  return new Response(text,{status:r.status,statusText:r.statusText,headers:h});
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method==='POST'&&url.pathname.endsWith('/share-target')){
    event.respondWith((async()=>{
      try{
        const form=await event.request.formData();let file=null;
        for(const [,v] of form.entries()){
          if(v instanceof File&&(!v.type||v.type.startsWith('image/'))){file=v;break;}
        }
        if(!file)throw new Error('image file missing');
        const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
        const key=new Request(new URL('./shared/'+id,self.registration.scope).href);
        const c=await caches.open(SHARE_CACHE);
        await c.put(key,new Response(file,{headers:{'Content-Type':file.type||'image/png'}}));
        return Response.redirect('./?share='+encodeURIComponent(id),303);
      }catch(e){return Response.redirect('./?share_error=1',303);}
    })());return;
  }
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'||event.request.destination==='document'){
    event.respondWith(injectPatch(event.request).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{
    const cp=r.clone();caches.open(CACHE).then(c=>c.put(event.request,cp)).catch(()=>{});return r;
  }).catch(()=>caches.match(event.request)));
});
