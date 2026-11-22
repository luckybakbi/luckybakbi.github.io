// 아침 퀘스트 보드 — 오프라인 저장 담당
// 처음 한 번 서버에서 받은 페이지를 아이패드 안에 저장해 두고,
// 그 뒤로는 서버(WorldWideWeb)가 꺼져 있어도 홈 화면 아이콘이 저장본으로 바로 열립니다.
// 서버가 켜져 있으면 뒤에서 새 파일을 받아 다음 열 때 반영합니다.

const CACHE = 'quest-board-v8';
const FILES = ['./', './index.html', './sw.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 우리 폴더의 파일만 저장본으로 처리. 날씨 API 등 바깥 요청은 그대로 통과.
  if (url.origin !== self.location.origin) return;

  // 페이지 열기 요청은 항상 index.html 저장본 → 서버가 꺼져 있어도 열림
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? './index.html' : req;
    const cached = await cache.match(key);

    // 서버가 켜져 있으면 새 파일을 받아 저장 (다음 열 때 반영)
    const refresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);

    if (cached) {
      refresh; // 뒤에서 조용히 갱신
      return cached;
    }
    const fresh = await refresh;
    if (fresh) return fresh;
    return new Response('<meta charset="utf-8"><p style="font:18px sans-serif;padding:2em">아직 저장된 대시보드가 없어요. WorldWideWeb을 켜고 한 번 열어 주세요.</p>', { headers: { 'Content-Type': 'text/html' } });
  })());
});
