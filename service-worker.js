const CACHE='pill-return-v17-photo-history';
const STATIC=['./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(STATIC))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('message',event=>{
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('pill-return-share-db',1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('shares'))db.createObjectStore('shares',{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function saveSharedFile(file){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('shares','readwrite');
    tx.objectStore('shares').put({
      id:'latest',
      blob:file,
      name:file.name||'Pillens.jpg',
      type:file.type||'image/jpeg',
      savedAt:Date.now()
    });
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);

  if(event.request.method==='POST' && url.pathname.endsWith('/share-target')){
    event.respondWith((async()=>{
      try{
        const form=await event.request.formData();
        const file=form.get('image');
        if(file && typeof file==='object' && 'arrayBuffer' in file){
          await saveSharedFile(file);
        }
      }catch(e){
        console.error('share receive failed',e);
      }
      return Response.redirect(new URL('./?shared=1',event.request.url).href,303);
    })());
    return;
  }

  if(event.request.method!=='GET') return;

  // HTML/navigation은 항상 네트워크 우선: GitHub에 새 버전이 올라오면 앱도 새 화면을 받는다.
  if(event.request.mode==='navigate' || event.request.destination==='document'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        const c=await caches.open(CACHE);
        c.put('./index.html',fresh.clone());
        return fresh;
      }catch(e){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 정적 리소스는 네트워크 우선 + 캐시 대체
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(event.request,{cache:'no-store'});
      if(fresh.ok){
        const c=await caches.open(CACHE);
        c.put(event.request,fresh.clone());
      }
      return fresh;
    }catch(e){
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
