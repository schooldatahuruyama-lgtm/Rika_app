// 解説カードの「動く図」
// frame(kind, t) は 1 周の中の位置 t（0 以上 1 未満）の場面（scene）を返す純粋関数（DOM を使わない。Node でテストできる）。
// 位置は数式で計算する（光線が物体のはしを通る、入射角＝反射角）。描くのは figures.js の item と同じ部品。
// create(kind) はブラウザ専用。requestAnimationFrame で図を描き直し、要素が画面から外れたら自分で止まる。
// 画面側（ui-screens.js の lessonCardBody）が create して、動きを減らす設定でなければ start() を呼ぶ。
(function (root) {
  'use strict';

  const KINDS = ['shadow-size', 'reflect-law'];
  const PERIOD_MS = 4000;   // 1 周の時間
  const WIDTH = 320;
  const HEIGHT = 240;

  // 図の描き方は figures.js を使う。読み込み順に頼らないよう、使うときに取る
  function figures() {
    return typeof require === 'function' ? require('./figures.js') : root.RikaQuest.figures;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // 物体を光源に近づけたり離したりすると、スクリーンの影が大きく・小さくなる（straight-1-c3）
  function shadowSize(c) {
    const ox = 150 - 50 * c;   // t = 0 で 100（光源に近い）、t = 0.5 で 200（遠い）
    // 光源 (40, 120) と物体の先端 (ox, 98)・根元 (ox, 143) を結ぶ直線を x = 280 までのばす
    const yTop = clamp(120 - 22 * 240 / (ox - 40), 30, 220);
    const yBot = clamp(120 + 23 * 240 / (ox - 40), 30, 220);
    return [
      { type: 'ray', x1: 40, y1: 120, x2: 280, y2: yTop, arrow: true },
      { type: 'ray', x1: 40, y1: 120, x2: 280, y2: yBot, arrow: true },
      { type: 'object', x: ox, y: 143, height: 45, label: '物体' },
      { type: 'screen', x: 280, y1: 30, y2: 220 },
      { type: 'shadow', x: 280, y1: yTop, y2: yBot },
      { type: 'lamp', x: 40, y: 120 },
      { type: 'label', x: 104, y: 232, text: ox < 150 ? '光源に近い → 影は大きい' : '光源から遠い → 影は小さい' },
    ];
  }

  // 入射角が 20°〜50° で変わり、反射光がそれに合わせて動く（reflect-1-c3）
  function reflectLaw(c) {
    const theta = 20 + 30 * (0.5 - 0.5 * c);   // 度
    const L = 110;
    const rad = theta * Math.PI / 180;
    const s = Math.sin(rad), co = Math.cos(rad);
    const d = Math.round(theta);   // 表示だけ丸める（座標は丸めない）
    return [
      { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
      { type: 'normal', x: 160, y: 120, angle: 0 },
      { type: 'ray', x1: 160 - L * s, y1: 180 - L * co, x2: 160, y2: 180, arrow: true },
      { type: 'ray', x1: 160, y1: 180, x2: 160 + L * s, y2: 180 - L * co, arrow: true },
      { type: 'label', x: 20, y: 40, text: '入射角 ' + d + '°' },
      { type: 'label', x: 200, y: 40, text: '反射角 ' + d + '°' },
      { type: 'label', x: 120, y: 215, text: '入射角 ＝ 反射角' },
    ];
  }

  const BUILD = { 'shadow-size': shadowSize, 'reflect-law': reflectLaw };

  // kind の動く図の、1 周の中の位置 t の場面。知らない kind は例外
  function frame(kind, t) {
    if (!Object.prototype.hasOwnProperty.call(BUILD, kind)) throw new Error('知らない動く図: ' + kind);
    const c = Math.cos(2 * Math.PI * (Number(t) || 0));
    return { width: WIDTH, height: HEIGHT, items: BUILD[kind](c) };
  }

  // 動きを減らす設定（matchMedia がない環境では false）
  function prefersReducedMotion() {
    try {
      return typeof root.matchMedia === 'function' && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  // ブラウザ用: div.anim-box（図の箱と、とめる／動かすボタン）を作る。最初は t = 0 の絵
  function create(kind) {
    frame(kind, 0);   // 知らない kind はここで例外
    const doc = root.document;
    const element = doc.createElement('div');
    element.className = 'anim-box';
    const box = doc.createElement('div');
    box.className = 'figure-box';
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-quiet anim-toggle';
    element.append(box, toggle);

    let t = 0;          // いまの位置（止めたときはそこから続ける）
    let t0 = 0;         // 位置 0 に当たる時刻
    let rafId = null;

    // figures が作った SVG 文字列だけを入れる（svgBox と同じ）
    function draw() { box.innerHTML = figures().sceneSvg(frame(kind, t)); }

    function tick(now) {
      if (!element.isConnected) { rafId = null; stop(); return; }   // 画面から外れたら止まる
      t = ((now - t0) % PERIOD_MS) / PERIOD_MS;
      draw();
      rafId = root.requestAnimationFrame(tick);
    }

    function start() {
      if (rafId !== null) return;
      toggle.textContent = 'とめる';
      rafId = root.requestAnimationFrame((now) => {
        t0 = now - t * PERIOD_MS;   // 止めたときの t から続ける
        tick(now);
      });
    }

    function stop() {
      if (rafId !== null) root.cancelAnimationFrame(rafId);
      rafId = null;
      toggle.textContent = '動かす';
    }

    function isPlaying() { return rafId !== null; }

    toggle.addEventListener('click', () => { if (isPlaying()) stop(); else start(); });
    toggle.textContent = '動かす';
    draw();
    return { element, start, stop, isPlaying };
  }

  const api = { KINDS, PERIOD_MS, frame, create, prefersReducedMotion };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { anim: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
