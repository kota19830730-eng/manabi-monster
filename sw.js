/* ---------------------------------------------------------
   オフラインで 動かす しくみ（Service Worker）

   ※ファイルを 直したら CACHE_NAME の 番号を 1つ上げてください。
     そうしないと 古いファイルが 表示されつづけます。
   ※ファイルを 増やしたら FILES にも 足してください。
   --------------------------------------------------------- */

const CACHE_NAME = 'manabi-monster-v72';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/core/util.js',
  './js/core/stage.js',
  './js/core/pixel.js',
  './js/core/blocks.js',
  './js/core/tiles.js',
  './js/core/sfx.js',
  './js/core/bgm.js',
  './js/core/save.js',
  './js/core/ai.js',
  './js/core/handwrite.js',
  './js/core/missions.js',
  './js/core/pals.js',
  './js/core/speech.js',
  './js/core/battle.js',
  './js/content/monsterart.js',
  './js/content/monstergen.js',
  './js/content/face.js',
  './js/content/enemies.js',
  './js/content/hero.js',
  './js/content/art.js',
  './js/content/treasure.js',
  './js/content/sansu3.js',
  './js/content/kokugo3.js',
  './js/content/sansu1.js',
  './js/content/kanjiq.js',
  './js/content/kakusu.js',
  './js/content/kokugo1.js',
  './js/content/sansu2.js',
  './js/content/kokugo2.js',
  './js/content/sansu4.js',
  './js/content/kokugo4.js',
  './js/content/rika4.js',
  './js/content/shakai4.js',
  './js/content/eigo4.js',
  './js/content/zu.js',
  './js/content/rikashakai3.js',
  './js/content/eigo3.js',
  './js/content/romaji3.js',
  './js/content/terms.js',
  './js/content/world3.js',
  './js/ui/common.js',
  './js/ui/look.js',
  './js/ui/start.js',
  './js/ui/map.js',
  './js/ui/battle.js',
  './js/ui/result.js',
  './js/ui/dex.js',
  './js/ui/photo.js',
  './js/ui/pixedit.js',
  './js/ui/boot.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(FILES); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; })
             .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// アプリから「version」と 聞かれたら、いまの 番号を こたえる（せっていに 出す・v2.3）
self.addEventListener('message', function (event) {
  if (event.data === 'version' && event.source) {
    event.source.postMessage({ version: CACHE_NAME.replace('manabi-monster-', '') });
  }
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
