// Service Worker（キャッシュ優先）。アプリ本体と教材を初回に全部キャッシュし、通信がなくても開けるようにする。
// 更新の手順: 教材やプログラムを変えたら VERSION を上げる。次にオンラインで開いたとき新しい版が入り、
// 古いキャッシュ（rika-quest- で始まる別の名前）は消える。記録は localStorage なので残る。
// http(s):// で開いたときだけ js/app.js が登録する（file:// では動かない）。
'use strict';

const VERSION = '2026-11-06-26';
const CACHE_PREFIX = 'rika-quest-';
const CACHE_NAME = CACHE_PREFIX + VERSION;

// 先にキャッシュするファイル。index.html が読み込むファイルはすべてここに入れる（並びも index.html と同じ）。
// tests/offline.test.js が index.html との食い違いを確かめる。
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'assets/avatars/poyon.png',
  'assets/avatars/mojari.png',
  'assets/avatars/nyokki.png',
  'assets/avatars/purumo.png',
  'assets/avatars/mukuri.png',
  'assets/avatars/nemune.png',
  'assets/mascots/mascot_A.svg',
  'assets/mascots/mascot_B.svg',
  'assets/mascots/mascot_C.svg',
  'assets/mascots/mascot_D.svg',
  'assets/mascots/mascot_E.svg',
  'assets/mascots/mascot_F.svg',
  // 写真ふうの画像（docs/image-plan.md）
  'assets/images/animals/animals-1-c1.jpg',
  'assets/images/animals/animals-1-c2.jpg',
  'assets/images/animals/animals-1-c3.jpg',
  'assets/images/animals/animals-2-c3.jpg',
  'assets/images/animals/animals-2-c4.jpg',
  'assets/images/animals/animals-3-c1.jpg',
  'assets/images/animals/animals-3-c2.jpg',
  'assets/images/animals/animals-3-c3.jpg',
  'assets/images/animals/animals-3-c4.jpg',
  'assets/images/animals/animals-3-p2.jpg',
  'assets/images/animals/animals-4-c3.jpg',
  'assets/images/animals/animals-4-c4.jpg',
  'assets/images/body/body-1-c1.jpg',
  'assets/images/body/body-1-c2.jpg',
  'assets/images/body/body-1-c3.jpg',
  'assets/images/body/body-1-c4.jpg',
  'assets/images/body/body-2-c2.jpg',
  'assets/images/body/body-2-c3.jpg',
  'assets/images/body/body-2-c4.jpg',
  'assets/images/body/body-3-c1.jpg',
  'assets/images/body/body-3-c3.jpg',
  'assets/images/body/body-4-c2.jpg',
  'assets/images/body/body-4-c3.jpg',
  'assets/images/chemical-change/chem-1-c2.jpg',
  'assets/images/chemical-change/chem-1-c3.jpg',
  'assets/images/chemical-change/chem-1-c4.jpg',
  'assets/images/chemical-change/chem-3-c2.jpg',
  'assets/images/chemical-change/chem-3-c3.jpg',
  'assets/images/electricity/elec-1-c3.jpg',
  'assets/images/electricity/elec-4-c2.jpg',
  'assets/images/electricity/elec-4-c3.jpg',
  'assets/images/heredity/life-1-c1.jpg',
  'assets/images/heredity/life-1-c3.jpg',
  'assets/images/heredity/life-2-c1.jpg',
  'assets/images/heredity/life-2-c3.jpg',
  'assets/images/heredity/life-2-c4.jpg',
  'assets/images/heredity/life-3-c1.jpg',
  'assets/images/heredity/life-4-c3.jpg',
  'assets/images/ion/ion-2-c1.jpg',
  'assets/images/ion/ion-2-c2.jpg',
  'assets/images/ion/ion-3-c3.jpg',
  'assets/images/motion/motion-2-c3.jpg',
  'assets/images/nature/nature-1-c1.jpg',
  'assets/images/nature/nature-1-c2.jpg',
  'assets/images/nature/nature-2-c1.jpg',
  'assets/images/nature/nature-2-c2.jpg',
  'assets/images/nature/nature-2-c3.jpg',
  'assets/images/nature/nature-3-c1.jpg',
  'assets/images/nature/nature-3-c2.jpg',
  'assets/images/nature/nature-4-c2.jpg',
  'assets/images/plants/plants-1-c1.jpg',
  'assets/images/plants/plants-1-c2.jpg',
  'assets/images/plants/plants-1-c3.jpg',
  'assets/images/plants/plants-1-c4.jpg',
  'assets/images/plants/plants-2-c2.jpg',
  'assets/images/plants/plants-2-r1.jpg',
  'assets/images/plants/plants-3-c1.jpg',
  'assets/images/plants/plants-3-c2.jpg',
  'assets/images/plants/plants-3-c3.jpg',
  'assets/images/plants/plants-3-c4.jpg',
  'assets/images/plants/plants-3-p2.jpg',
  'assets/images/plants/plants-4-c1.jpg',
  'assets/images/plants/plants-4-c2.jpg',
  'assets/images/solution/sol-1-c2.jpg',
  'assets/images/solution/sol-1-c3.jpg',
  'assets/images/solution/sol-4-c1.jpg',
  'assets/images/solution/sol-4-c3.jpg',
  'assets/images/solution/sol-4-c4.jpg',
  'assets/images/sound/sound-1-c1.jpg',
  'assets/images/sound/sound-1-c2.jpg',
  'assets/images/sound/sound-2-c1.jpg',
  'assets/images/sound/sound-3-c3.jpg',
  'assets/images/space/space-1-c2.jpg',
  'assets/images/space/space-1-c4.jpg',
  'assets/images/space/space-3-c2.jpg',
  'assets/images/space/space-3-c3.jpg',
  'assets/images/space/space-4-c1.jpg',
  'assets/images/space/space-4-c3.jpg',
  'assets/images/space/space-4-c4.jpg',
  'assets/images/state-change/state-1-c2.jpg',
  'assets/images/state-change/state-4-c1.jpg',
  'assets/images/strata/strata-1-c2.jpg',
  'assets/images/strata/strata-1-c3.jpg',
  'assets/images/strata/strata-1-c4.jpg',
  'assets/images/strata/strata-2-c1.jpg',
  'assets/images/strata/strata-2-c2.jpg',
  'assets/images/strata/strata-3-c1.jpg',
  'assets/images/strata/strata-3-c2.jpg',
  'assets/images/strata/strata-3-c3.jpg',
  'assets/images/strata/strata-4-c4.jpg',
  'assets/images/substance/sub-1-c1.jpg',
  'assets/images/substance/sub-1-c2.jpg',
  'assets/images/substance/sub-1-c3.jpg',
  'assets/images/substance/sub-2-c2.jpg',
  'assets/images/substance/sub-2-c3.jpg',
  'assets/images/substance/sub-2-c4.jpg',
  'assets/images/volcano/volcano-1-c1.jpg',
  'assets/images/volcano/volcano-1-c2.jpg',
  'assets/images/volcano/volcano-1-c3.jpg',
  'assets/images/volcano/volcano-2-c2.jpg',
  'assets/images/volcano/volcano-2-c3.jpg',
  'assets/images/volcano/volcano-2-c4.jpg',
  'assets/images/volcano/volcano-4-c4.jpg',
  'assets/images/weather/weather-1-c1.jpg',
  'assets/images/weather/weather-1-c2.jpg',
  'assets/images/weather/weather-1-c3.jpg',
  'assets/images/weather/weather-2-c2.jpg',
  'assets/images/weather/weather-3-c4.jpg',
  'assets/images/weather/weather-4-c1.jpg',
  'assets/images/weather/weather-4-c4.jpg',
  // バッジの絵（js/badges.js の DEFS の順）
  'assets/images/badges/first-clear.png',
  'assets/images/badges/clear-5.png',
  'assets/images/badges/clear-20.png',
  'assets/images/badges/unit-master.png',
  'assets/images/badges/unit-master-3.png',
  'assets/images/badges/perfect.png',
  'assets/images/badges/stars-10.png',
  'assets/images/badges/stars-30.png',
  'assets/images/badges/streak-3.png',
  'assets/images/badges/streak-7.png',
  'assets/images/badges/streak-30.png',
  'assets/images/badges/retry.png',
  'assets/images/badges/learnback-3.png',
  'assets/images/badges/review-3.png',
  'assets/images/badges/reader-5.png',
  'assets/images/badges/answers-100.png',
  'assets/images/badges/mastered-5.png',
  'assets/images/badges/mastered-20.png',
  'assets/images/badges/level-5.png',
  'assets/images/badges/level-10.png',
  'js/config.js',
  'js/geometry.js',
  'js/content-registry.js',
  'js/judge.js',
  'js/mastery.js',
  'js/xp.js',
  'js/record.js',
  'js/badges.js',
  'js/storage.js',
  'js/session.js',
  'js/recommend.js',
  'js/units.js',
  'js/author.js',
  'js/author-api.js',
  'js/teacher.js',
  'js/figures.js',
  'js/anim.js',
  'js/anim-physics.js',
  'js/anim-chem.js',
  'js/anim-bio.js',
  'js/anim-earth.js',
  'js/sfx.js',
  'js/mascot.js',
  'js/richtext.js',
  'js/ruby.js',
  'content/readings.js',
  'content/curriculum.js',
  'content/basics.js',
  'content/light.js',
  'content/sound.js',
  'content/force.js',
  'content/substance.js',
  'content/solution.js',
  'content/state-change.js',
  'content/plants.js',
  'content/animals.js',
  'content/volcano.js',
  'content/strata.js',
  'content/chemical-change.js',
  'content/body.js',
  'content/electricity.js',
  'content/weather.js',
  'content/motion.js',
  'content/ion.js',
  'content/heredity.js',
  'content/space.js',
  'content/nature.js',
  'js/ui-problems.js',
  'js/ui-screens.js',
  'js/teacher-gate.js',
  'js/ui-teacher.js',
  'js/ui-author.js',
  'js/app.js',
];

// 開いている画面すべてに「この版でオフラインの準備ができた」と知らせる
function notifyReady(client) {
  client.postMessage({ type: 'offline-ready', version: VERSION });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // ブラウザの HTTP キャッシュに古いファイルが残っていても、サーバーから取り直して入れる
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach(notifyReady);
  })());
});

// 画面からの問い合わせ（{ type: 'status' }）: この版のキャッシュがあれば offline-ready を返す
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'status' || !event.source) return;
  event.waitUntil(caches.has(CACHE_NAME).then((has) => {
    if (has) notifyReady(event.source);
  }));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // ページを開く（/ でも /index.html でも）: キャッシュした index.html を返す
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => cache.match('index.html'))
        .then((hit) => hit || fetch(request))
        .catch(() => Response.error())
    );
    return;
  }

  // それ以外: キャッシュ優先。なければネットから取り、取れたらキャッシュに入れる
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(cache.put(request, copy).catch(() => {}));
        }
        return response;
      });
    })).catch(() => Response.error())
  );
});
