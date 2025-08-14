// 빌드 시에 해당 코드 내의 __BUILD_HASH__는 Vite의 define 옵션에 의해 문자열로 치환됩니다.
const CACHE_NAME = `my-cache-${__BUILD_HASH__}`;

// 기타 워커 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 캐시할 파일 목록
      return cache.addAll([
        '/', // 홈
        '/index.html',
        '/styles.css',
        '/main.js',
        // 기타 정적 자원
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  // 오래된 캐시 삭제
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});