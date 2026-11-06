// tests/live-db.test.js — Firebase Realtime Database の REST クライアント（js/live-db.js）。偽の fetch・EventSource で試す
const test = require('node:test'); const assert = require('node:assert/strict');
const liveDb = require('../js/live-db.js');

const BASE = 'https://rika-test-default-rtdb.asia-southeast1.firebasedatabase.app';

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : body) };
}
// 呼ばれた順に responses を返し、呼び出しを calls に記録する
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body === undefined ? undefined : JSON.parse(init.body) });
    const r = responses[calls.length - 1];
    if (r instanceof Error) throw r;
    return r;
  };
  fn.calls = calls;
  return fn;
}

// 偽の EventSource。作られたものを instances に残し、fire で手でイベントを起こす
function fakeEventSourceClass() {
  const instances = [];
  class FakeEventSource {
    constructor(url) { this.url = url; this.listeners = {}; this.closed = false; this.onmessage = null; instances.push(this); }
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    close() { this.closed = true; }
    fire(type, data) {
      const ev = { type, data: data === undefined ? undefined : JSON.stringify(data) };
      (this.listeners[type] || []).forEach(fn => fn(ev));
      if (type === 'message' && typeof this.onmessage === 'function') this.onmessage(ev);
    }
  }
  FakeEventSource.instances = instances;
  return FakeEventSource;
}
// 偽のタイマー（run で待っている関数を動かす）
function fakeTimers() {
  const pending = [];
  return {
    pending,
    setTimeoutImpl: (fn, ms) => { pending.push({ fn, ms }); return pending.length; },
    clearTimeoutImpl: (id) => { if (pending[id - 1]) pending[id - 1].fn = null; },
    run() { const list = pending.splice(0); list.forEach(t => t.fn && t.fn()); return list; },
  };
}

test('put / patch / get / remove: URL・メソッド・body（末尾の / と .json は取る）', async () => {
  const f = fakeFetch([response(200, '{"a":1}'), response(200, '{"b":2}'), response(200, '{"x":"y"}'), response(200, 'null')]);
  const db = liveDb.createDb({ baseUrl: BASE + '/.json/', fetchImpl: f });
  assert.deepEqual(await db.put('rooms/ABCDEF', { a: 1 }), { a: 1 });
  assert.deepEqual(await db.patch('/rooms/ABCDEF/state/', { b: 2 }), { b: 2 });
  assert.deepEqual(await db.get('rooms/ABCDEF/meta'), { x: 'y' });
  assert.equal(await db.remove('rooms/ABCDEF'), null);
  assert.deepEqual(f.calls, [
    { url: BASE + '/rooms/ABCDEF.json', method: 'PUT', body: { a: 1 } },
    { url: BASE + '/rooms/ABCDEF/state.json', method: 'PATCH', body: { b: 2 } },
    { url: BASE + '/rooms/ABCDEF/meta.json', method: 'GET', body: undefined },
    { url: BASE + '/rooms/ABCDEF.json', method: 'DELETE', body: undefined },
  ]);
});

test('サーバー時刻の { ".sv": "timestamp" } はそのまま送る', async () => {
  const f = fakeFetch([response(200, '{"createdAt":1770000000000}')]);
  const db = liveDb.createDb({ baseUrl: BASE, fetchImpl: f });
  await db.put('rooms/ABCDEF/meta', { createdAt: { '.sv': 'timestamp' } });
  assert.deepEqual(f.calls[0].body, { createdAt: { '.sv': 'timestamp' } });
});

test('失敗: 403 は規則の案内、ほかの status と通信の失敗は「通信できませんでした（…）」', async () => {
  const db403 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(403, '{"error":"Permission denied"}')]) });
  await assert.rejects(db403.put('x', 1), { message: 'データベースの規則で拒まれました（docs/live/setup.md の規則を確かめてください）' });
  const db500 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(500, '{"error":"Internal"}')]) });
  await assert.rejects(db500.get('x'), { message: '通信できませんでした（500: Internal）' });
  const db404 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(404, 'Not Found')]) });
  await assert.rejects(db404.get('x'), { message: '通信できませんでした（404）' });
  const down = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([new TypeError('Failed to fetch')]) });
  await assert.rejects(down.patch('x', {}), { message: '通信できませんでした（ネットワークにつながりません）' });
});

test('get: 本文を読めない・JSON でない本文は失敗（データなしの null とは区別）。書きこみは本文が読めなくても null', async () => {
  const broken = { ok: true, status: 200, text: async () => { throw new TypeError('body stream already read'); } };
  const db1 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([broken]) });
  await assert.rejects(db1.get('rooms/ABCDEF/answers/q1'), { message: '通信できませんでした（受け取ったデータを読めませんでした）' });
  const db2 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(200, '{"p1":')]) });
  await assert.rejects(db2.get('x'), { message: liveDb.MESSAGES.badBody });
  const db3 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(200, '')]) });
  await assert.rejects(db3.get('x'), { message: liveDb.MESSAGES.badBody });
  // 正常な「データなし」は null、値はそのまま
  const db4 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(200, 'null'), response(200, '0'), response(200, '{"p1":{"choice":"o1"}}')]) });
  assert.equal(await db4.get('x'), null);
  assert.equal(await db4.get('x'), 0);
  assert.deepEqual(await db4.get('x'), { p1: { choice: 'o1' } });
  // 書きこみ（PUT・PATCH・DELETE）は届いているので、本文が読めなくても失敗にしない
  const db5 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([broken, response(200, 'not json'), broken]) });
  assert.equal(await db5.put('x', 1), null);
  assert.equal(await db5.patch('x', {}), null);
  assert.equal(await db5.remove('x'), null);
  // 本文を読めなくても 403 は規則の案内
  const db6 = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([{ ok: false, status: 403, text: async () => { throw new Error('x'); } }]) });
  await assert.rejects(db6.get('x'), { message: liveDb.MESSAGES.denied });
});

test('normalizeUrl: https の Firebase のデータベースの URL だけ', () => {
  assert.equal(liveDb.normalizeUrl(' ' + BASE + '/ '), BASE);
  assert.equal(liveDb.normalizeUrl(BASE + '/rooms.json'), BASE);
  assert.equal(liveDb.normalizeUrl('https://rika-test-default-rtdb.firebaseio.com'), 'https://rika-test-default-rtdb.firebaseio.com');
  assert.equal(liveDb.normalizeUrl('http://rika-test-default-rtdb.firebaseio.com'), null);
  assert.equal(liveDb.normalizeUrl('https://example.com/firebaseio.com'), null);
  assert.equal(liveDb.normalizeUrl('https://firebaseio.com.evil.example'), null);
  assert.equal(liveDb.normalizeUrl('rika-test-default-rtdb.firebaseio.com'), null);
  assert.equal(liveDb.normalizeUrl(''), null);
  assert.equal(liveDb.normalizeUrl(null), null);
});

test('watch: put "/" で全体、put "/players/p1" で一部、patch で合成し、最新の全体を渡す', () => {
  const ES = fakeEventSourceClass();
  const db = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES });
  const seen = [];
  const errors = [];
  const stop = db.watch('rooms/ABCDEF', w => seen.push(w), e => errors.push(e));
  assert.equal(ES.instances.length, 1);
  const es = ES.instances[0];
  assert.equal(es.url, BASE + '/rooms/ABCDEF.json');

  es.fire('put', { path: '/', data: { meta: { title: '光' }, state: { index: -1, phase: 'lobby' } } });
  es.fire('keep-alive', null);
  es.fire('put', { path: '/players/p1', data: { name: 'ひかり', score: 0 } });
  es.fire('patch', { path: '/state', data: { index: 0, phase: 'show' } });
  es.fire('put', { path: '/players/p1/score', data: 750 });
  assert.equal(seen.length, 4);   // keep-alive は無視
  assert.deepEqual(seen[3], {
    meta: { title: '光' },
    state: { index: 0, phase: 'show' },
    players: { p1: { name: 'ひかり', score: 750 } },
  });
  // 前に渡した全体は変わらない（写しを渡す）
  assert.deepEqual(seen[0], { meta: { title: '光' }, state: { index: -1, phase: 'lobby' } });
  // null で消える
  es.fire('put', { path: '/players/p1', data: null });
  assert.equal('players' in seen[4], false);
  es.fire('patch', { path: '/', data: { answers: { q1: { p2: { choice: 'o1', at: 5 } } } } });
  assert.deepEqual(seen[5].answers, { q1: { p2: { choice: 'o1', at: 5 } } });
  // 部屋がない（全体が null）
  es.fire('put', { path: '/', data: null });
  assert.equal(seen[6], null);
  // 壊れた data は無視
  (es.listeners.put || []).forEach(fn => fn({ data: '{bad' }));
  assert.equal(seen.length, 7);
  assert.deepEqual(errors, []);

  stop();
  assert.equal(es.closed, true);
});

test('watch: cancel・auth_revoked は onError（つなぎ直さない）', () => {
  ['cancel', 'auth_revoked'].forEach(type => {
    const ES = fakeEventSourceClass();
    const timers = fakeTimers();
    const db = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES, setTimeoutImpl: timers.setTimeoutImpl, clearTimeoutImpl: timers.clearTimeoutImpl });
    const errors = [];
    db.watch('rooms/ABCDEF', () => {}, e => errors.push(e));
    ES.instances[0].fire(type, null);
    assert.equal(errors.length, 1);
    assert.ok(errors[0] instanceof Error);
    assert.equal(ES.instances[0].closed, true);
    assert.equal(timers.pending.length, 0);
  });
});

test('watch: 切れたら 3 秒後につなぎ直し、最大 10 回で onError。stop で止まる', () => {
  const ES = fakeEventSourceClass();
  const timers = fakeTimers();
  const db = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES, setTimeoutImpl: timers.setTimeoutImpl, clearTimeoutImpl: timers.clearTimeoutImpl });
  const errors = [];
  const seen = [];
  const stop = db.watch('rooms/ABCDEF', w => seen.push(w), e => errors.push(e));

  ES.instances[0].fire('error');
  assert.equal(ES.instances[0].closed, true);
  assert.equal(timers.pending.length, 1);
  assert.equal(timers.pending[0].ms, 3000);
  timers.run();
  assert.equal(ES.instances.length, 2);
  // つながってデータが届いたら回数を数え直す
  ES.instances[1].fire('put', { path: '/', data: { a: 1 } });
  assert.deepEqual(seen, [{ a: 1 }]);

  for (let i = 0; i < 10; i++) {
    ES.instances[ES.instances.length - 1].fire('error');
    timers.run();
  }
  assert.equal(ES.instances.length, 12);
  assert.deepEqual(errors, []);
  ES.instances[11].fire('error');   // 11 回目は諦める
  assert.equal(timers.pending.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, '通信できませんでした（接続が切れました）');

  // stop で待っているつなぎ直しも止まる
  const ES2 = fakeEventSourceClass();
  const t2 = fakeTimers();
  const db2 = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES2, setTimeoutImpl: t2.setTimeoutImpl, clearTimeoutImpl: t2.clearTimeoutImpl });
  const stop2 = db2.watch('rooms/ABCDEF', () => {}, () => {});
  ES2.instances[0].fire('error');
  stop2();
  t2.run();
  assert.equal(ES2.instances.length, 1);
  stop();
});

test('serverTime: rooms/_time/<乱数> に timestamp を put して差を返す。失敗は 0', async () => {
  let t = 1000;
  const f = fakeFetch([response(200, '6000'), response(200, 'null')]);
  const db = liveDb.createDb({ baseUrl: BASE, fetchImpl: f, now: () => (t += 1000), random: () => 0.5 });
  const offset = await db.serverTime();
  assert.equal(offset, 6000 - 2500);   // 端末の時刻 2000〜3000 の真ん中との差
  assert.match(f.calls[0].url, /^https:\/\/.+\/rooms\/_time\/[a-z0-9]+\.json$/);
  assert.equal(f.calls[0].method, 'PUT');
  assert.deepEqual(f.calls[0].body, { '.sv': 'timestamp' });
  await new Promise(r => setImmediate(r));
  assert.equal(f.calls[1].method, 'DELETE');   // 片づけ
  assert.equal(f.calls[1].url, f.calls[0].url);

  const bad = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([response(403, '')]) });
  assert.equal(await bad.serverTime(), 0);
  const down = liveDb.createDb({ baseUrl: BASE, fetchImpl: fakeFetch([new TypeError('x')]) });
  assert.equal(await down.serverTime(), 0);
});

test('watch: 切れたら onStatus で reconnecting（回数つき）、つながったら reconnected、10 回だめなら gave-up と onError', () => {
  const ES = fakeEventSourceClass();
  const timers = fakeTimers();
  const db = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES, setTimeoutImpl: timers.setTimeoutImpl, clearTimeoutImpl: timers.clearTimeoutImpl });
  const statuses = [];
  const errors = [];
  db.watch('rooms/ABCDEF', () => {}, e => errors.push(e), s => statuses.push(s));
  ES.instances[0].fire('open');
  assert.deepEqual(statuses, []);   // 初めてつながったときは何も言わない
  ES.instances[0].fire('error');
  assert.deepEqual(statuses, [{ kind: 'reconnecting', attempt: 1 }]);
  timers.run();
  ES.instances[1].fire('error');    // つなぎ直しもすぐ切れた
  assert.deepEqual(statuses[1], { kind: 'reconnecting', attempt: 2 });
  timers.run();
  ES.instances[2].fire('open');
  assert.deepEqual(statuses[2], { kind: 'reconnected' });
  ES.instances[2].fire('put', { path: '/', data: { a: 1 } });
  assert.equal(statuses.length, 3);   // 2 度は言わない
  assert.deepEqual(errors, []);

  // データが届いたときも reconnected（open が来ない場合）
  ES.instances[2].fire('error');
  timers.run();
  ES.instances[3].fire('put', { path: '/', data: { a: 2 } });
  assert.deepEqual(statuses.slice(3), [{ kind: 'reconnecting', attempt: 1 }, { kind: 'reconnected' }]);

  // 10 回つなぎ直してもだめなら gave-up。onError の Error にも kind
  statuses.length = 0;
  for (let i = 0; i < 10; i++) {
    ES.instances[ES.instances.length - 1].fire('error');
    timers.run();
  }
  assert.deepEqual(statuses.map(s => s.attempt), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  ES.instances[ES.instances.length - 1].fire('error');
  assert.deepEqual(statuses[10], { kind: 'gave-up' });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].kind, 'gave-up');
  assert.equal(errors[0].message, '通信できませんでした（接続が切れました）');
  assert.equal(timers.pending.length, 0);

  // cancel は onError（kind cancel）だけ
  const ES2 = fakeEventSourceClass();
  const db2 = liveDb.createDb({ baseUrl: BASE, EventSourceImpl: ES2 });
  const st2 = [];
  const er2 = [];
  db2.watch('rooms/ABCDEF', () => {}, e => er2.push(e), s => st2.push(s));
  ES2.instances[0].fire('cancel', null);
  assert.deepEqual(st2, []);
  assert.equal(er2[0].kind, 'cancel');
});
