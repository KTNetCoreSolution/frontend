const CACHE_NAME = `my-cache-${__BUILD_HASH__}`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        // 기타 자원
      ]);
    })
  );
});