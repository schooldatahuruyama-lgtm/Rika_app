// 授業ログで先生がクラスごとに決めた単元を読む。データベースには書きこまない。
(function (root) {
  'use strict';

  function clean(value) {
    return typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value) ? value : null;
  }

  function pickClass(list) {
    return list.slice().sort((a, b) => {
      const ay = typeof a.year === 'number' && Number.isFinite(a.year) ? a.year : -Infinity;
      const by = typeof b.year === 'number' && Number.isFinite(b.year) ? b.year : -Infinity;
      if (ay !== by) return ay > by ? -1 : 1;
      const an = typeof a.name === 'string' ? a.name : '';
      const bn = typeof b.name === 'string' ? b.name : '';
      if (an !== bn) return an < bn ? -1 : 1;
      return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
    })[0] || null;
  }

  function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function validKey(value) { return typeof value === 'string' && value.length > 0 && !/[/.#$\[\]]/.test(value); }

  function createClassUnit({ uid, link, fetch, config }) {
    let loading = null;

    async function request(path, token) {
      let timer = null;
      try {
        const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => { resolve({ status: 'offline' }); if (controller) controller.abort(); }, config.timeoutMs);
        });
        const response = (async () => {
          const init = { method: 'GET', redirect: 'error' };
          if (controller) init.signal = controller.signal;
          const res = await fetch(config.dbUrl.replace(/\/$/, '') + '/' + path + '.json?auth=' + encodeURIComponent(token), init);
          if (res.status === 401 || res.status === 403) return { status: 'denied' };
          if (res.status >= 500) return { status: 'offline' };
          if (res.status < 200 || res.status >= 300) return { status: 'broken' };
          try { return { status: 'ok', value: await res.json() }; } catch (e) { return { status: 'broken' }; }
        })();
        return await Promise.race([response, timeout]);
      } catch (e) { return { status: 'offline' }; }
      finally { if (timer !== null) clearTimeout(timer); }
    }

    async function run() {
      if (!validKey(uid)) return { status: 'offline' };
      const token = await link.getToken();
      if (!token || link.savedUid() !== uid) return { status: 'offline' };
      const empty = { status: 'ok', unitId: null, classId: null };
      const account = await request('accounts/' + encodeURIComponent(uid), token);
      if (account.status !== 'ok') return account;
      if (typeof account.value !== 'string') return empty;
      if (!validKey(account.value)) return { status: 'broken' };
      const member = await request('memberOf/' + encodeURIComponent(account.value), token);
      if (member.status !== 'ok') return member;
      const ids = isObject(member.value) ? Object.keys(member.value)
        .filter((id) => member.value[id] === true && /^[A-Za-z0-9]+$/.test(id)).slice(0, 10) : [];
      if (!ids.length) return empty;
      const list = [];
      for (const id of ids) {
        const result = await request('classes/' + id, token);
        if (result.status !== 'ok') return result;
        const value = isObject(result.value) ? result.value : {};
        list.push({ id, year: value.year, name: value.name });
      }
      const chosen = pickClass(list);
      const unit = await request('rika/classUnit/' + chosen.id, token);
      if (unit.status !== 'ok') return unit;
      return { status: 'ok', unitId: clean(unit.value), classId: chosen.id };
    }

    function load() {
      if (!loading) loading = Promise.resolve().then(run).catch(() => ({ status: 'offline' }))
        .then((result) => { loading = null; return result; });
      return loading;
    }
    return { load };
  }

  const api = { clean, pickClass, createClassUnit };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { classUnit: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
