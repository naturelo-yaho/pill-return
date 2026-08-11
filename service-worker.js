const CACHE='pill-return-v6-pillens';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
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
      name:file.name||'PillEye.jpg',
      type:file.type||'image/jpeg',
      savedAt:Date.now()
    });
    tx.oncomplete=()=>resolve();
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

  if(event.request.method==='GET'){
    event.respondWith(
      caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
        return response;
      }).catch(()=>caches.match('./index.html')))
    );
  }
});