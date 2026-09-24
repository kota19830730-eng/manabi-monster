/* ---------------------------------------------------------
   オフラインで 動かす しくみ（Service Worker）

   ※ファイルを 直したら CACHE_NAME の 番号を 1つ上げてください。
     そうしないと 古いファイルが 表示されつづけます。
   ※ファイルを 増やしたら FILES にも 足してください。
   --------------------------------------------------------- */

const CACHE_NAME = 'manabi-monster-v200';

/* フォントの キャッシュ（v7.9）
   書体は Google（fonts.googleapis.com / fonts.gstatic.com）から 読んで いる。
   ここに 入れて おかないと **オフラインだと 端末の 書体に 落ちて、ロゴまで
   ふつうの 字に なる**（実測ずみ）。書体は 版を 上げても 変わらないので、
   アプリ本体とは べつの 箱に 入れて、下の activate で 消さない。 */
const FONT_CACHE = 'manabi-monster-fonts-v1';
const FONT_HOSTS = ['https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];
function isFontUrl(url) {
  for (let i = 0; i < FONT_HOSTS.length; i++) if (url.indexOf(FONT_HOSTS[i]) === 0) return true;
  return false;
}

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/motion3d.css',
  './css/scenery.css',
  './css/prize.css',
  './css/capsulefx.css',
  './css/specialfx.css',
  './css/setwaza.css',
  './css/gearaura.css',
  './js/core/guard.js',
  './js/core/util.js',
  './js/core/text.js',
  './js/core/vox.js',
  './js/content/chest3d.js',
  './js/content/capsule3d.js',
  './js/content/boss3d.js',
  './js/ui/three.js',
  './js/ui/cisnap.js',
  './js/ui/gearaura.js',
  './js/ui/scenery.js',
  './js/ui/fxcanvas.js',
  './js/ui/fxtext.js',
  './js/ui/bossfx.js',
  './js/ui/setwaza.js',
  './js/core/stage.js',
  './js/core/pixel.js',
  './js/core/blocks.js',
  './js/core/tiles.js',
  './js/core/sfx.js',
  './js/core/bgm.js',
  './js/core/save.js',
  './js/core/stats.js',
  './js/core/ai.js',
  './js/core/handwrite.js',
  './js/core/missions.js',
  './js/core/fever.js',
  './js/core/pals.js',
  './js/core/levelup.js',
  './js/core/forge.js',
  './js/core/pika.js',
  './js/core/weekend.js',
  './js/core/capsule.js',
  './js/core/prize.js',
  './js/core/streak.js',
  './js/core/letter.js',
  './js/core/review.js',
  './js/core/speech.js',
  './js/core/battle.js',
  './js/content/monsterart.js',
  './js/content/monstergen.js',
  './js/content/face.js',
  './js/content/enemies.js',
  './js/content/sonskin.js',
  './js/content/gearart.js',
  './js/content/hero.js',
  './js/content/art.js',
  './js/content/treasure.js',
  './js/content/setwaza.js',
  './js/content/sansu3.js',
  './js/content/lesson3.js',
  './js/content/lessonkoku3.js',
  './js/content/kokugo3.js',
  './js/content/dokkai3.js',
  './js/content/sansu1.js',
  './js/content/kanjiq.js',
  './js/content/kakusu.js',
  './js/content/kotoba.js',
  './js/content/kokugo1.js',
  './js/content/sansu2.js',
  './js/content/kokugo2.js',
  './js/content/sansu4.js',
  './js/content/sansu5.js',
  './js/content/kokugo5.js',
  './js/content/rika5.js',
  './js/content/shakai5.js',
  './js/content/eigo5.js',
  './js/content/sansu6.js',
  './js/content/kokugo6.js',
  './js/content/rika6.js',
  './js/content/shakai6.js',
  './js/content/eigo6.js',
  './js/content/kokugo4.js',
  './js/content/rika4.js',
  './js/content/shakai4.js',
  './js/content/eigo4.js',
  './js/content/zu.js',
  './js/content/rekishi.js',
  './assets/rekishi/dotaku.jpg',
  './assets/rekishi/genbaku.jpg',
  './assets/rekishi/genpaku.jpg',
  './assets/rekishi/ginkaku.jpg',
  './assets/rekishi/heian.jpg',
  './assets/rekishi/heijo.jpg',
  './assets/rekishi/hideyoshi.jpg',
  './assets/rekishi/hirobumi.jpg',
  './assets/rekishi/hiroshige.jpg',
  './assets/rekishi/horyuji.jpg',
  './assets/rekishi/ieyasu.jpg',
  './assets/rekishi/inozu.jpg',
  './assets/rekishi/itagaki.jpg',
  './assets/rekishi/jomondoki.jpg',
  './assets/rekishi/kaitai.jpg',
  './assets/rekishi/kana.jpg',
  './assets/rekishi/kango.jpg',
  './assets/rekishi/yakata.jpg',
  './assets/rekishi/kanmu.jpg',
  './assets/rekishi/kenpo.jpg',
  './assets/rekishi/kinkaku.jpg',
  './assets/rekishi/kiyomori.jpg',
  './assets/rekishi/kofun.jpg',
  './assets/rekishi/manyoshu.jpg',
  './assets/rekishi/michinaga.jpg',
  './assets/rekishi/murasaki.jpg',
  './assets/rekishi/nobunaga.jpg',
  './assets/rekishi/noh.jpg',
  './assets/rekishi/norinaga.jpg',
  './assets/rekishi/sei.jpg',
  './assets/rekishi/shinden.jpg',
  './assets/rekishi/shoin.jpg',
  './assets/rekishi/shomu.jpg',
  './assets/rekishi/shosoin.jpg',
  './assets/rekishi/shotoku.jpg',
  './assets/rekishi/tadataka.jpg',
  './assets/rekishi/takauji.jpg',
  './assets/rekishi/takayuka.jpg',
  './assets/rekishi/tateana.jpg',
  './assets/rekishi/tenji.jpg',
  './assets/rekishi/terakoya.jpg',
  './assets/rekishi/tetsudo.jpg',
  './assets/rekishi/todaiji.jpg',
  './assets/rekishi/tokaido.jpg',
  './assets/rekishi/tomioka.jpg',
  './assets/rekishi/yoritomo.jpg',
  './assets/rekishi/yoshimasa.jpg',
  './assets/rekishi/yoshimitsu.jpg',
  './js/content/rikashakai3.js',
  './js/content/eigo3.js',
  './js/content/eigogen.js',
  './js/content/kotobagen.js',
  './js/content/shakaigen.js',
  './js/content/rikagen.js',
  './js/content/romaji3.js',
  './js/content/textbooks.js',
  './js/content/terms.js',
  './js/content/world3.js',
  './js/content/news.js',
  './js/core/dojo.js',
  './js/ui/common.js',
  './js/ui/news.js',
  './js/ui/look.js',
  './js/ui/start.js',
  './js/ui/map.js',
  './js/ui/dojo.js',
  './js/ui/battle.js',
  './js/ui/result.js',
  './js/ui/dex.js',
  './js/ui/parent.js',
  './js/ui/photo.js',
  './js/ui/pixedit.js',
  './js/ui/prize.js',
  './js/ui/capsulefx.js',
  './js/ui/capsule.js',
  './js/ui/boot.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

/* v12.9.1：**かならず サーバーから 取り直す**（cache: 'reload'）。
   GitHub Pages は ぜんぶの ファイルを max-age=600（10分）で 送る ので、ふつうの addAll だと
   10分 いないに つぎの 版を 出した とき **新しい 版の 箱に 古い ファイルが 入って** しまい、
   タブレットは 番号だけ 新しくて 中身は 古い まま（お知らせも もう 出ない）に なって いた。
   本物の Chrome で 再現・直った ことも 確認ずみ。この 行を 元に もどさない */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME && name !== FONT_CACHE; })
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

  /* 書体（v7.9）：1回 読めたら ためて おき、つぎからは そこから 出す。
     オフラインでも いつもの 字で 出る（ためる 前に オフラインに なった ときは
     ふつうに 失敗する ＝ 端末の 書体に 落ちるだけで、アプリは 動く） */
  if (isFontUrl(event.request.url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(event.request).then(function (hit) {
          if (hit) return hit;
          return fetch(event.request).then(function (res) {
            // opaque（中身の 見えない こたえ）は cache.put が 失敗するので 入れない
            if (res && res.status === 200 && res.type !== 'opaque') {
              cache.put(event.request, res.clone()).catch(function () {});
            }
            return res;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
