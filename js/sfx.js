// 効果音: Web Audio API で短い音を合成して鳴らす（音声ファイルは使わない。オフラインでも鳴る）
// RikaQuest.sfx = { plan, play, setEnabled, isEnabled }
//   plan(kind)        … 鳴らす音の並び [{ freq（Hz）, start（秒）, dur（秒）, type（OscillatorNode の波形）, gain（0〜1） }]。
//                       kind: 'correct'（正解）| 'wrong'（不正解）| 'levelup'（レベルアップ）| 'badge'（新しいバッジ。levelup と同じ音）。
//                       知らない kind は []。毎回新しい配列を返す（DOM・音を使わない。Node でも動く）
//   play(kind)        … plan(kind) を鳴らす（ブラウザ）。setEnabled(false) のあいだは何もしない。
//                       AudioContext は最初に鳴らすときに作る（iOS・Android はユーザー操作の中で作る・resume する必要があるため、
//                       答えるボタンなどの操作の中から呼ぶ）。作れない環境・失敗は握りつぶす（console.warn は 1 回だけ）
//   setEnabled(flag)  … 鳴らすかどうか（app.js の applyPrefs が生徒の設定 profile.sound で呼ぶ。既定は true）
//   isEnabled()       … いまの設定
// 音はやさしく短く（教室で鳴っても耳ざわりでないように、音量は小さめ）。端末のミュートには従う（Web Audio の既定のまま）。
(function (root) {
  'use strict';

  // 音の高さ（Hz）
  const NOTE = { F3: 174.61, A3: 220.0, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5 };

  // 1 音: [高さ, 始まり, 長さ, 波形, 音量]
  const PLANS = {
    // 2 音の上がるチャイム
    correct: [
      [NOTE.C5, 0, 0.09, 'sine', 0.2],
      [NOTE.E5, 0.09, 0.12, 'sine', 0.2],
    ],
    // 低い 2 音の下がる音（「ぽん、ぽん」程度。正解より小さく）
    wrong: [
      [NOTE.A3, 0, 0.12, 'triangle', 0.14],
      [NOTE.F3, 0.13, 0.12, 'triangle', 0.14],
    ],
    // 上がるアルペジオ 4 音。最後を少しのばす（計 0.6 秒）
    levelup: [
      [NOTE.C5, 0, 0.1, 'sine', 0.18],
      [NOTE.E5, 0.1, 0.1, 'sine', 0.18],
      [NOTE.G5, 0.2, 0.1, 'sine', 0.18],
      [NOTE.C6, 0.3, 0.3, 'sine', 0.18],
    ],
  };
  PLANS.badge = PLANS.levelup;

  function plan(kind) {
    if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(PLANS, kind)) return [];
    return PLANS[kind].map((n) => ({ freq: n[0], start: n[1], dur: n[2], type: n[3], gain: n[4] }));
  }

  let enabled = true;
  let ctx = null;            // 作った AudioContext（1 つだけ使い回す）
  let unavailable = false;   // 作れなかった（以後は作ろうとしない）
  let warned = false;

  function setEnabled(flag) { enabled = !!flag; }
  function isEnabled() { return enabled; }

  function warnOnce(e) {
    if (warned) return;
    warned = true;
    if (typeof console !== 'undefined' && console.warn) console.warn('効果音を鳴らせません', e);
  }

  function audioContext() {
    if (ctx || unavailable) return ctx;
    const Ctor = root.AudioContext || root.webkitAudioContext;
    if (typeof Ctor !== 'function') { unavailable = true; return null; }
    try {
      ctx = new Ctor();
    } catch (e) {
      unavailable = true;
      warnOnce(e);
    }
    return ctx;
  }

  function play(kind) {
    if (!enabled) return;
    const notes = plan(kind);
    if (notes.length === 0) return;
    try {
      const ac = audioContext();
      if (!ac) return;
      // 止まっていれば動かす（iOS Safari は画面ロックやタブ切りかえで 'interrupted' になる。ユーザー操作の中で resume する）
      if ((ac.state === 'suspended' || ac.state === 'interrupted') && typeof ac.resume === 'function') {
        const p = ac.resume();
        if (p && typeof p.catch === 'function') p.catch(warnOnce);
      }
      const t0 = (ac.currentTime || 0) + 0.01;
      notes.forEach((n) => {
        const t = t0 + n.start;
        const osc = ac.createOscillator();
        const amp = ac.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, t);
        // 立ち上がりと消え方をなめらかに（プツッという音を出さない）
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.linearRampToValueAtTime(n.gain, t + 0.01);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
        osc.connect(amp);
        amp.connect(ac.destination);
        osc.start(t);
        osc.stop(t + n.dur + 0.02);
      });
    } catch (e) {
      warnOnce(e);
    }
  }

  const api = { plan, play, setEnabled, isEnabled };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { sfx: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
