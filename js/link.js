// 授業ログのログインを読むだけで確かめる。記録やログインの保存場所は書きかえない。
// fetch・タイマー・時刻・storage は引数で差しかえられる（DOM は使わない）。
(function (root) {
  'use strict';

  const EXPIRED = ['TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'MISSING_REFRESH_TOKEN'];

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isText(v) { return typeof v === 'string' && v.trim().length > 0; }

  function readSaved(storageObj, key) {
    try {
      const saved = JSON.parse(storageObj.getItem(key));
      if (!isObject(saved) || !isText(saved.uid) || !isText(saved.refreshToken)) return null;
      return { uid: saved.uid, refreshToken: saved.refreshToken };
    } catch (e) {
      return null;
    }
  }

  function sameSaved(a, b) {
    return !!a && !!b && a.uid === b.uid && a.refreshToken === b.refreshToken;
  }

  function createLink(o) {
    const opts = o || {};
    const config = opts.config || {};
    const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
    const setTimer = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms));
    const clearTimer = opts.clearTimeout || ((id) => clearTimeout(id));
    const listeners = new Set();
    let current = 'none';
    let last = null;   // 確認結果とトークン・期限はメモリだけ。保存はしない
    let pending = null;

    function change(next) {
      if (current === next) return;
      current = next;
      listeners.forEach((fn) => {
        try { fn(next); } catch (e) {
          // 例外の中身にはトークンが含まれるかもしれないので、固定の文だけ出す
          try { console.error('授業ログのつながりの表示を更新できませんでした'); } catch (err) {}
        }
      });
    }

    function finish(next, saved, result) {
      last = saved ? {
        saved, status: next, at: now(),
        idToken: next === 'ok' ? result.idToken : null,
        expiresAt: next === 'ok' ? result.expiresAt : null,
      } : null;
      change(next);
      return current;
    }

    async function request(saved) {
      let timer = null;
      try {
        const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
        // AbortController がない・fetch が中断に応じない場合も、本文の読み取りごと打ち切る
        const timeout = new Promise((resolve) => {
          timer = setTimer(() => {
            resolve({ status: 'unknown' });
            try { if (controller) controller.abort(); } catch (e) {}
          }, config.timeoutMs);
        });
        const response = (async () => {
          const init = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(saved.refreshToken),
            redirect: 'error',   // 別の URL への転送でトークンを送らない
          };
          if (controller) init.signal = controller.signal;
          const res = await opts.fetch(config.tokenUrl + '?key=' + encodeURIComponent(config.apiKey), init);
          if (res.status !== 200 && res.status !== 400) return { status: 'unknown' };
          const body = await res.json();
          if (!isObject(body)) return { status: 'unknown' };
          if (res.status === 200 && body.user_id === saved.uid && isText(body.id_token)) {
            const seconds = Number(body.expires_in);
            return {
              status: 'ok', idToken: body.id_token,
              expiresAt: Number.isFinite(seconds) && seconds > 0 ? now() + seconds * 1000 : null,
            };
          }
          if (res.status === 400 && isObject(body.error) && EXPIRED.includes(body.error.message)) return { status: 'expired' };
          return { status: 'unknown' };
        })();
        return await Promise.race([response, timeout]);
      } catch (e) {
        return { status: 'unknown' };
      } finally {
        try { if (timer !== null) clearTimer(timer); } catch (e) {}
      }
    }

    async function run(force) {
      let saved = readSaved(opts.storage, config.authKey);
      if (!saved) return finish('none', null);
      if (last && sameSaved(saved, last.saved) && last.status === 'ok' && !force && now() - last.at < config.recheckMs) return current;
      if (!isText(config.apiKey) || !isText(config.tokenUrl)) return finish('unknown', saved);
      for (let retry = 0; retry <= 1; retry++) {
        if (!last || !sameSaved(saved, last.saved)) {
          last = null;
          change('checking');
        }
        const result = await request(saved);
        const latest = readSaved(opts.storage, config.authKey);
        if (!latest) return finish('none', null);
        if (sameSaved(saved, latest)) return finish(result.status, saved, result);
        // 途中で別のログインに変わった結果は使わない。やり直しは 1 回まで
        last = null;
        if (retry === 1) return finish('unknown', latest);
        saved = latest;
      }
    }

    function check(options) {
      if (pending) return pending;
      // 通知の中から check が呼ばれても、同じ Promise を返す
      pending = Promise.resolve().then(() => run(!!(options && options.force))).catch(() => {
        last = null;
        change('unknown');
        return current;
      }).then(() => {
        pending = null;
        return current;
      });
      return pending;
    }

    function onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function savedUid() {
      const saved = readSaved(opts.storage, config.authKey);
      return saved ? saved.uid : null;
    }

    function usableToken() {
      return current === 'ok' && last && sameSaved(readSaved(opts.storage, config.authKey), last.saved) &&
        last.expiresAt !== null && last.expiresAt - now() >= 5 * 60 * 1000 ? last.idToken : null;
    }

    async function getToken() {
      if (pending) await pending;
      const token = usableToken();
      if (token) return token;
      await check({ force: true });
      return usableToken();
    }

    return { status: () => current, uid: () => current === 'ok' && last ? last.saved.uid : null, savedUid, getToken, check, onChange };
  }

  const api = { readSaved, createLink };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { link: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
