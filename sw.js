const C="dhenlux-v10";
const FILES=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{var r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
e.respondWith(fetch(r).then(x=>{if(x.ok){var cp=x.clone();caches.open(C).then(c=>c.put(r,cp))}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):Response.error()))))});
