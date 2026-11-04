// Service Worker（キャッシュ優先）。アプリ本体と教材を初回に全部キャッシュし、通信がなくても開けるようにする。
// 更新の手順: 教材やプログラムを変えたら VERSION を上げる。次にオンラインで開いたとき新しい版が入り、
// 古いキャッシュ（rika-quest- で始まる別の名前）は消える。記録は localStorage なので残る。
// http(s):// で開いたときだけ js/app.js が登録する（file:// では動かない）。
'use strict';

const VERSION = '2026-11-04-9';
const CACHE_PREFIX = 'rika-quest-';
const CACHE_NAME = CACHE_PREFIX + VERSION;

// 先にキャッシュするファイル。index.html が読み込むファイルはすべてここに入れる（並びも index.html と同じ）。
// tests/offline.test.js が index.html との食い違いを確かめる。
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'assets/avatars/mascot_A.svg',
  'assets/avatars/mascot_B.svg',
  'assets/avatars/mascot_C.svg',
  'assets/avatars/mascot_D.svg',
  'assets/avatars/mascot_E.svg',
  'assets/avatars/mascot_F.svg',
  'js/config.js',
  'js/geometry.js',
  'js/content-registry.js',
  'js/judge.js',
  'js/mastery.js',
  'js/xp.js',
  'js/record.js',
  'js/storage.js',
  'js/session.js',
  'js/recommend.js',
  'js/figures.js',
  'js/anim.js',
  'js/mascot.js',
  'js/richtext.js',
  'content/light.js',
  'js/ui-problems.js',
  'js/ui-screens.js',
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
