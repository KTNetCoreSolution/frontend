// sw.js
self.addEventListener("install", (event) => {
  console.log(event);
  // 새 Service Worker가 설치될 때 바로 활성화
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 활성화 시 기존 캐시 삭제 등 필요 작업
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    })
  );
});

// 메시지 수신하여 skipWaiting() 호출
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
