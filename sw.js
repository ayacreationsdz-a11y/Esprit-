/* Esprit Léger - service worker v3 (Aya Créations DZ)
   Cache-first: the app opens from the saved copy instantly, even with weak 4G,
   and a fresh copy is downloaded in the background for next time.
   A copy is only saved when it downloaded completely. */
var CACHE='eslg-v3';
var CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('eslg-')===0&&k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

function complete(res){
  if(!res||!res.ok||res.type==='opaqueredirect')return Promise.resolve(null);
  /* read the whole body: if the connection drops, this rejects and nothing is cached */
  return res.clone().arrayBuffer().then(function(buf){
    var len=res.headers.get('Content-Length');
    if(len&&+len!==buf.byteLength)return null;
    if(!buf.byteLength)return null;
    return new Response(buf,{status:res.status,statusText:res.statusText,headers:res.headers});
  }).catch(function(){return null;});
}
function refresh(req,key){
  return fetch(req,{cache:'no-store'}).then(complete).then(function(full){
    if(!full)return null;
    return caches.open(CACHE).then(function(c){return c.put(key,full.clone());}).then(function(){return full;});
  }).catch(function(){return null;});
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  var isPage=req.mode==='navigate'||url.pathname.slice(-1)==='/'||/index\.html$/.test(url.pathname);
  var key=(url.origin===location.origin&&isPage)?'./index.html':req;
  e.respondWith(
    caches.match(key).then(function(hit){
      var update=refresh(req,key);
      if(hit){e.waitUntil(update);return hit;}
      return update.then(function(r){return r||fetch(req);});
    })
  );
});
