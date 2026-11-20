// 先生がクラスの今の状態を読む。履歴・保存場所は使わず、データベースには書かない。
(function (root) {
  'use strict';

  function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function validKey(value) { return typeof value === 'string' && value.length > 0 && !/[/.#$\[\]]/.test(value); }
  function validClass(value) { return typeof value === 'string' && /^[A-Za-z0-9]+$/.test(value); }
  function compare(a, b) { return a === b ? 0 : a < b ? -1 : 1; }

  function sortClasses(value) {
    if (!isObject(value)) return [];
    return Object.keys(value).filter((id) => validClass(id) && isObject(value[id]) &&
      Number.isFinite(value[id].year) && value[id].year >= 2000 && typeof value[id].name === 'string')
      .map((id) => ({ id, year: value[id].year, name: value[id].name }))
      .sort((a, b) => b.year - a.year || compare(a.name, b.name) || compare(a.id, b.id));
  }

  function memberRows(members, accounts) {
    const bySid = new Map();
    if (isObject(accounts)) Object.keys(accounts).filter(validKey).forEach((uid) => {
      const sid = accounts[uid];
      if (typeof sid !== 'string') return;
      if (bySid.has(sid)) bySid.set(sid, null);
      else bySid.set(sid, uid);
    });
    if (!isObject(members)) return [];
    return Object.keys(members).filter((sid) => /^[A-Za-z0-9-]{1,40}$/.test(sid)).map((sid) => {
      const row = { sid, number: Number.isFinite(members[sid]) ? members[sid] : null, uid: bySid.get(sid) || null };
      if (bySid.has(sid) && row.uid === null) row.dup = true;
      return row;
    }).sort((a, b) => (a.number === null ? Infinity : a.number) - (b.number === null ? Infinity : b.number) || compare(a.sid, b.sid));
  }

  function createClassProgress({ link, fetch, config, unpackState }) {
    let teacherCache = null;
    const loading = new Map();

    async function request(path, auth) {
      let timer = null;
      try {
        if (link.savedUid() !== auth.uid) return { status: 'offline' };
        const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => { resolve({ status: 'offline' }); if (controller) controller.abort(); }, config.timeoutMs);
        });
        const response = (async () => {
          const init = { method: 'GET', redirect: 'error' };
          if (controller) init.signal = controller.signal;
          const res = await fetch(config.dbUrl.replace(/\/$/, '') + '/' + path + '.json?auth=' + encodeURIComponent(auth.token), init);
          if (res.status === 401 || res.status === 403) return { status: 'denied' };
          if (res.status >= 500) return { status: 'offline' };
          if (res.status < 200 || res.status >= 300) return { status: 'broken' };
          try { return { status: 'ok', value: await res.json() }; } catch (e) { return { status: 'broken' }; }
        })();
        const result = await Promise.race([response, timeout]);
        return link.savedUid() === auth.uid ? result : { status: 'offline' };
      } catch (e) { return { status: 'offline' }; }
      finally { if (timer !== null) clearTimeout(timer); }
    }

    async function credentials() {
      const uid = link.savedUid();
      if (!uid || link.status() === 'none') { teacherCache = null; return { status: 'none' }; }
      if (teacherCache && teacherCache.uid !== uid) teacherCache = null;
      if (!validKey(uid)) return { status: 'offline' };
      const token = await link.getToken();
      if (!token || link.savedUid() !== uid) return { status: 'offline' };
      return { status: 'ok', uid, token };
    }

    async function teacher(auth) {
      if (teacherCache && teacherCache.uid === auth.uid) return { status: 'ok', teacher: teacherCache.teacher };
      const result = await request('teacherList/' + encodeURIComponent(auth.uid), auth);
      if (result.status !== 'ok' && result.status !== 'denied') return result;
      const yes = result.status === 'ok' && result.value === true;
      teacherCache = { uid: auth.uid, teacher: yes };
      return { status: 'ok', teacher: yes };
    }

    async function authorize() {
      const auth = await credentials();
      if (auth.status !== 'ok') return auth;
      const result = await teacher(auth);
      if (result.status !== 'ok') return result;
      return result.teacher ? auth : { status: 'not-teacher' };
    }

    async function isTeacher() {
      try {
        const auth = await credentials();
        return auth.status === 'ok' ? await teacher(auth) : auth;
      } catch (e) { return { status: 'offline' }; }
    }

    async function listClasses() {
      try {
        const auth = await authorize();
        if (auth.status !== 'ok') return auth;
        const result = await request('classes', auth);
        return result.status === 'ok' ? { status: 'ok', classes: sortClasses(result.value) } : result;
      } catch (e) { return { status: 'offline' }; }
    }

    async function run(classId) {
      const auth = await authorize();
      if (auth.status !== 'ok') return auth;
      const [members, accounts, unit] = await Promise.all([
        request('members/' + classId, auth), request('accounts', auth), request('rika/classUnit/' + classId, auth),
      ]);
      if (members.status !== 'ok') return members;
      if (accounts.status !== 'ok') return accounts;
      const all = memberRows(members.value, accounts.value);
      const rows = all.slice(0, 60);
      let next = 0;
      async function worker() {
        while (next < rows.length) {
          const row = rows[next++];
          row.kind = row.dup ? 'dup' : 'no-account';
          delete row.dup;
          if (!row.uid) continue;
          const result = await request('rika/state/' + encodeURIComponent(row.uid), auth);
          if (result.status !== 'ok') { row.kind = 'failed'; continue; }
          if (result.value === null) { row.kind = 'empty'; continue; }
          row.kind = 'broken';
          const value = result.value;
          if (!isObject(value) || value.v !== 1 || !Number.isFinite(value.updatedAt) ||
              typeof value.json !== 'string' || value.json.length > 500000) continue;
          let state;
          try { state = unpackState(value.json); } catch (e) { continue; }
          if (!state) continue;
          row.kind = 'ok';
          row.profile = Object.assign({}, state.profile, { nickname: typeof state.profile.nickname === 'string' ? state.profile.nickname : '' });
          row.record = state.record;
          row.updatedAt = value.updatedAt;
        }
      }
      await Promise.all(Array.from({ length: Math.min(5, rows.length) }, () => worker()));
      if (link.savedUid() !== auth.uid) return { status: 'offline' };
      return { status: 'ok', classId, classUnit: unit.status === 'ok' && typeof unit.value === 'string' ? unit.value : null,
        truncated: all.length > 60, rows };
    }

    function load(classId) {
      if (!validClass(classId)) return Promise.resolve({ status: 'broken' });
      try {
        const key = JSON.stringify([link.savedUid(), classId]);
        if (!loading.has(key)) {
          const job = Promise.resolve().then(() => run(classId)).catch(() => ({ status: 'offline' }))
            .then((result) => { loading.delete(key); return result; });
          loading.set(key, job);
        }
        return loading.get(key);
      } catch (e) { return Promise.resolve({ status: 'offline' }); }
    }
    return { isTeacher, listClasses, load };
  }

  const api = { sortClasses, memberRows, createClassProgress };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { classProgress: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
