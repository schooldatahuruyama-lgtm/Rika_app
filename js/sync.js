// 授業ログの記録の同期。DOM は使わず、通信・保存場所・時刻・乱数を受け取る。
(function (root) {
  'use strict';

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function objects(v) { return Array.isArray(v) ? v.filter(isObject) : []; }
  function number(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }
  function entryKey(kind, entry) {
    const e = entry || {};
    return typeof e.eid === 'string' && e.eid ? kind + ':' + e.eid : null;
  }
  function dedupe(kind, list) {
    const seen = new Set();
    return list.filter((entry) => {
      const key = entryKey(kind, entry);
      if (key === null) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function packState(profile, record) {
    const rest = Object.assign({}, record);
    delete rest.history;
    delete rest.xpLog;
    delete rest.sync;
    return JSON.stringify({ profile, record: rest });
  }
  function unpackState(json) {
    try {
      if (typeof json !== 'string') return null;
      const v = JSON.parse(json);
      return isObject(v) && isObject(v.profile) && typeof v.profile.id === 'string' && isObject(v.record) ? v : null;
    } catch (e) { return null; }
  }
  function packChunk(h, x) { return JSON.stringify({ h: objects(h), x: objects(x) }); }
  function unpackChunk(text) {
    try {
      if (typeof text !== 'string') return null;
      const v = JSON.parse(text);
      return isObject(v) ? { h: objects(v.h), x: objects(v.x) } : null;
    } catch (e) { return null; }
  }

  function mergeMap(a, b, choose) {
    const out = {};
    new Set(Object.keys(b || {}).concat(Object.keys(a || {}))).forEach((key) => {
      const x = a && Object.prototype.hasOwnProperty.call(a, key) ? a[key] : undefined;
      const y = b && Object.prototype.hasOwnProperty.call(b, key) ? b[key] : undefined;
      Object.defineProperty(out, key, { value: choose(x, y), enumerable: true, writable: true, configurable: true });
    });
    return out;
  }

  function mergeRecord(local, remote, deps) {
    const out = Object.assign({}, remote, local);
    out.history = dedupe('h', local.history || []);
    out.xpLog = dedupe('x', local.xpLog || []);
    out.xp = out.xpLog.length ? out.xpLog.reduce((n, e) => n + number(e && e.amount), 0) : Math.max(number(local.xp), number(remote && remote.xp));
    out.level = deps.levelFor(out.xp);
    if (!remote || JSON.stringify(local) === JSON.stringify(remote)) return copy(out);
    out.stages = mergeMap(local.stages, remote.stages, (a, b) => {
      if (!a || !b) { const s = a || b; return s.status === 'cleared' ? Object.assign({}, s, { resume: null }) : s; }
      const ranks = { none: 0, inprogress: 1, cleared: 2 };
      const status = ranks[a.status] >= ranks[b.status] ? a.status : b.status;
      return Object.assign({}, b, a, { status, stars: Math.max(number(a.stars), number(b.stars)),
        attempts: Math.max(number(a.attempts), number(b.attempts)), resume: status === 'cleared' ? null : a.resume || b.resume || null });
    });
    out.mastery = mergeMap(local.mastery, remote.mastery, (a, b) => {
      if (!a || !b) return a || b;
      if (a.lastAt && b.lastAt && a.lastAt !== b.lastAt) return a.lastAt > b.lastAt ? a : b;
      return number(a.value) >= number(b.value) ? a : b;
    });
    out.lessonsRead = mergeMap(local.lessonsRead, remote.lessonsRead, (a, b) => a === true || b === true);
    out.reviewDone = mergeMap(local.reviewDone, remote.reviewDone, (a, b) => !b || a > b ? a : b);
    out.badges = mergeMap(local.badges, remote.badges, (a, b) => a === undefined ? b : a);
    const codes = new Set();
    out.liveResults = objects(local.liveResults).concat(objects(remote.liveResults)).filter((v) => {
      if (codes.has(v.code)) return false;
      codes.add(v.code);
      return true;
    });
    const a = local.streak || { count: 0, lastDate: null };
    const b = remote.streak || { count: 0, lastDate: null };
    out.streak = (a.lastDate || '') === (b.lastDate || '') ? (number(a.count) >= number(b.count) ? a : b)
      : (a.lastDate || '') > (b.lastDate || '') ? a : b;
    return copy(out);
  }

  const CHUNK_ID = /^[A-Za-z0-9_-]{8,40}$/;
  function validMeta(v) {
    const arrays = (p) => isObject(p) && Array.isArray(p.h) && p.h.every(isObject) && Array.isArray(p.x) && p.x.every(isObject);
    return isObject(v) && v.v === 1 && (v.seenRev === null || typeof v.seenRev === 'number' && Number.isFinite(v.seenRev)) &&
      Array.isArray(v.chunks) && v.chunks.every((id) => typeof id === 'string' && CHUNK_ID.test(id)) &&
      isObject(v.len) && ['h', 'x'].every((k) => Number.isInteger(v.len[k]) && v.len[k] >= 0) && arrays(v.pending) &&
      (v.sending === null || arrays(v.sending) && typeof v.sending.id === 'string' && CHUNK_ID.test(v.sending.id)) && typeof v.dirty === 'boolean';
  }

  function createSync(opts) {
    const { uid, link, fetch, storage, save, config, now, random, levelFor } = opts;
    // 旧版の別キーは引きつがない。記録と同期情報は同じ入れ物で保存する。
    try { storage.removeItem(config.syncKeyPrefix + uid); } catch (e) {}
    let meta = null;
    let recovering = false;
    let stateKnown = false;
    let remoteRev = null;
    let broken = false;
    let retryChunks = false;
    let generation = 0;
    let sequence = 0;
    let tail = Promise.resolve();
    let pulling = null;
    let pushing = null;

    function recordOf(store) { return store && store.records && store.records[store.currentProfileId] || null; }
    function emptyMeta() {
      return { v: 1, seenRev: null, chunks: [], len: { h: 0, x: 0 }, pending: { h: [], x: [] }, sending: null, dirty: false };
    }
    function init(store) {
      if (!store) return;
      if (!meta) {
        const rec = recordOf(store);
        recovering = !validMeta(store.sync) && (Object.prototype.hasOwnProperty.call(store, 'sync') ||
          objects(rec && rec.history).length > 0 || objects(rec && rec.xpLog).length > 0);
        meta = validMeta(store.sync) ? store.sync : emptyMeta();
        if (recovering) meta.dirty = true;
      }
      // 読み直せるまでは壊れた情報も残し、再起動しても復旧をやり直す。
      if (!recovering) store.sync = meta;
    }
    init(opts.store);
    function persist(store) {
      init(store);
      try { return save(store) === true; } catch (e) { return false; }
    }
    function addPending(kind, list) {
      const sending = new Set((meta.sending ? meta.sending[kind] : []).map((entry) => entryKey(kind, entry)));
      meta.pending[kind] = dedupe(kind, meta.pending[kind].concat(list)).filter((entry) => {
        const key = entryKey(kind, entry);
        return key === null || !sending.has(key);
      });
    }
    function capture(store) {
      init(store);
      const rec = recordOf(store);
      if (!rec) return;
      meta.dirty = true;
      generation++;
      if (recovering) return;
      let prefix = null;
      let index = 0;
      [['h', 'history'], ['x', 'xpLog']].forEach(([k, field]) => {
        const list = Array.isArray(rec[field]) ? rec[field] : [];
        const added = objects(list.slice(meta.len[k]));
        added.forEach((entry) => {
          if (entryKey(k, entry) !== null) return;
          if (prefix === null) prefix = now().toString(36) + '_' + random().toString(36).slice(2).padEnd(12, '0');
          entry.eid = prefix + '_' + (++index).toString(36);
        });
        addPending(k, copy(added));
        meta.len[k] = list.length;
      });
    }
    function hasPending() { return meta && (meta.sending || meta.pending.h.length || meta.pending.x.length); }
    function pendingCount() { return meta ? meta.pending.h.length + (meta.sending ? meta.sending.h.length : 0) : 0; }
    function isDirty() { return !!(meta && (meta.dirty || hasPending())); }

    async function request(path, method, token, body, shallow) {
      let timer = null;
      try {
        const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => { resolve({ status: 'offline' }); if (controller) controller.abort(); }, config.timeoutMs);
        });
        const response = (async () => {
          const init = { method, redirect: 'error' };
          if (controller) init.signal = controller.signal;
          if (body !== undefined) { init.body = JSON.stringify(body); init.headers = { 'Content-Type': 'application/json' }; }
          const res = await fetch(config.dbUrl.replace(/\/$/, '') + '/rika/' + path + '.json?auth=' + encodeURIComponent(token) + (shallow ? '&shallow=true' : ''), init);
          if (res.status === 401 || res.status === 403) return { status: 'denied' };
          if (res.status >= 500) return { status: 'offline' };
          if (res.status < 200 || res.status >= 300) return { status: 'broken' };
          if (method === 'PUT') return { status: 'ok' };
          try { return { status: 'ok', value: await res.json() }; } catch (e) { return { status: 'broken' }; }
        })();
        return await Promise.race([response, timeout]);
      } catch (e) { return { status: 'offline' }; }
      finally { if (timer !== null) clearTimeout(timer); }
    }
    async function tokenForUser() {
      try {
        if (typeof uid !== 'string' || !uid || /[/.#$\[\]]/.test(uid)) return null;
        const token = await link.getToken();
        if (typeof link.savedUid === 'function' && link.savedUid() !== uid) return null;
        return token;
      } catch (e) { return null; }
    }

    async function doPull(store) {
      init(store);
      const result = (status, next) => ({ status, store: next || store, changed: !!next });
      const token = await tokenForUser();
      if (!token) return result('offline');
      const response = await request('state/' + encodeURIComponent(uid), 'GET', token);
      if (response.status !== 'ok') {
        if (response.status === 'broken') broken = true;
        return result(response.status);
      }
      const value = response.value;
      if (value === null) {
        broken = false;
        stateKnown = true;
        remoteRev = null;
        meta.seenRev = null;
        if (recovering) {
          meta = emptyMeta();
          recovering = false;
          capture(store);
          persist(store);
        }
        return result('none');
      }
      const remote = isObject(value) && value.v === 1 && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && unpackState(value.json);
      if (!remote) { broken = true; return result('broken'); }
      broken = false;
      stateKnown = true;
      remoteRev = value.updatedAt;
      if (!recovering && !retryChunks && value.updatedAt === meta.seenRev && recordOf(store)) return result('ok');
      const reset = recovering;
      const dirtyBefore = meta.dirty;
      if (!reset) capture(store);
      const started = generation;
      const listing = await request('log/' + encodeURIComponent(uid), 'GET', token, undefined, true);
      if (listing.status !== 'ok') return result(listing.status);
      if (listing.value !== null && !isObject(listing.value)) return result('broken');
      const additions = { h: [], x: [] };
      const seen = [];
      let incomplete = false;
      // 入れ物だけが壊れて退避された場合は、取りこみ済みの印があっても全履歴を復元する。
      const knownChunks = !reset && recordOf(store) ? meta.chunks : [];
      for (const id of Object.keys(listing.value || {})) {
        if (!CHUNK_ID.test(id) || knownChunks.includes(id)) continue;
        const res = await request('log/' + encodeURIComponent(uid) + '/' + id, 'GET', token);
        if (res.status === 'offline' || res.status === 'denied') return result(res.status);
        const chunk = res.status === 'ok' && unpackChunk(res.value);
        if (!chunk) { incomplete = true; continue; }
        // 送信の返事だけ失われた自分のかたまりは、履歴へ二重に足さない。
        if (!reset && meta.sending && meta.sending.id === id) {
          if (packChunk(meta.sending.h, meta.sending.x) !== res.value) return result('denied');
        } else { additions.h = additions.h.concat(chunk.h); additions.x = additions.x.concat(chunk.x); }
        seen.push(id);
      }
      const local = recordOf(store);
      const profileDirty = dirtyBefore || generation !== started;
      if (reset) {
        meta = emptyMeta();
        recovering = false;
      } else capture(store);
      const combined = Object.assign({}, local || {}, {
        history: dedupe('h', (reset ? [] : local ? objects(local.history) : []).concat(additions.h)),
        xpLog: dedupe('x', (reset ? [] : local ? objects(local.xpLog) : []).concat(additions.x)),
      });
      const sort = (list) => list.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
      sort(combined.history); sort(combined.xpLog);
      const rec = mergeRecord(combined, remote.record, { levelFor });
      const localProfile = store.profiles.find((p) => p.id === store.currentProfileId);
      const profile = local && localProfile ? Object.assign({}, profileDirty ? localProfile : remote.profile, { id: localProfile.id }) : copy(remote.profile);
      // 印が違うときは、受け取った時刻が新しい方の印と生徒が選んだ単元を残す。
      if (local && localProfile && profileDirty) {
        const localApplied = typeof localProfile.classUnitApplied === 'string' ? localProfile.classUnitApplied : undefined;
        const remoteApplied = typeof remote.profile.classUnitApplied === 'string' ? remote.profile.classUnitApplied : undefined;
        const appliedAt = (p) => Number.isFinite(p.classUnitAppliedAt) && p.classUnitAppliedAt >= 0
          ? p.classUnitAppliedAt : undefined;
        const localAt = appliedAt(localProfile);
        const remoteAt = appliedAt(remote.profile);
        if (localApplied === remoteApplied) {
          if (localAt !== undefined || remoteAt !== undefined) profile.classUnitAppliedAt = Math.max(localAt || 0, remoteAt || 0);
        } else if ((remoteAt || 0) > (localAt || 0)) {
          if (remoteApplied === undefined) delete profile.classUnitApplied; else profile.classUnitApplied = remoteApplied;
          profile.classUnitAppliedAt = remoteAt;
          if (Object.prototype.hasOwnProperty.call(remote.profile, 'unitId')) profile.unitId = remote.profile.unitId;
        }
      }
      const next = { version: 1, currentProfileId: profile.id, profiles: [profile], records: { [profile.id]: rec }, sync: meta };
      meta.chunks = [...new Set(knownChunks.concat(seen))];
      if (meta.sending && seen.includes(meta.sending.id)) meta.sending = null;
      meta.len = { h: rec.history.length, x: rec.xpLog.length };
      // 読めないかたまりがあれば、同じ版でも次に取り直す。
      meta.seenRev = incomplete ? null : value.updatedAt;
      retryChunks = incomplete;
      meta.dirty = dirtyBefore || generation !== started + (!reset && local ? 1 : 0) || packState(profile, rec) !== packState(remote.profile, remote.record);
      if (!persist(next)) meta.dirty = true;
      return result('ok', next);
    }

    function prepareChunk(store) {
      ['h', 'x'].forEach((k) => addPending(k, []));
      if (meta.sending) return persist(store) ? 'ok' : 'offline';
      const chunk = { h: [], x: [] };
      let size = packChunk([], []).length;
      for (const k of ['h', 'x']) {
        for (const entry of meta.pending[k]) {
          const extra = JSON.stringify(entry).length + (chunk[k].length ? 1 : 0);
          if (size + extra > config.chunkMaxChars) break;
          size += extra;
          chunk[k].push(entry);
        }
      }
      if (!chunk.h.length && !chunk.x.length) return 'too-big';
      const suffix = random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 12).padEnd(12, '0');
      const id = (now().toString(36) + '_' + suffix + '_' + (++sequence).toString(36)).slice(0, 40);
      meta.sending = { id, h: chunk.h, x: chunk.x };
      const pending = meta.pending;
      meta.pending = { h: pending.h.slice(chunk.h.length), x: pending.x.slice(chunk.x.length) };
      if (!persist(store)) {
        meta.sending = null;
        meta.pending = pending;
        return 'offline';
      }
      return 'ok';
    }

    async function doPush(store) {
      let changed = false;
      const result = (status) => ({ status, store, changed });
      const refresh = async () => {
        const pulled = await doPull(store);
        if (pulled.changed) {
          // 通信待ちの間も、アプリの保存先を統合後の入れ物と一致させる。
          Object.assign(store, pulled.store);
          changed = true;
        }
        return pulled.status;
      };
      if (broken) return result('broken');
      init(store);
      if (recovering) {
        const status = await refresh();
        if (!['ok', 'none'].includes(status)) return result(status);
      }
      if (!recordOf(store) || !isDirty()) return result('ok');
      const token = await tokenForUser();
      if (!token) return result('offline');
      for (let i = 0; i < 20 && hasPending(); i++) {
        const prepared = prepareChunk(store);
        if (prepared !== 'ok') return result(prepared);
        const sending = meta.sending;
        const body = packChunk(sending.h, sending.x);
        const path = 'log/' + encodeURIComponent(uid) + '/' + sending.id;
        let res = await request(path, 'PUT', token, body);
        if (res.status === 'denied') {
          const existing = await request(path, 'GET', token);
          if (existing.status === 'offline') return result('offline');
          if (existing.status !== 'ok' || existing.value !== body) return result('denied');
          res = { status: 'ok' };
        }
        if (res.status !== 'ok') return result(res.status);
        if (!meta.chunks.includes(sending.id)) meta.chunks.push(sending.id);
        meta.sending = null;
        persist(store);
      }
      // 全かたまりを送ってから state の版を進める（残りは次の push）。
      if (hasPending()) return result('ok');
      if (meta.dirty && meta.seenRev === null && (!stateKnown || remoteRev !== null)) {
        const status = await refresh();
        if (!['ok', 'none'].includes(status)) return result(status);
      }
      for (let attempt = 0; meta.dirty; attempt++) {
        // 読み直し中に増えた履歴は、次の push で先に送る。
        if (hasPending()) return result('ok');
        const profile = store.profiles.find((p) => p.id === store.currentProfileId);
        const json = packState(profile, recordOf(store));
        if (json.length > config.stateMaxChars) return result('too-big');
        const version = generation;
        const base = meta.seenRev === null ? remoteRev : meta.seenRev;
        const updatedAt = Math.max(now(), number(base) + 1);
        const body = { v: 1, updatedAt, json };
        if (base !== null) body.base = base;
        const res = await request('state/' + encodeURIComponent(uid), 'PUT', token, body);
        if (res.status === 'denied') {
          const status = await refresh();
          if (!['ok', 'none'].includes(status)) return result(status);
          if (remoteRev === base) return result('denied');
          meta.dirty = true;
          if (attempt >= 2) return result('offline');
          continue;
        }
        if (res.status !== 'ok') return result(res.status);
        remoteRev = updatedAt;
        stateKnown = true;
        meta.seenRev = retryChunks ? null : updatedAt;
        if (generation === version) meta.dirty = false;
        if (!persist(store)) { meta.dirty = true; return result('offline'); }
        break;
      }
      return result('ok');
    }

    function enqueue(fn, fallback) {
      const job = tail.then(fn).catch(() => fallback());
      tail = job.then(() => {});
      return job;
    }
    function pull(store) {
      if (!pulling) pulling = enqueue(() => doPull(store), () => ({ status: 'offline', store, changed: false })).then((r) => { pulling = null; return r; });
      return pulling;
    }
    function push(store) {
      if (!pushing) pushing = enqueue(() => doPush(store), () => ({ status: 'offline', store, changed: false })).then((r) => { pushing = null; return r; });
      return pushing;
    }
    return { capture, pendingCount, isDirty, pull, push };
  }

  const api = { entryKey, dedupe, packState, unpackState, packChunk, unpackChunk, mergeRecord, validMeta, createSync };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { sync: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
