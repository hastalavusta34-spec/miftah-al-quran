var CACHE_NAME = 'miftah-al-quran-v2';
var CORE_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  // Never intercept audio streaming, video embeds, or Google Fonts
  if (req.url.indexOf('cdn.islamic.network') !== -1 ||
      req.url.indexOf('fonts.g') !== -1 ||
      req.url.indexOf('youtube.com') !== -1 ||
      req.url.indexOf('ytimg.com') !== -1) {
    return;
  }

  // Network-first for the app shell (index.html / navigations / this script's own scope):
  // always fetch the freshest version when online, so updates are never stuck behind a stale cache.
  var isAppShell = req.mode === 'navigate' || req.url.indexOf('index.html') !== -1 || req.url === self.location.origin + '/';
  if (isAppShell){
    event.respondWith(
      fetch(req).then(function(res){
        if (res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Cache-first for static assets (icons, manifest)
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && req.url.indexOf(self.location.origin) === 0){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
