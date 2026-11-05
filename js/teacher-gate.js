// 先生用の確認画面の入り口（パスコード）。純粋関数（Node でテストできる）と、storage への保存
// 生徒が先生画面を見ないようにするための目安の鍵（サーバーがないので、端末のブラウザ内だけで確かめる）。
//
// 保存データ（キー rika-quest:teacher）: { algo: 'sha256' | 'fnv', salt, hash, failed, lockUntil }
//   algo は hash を作った方式。照合のときも同じ方式で作る。
//   sha256 … crypto.subtle（https・localhost など安全な開き方でだけ使える）の SHA-256
//   fnv    … crypto.subtle が使えない開き方（http の LAN の IP など）での代わり（FNV-1a を 4 回、32 文字）
// isValidCode(code)        → 4〜8 桁の数字の文字列なら true
// hashCode(code, salt, algo) → Promise<{ algo, hash }>。algo を省くと、使える方式（sha256 を優先）
// create(code, now)        → Promise<保存データ>（新しい salt で作る。失敗回数 0）
// load(storage)            → 保存データか null（未設定・壊れている・読めない）。例外を出さない
// save(storage, data)      → 保存できたら true
// canTry(data, now)        → ロック中でなければ true（lockUntil を過ぎている）
// recordFailure(data, now) → 失敗を 1 回足した写し。MAX_FAILURES 回目でロック（now + LOCK_MS）し、回数は 0 に戻す
// recordSuccess(data)      → 失敗回数とロックを 0 にした写し
// triesLeft(data)          → ロックまでにあと何回まちがえられるか
// lockSecondsLeft(data, now) → ロックの残り秒（切り上げ。ロック中でなければ 0）
// canVerify(data)          → この開き方で data の方式を計算できるか（sha256 で作ったのに crypto.subtle がない、など）
// verify(data, code)       → Promise<boolean>（コードが合うか。失敗回数は変えない）
// sameCode(a, b)           → 同じパスコードの保存データか（salt と hash が同じ）
// isGone(seenBefore, stored) → 一度見た保存データが今はない（ほかのタブで「すべて削除」など）。画面はページを読み込み直す
// storeVanished(rawRecord, profileCount) → 学習記録のキーの値（getItem の戻り値）が null なのに、メモリの store に
//                            生徒がいる（ほかのタブで「すべて削除」された）。画面はページを読み込み直す
// stricter(stored, held)   → 保存データ stored と、保存できずにメモリに持っている held のきびしいほう
//                            （同じパスコードなら失敗回数・ロックの大きいほう。違えば・held がなければ stored。stored がなければ null）
// attempt(storage, code, now, held) → Promise<結果>。入り口の 1 回の送信（毎回 storage を読み直す）
//   結果 = { status, data, held, triesLeft, seconds }
//   status: 'unset'（保存データがない。古いデータは使わない）| 'blocked'（失敗回数・ロックを保存できない。照合しない）|
//           'locked'（ロック中。seconds が残り秒）| 'cantVerify' | 'invalid'（4〜8 桁の数字でない。失敗に数えない）|
//           'changed'（照合のあいだにほかのタブでパスコードが変わった・消えた。上書きしない）|
//           'wrong'（ちがう。triesLeft が残り回数。5 回目ならロックして 'locked'）| 'ok'（合った。data.saved が偽なら成功の保存に失敗）
//   held は次の送信に渡す値（保存できなかった失敗回数・ロック。なければ null）
(function (root) {
  'use strict';

  const KEY = 'rika-quest:teacher';
  const MAX_FAILURES = 5;
  const LOCK_MS = 60 * 1000;
  const ALGOS = ['sha256', 'fnv'];

  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function toMs(now) { return now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.now(); }

  function isValidCode(code) {
    return typeof code === 'string' && /^[0-9]{4,8}$/.test(code);
  }

  function subtle() {
    const c = root.crypto;
    return c && c.subtle && typeof c.subtle.digest === 'function' ? c.subtle : null;
  }

  function hex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function utf8(text) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text);
    // TextEncoder のない古い環境（数字と salt の英数字だけなので 1 文字 1 バイトで足りる）
    return Uint8Array.from(String(text), (ch) => ch.charCodeAt(0) & 0xff);
  }

  // FNV-1a（32 ビット）を初期値を変えて 4 回計算し、16 進 8 文字ずつ並べて 32 文字にする
  function fnvHash(text) {
    const bytes = utf8(text);
    const seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
    return seeds.map((seed, i) => {
      let h = seed >>> 0;
      for (let round = 0; round < 64; round++) {
        for (let k = 0; k < bytes.length; k++) {
          h ^= bytes[k];
          h = Math.imul(h, 0x01000193) >>> 0;
        }
        h ^= round + i;
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    }).join('');
  }

  async function hashCode(code, salt, algo) {
    const method = algo || (subtle() ? 'sha256' : 'fnv');
    const text = String(salt) + ':' + String(code);
    if (method === 'sha256') {
      const s = subtle();
      if (!s) throw new Error('この開き方では SHA-256 を使えません');
      const digest = await s.digest('SHA-256', utf8(text));
      return { algo: 'sha256', hash: hex(new Uint8Array(digest)) };
    }
    if (method === 'fnv') return { algo: 'fnv', hash: fnvHash(text) };
    throw new Error('知らない方式: ' + method);
  }

  function newSalt() {
    const bytes = new Uint8Array(16);
    const c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return hex(bytes);
  }

  async function create(code) {
    if (!isValidCode(code)) throw new Error('パスコードは 4〜8 桁の数字です');
    const salt = newSalt();
    const h = await hashCode(code, salt);
    return { algo: h.algo, salt, hash: h.hash, failed: 0, lockUntil: 0 };
  }

  // 形を確かめて整える。使えない形なら null
  function normalize(data) {
    if (!isObject(data)) return null;
    if (ALGOS.indexOf(data.algo) === -1 || typeof data.salt !== 'string' || typeof data.hash !== 'string' || data.hash === '') return null;
    const failed = Number.isInteger(data.failed) && data.failed >= 0 ? data.failed : 0;
    const lockUntil = typeof data.lockUntil === 'number' && Number.isFinite(data.lockUntil) && data.lockUntil > 0 ? data.lockUntil : 0;
    return { algo: data.algo, salt: data.salt, hash: data.hash, failed, lockUntil };
  }

  function load(storage) {
    try {
      const raw = storage && typeof storage.getItem === 'function' ? storage.getItem(KEY) : null;
      if (raw === null || raw === undefined) return null;
      return normalize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function save(storage, data) {
    const d = normalize(data);
    if (!d) return false;
    try {
      storage.setItem(KEY, JSON.stringify(d));
      return true;
    } catch (e) {
      return false;
    }
  }

  function canTry(data, now) {
    return !data || !data.lockUntil || toMs(now) >= data.lockUntil;
  }

  function recordFailure(data, now) {
    const failed = (data.failed || 0) + 1;
    if (failed >= MAX_FAILURES) return Object.assign({}, data, { failed: 0, lockUntil: toMs(now) + LOCK_MS });
    return Object.assign({}, data, { failed });
  }

  function recordSuccess(data) {
    return Object.assign({}, data, { failed: 0, lockUntil: 0 });
  }

  function triesLeft(data) {
    return Math.max(0, MAX_FAILURES - ((data && data.failed) || 0));
  }

  function lockSecondsLeft(data, now) {
    if (canTry(data, now)) return 0;
    return Math.ceil((data.lockUntil - toMs(now)) / 1000);
  }

  function canVerify(data) {
    return !!data && (data.algo === 'fnv' || (data.algo === 'sha256' && !!subtle()));
  }

  async function verify(data, code) {
    if (!data || !isValidCode(code) || !canVerify(data)) return false;
    try {
      const h = await hashCode(code, data.salt, data.algo);
      return h.hash === data.hash;
    } catch (e) {
      return false;
    }
  }

  function sameCode(a, b) {
    return !!a && !!b && a.algo === b.algo && a.salt === b.salt && a.hash === b.hash;
  }

  function isGone(seenBefore, stored) {
    return !!seenBefore && !stored;
  }

  function storeVanished(rawRecord, profileCount) {
    return rawRecord === null && typeof profileCount === 'number' && profileCount > 0;
  }

  function stricter(stored, held) {
    if (!stored) return null;
    if (!sameCode(stored, held)) return stored;
    return Object.assign({}, stored, { failed: Math.max(stored.failed || 0, held.failed || 0), lockUntil: Math.max(stored.lockUntil || 0, held.lockUntil || 0) });
  }

  async function attempt(storage, code, now, held) {
    const stored = load(storage);
    if (!stored) return { status: 'unset', data: null, held: null };
    let d = stricter(stored, held);
    // 前に保存できなかった失敗回数・ロックを、まず保存し直す。できなければ照合しない
    if (held && sameCode(stored, held)) {
      if (!save(storage, d)) return { status: 'blocked', data: d, held: d };
    }
    if (!canTry(d, now)) return { status: 'locked', data: d, held: null, seconds: lockSecondsLeft(d, now) };
    if (!canVerify(d)) return { status: 'cantVerify', data: d, held: null };
    if (!isValidCode(code)) return { status: 'invalid', data: d, held: null };
    const ok = await verify(d, code);
    // 照合のあいだに、ほかのタブで消された・変えられたら上書きしない。失敗回数が増えていればそちらも数える
    const after = load(storage);
    if (!after) return { status: 'unset', data: null, held: null };
    if (!sameCode(after, d)) return { status: 'changed', data: after, held: null };
    d = stricter(after, d);
    if (ok) {
      const next = recordSuccess(d);
      return { status: 'ok', data: Object.assign({}, next, { saved: save(storage, next) }), held: null };
    }
    const next = recordFailure(d, now);
    if (!save(storage, next)) return { status: 'blocked', data: next, held: next };
    if (!canTry(next, now)) return { status: 'locked', data: next, held: null, seconds: lockSecondsLeft(next, now) };
    return { status: 'wrong', data: next, held: null, triesLeft: triesLeft(next) };
  }

  const api = {
    KEY, MAX_FAILURES, LOCK_MS,
    isValidCode, hashCode, create, load, save, canTry, recordFailure, recordSuccess, triesLeft, lockSecondsLeft, canVerify, verify,
    sameCode, isGone, storeVanished, stricter, attempt,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { teacherGate: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
