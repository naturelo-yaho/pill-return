const CACHE='pill-return-v19-sharefix';
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
      if(!db.objectStoreNames.contains('shares')) db.createObjectStore('shares',{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function saveSharedFiles(files){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('shares','readwrite');
    tx.objectStore('shares').put({
      id:'latest',
      blobs:files.map(f=>f),
      names:files.map((f,i)=>f.name||`pillens-${i+1}.jpg`),
      savedAt:Date.now()
    });
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);

  // Android Web Share Target
  if(event.request.method==='POST' && url.pathname.endsWith('/share-target')){
    event.respondWith((async()=>{
      try{
        const form=await event.request.formData();

        // 필드명이 image가 아니어도 모든 File 항목을 받아서 저장합니다.
        const files=[];
        for(const [,value] of form.entries()){
          if(value && typeof value==='object' && typeof value.arrayBuffer==='function' && value.size>0){
            if(!value.type || value.type.startsWith('image/')) files.push(value);
          }
        }

        // 정상적인 manifest 필드도 한 번 더 확인
        if(!files.length){
          const one=form.get('image');
          if(one && typeof one==='object' && typeof one.arrayBuffer==='function') files.push(one);
        }

        if(files.length) await saveSharedFiles(files);
      }catch(e){
        console.error('share receive failed',e);
      }

      // 캐시된 시작화면이 아니라 반드시 새 문서를 열도록 고유 쿼리 사용
      return Response.redirect(
        new URL(`./?shared=${Date.now()}`,event.request.url).href,
        303
      );
    })());
    return;
  }

  if(event.request.method!=='GET') return;

  // 문서는 네트워크 우선
  if(event.request.mode==='navigate' || event.request.destination==='document'){
    event.respondWith((async()=>{
      try{
        return await fetch(event.request,{cache:'no-store'});
      }catch(e){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 정적 파일도 네트워크 우선
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
