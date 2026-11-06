// ライブクイズ（設計書 14 章）: Firebase Realtime Database の REST クライアント
// SDK は使わない。書きこみ・読みこみは fetch、受信は EventSource（Firebase の REST ストリーム）。
// fetch・EventSource・タイマー・時刻は引数で差しかえられる（Node のテストでは偽物を渡す）。
// createDb({ baseUrl, fetchImpl, EventSourceImpl, now, setTimeoutImpl, clearTimeoutImpl, random })
//   → { put, patch, get, remove, watch(path, onData, onError, onStatus) → stop(), serverTime() }
// get は本文を読めない・JSON でないとき投げる（データがないときの null とは別）。
// watch の通知: onStatus({ kind: 'reconnecting', attempt })（切れるたび。attempt は続けて切れた回数）、
//   onStatus({ kind: 'reconnected' })（切れたあとにつながった）、onStatus({ kind: 'gave-up' })（MAX_RETRY 回つなぎ直してもだめ）。
//   onError(Error) は受信が止まったときだけ（つなぎ直しをあきらめた・規則で読めなくなった）。Error の kind は 'gave-up' | 'cancel' | 'unsupported'
(function (root) {
  'use strict';

  const RETRY_MS = 3000;     // 切れたあと、つなぎ直すまでの時間
  const MAX_RETRY = 10;      // 続けてつなぎ直す回数の上限

  const MSG = {
    denied: 'データベースの規則で拒まれました（docs/live/setup.md の規則を確かめてください）',
    network: '通信できませんでした（ネットワークにつながりません）',
    lost: '通信できませんでした（接続が切れました）',
    cancel: '通信できませんでした（データベースの規則で読めなくなりました）',
    noFetch: '通信できませんでした（この環境では通信できません）',
    badBody: '通信できませんでした（受け取ったデータを読めませんでした）',
  };

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  // 先生が貼った URL を baseUrl に。https で Firebase のデータベースの URL だけ（パスは落とす）
  function normalizeUrl(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    if (t.indexOf('https://') !== 0) return null;
    let u;
    try { u = new URL(t); } catch (e) { return null; }
    const host = u.hostname.toLowerCase();
    if (!/\.firebaseio\.com$/.test(host) && !/\.firebasedatabase\.app$/.test(host)) return null;
    return 'https://' + u.host.toLowerCase();
  }

  // 末尾の / と .json を取る
  function trimBase(baseUrl) {
    let b = String(baseUrl || '').trim();
    for (;;) {
      if (b.endsWith('/')) b = b.slice(0, -1);
      else if (b.endsWith('.json')) b = b.slice(0, -5);
      else break;
    }
    return b;
  }

  function splitPath(path) {
    return String(path || '').split('/').filter(Boolean);
  }

  // 全体 whole の path の場所を value に置きかえた写し（value が null なら消す）。元は変えない
  function setAt(whole, path, value) {
    const keys = splitPath(path);
    if (keys.length === 0) return value === undefined ? null : value;
    const base = isObject(whole) ? Object.assign({}, whole) : Array.isArray(whole) ? Object.assign({}, whole) : {};
    const [head, ...rest] = keys;
    const child = setAt(base[head], rest.join('/'), value);
    if (child === null || child === undefined) delete base[head];
    else base[head] = child;
    return Object.keys(base).length > 0 ? base : null;
  }

  function createDb(o) {
    const opts = o || {};
    const base = trimBase(opts.baseUrl);
    const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(root) : null);
    const EventSourceImpl = opts.EventSourceImpl || (typeof EventSource === 'function' ? EventSource : null);
    const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
    const setTimer = opts.setTimeoutImpl || ((fn, ms) => setTimeout(fn, ms));
    const clearTimer = opts.clearTimeoutImpl || ((id) => clearTimeout(id));
    const random = typeof opts.random === 'function' ? opts.random : Math.random;

    function urlOf(path) {
      return base + '/' + splitPath(path).map(encodeURIComponent).join('/') + '.json';
    }

    async function request(method, path, data) {
      if (!fetchImpl) throw new Error(MSG.noFetch);
      const init = { method };
      if (data !== undefined) init.body = JSON.stringify(data);
      let res;
      try {
        res = await fetchImpl(urlOf(path), init);
      } catch (e) {
        throw new Error(MSG.network);
      }
      let text = '';
      let textOk = true;
      try { text = await res.text(); } catch (e) { textOk = false; }
      if (res.status === 403 || res.status === 401) throw new Error(MSG.denied);
      if (!res.ok || res.status >= 400) {
        let detail = '';
        try { const v = JSON.parse(text); if (v && typeof v.error === 'string') detail = ': ' + v.error; } catch (e) { /* JSON でない */ }
        throw new Error('通信できませんでした（' + res.status + detail + '）');
      }
      // GET は本文が答えそのもの。読めない・JSON でない本文は「データなし（null）」と区別して失敗にする
      // （正常な「データなし」は本文 'null'）。書きこみ（PUT・PATCH・DELETE）は届いているので、本文が読めなくても null
      if (method === 'GET') {
        if (!textOk) throw new Error(MSG.badBody);
        try { return JSON.parse(text); } catch (e) { throw new Error(MSG.badBody); }
      }
      if (!text) return null;
      try { return JSON.parse(text); } catch (e) { return null; }
    }

    const put = (path, data) => request('PUT', path, data);
    const patch = (path, data) => request('PATCH', path, data);
    const get = (path) => request('GET', path);
    const remove = (path) => request('DELETE', path);

    // path の下を受信しつづけ、変わるたびに最新の全体を onData に渡す。戻り値の stop() で止める
    function watch(path, onData, onError, onStatus) {
      let whole = null;
      let es = null;
      let timer = null;
      let retries = 0;
      let lost = false;          // 切れてから、まだつながっていない
      let stopped = false;

      function emit() {
        if (typeof onData === 'function') { try { onData(whole); } catch (e) { /* 画面の都合の失敗は無視 */ } }
      }
      function fail(message, kind) {
        if (typeof onError === 'function') {
          const err = new Error(message);
          err.kind = kind;
          try { onError(err); } catch (e) { /* 無視 */ }
        }
      }
      function status(info) {
        if (typeof onStatus === 'function') { try { onStatus(info); } catch (e) { /* 無視 */ } }
      }
      // 切れたあとに、つながった（open）かデータが届いた
      function back() {
        if (!lost) return;
        lost = false;
        status({ kind: 'reconnected' });
      }
      function parse(ev) {
        try { const v = JSON.parse(ev && ev.data); return isObject(v) ? v : null; } catch (e) { return null; }
      }
      function closeEs() {
        if (es) { try { es.close(); } catch (e) { /* 無視 */ } es = null; }
      }

      function onPut(ev) {
        const m = parse(ev);
        if (!m || typeof m.path !== 'string') return;
        retries = 0;
        back();
        whole = setAt(whole, m.path, m.data === undefined ? null : m.data);
        emit();
      }
      function onPatch(ev) {
        const m = parse(ev);
        if (!m || typeof m.path !== 'string' || !isObject(m.data)) return;
        retries = 0;
        back();
        const prefix = splitPath(m.path).join('/');
        Object.keys(m.data).forEach(k => { whole = setAt(whole, prefix ? prefix + '/' + k : k, m.data[k]); });
        emit();
      }
      function onCancel() {
        stopped = true;
        closeEs();
        fail(MSG.cancel, 'cancel');
      }
      function onLost() {
        if (stopped) return;
        closeEs();
        lost = true;
        if (retries >= MAX_RETRY) {
          stopped = true;
          status({ kind: 'gave-up' });
          fail(MSG.lost, 'gave-up');
          return;
        }
        retries++;
        status({ kind: 'reconnecting', attempt: retries });
        timer = setTimer(() => { timer = null; connect(); }, RETRY_MS);
      }

      function connect() {
        if (stopped) return;
        if (!EventSourceImpl) { stopped = true; fail(MSG.noFetch, 'unsupported'); return; }
        try {
          es = new EventSourceImpl(urlOf(path));
        } catch (e) {
          es = null;
          onLost();
          return;
        }
        es.addEventListener('open', back);
        es.addEventListener('put', onPut);
        es.addEventListener('patch', onPatch);
        es.addEventListener('keep-alive', () => {});
        es.addEventListener('cancel', onCancel);
        es.addEventListener('auth_revoked', onCancel);
        es.addEventListener('error', onLost);
      }

      connect();
      return function stop() {
        stopped = true;
        if (timer !== null) { clearTimer(timer); timer = null; }
        closeEs();
      };
    }

    // サーバー時刻と端末時刻の差（ms）。サーバー時刻 ≒ now() + offset。失敗は 0
    async function serverTime() {
      const id = 't' + Math.floor(random() * 1e12).toString(36);
      const path = 'rooms/_time/' + id;
      try {
        const t0 = now();
        const server = await put(path, { '.sv': 'timestamp' });
        const t1 = now();
        remove(path).catch(() => {});   // 片づけ（失敗しても困らない）
        if (typeof server !== 'number' || !Number.isFinite(server)) return 0;
        return Math.round(server - (t0 + t1) / 2);
      } catch (e) {
        return 0;
      }
    }

    return { put, patch, get, remove, watch, serverTime, url: urlOf };
  }

  const api = { MESSAGES: MSG, RETRY_MS, MAX_RETRY, normalizeUrl, createDb, setAt };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { liveDb: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
