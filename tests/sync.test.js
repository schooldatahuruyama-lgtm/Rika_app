// tests/sync.test.js — 通信・保存場所を偽物にして、再送と端末間の統合を確かめる
const test = require('node:test'); const assert = require('node:assert/strict');
const S = require('../js/sync.js'); const R = require('../js/record.js');
const CONFIG = Object.assign({}, require('../js/config.js').link, { dbUrl: 'https://sync.example.invalid', timeoutMs: 30 });
const UID = 'test-user'; const TOKEN = 'test-token+&secret';
const clone = (v) => JSON.parse(JSON.stringify(v));
const levelFor = (xp) => 1 + Math.floor(xp / 100);
const response = (status, value) => ({ status, json: async () => clone(value) });
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function storage() {
  const data = new Map();
  return { data, getItem: (k) => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
function store(rec) { return { version: 1, currentProfileId: 'p-test', profiles: [{ id: 'p-test', nickname: 'テスト', avatar: 'fox' }], records: { 'p-test': rec || R.createRecord() } }; }
function rec(s) { return s.records[s.currentProfileId]; }
function db() {
  const data = { state: null, chunks: {} }; const calls = [];
  const fetch = async (url, init) => {
    const u = new URL(url);
    assert.equal(u.origin, CONFIG.dbUrl);
    assert.equal(u.searchParams.get('auth'), TOKEN);
    assert.equal(init.redirect, 'error');
    assert.ok(!JSON.stringify(init).includes(TOKEN));
    calls.push({ path: u.pathname, method: init.method, body: init.body });
    const state = u.pathname === '/rika/state/' + UID + '.json';
    const id = u.pathname.split('/').at(-1).replace('.json', '');
    if (init.method === 'PUT') {
      if (state) {
        const next = JSON.parse(init.body);
        if (data.state && (next.base !== data.state.updatedAt || next.updatedAt <= data.state.updatedAt)) return response(403, null);
        if (!data.state) assert.equal(Object.hasOwn(next, 'base'), false);
        data.state = next;
      }
      else {
        assert.match(id, /^[A-Za-z0-9_-]{16,40}$/);
        if (data.chunks[id] !== undefined) return response(403, null);
        data.chunks[id] = JSON.parse(init.body);
        assert.equal(typeof data.chunks[id], 'string');
      }
      return response(200, null);
    }
    if (state) return response(200, data.state);
    if (u.searchParams.get('shallow') === 'true') return response(200, Object.fromEntries(Object.keys(data.chunks).map((k) => [k, true])));
    return response(200, data.chunks[id] === undefined ? null : data.chunks[id]);
  };
  return { data, calls, fetch };
}
let clock = 100000;
function fixture(options = {}) {
  const database = options.db || db(); const local = options.storage || storage(); const current = options.store || store();
  local.setItem(CONFIG.acctKeyPrefix + UID, JSON.stringify(current));
  let latest = current;
  const client = S.createSync({ store: current, save: (next) => { latest = next; if (options.save) return options.save(next); local.setItem(CONFIG.acctKeyPrefix + UID, JSON.stringify(next)); return true; }, uid: options.uid || UID, storage: local, config: Object.assign({}, CONFIG, options.config),
    link: options.link || { getToken: async () => TOKEN, savedUid: () => UID },
    fetch: options.fetch || database.fetch, now: options.now || (() => ++clock), random: options.random || (() => 0.123456789), levelFor });
  return { client, db: database, storage: local, store: current, meta: () => latest.sync };
}
function learn(s, id, at, amount = 25) {
  const r = rec(s);
  r.history.push({ at, problemId: id }); r.xpLog.push({ at, amount, kind: 'correct' });
  r.xp += amount; r.level = levelFor(r.xp);
  r.stages[id] = { status: 'cleared', stars: 2, attempts: 1, resume: null };
}

test('entryKey: 空でない文字列の eid だけを使い、不正な eid は null', () => {
  for (const kind of ['h', 'x']) {
    assert.equal(S.entryKey(kind, { eid: 'event-1' }), kind + ':event-1');
    assert.equal(S.entryKey(kind, { eid: 'event-1', at: 'different', amount: 50 }), kind + ':event-1');
    assert.notEqual(S.entryKey(kind, { eid: 'event-1' }), S.entryKey(kind, { eid: 'event-2' }));
    for (const eid of [undefined, null, '', 0, 1, true, [], {}]) assert.equal(S.entryKey(kind, { eid }), null);
    for (const entry of [null, undefined, [], 1, {}]) assert.equal(S.entryKey(kind, entry), null);
  }
  assert.notEqual(S.entryKey('h', { eid: 'same' }), S.entryKey('x', { eid: 'same' }));
});

test('dedupe: 最初の項目と順序を保ち、項目のない記録も落とさない', () => {
  for (const kind of ['h', 'x']) {
    const first = { eid: 'first', at: 'a', extra: 'first' }; const second = { eid: 'second', at: 'a' };
    const missing = [{ at: 'a' }, { at: 'a' }, { eid: '' }, { eid: '' }, { eid: 1 }, { eid: 1 }];
    const list = [first, second, { eid: 'first', at: 'b', extra: 'last' }, ...missing];
    assert.deepEqual(S.dedupe(kind, list), [first, second, ...missing]);
    assert.equal(S.dedupe(kind, list)[0], first); assert.equal(list.length, 9);
    assert.deepEqual(S.dedupe(kind, []), []);
  }
});

test('mergeRecord: 重複を除いてから経験値とレベルを計算する。同じ記録・リモートなしでも同じ', () => {
  const f = fixture(); const s = f.store; learn(s, 'a', 'a', 75); learn(s, 'b', 'b', 50); f.client.capture(s);
  const a = rec(s); a.history.push(clone(a.history[0])); a.xpLog.push(clone(a.xpLog[0])); a.xp = 200;
  for (const remote of [R.createRecord(), clone(a), null]) {
    const merged = S.mergeRecord(a, remote, { levelFor });
    assert.equal(merged.history.length, 2); assert.equal(merged.xpLog.length, 2);
    assert.equal(merged.xp, 125); assert.equal(merged.level, 2);
  }
  assert.equal(a.history.length, 3); assert.equal(a.xp, 200);
});

test('capture: pending・sending にある項目を含む記録でも送信待ちは増えない', () => {
  for (const sending of [false, true]) {
    const f = fixture(); learn(f.store, 'a', 'a'); f.client.capture(f.store);
    if (sending) { f.store.sync.sending = { id: 'chunk_test', ...clone(f.store.sync.pending) }; f.store.sync.pending = { h: [], x: [] }; }
    rec(f.store).history.push(clone(rec(f.store).history[0])); rec(f.store).xpLog.push(clone(rec(f.store).xpLog[0]));
    f.store.sync.len = { h: 0, x: 0 }; f.client.capture(f.store); f.client.capture(f.store);
    assert.equal(f.client.pendingCount(), 1); assert.equal(f.store.sync.pending.x.length, sending ? 0 : 1);
    learn(f.store, 'b', 'b'); f.client.capture(f.store);
    assert.equal(f.client.pendingCount(), 2); assert.equal(f.store.sync.pending.x.length, sending ? 1 : 2);
  }
});

test('capture: 同時刻の項目にも別の eid を付け、記録・pending・保存後で一致し、付け直さない', () => {
  for (const random of [0, 0.5, 0.123456789]) {
    const f = fixture({ now: () => 123456, random: () => random });
    for (let i = 0; i < 3; i++) learn(f.store, 'p' + i, 'same');
    rec(f.store).history[0].eid = ''; rec(f.store).xpLog[0].eid = 123;
    rec(f.store).history.push({ eid: 'existing', at: 'same' });
    f.client.capture(f.store);
    const entries = rec(f.store).history.concat(rec(f.store).xpLog);
    const ids = entries.map((entry) => entry.eid);
    assert.equal(new Set(ids).size, 7); assert.equal(rec(f.store).history[3].eid, 'existing');
    for (const eid of ids.filter((id) => id !== 'existing')) assert.match(eid, /^2n9c_[a-z0-9]{10,}_[a-z0-9]+$/);
    for (const [kind, field] of [['h', 'history'], ['x', 'xpLog']]) {
      assert.deepEqual(f.store.sync.pending[kind].map((entry) => entry.eid), rec(f.store)[field].map((entry) => entry.eid));
      assert.notEqual(f.store.sync.pending[kind][0], rec(f.store)[field][0]);
    }
    f.client.capture(f.store); assert.deepEqual(entries.map((entry) => entry.eid), ids);
    assert.equal(f.store.sync.pending.h.length, 4); assert.equal(f.store.sync.pending.x.length, 3);
    const saved = clone(f.store);
    assert.deepEqual(saved.records['p-test'].history.map((entry) => entry.eid), saved.sync.pending.h.map((entry) => entry.eid));
    assert.deepEqual(saved.records['p-test'].xpLog.map((entry) => entry.eid), saved.sync.pending.x.map((entry) => entry.eid));
  }
});

test('ライブクイズ: 同時刻・stageId null の3問分の answer・correct を同期してもすべて残る', async () => {
  const f = fixture(); const at = '2026-11-19T12:00:00.000Z';
  for (let i = 0; i < 3; i++) {
    rec(f.store).history.push({ at, stageId: null, problemId: 'p' + i });
    for (const [kind, amount] of [['answer', 5], ['correct', 25]]) rec(f.store).xpLog.push({ at, stageId: null, kind, amount });
  }
  rec(f.store).xp = 90;
  f.client.capture(f.store); assert.equal(new Set(rec(f.store).xpLog.map((entry) => entry.eid)).size, 6);
  assert.equal((await f.client.push(f.store)).status, 'ok');
  const fresh = fixture({ db: f.db, store: R.createStore() });
  // 元の端末も、版が進んで再集計する道を通す。
  f.db.data.state.updatedAt++;
  for (const current of [fresh, f]) {
    const pulled = await current.client.pull(current.store); assert.equal(pulled.status, 'ok'); assert.equal(pulled.changed, true);
    const record = rec(pulled.store);
    assert.equal(record.history.length, 3); assert.equal(record.xpLog.length, 6); assert.equal(record.xp, 90);
    for (const kind of ['answer', 'correct']) assert.equal(record.xpLog.filter((entry) => entry.kind === kind).length, 3);
  }
});

test('古い形: eid が無い・不正な項目は、同じ内容でもかたまり間で落とさない', async () => {
  const f = fixture({ store: R.createStore() }); const remote = store();
  f.db.data.state = { v: 1, updatedAt: 1, json: S.packState(remote.profiles[0], rec(remote)) };
  const h = [undefined, '', 1].map((eid) => ({ eid, at: 'same', problemId: 'same' }));
  const x = [undefined, '', 1].map((eid) => ({ eid, at: 'same', kind: 'answer', amount: 5, stageId: null }));
  for (const id of ['chunk_legacy1', 'chunk_legacy2']) f.db.data.chunks[id] = S.packChunk(h, x);
  let pulled = await f.client.pull(f.store);
  assert.equal(rec(pulled.store).history.length, 6); assert.equal(rec(pulled.store).xpLog.length, 6); assert.equal(rec(pulled.store).xp, 30);
  f.db.data.state.updatedAt++; pulled = await f.client.pull(pulled.store);
  assert.equal(rec(pulled.store).xpLog.length, 6); assert.equal(rec(pulled.store).xp, 30);
  assert.deepEqual(pulled.store.sync.pending, { h: [], x: [] });
  assert.ok(rec(pulled.store).xpLog.every((entry) => S.entryKey('x', entry) === null));
});

test('古い pending・sending: eid のない項目を内容で落とさず、len の範囲は再取りこみしない', async () => {
  const seed = fixture();
  learn(seed.store, 'same', 'same'); learn(seed.store, 'same', 'same'); seed.client.capture(seed.store);
  for (const list of [rec(seed.store).history, rec(seed.store).xpLog, seed.store.sync.pending.h, seed.store.sync.pending.x]) {
    list.forEach((entry) => { delete entry.eid; });
  }
  seed.store.sync.sending = { id: 'chunk_legacy0001', h: [seed.store.sync.pending.h.shift()], x: [seed.store.sync.pending.x.shift()] };
  const f = fixture({ store: clone(seed.store) }); f.client.capture(f.store);
  assert.equal(f.client.pendingCount(), 2); assert.ok(rec(f.store).history.every((entry) => !entry.eid));
  assert.equal((await f.client.push(f.store)).status, 'ok');
  const chunks = Object.values(f.db.data.chunks).map(S.unpackChunk);
  assert.equal(chunks.length, 2); assert.equal(chunks.flatMap((c) => c.h).length, 2); assert.equal(chunks.flatMap((c) => c.x).length, 2);
});

test('prepareChunk: 保存済みの pending の重複と sending との重なりを除き、sending の本文は変えない', async () => {
  for (const sending of [false, true]) {
    const seed = fixture(); learn(seed.store, 'a', 'a'); seed.client.capture(seed.store);
    const pending = seed.store.sync.pending;
    if (sending) seed.store.sync.sending = { id: 'chunk_existing01', ...clone(pending) };
    pending.h.push(clone(pending.h[0])); pending.x.push(clone(pending.x[0]));
    const f = fixture({ store: clone(seed.store) });
    assert.equal((await f.client.push(f.store)).status, 'ok');
    const chunks = Object.values(f.db.data.chunks).map(S.unpackChunk);
    assert.equal(chunks.length, 1); assert.equal(chunks[0].h.length, 1); assert.equal(chunks[0].x.length, 1);
    if (sending) assert.deepEqual(Object.keys(f.db.data.chunks), ['chunk_existing01']);
  }
});

test('2 タブ: 同じ pending を別 id で送っても、両タブと新しい端末で履歴・経験値を二重にしない', async () => {
  const database = db(); const seed = fixture({ db: database });
  seed.client.capture(seed.store); await seed.client.push(seed.store);
  learn(seed.store, 'a', 'a'); learn(seed.store, 'b', 'b', 40); seed.client.capture(seed.store);
  const a = fixture({ db: database, store: clone(seed.store) }); const b = fixture({ db: database, store: clone(seed.store) });
  assert.equal((await a.client.push(a.store)).status, 'ok');
  const pushed = await b.client.push(b.store); assert.equal(pushed.status, 'ok'); assert.equal(pushed.changed, true);
  const ids = Object.keys(database.data.chunks); assert.equal(ids.length, 2);
  assert.deepEqual(S.unpackChunk(database.data.chunks[ids[0]]), S.unpackChunk(database.data.chunks[ids[1]]));
  const fresh = fixture({ db: database, store: R.createStore() });
  for (const f of [a, b, fresh]) {
    f.store = (await f.client.pull(f.store)).store;
    assert.equal(rec(f.store).history.length, 2); assert.equal(rec(f.store).xpLog.length, 2); assert.equal(rec(f.store).xp, 65);
    assert.deepEqual(rec(f.store).history.map((e) => e.problemId), ['a', 'b']);
  }
  assert.equal(S.unpackState(database.data.state.json).record.xp, 65);
  assert.equal(Object.keys(database.data.chunks).length, 2);
});

test('packState と unpackState: 履歴を除いて往復し、不正な値を拒む', () => {
  const s = store(); learn(s, 'a', '2026-11-19');
  s.sync = { private: true }; rec(s).sync = { private: true };
  const text = S.packState(s.profiles[0], rec(s)); const unpacked = S.unpackState(text);
  assert.deepEqual(unpacked.profile, s.profiles[0]);
  assert.equal(Object.hasOwn(unpacked.record, 'history'), false); assert.equal(Object.hasOwn(unpacked.record, 'xpLog'), false);
  assert.equal(text.includes('sync'), false);
  assert.equal(rec(s).history.length, 1);
  for (const bad of [null, {}, 'bad', 'null', '[]', '1', '{}', '{"profile":{"id":1},"record":{}}', '{"profile":{"id":"p"},"record":[]}']) assert.equal(S.unpackState(bad), null);
});
test('packChunk と unpackChunk: 往復、不正な本文・項目', () => {
  const h = [{ at: 'a', eid: 'history-1' }]; const x = [{ amount: 20, eid: 'xp-1' }];
  assert.deepEqual(S.unpackChunk(S.packChunk(h, x)), { h, x });
  assert.deepEqual(S.unpackChunk('{"h":[{},null,1,[]],"x":false}'), { h: [{}], x: [] });
  for (const bad of [null, {}, 'bad', 'null', '[]', 'false']) assert.equal(S.unpackChunk(bad), null);
});
test('mergeRecord: 表の各項目と未知の項目、元の記録を変更しない', () => {
  const a = R.createRecord(); const b = R.createRecord();
  a.history = [{ at: 'a' }]; a.xpLog = [{ amount: 75 }, { amount: 50 }]; a.xp = 125; a.level = 2;
  a.stages = { s: { status: 'inprogress', stars: 1, attempts: 3, resume: { a: 1 } }, t: { status: 'inprogress', stars: 0, attempts: 1, resume: { a: 1 } } };
  b.stages = { s: { status: 'cleared', stars: 3, attempts: 1, resume: { b: 1 } }, t: { status: 'none', stars: 0, attempts: 2, resume: { b: 1 } }, u: { status: 'inprogress', stars: 0, attempts: 1, resume: { b: 1 } } };
  a.mastery = { newer: { lastAt: '2026-02-02', value: 0.2 }, tie: { lastAt: '2026-02-01', value: 0.8 }, absent: { value: 0.3 } };
  b.mastery = { newer: { lastAt: '2026-02-01', value: 0.9 }, tie: { lastAt: '2026-02-01', value: 0.4 }, absent: { lastAt: '2026-02-03', value: 0.9 } };
  a.lessonsRead = { a: true, b: false }; b.lessonsRead = { b: true, c: true };
  a.reviewDone = { a: '2026-02-02' }; b.reviewDone = { a: '2026-02-01', b: '2026-02-03' };
  a.badges = { a: { seen: true } }; b.badges = { a: { seen: false }, b: { seen: false } };
  a.liveResults = [{ code: 'same', rank: 1 }]; b.liveResults = [{ code: 'same', rank: 2 }, { code: 'new', rank: 3 }];
  a.streak = { lastDate: '2026-02-02', count: 2 }; b.streak = { lastDate: '2026-02-01', count: 10 };
  a.extra = { a: 1 }; b.extra = { b: 1 }; b.other = 'kept';
  const before = clone([a, b]); const m = S.mergeRecord(a, b, { levelFor });
  assert.equal(m.xp, 125); assert.equal(m.level, 2); assert.deepEqual(m.history, a.history); assert.deepEqual(m.xpLog, a.xpLog);
  assert.deepEqual(m.stages.s, { status: 'cleared', stars: 3, attempts: 3, resume: null });
  assert.deepEqual(m.stages.t.resume, { a: 1 }); assert.deepEqual(m.stages.u.resume, { b: 1 });
  assert.deepEqual(m.mastery, { newer: a.mastery.newer, tie: a.mastery.tie, absent: b.mastery.absent });
  assert.deepEqual(m.lessonsRead, { a: true, b: true, c: true }); assert.deepEqual(m.reviewDone, { a: '2026-02-02', b: '2026-02-03' });
  assert.deepEqual(m.badges, { a: { seen: true }, b: { seen: false } }); assert.deepEqual(m.liveResults, [a.liveResults[0], b.liveResults[1]]);
  assert.deepEqual(m.streak, a.streak); assert.deepEqual(m.extra, a.extra); assert.equal(m.other, 'kept');
  assert.deepEqual([a, b], before); m.extra.a = 2; assert.equal(a.extra.a, 1);
  assert.deepEqual(S.mergeRecord(a, a, { levelFor }), a); assert.deepEqual(S.mergeRecord(a, null, { levelFor }), a);
  b.streak.lastDate = a.streak.lastDate; assert.equal(S.mergeRecord(a, b, { levelFor }).streak.count, 10);
  a.xpLog = []; b.xp = 200; assert.equal(S.mergeRecord(a, b, { levelFor }).xp, 200);
});
test('mergeRecord: 衝突しない stages・mastery・lessonsRead・badges は順序を入れかえても同じ', () => {
  const a = R.createRecord(); const b = R.createRecord();
  a.stages.s = { status: 'inprogress', stars: 1, attempts: 2, resume: null };
  b.stages.s = { status: 'cleared', stars: 3, attempts: 1, resume: null };
  a.mastery.c = { lastAt: '2026-01-01', value: 0.2 }; b.mastery.c = { lastAt: '2026-01-02', value: 0.5 };
  a.lessonsRead.a = true; b.lessonsRead.b = true; a.badges.a = {}; b.badges.b = {};
  const x = S.mergeRecord(a, b, { levelFor }); const y = S.mergeRecord(b, a, { levelFor });
  for (const field of ['stages', 'mastery', 'lessonsRead', 'badges']) assert.deepEqual(x[field], y[field]);
});
test('capture: 増えた分だけ、繰り返しても二重にしない。短くなったら長さだけ合わせる', () => {
  const f = fixture(); learn(f.store, 'a', 'a'); f.client.capture(f.store); f.client.capture(f.store);
  assert.equal(f.client.pendingCount(), 1); assert.equal(f.meta().pending.x.length, 1);
  rec(f.store).history = []; rec(f.store).xpLog = []; f.client.capture(f.store);
  assert.deepEqual(f.meta().len, { h: 0, x: 0 }); assert.equal(f.client.pendingCount(), 1);
});
test('pull: none、更新なしの ok、各失敗で元の store を返す', async () => {
  const f = fixture(); assert.deepEqual(await f.client.pull(f.store), { status: 'none', store: f.store, changed: false });
  f.db.data.state = { v: 1, updatedAt: 7, json: S.packState(f.store.profiles[0], rec(f.store)) };
  const first = await f.client.pull(f.store); assert.equal(first.changed, true);
  const count = f.db.calls.length; const again = await f.client.pull(first.store);
  assert.equal(again.status, 'ok'); assert.equal(again.changed, false); assert.equal(f.db.calls.length, count + 1);
  for (const [http, status] of [[500, 'offline'], [401, 'denied'], [403, 'denied']]) {
    const x = fixture({ fetch: async () => response(http, null) }); const r = await x.client.pull(x.store);
    assert.equal(r.status, status); assert.equal(r.store, x.store); assert.equal(r.changed, false);
  }
  assert.equal((await fixture({ link: { getToken: async () => null } }).client.pull(store())).status, 'offline');
  assert.equal((await fixture({ fetch: async () => { throw new Error(TOKEN); } }).client.pull(store())).status, 'offline');
});
test('pull: state が壊れていたら broken、後の push は通信せず、正常な pull で復旧', async () => {
  for (const value of [{}, [], { v: 2, updatedAt: 1, json: '{}' }, { v: 1, updatedAt: '1', json: '{}' }, { v: 1, updatedAt: 1, json: 'bad' }]) {
    const f = fixture(); f.db.data.state = value;
    assert.equal((await f.client.pull(f.store)).status, 'broken');
    f.client.capture(f.store); const calls = f.db.calls.length;
    assert.equal((await f.client.push(f.store)).status, 'broken'); assert.equal(f.db.calls.length, calls);
    f.db.data.state = null; assert.equal((await f.client.pull(f.store)).status, 'none'); assert.equal((await f.client.push(f.store)).status, 'ok');
  }
});
test('pull: 未取得のかたまりを安定した日時順で統合し、二重に取りこまない', async () => {
  const f = fixture(); learn(f.store, 'local', '2026-03-02'); f.client.capture(f.store);
  f.db.data.state = { v: 1, updatedAt: 1, json: S.packState({ id: 'remote', nickname: '別の表示' }, R.createRecord()) };
  f.db.data.chunks.chunk_0001 = S.packChunk([{ at: '2026-03-01', problemId: 'early' }, { at: '2026-03-02', problemId: 'tie' }], [{ at: '2026-03-01', amount: 10 }]);
  const r = await f.client.pull(f.store);
  assert.deepEqual(rec(r.store).history.map((e) => e.problemId), ['early', 'local', 'tie']); assert.equal(rec(r.store).xp, 35);
  assert.equal(r.store.profiles[0].nickname, 'テスト'); assert.equal(r.store.currentProfileId, 'p-test');
  assert.equal(f.meta().pending.h.length, 1); assert.equal(f.meta().len.h, 3);
  f.db.data.state.updatedAt++;
  const again = await f.client.pull(r.store); assert.equal(rec(again.store).history.length, 3);
  assert.equal(f.meta().pending.h.length, 1);
});
test('pull: 未編集のプロフィールはリモートを使い、id は端末のまま。初回はリモートの id', async () => {
  const f = fixture(); f.store.profiles[0].unitId = 'force'; f.store.profiles[0].classUnitApplied = 'force';
  f.store.profiles[0].classUnitAppliedAt = 200;
  f.db.data.state = { v: 1, updatedAt: 3, json: S.packState({ id: 'remote', nickname: 'リモート', unitId: 'sound', classUnitApplied: 'light', classUnitAppliedAt: 100 }, R.createRecord()) };
  const r = await f.client.pull(f.store); assert.equal(r.store.profiles[0].nickname, 'リモート'); assert.equal(r.store.currentProfileId, 'p-test');
  assert.equal(r.store.profiles[0].unitId, 'sound'); assert.equal(r.store.profiles[0].classUnitApplied, 'light');
  assert.equal(r.store.profiles[0].classUnitAppliedAt, 100);
  const fresh = fixture({ db: f.db, store: R.createStore() }); const first = await fresh.client.pull(fresh.store);
  assert.equal(first.store.currentProfileId, 'remote');
  assert.equal(first.store.profiles[0].unitId, 'sound'); assert.equal(first.store.profiles[0].classUnitApplied, 'light');
  assert.equal(first.store.profiles[0].classUnitAppliedAt, 100);
});
for (const sample of [
  { name: '印が違って端末が新しい', local: { classUnitApplied: 'force', classUnitAppliedAt: 200, unitId: 'sound' },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'light' }, expected: {} },
  { name: '印が違ってリモートが新しい', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 200, unitId: 'sound' }, expected: { classUnitApplied: 'light', classUnitAppliedAt: 200, unitId: 'sound' } },
  { name: '印が違って時刻が同じ', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: '印が違って両方とも時刻なし', local: { classUnitApplied: 'force' },
    remote: { classUnitApplied: 'light', unitId: 'sound' }, expected: {} },
  { name: '印が違ってリモートの時刻なし', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', unitId: 'sound' }, expected: {} },
  { name: '時刻なしと0は同じ', local: { classUnitApplied: 'force' },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 0, unitId: 'sound' }, expected: {} },
  { name: '時刻0より1が新しい', local: { classUnitApplied: 'force', classUnitAppliedAt: 0 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 1, unitId: 'sound' }, expected: { classUnitApplied: 'light', classUnitAppliedAt: 1, unitId: 'sound' } },
  { name: '端末に印がない', local: {}, remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' },
    expected: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' } },
  { name: '端末は印なしで時刻だけ新しい', local: { classUnitAppliedAt: 300, unitId: 'sound' },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'light' }, expected: {} },
  { name: '端末は印なしでリモートの時刻が新しい', local: { classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 300, unitId: 'sound' }, expected: { classUnitApplied: 'light', classUnitAppliedAt: 300, unitId: 'sound' } },
  { name: '端末は印なしで時刻が同じ', local: { classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: '端末に印なしでリモートは時刻なし', local: {}, remote: { classUnitApplied: 'light', unitId: 'sound' }, expected: {} },
  { name: 'リモートに印がない', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 }, remote: { unitId: 'sound' }, expected: {} },
  { name: 'リモートは印なしで時刻だけ新しい', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitAppliedAt: 300, unitId: 'sound' }, expected: { classUnitApplied: undefined, classUnitAppliedAt: 300, unitId: 'sound' } },
  { name: 'リモートは印なしで端末の時刻が新しい', local: { classUnitApplied: 'force', classUnitAppliedAt: 300 },
    remote: { classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: 'リモートは印なしで時刻が同じ', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: 'リモートは印なしで時刻だけ新しく単元がない', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitAppliedAt: 300 }, expected: { classUnitApplied: undefined, classUnitAppliedAt: 300 } },
  { name: '両方とも印なし', local: {}, remote: { unitId: 'sound' }, expected: {} },
  { name: '両方とも印なしでリモートに時刻だけある', local: {}, remote: { classUnitAppliedAt: 300, unitId: 'sound' }, expected: { classUnitAppliedAt: 300 } },
  { name: '両方とも印なしで端末に時刻だけある', local: { classUnitAppliedAt: 300 }, remote: { unitId: 'sound' }, expected: {} },
  { name: '両方とも印なしで端末の時刻が新しい', local: { classUnitAppliedAt: 300 },
    remote: { classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: '両方とも印なしでリモートの時刻が新しい', local: { classUnitAppliedAt: 100 },
    remote: { classUnitAppliedAt: 300, unitId: 'sound' }, expected: { classUnitAppliedAt: 300 } },
  { name: '両方とも印なしで時刻が同じ', local: { classUnitAppliedAt: 300 },
    remote: { classUnitAppliedAt: 300, unitId: 'sound' }, expected: {} },
  { name: '両方とも印なしでリモートだけ時刻0', local: {}, remote: { classUnitAppliedAt: 0, unitId: 'sound' }, expected: { classUnitAppliedAt: 0 } },
  { name: '印が同じで端末が新しい', local: { classUnitApplied: 'light', classUnitAppliedAt: 200 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: '印が同じでリモートが新しい', local: { classUnitApplied: 'light', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 200, unitId: 'sound' }, expected: { classUnitAppliedAt: 200 } },
  { name: '印も時刻も同じ', local: { classUnitApplied: 'light', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' }, expected: {} },
  { name: '印が同じで両方とも時刻なし', local: { classUnitApplied: 'light' }, remote: { classUnitApplied: 'light', unitId: 'sound' }, expected: {} },
  { name: '印が同じで端末だけ時刻あり', local: { classUnitApplied: 'light', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', unitId: 'sound' }, expected: {} },
  { name: '印が同じでリモートだけ時刻あり', local: { classUnitApplied: 'light' },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 200, unitId: 'sound' }, expected: { classUnitAppliedAt: 200 } },
  { name: 'リモートに単元がない', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: 'light', classUnitAppliedAt: 200 }, expected: { classUnitApplied: 'light', classUnitAppliedAt: 200 } },
  { name: 'リモートの印が空文字列', local: { classUnitApplied: 'force', classUnitAppliedAt: 100 },
    remote: { classUnitApplied: '', classUnitAppliedAt: 200, unitId: 'sound' }, expected: { classUnitApplied: '', classUnitAppliedAt: 200, unitId: 'sound' } },
  ...[null, 1, true, [], {}].map((value) => ({ name: 'リモートの印が文字列でない: ' + JSON.stringify(value),
    local: { classUnitApplied: 'force', classUnitAppliedAt: 100 }, remote: { classUnitApplied: value, classUnitAppliedAt: 200, unitId: 'sound' },
    expected: { classUnitApplied: undefined, classUnitAppliedAt: 200, unitId: 'sound' } })),
  ...[undefined, 'force'].flatMap((applied) => [undefined, null, '300', -1, NaN, Infinity, -Infinity, true, [], {}].map((value) => ({ name: '端末の印が' + applied + 'で時刻がない・不正: ' + String(value),
    local: { classUnitApplied: applied, classUnitAppliedAt: value }, remote: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' },
    expected: { classUnitApplied: 'light', classUnitAppliedAt: 100, unitId: 'sound' } }))),
  ...['force', 'light'].flatMap((applied) => [null, '300', -1, NaN, Infinity, -Infinity, true, [], {}].map((value) => ({ name: '端末の印が' + applied + 'でリモートの時刻が不正: ' + String(value),
    local: { classUnitApplied: applied, classUnitAppliedAt: 0 }, remote: { classUnitApplied: 'light', classUnitAppliedAt: value, unitId: 'sound' }, expected: {} }))),
  ...[undefined, 'force'].flatMap((applied) => [undefined, null, '300', -1, NaN, Infinity, -Infinity, true, [], {}].map((value) => ({ name: '端末の印が' + applied + 'でリモートは印なし・時刻がないか不正: ' + String(value),
    local: { classUnitApplied: applied, classUnitAppliedAt: 0 }, remote: { classUnitAppliedAt: value, unitId: 'sound' }, expected: {} }))),
]) {
  test('pull: 未送信ありの classUnitApplied — ' + sample.name, async () => {
    const f = fixture();
    Object.assign(f.store.profiles[0], { unitId: 'force', theme: 'teal' }, sample.local);
    if (f.store.profiles[0].classUnitApplied === undefined) delete f.store.profiles[0].classUnitApplied;
    learn(f.store, 'local', '2026-11-20'); f.client.capture(f.store);
    const before = clone(f.store); const pending = clone(f.store.sync.pending);
    const beforeProfile = Object.assign({}, f.store.profiles[0]);
    const expected = Object.assign({}, beforeProfile, sample.expected);
    if (expected.classUnitApplied === undefined) delete expected.classUnitApplied;
    const remote = Object.assign({ id: 'remote', nickname: 'リモート', avatar: 'cat', theme: 'blue' }, sample.remote);
    f.db.data.state = { v: 1, updatedAt: 3, json: S.packState(remote, R.createRecord()) };
    const pulled = await f.client.pull(f.store);
    assert.equal(pulled.status, 'ok'); assert.equal(pulled.changed, true);
    assert.equal(pulled.store.currentProfileId, 'p-test'); assert.deepEqual(pulled.store.profiles[0], expected);
    assert.deepEqual(f.store.profiles[0], beforeProfile);
    assert.deepEqual(rec(pulled.store), rec(before)); assert.deepEqual(pulled.store.sync.pending, pending);
    assert.deepEqual(JSON.parse(f.storage.getItem(CONFIG.acctKeyPrefix + UID)).profiles[0], expected);
    assert.equal(f.client.isDirty(), true); assert.equal(f.client.pendingCount(), 1);
    assert.equal((await f.client.push(pulled.store)).status, 'ok');
    assert.deepEqual(S.unpackState(f.db.data.state.json).profile, expected);
    const chunks = Object.values(f.db.data.chunks).map(S.unpackChunk);
    assert.deepEqual(chunks.flatMap((chunk) => chunk.h), pending.h);
    assert.deepEqual(chunks.flatMap((chunk) => chunk.x), pending.x);
    assert.equal(f.client.isDirty(), false); assert.equal(f.client.pendingCount(), 0);
  });
}

test('pull: 読めないかたまりを飛ばし、同じ state の版でも次に再試行する', async () => {
  const f = fixture(); f.db.data.state = { v: 1, updatedAt: 1, json: S.packState(f.store.profiles[0], rec(f.store)) };
  f.db.data.chunks.chunk_bad1 = 'bad'; f.db.data.chunks.chunk_good = S.packChunk([{ at: 'a' }], []);
  const r = await f.client.pull(f.store); assert.equal(rec(r.store).history.length, 1); assert.deepEqual(f.meta().chunks, ['chunk_good']);
  f.db.data.chunks.chunk_bad1 = S.packChunk([{ at: 'b' }], []);
  const again = await f.client.pull(r.store); assert.equal(rec(again.store).history.length, 2);
});
test('push: かたまり→state の順、同時呼び出しは同じ Promise', async () => {
  const f = fixture(); learn(f.store, 'a', 'a'); f.client.capture(f.store);
  const a = f.client.push(f.store); const b = f.client.push(f.store); assert.equal(a, b);
  assert.equal((await a).status, 'ok'); assert.deepEqual(f.db.calls.map((c) => c.path.split('/')[2]), ['log', 'state', 'state']);
  assert.equal(f.client.pendingCount(), 0); assert.equal(f.client.isDirty(), false);
  assert.deepEqual(Object.keys(f.db.data.state).sort(), ['json', 'updatedAt', 'v']);
});
test('push: 返事が失われても sending が残り、再起動後も同じ id。403 でも同じ本文なら成功', async () => {
  const database = db(); let first = true;
  const f = fixture({ db: database, fetch: async (url, init) => {
    const r = await database.fetch(url, init); if (first && init.method === 'PUT') { first = false; throw new Error(TOKEN); } return r;
  } });
  learn(f.store, 'a', 'a'); f.client.capture(f.store); assert.equal((await f.client.push(f.store)).status, 'offline');
  const id = f.meta().sending.id; assert.equal(f.client.pendingCount(), 1);
  const next = fixture({ db: database, storage: f.storage, store: JSON.parse(f.storage.getItem(CONFIG.acctKeyPrefix + UID)) });
  assert.equal((await next.client.push(next.store)).status, 'ok'); assert.equal(Object.keys(database.data.chunks).length, 1);
  assert.equal(database.calls[1].path, '/rika/log/' + UID + '/' + id + '.json'); assert.equal(next.meta().sending, null);
});
test('push: 403 の本文が別物・無いときは denied。待機中の履歴は残す', async () => {
  for (const value of [null, 'different']) {
    const f = fixture({ fetch: async (url, init) => response(init.method === 'PUT' ? 403 : 200, value) });
    learn(f.store, 'a', 'a'); f.client.capture(f.store); assert.equal((await f.client.push(f.store)).status, 'denied'); assert.equal(f.client.pendingCount(), 1);
  }
});
test('pull: 自分の sending が既にサーバーにあっても二重に取りこまない', async () => {
  const database = db(); const f = fixture({ db: database, fetch: async (url, init) => { await database.fetch(url, init); throw new Error('lost'); } });
  learn(f.store, 'a', 'a'); f.client.capture(f.store); (await f.client.push(f.store)).status;
  database.data.state = { v: 1, updatedAt: 1, json: S.packState(f.store.profiles[0], rec(f.store)) };
  const next = fixture({ db: database, storage: f.storage, store: f.store });
  const pulled = await next.client.pull(next.store); assert.equal(rec(pulled.store).history.length, 1); assert.equal(next.meta().sending, null);
});
test('push: state のサイズちょうどは送る。超えたら too-big。空の履歴のかたまりは送らない', async () => {
  const s = store(); const length = S.packState(s.profiles[0], rec(s)).length;
  for (const max of [length, length - 1]) {
    const f = fixture({ store: clone(s), config: { stateMaxChars: max } }); f.client.capture(f.store);
    assert.equal((await f.client.push(f.store)).status, max === length ? 'ok' : 'too-big');
    assert.equal(f.db.calls.filter((c) => c.method === 'PUT').length, max === length ? 1 : 0);
  }
});
test('push: 大きなかたまりを分割し、1 件でも大きすぎれば捨てずに知らせる', async () => {
  const f = fixture({ config: { chunkMaxChars: 100 } });
  for (let i = 0; i < 6; i++) learn(f.store, 'p' + i, 'a');
  f.client.capture(f.store); assert.equal((await f.client.push(f.store)).status, 'ok');
  const chunks = Object.values(f.db.data.chunks).map(S.unpackChunk);
  assert.ok(chunks.length > 1); assert.equal(chunks.reduce((n, c) => n + c.h.length, 0), 6);
  assert.equal(chunks.reduce((n, c) => n + c.x.length, 0), 6); Object.values(f.db.data.chunks).forEach((c) => assert.ok(c.length <= 100));
  const huge = fixture({ config: { chunkMaxChars: 20 } }); learn(huge.store, 'huge', 'a'); huge.client.capture(huge.store);
  assert.equal((await huge.client.push(huge.store)).status, 'too-big'); assert.equal(huge.client.pendingCount(), 1);
});
test('push: 20 かたまりを超える分は残して、次回すべて送ってから state を送る', async () => {
  const f = fixture({ config: { chunkMaxChars: 100 } });
  for (let i = 0; i < 25; i++) learn(f.store, 'p' + i, 'a'); f.client.capture(f.store);
  (await f.client.push(f.store)).status; assert.equal(Object.keys(f.db.data.chunks).length, 20); assert.equal(f.db.data.state, null);
  while (f.client.isDirty()) assert.equal((await f.client.push(f.store)).status, 'ok');
  assert.ok(f.db.data.state); assert.equal(Object.values(f.db.data.chunks).map(S.unpackChunk).reduce((n, c) => n + c.h.length, 0), 25);
});
test('通信中の capture は取りこぼさず、pull と push は順番に動く', async () => {
  const database = db(); const gate = deferred(); const started = deferred(); let once = true;
  const f = fixture({ db: database, fetch: async (url, init) => {
    if (once && init.method === 'PUT') { once = false; started.resolve(); await gate.promise; } return database.fetch(url, init);
  } });
  f.client.capture(f.store); const pushing = f.client.push(f.store); await started.promise;
  const pulling = f.client.pull(f.store); learn(f.store, 'during', 'a'); f.client.capture(f.store);
  gate.resolve(); await pushing; await pulling; assert.equal(f.client.isDirty(), true);
  assert.deepEqual(f.db.calls.map((c) => c.method), ['GET', 'PUT', 'GET']);
  (await f.client.push(f.store)).status; assert.equal(f.client.isDirty(), false); assert.equal(Object.keys(f.db.data.chunks).length, 1);
});
test('pull の待機中に学習・表示名変更をしても、最新のローカル記録を残す', async () => {
  const database = db(); const gate = deferred(); const started = deferred();
  const f = fixture({ db: database, fetch: async (url, init) => {
    if (url.includes('shallow=true')) { started.resolve(); await gate.promise; } return database.fetch(url, init);
  } });
  database.data.state = { v: 1, updatedAt: 1, json: S.packState(f.store.profiles[0], rec(f.store)) };
  const pulling = f.client.pull(f.store); await started.promise;
  learn(f.store, 'during', 'a'); f.store.profiles[0].nickname = '変更'; f.client.capture(f.store); gate.resolve();
  const r = await pulling; assert.equal(rec(r.store).history.length, 1); assert.equal(r.store.profiles[0].nickname, '変更'); assert.equal(f.client.pendingCount(), 1);
});
test('2 台: 別々に学習して state を上書きし合っても、履歴・XP・ステージが収束する', async () => {
  const database = db(); const a = fixture({ db: database }); const b = fixture({ db: database });
  await a.client.pull(a.store); await b.client.pull(b.store);
  learn(a.store, 'a', '2026-01-02'); learn(b.store, 'b', '2026-01-01', 40);
  a.client.capture(a.store); b.client.capture(b.store);
  (await a.client.push(a.store)).status; (await b.client.push(b.store)).status;
  a.store = (await a.client.pull(a.store)).store; (await a.client.push(a.store)).status;
  b.store = (await b.client.pull(b.store)).store; (await b.client.push(b.store)).status;
  a.store = (await a.client.pull(a.store)).store;
  assert.equal(rec(a.store).history.length, 2); assert.equal(rec(a.store).xp, 65);
  for (const key of ['history', 'xp', 'stages']) assert.deepEqual(rec(a.store)[key], rec(b.store)[key]);
});
test('時間切れ・保存失敗でも止まらず、トークンを保存・console・例外に出さない', async (t) => {
  const logs = []; t.mock.method(console, 'error', (...args) => logs.push(args)); t.mock.method(console, 'log', (...args) => logs.push(args));
  const f = fixture({ fetch: () => new Promise(() => {}) }); f.client.capture(f.store);
  assert.equal((await f.client.pull(f.store)).status, 'offline'); assert.equal((await f.client.push(f.store)).status, 'offline');
  const throwing = fixture({ fetch: async () => { throw new Error(TOKEN); } }); throwing.client.capture(throwing.store);
  assert.equal((await throwing.client.push(throwing.store)).status, 'offline');
  assert.ok(!JSON.stringify([...f.storage.data]).includes(TOKEN)); assert.ok(!JSON.stringify([...throwing.storage.data]).includes(TOKEN)); assert.deepEqual(logs, []);
  const full = fixture(); full.storage.setItem = () => { throw new Error('full'); };
  learn(full.store, 'a', 'a'); assert.doesNotThrow(() => full.client.capture(full.store)); assert.equal(full.client.isDirty(), true);
  assert.equal((await full.client.push(full.store)).status, 'offline'); assert.equal(full.db.calls.length, 0);
});
test('別の uid へ変わったトークン・禁止文字の uid では通信しない', async () => {
  const f = fixture({ link: { getToken: async () => TOKEN, savedUid: () => 'another-user' } });
  assert.equal((await f.client.pull(f.store)).status, 'offline'); assert.equal(f.db.calls.length, 0);
  for (const char of ['/', '.', '#', '$', '[', ']']) {
    const x = fixture({ uid: 'bad' + char + 'uid' }); assert.equal((await x.client.pull(x.store)).status, 'offline'); assert.equal(x.db.calls.length, 0);
  }
});
test('同期情報だけ残って入れ物がないときも、全履歴をリモートから復元する', async () => {
  const f = fixture(); learn(f.store, 'a', 'a'); f.client.capture(f.store); (await f.client.push(f.store)).status;
  const restored = fixture({ storage: f.storage, db: f.db, store: R.createStore() });
  const pulled = await restored.client.pull(restored.store);
  assert.equal(pulled.status, 'ok'); assert.equal(rec(pulled.store).history.length, 1); assert.equal(rec(pulled.store).xp, 25);
});

test('古い B だけが接続しても、閉じた A の進捗と B の進捗をリモートと B に残す', async () => {
  const database = db(); const a = fixture({ db: database });
  a.client.capture(a.store); await a.client.push(a.store);
  const b = fixture({ db: database }); b.store = (await b.client.pull(b.store)).store;
  learn(a.store, 'a', 'a'); a.client.capture(a.store); await a.client.push(a.store);
  learn(b.store, 'b', 'b'); b.client.capture(b.store);
  const pushed = await b.client.push(b.store);
  assert.equal(pushed.status, 'ok'); assert.equal(pushed.changed, true);
  for (const r of [rec(pushed.store), S.unpackState(database.data.state.json).record]) {
    assert.deepEqual(Object.keys(r.stages).sort(), ['a', 'b']); assert.equal(r.xp, 50);
  }
  assert.equal(rec(pushed.store).history.length, 2);
  const writes = database.calls.filter((c) => c.method === 'PUT' && c.path.includes('/state/')).map((c) => JSON.parse(c.body));
  assert.equal(writes.at(-1).base, writes.at(-3).updatedAt);
});

test('同じ base の同時書きこみは片方が拒まれ、読み直し後に両方の進捗が残る', async () => {
  const database = db(); const seed = fixture({ db: database }); seed.client.capture(seed.store); await seed.client.push(seed.store);
  const gate = deferred(); let attempts = 0; let denied = 0;
  const fetch = async (url, init) => {
    if (url.includes('/state/') && init.method === 'PUT') {
      if (++attempts === 2) gate.resolve();
      await gate.promise;
    }
    const res = await database.fetch(url, init); if (res.status === 403) denied++;
    return res;
  };
  const a = fixture({ db: database, fetch }); const b = fixture({ db: database, fetch });
  a.store = (await a.client.pull(a.store)).store; b.store = (await b.client.pull(b.store)).store;
  learn(a.store, 'a', 'a'); learn(b.store, 'b', 'b'); a.client.capture(a.store); b.client.capture(b.store);
  const results = await Promise.all([a.client.push(a.store), b.client.push(b.store)]);
  assert.deepEqual(results.map((r) => r.status), ['ok', 'ok']); assert.equal(denied, 1);
  assert.deepEqual(Object.keys(S.unpackState(database.data.state.json).record.stages).sort(), ['a', 'b']);
  assert.equal(rec(results.find((r) => r.changed).store).history.length, 2);
});

test('更新がないのに state を拒まれたら denied。競合が続いても再送は2回まで', async () => {
  for (const competing of [false, true]) {
    const database = db(); const seed = fixture({ db: database }); seed.client.capture(seed.store); await seed.client.push(seed.store);
    let puts = 0;
    const f = fixture({ db: database, fetch: async (url, init) => {
      if (url.includes('/state/') && init.method === 'PUT') {
        puts++; if (competing) database.data.state.updatedAt++;
        return response(403, null);
      }
      return database.fetch(url, init);
    } });
    f.store = (await f.client.pull(f.store)).store;
    learn(f.store, 'b', 'b'); f.client.capture(f.store);
    const pushed = await f.client.push(f.store);
    assert.equal(pushed.status, competing ? 'offline' : 'denied'); assert.equal(puts, competing ? 3 : 1);
    assert.equal(f.client.isDirty(), true); assert.equal(rec(pushed.store).history.length, 1);
  }
});

test('読めないかたまりで seenRev が null でも、state を読み直して今の版を base にする', async () => {
  const f = fixture(); f.db.data.state = { v: 1, updatedAt: 10, json: S.packState(f.store.profiles[0], rec(f.store)) };
  f.db.data.chunks.chunk_bad1 = 'bad';
  f.store = (await f.client.pull(f.store)).store; assert.equal(f.store.sync.seenRev, null);
  f.db.data.state.updatedAt = 20;
  rec(f.store).lessonsRead.a = true; f.client.capture(f.store);
  const before = f.db.calls.length;
  assert.equal((await f.client.push(f.store)).status, 'ok');
  const calls = f.db.calls.slice(before); assert.equal(calls[0].method, 'GET');
  assert.equal(JSON.parse(calls.find((c) => c.method === 'PUT').body).base, 20);
  assert.equal(f.store.sync.seenRev, null);
});

test('同期情報だけ壊れた・消えたときは履歴を全取得し直し、履歴・経験値を二重にしない', async () => {
  const seed = fixture(); learn(seed.store, 'a', 'a'); seed.client.capture(seed.store); await seed.client.push(seed.store);
  for (const damage of [undefined, null, {}, { ...seed.store.sync, seenRev: 'bad' }, { ...seed.store.sync, chunks: 1 }]) {
    const s = clone(seed.store); if (damage === undefined) delete s.sync; else s.sync = damage;
    const f = fixture({ db: seed.db, store: s });
    const pushed = await f.client.push(f.store);
    assert.equal(pushed.status, 'ok'); assert.equal(pushed.changed, true);
    assert.equal(rec(pushed.store).history.length, 1); assert.equal(rec(pushed.store).xpLog.length, 1); assert.equal(rec(pushed.store).xp, 25);
    assert.equal(Object.keys(seed.db.data.chunks).length, 1); assert.equal(S.validMeta(pushed.store.sync), true);
  }
});

test('壊れた同期情報: リモートが無ければ全履歴を送る。通信できるまでは捨てず送らない', async () => {
  const s = store(); learn(s, 'a', 'a'); s.sync = { chunks: 'broken' };
  let online = false; const database = db();
  const f = fixture({ store: s, db: database, fetch: (url, init) => online ? database.fetch(url, init) : response(500, null) });
  f.client.capture(s); const before = clone(s);
  assert.equal((await f.client.push(s)).status, 'offline'); assert.deepEqual(s, before); assert.equal(database.calls.length, 0);
  online = true; assert.equal((await f.client.push(s)).status, 'ok');
  assert.equal(Object.values(database.data.chunks).map(S.unpackChunk).reduce((n, c) => n + c.h.length, 0), 1);
  assert.equal(rec(s).history.length, 1); assert.equal(rec(s).xp, 25);
});

test('入れ物全体が壊れて退避されたら、state と全かたまりを復元する', async () => {
  const f = fixture(); learn(f.store, 'a', 'a'); learn(f.store, 'b', 'b'); f.client.capture(f.store); await f.client.push(f.store);
  const storageApi = require('../js/storage.js');
  f.storage.setItem(CONFIG.acctKeyPrefix + UID, 'broken');
  const loaded = storageApi.load(f.storage, { storageKey: CONFIG.acctKeyPrefix + UID }); assert.ok(loaded.quarantinedKey);
  const restored = fixture({ db: f.db, storage: f.storage, store: loaded.store });
  const pulled = await restored.client.pull(restored.store);
  assert.equal(rec(pulled.store).history.length, 2); assert.equal(rec(pulled.store).xp, 50);
  assert.deepEqual(Object.keys(rec(pulled.store).stages).sort(), ['a', 'b']);
});

test('sending の保存が失敗したら通信せず pending を残す。capture は保存しない', async () => {
  let canSave = false; const writes = [];
  const f = fixture({ save: (s) => { writes.push(clone(s)); return canSave; } });
  learn(f.store, 'a', 'a'); f.client.capture(f.store); assert.equal(writes.length, 0);
  assert.equal((await f.client.push(f.store)).status, 'offline');
  assert.equal(f.db.calls.length, 0); assert.equal(f.store.sync.sending, null); assert.equal(f.store.sync.pending.h.length, 1);
  assert.equal(writes[0].sync.sending.h.length, 1); assert.equal(rec(writes[0]).history.length, 1);
  canSave = true; assert.equal((await f.client.push(f.store)).status, 'ok');
});

test('送信後の保存失敗と再起動でも、同じ id と base の再試行で二重にしない', async () => {
  for (const failAt of ['chunk', 'state']) {
    const database = db(); const local = storage(); let failed = false;
    const f = fixture({ db: database, storage: local, save: (s) => {
      if ((failAt === 'chunk' && s.sync.chunks.length || failAt === 'state' && !s.sync.dirty) || failed) { failed = true; throw new Error('full'); }
      local.setItem(CONFIG.acctKeyPrefix + UID, JSON.stringify(s)); return true;
    } });
    learn(f.store, 'a', 'a'); f.client.capture(f.store); await f.client.push(f.store);
    const restored = fixture({ db: database, storage: local, store: JSON.parse(local.getItem(CONFIG.acctKeyPrefix + UID)) });
    assert.equal((await restored.client.push(restored.store)).status, 'ok');
    assert.equal(Object.keys(database.data.chunks).length, 1); assert.equal(rec(restored.store).history.length, 1);
    assert.equal(S.unpackState(database.data.state.json).record.xp, 25);
  }
});

test('古い同期キーは削除し、中身を使わず、保存はアカウントの入れ物だけに行う', async () => {
  const local = storage(); local.setItem(CONFIG.syncKeyPrefix + UID, '{"dirty":true}');
  const f = fixture({ storage: local }); assert.equal(local.getItem(CONFIG.syncKeyPrefix + UID), null);
  learn(f.store, 'a', 'a'); f.client.capture(f.store); await f.client.push(f.store);
  assert.deepEqual([...local.data.keys()], [CONFIG.acctKeyPrefix + UID]);
  const saved = JSON.parse(local.getItem(CONFIG.acctKeyPrefix + UID)); assert.equal(saved.sync.dirty, false); assert.equal(rec(saved).history.length, 1);
});

test('state の返事が失われたら、再起動後は新しい版を読み直して保存する', async () => {
  const database = db(); let lost = false;
  const f = fixture({ db: database, fetch: async (url, init) => {
    const res = await database.fetch(url, init);
    if (!lost && url.includes('/state/') && init.method === 'PUT') { lost = true; throw new Error('lost'); }
    return res;
  } });
  learn(f.store, 'a', 'a'); f.client.capture(f.store);
  assert.equal((await f.client.push(f.store)).status, 'offline');
  const version = database.data.state.updatedAt;
  const restarted = fixture({ db: database, storage: f.storage, store: JSON.parse(f.storage.getItem(CONFIG.acctKeyPrefix + UID)) });
  assert.equal((await restarted.client.push(restarted.store)).status, 'ok');
  assert.equal(database.data.state.base, version); assert.ok(database.data.state.updatedAt > version);
  assert.equal(Object.keys(database.data.chunks).length, 1); assert.equal(rec(restarted.store).history.length, 1);
});
