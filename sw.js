const C="dhenlux-v13";
const FILES=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{var r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin||new URL(r.url).pathname.indexOf("/api/")===0)return;
e.respondWith(fetch(r).then(x=>{if(x.ok){var cp=x.clone();caches.open(C).then(c=>c.put(r,cp))}return x}).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):Response.error()))))});
self.addEventListener("push",e=>{var d={};try{d=e.data?e.data.json():{}}catch(x){}
e.waitUntil(self.registration.showNotification(d.title||"Dhenlux reminder",{body:d.body||"A pickup is coming up.",icon:"icon-192.png",badge:"icon-192.png",vibrate:[600,200,600,200,600,200,900],tag:d.tag||"dhenlux-due",renotify:true,requireInteraction:true,data:{url:"/#app"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();var u=(e.notification.data&&e.notification.data.url)||"/#app";
e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{for(var i=0;i<l.length;i++){if("focus" in l[i])return l[i].focus()}return self.clients.openWindow(u)}))});
