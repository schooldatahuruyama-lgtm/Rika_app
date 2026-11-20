// tests/class-unit.test.js — 先生が決めた単元を、偽物のデータベースで読む。
const test = require('node:test'); const assert = require('node:assert/strict');
const C = require('../js/class-unit.js');
const CONFIG = Object.assign({}, require('../js/config.js').link, { dbUrl: 'https://class.example.invalid', timeoutMs: 30 });
const UID = 'test-user'; const TOKEN = 'test-token+&secret';
const clone = (value) => JSON.parse(JSON.stringify(value));
const response = (status, value) => ({ status, json: async () => clone(value) });
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function fixture(options = {}) {
  const data = Object.assign({
    ['accounts/' + UID]: 'test-student', 'memberOf/test-student': { ClassA: true },
    'classes/ClassA': { year: 2026, name: '1組' }, 'rika/classUnit/ClassA': 'light',
  }, options.data);
  const calls = [];
  const client = C.createClassUnit({ uid: Object.hasOwn(options, 'uid') ? options.uid : UID,
    config: Object.assign({}, CONFIG, options.config),
    link: options.link || { getToken: async () => TOKEN, savedUid: () => UID },
    fetch: async (url, init) => {
      const u = new URL(url); const path = decodeURIComponent(u.pathname.slice(1, -5));
      assert.equal(u.origin, CONFIG.dbUrl); assert.equal(u.searchParams.get('auth'), TOKEN);
      assert.deepEqual([...u.searchParams.keys()], ['auth']);
      assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error');
      assert.equal(init.body, undefined); assert.equal(init.headers, undefined);
      assert.equal(JSON.stringify(init).includes(TOKEN), false);
      calls.push(path);
      return options.fetch ? options.fetch(path, init) : response(200, Object.hasOwn(data, path) ? data[path] : null);
    } });
  return { client, data, calls };
}

test('clean: 小文字・数字・ハイフンの1〜40文字だけを受け取る', () => {
  for (const value of ['a', 'light', 'state-change', '123', 'a'.repeat(40)]) assert.equal(C.clean(value), value);
  for (const value of [null, undefined, 1, {}, [], true, '', 'a'.repeat(41), 'Light', ' light', 'light ', 'a/b', 'a_b', '光']) {
    assert.equal(C.clean(value), null);
  }
});

test('pickClass: 年度降順、名前と id の文字コード順。元の配列を変えない', () => {
  const list = [{ id: 'a', year: 2025, name: 'A' }, { id: 'z', year: 2026, name: 'a' },
    { id: 'b', year: 2026, name: 'Z' }, { id: 'a', year: 2026, name: 'Z' }];
  const before = clone(list);
  assert.equal(C.pickClass(list), list[3]); assert.deepEqual(list, before);
  assert.equal(C.pickClass(list.slice(0, 2)), list[1]); assert.equal(C.pickClass([]), null);
});

test('pickClass: 数でない年度は後ろ、文字列でない名前は空として行を残す', () => {
  const invalid = [undefined, null, '2027', {}, NaN, Infinity];
  for (const year of invalid) {
    const list = [{ id: 'a', year, name: 'A' }, { id: 'b', year: -1, name: 'B' }];
    assert.equal(C.pickClass(list), list[1]);
  }
  const rows = [{ id: 'b' }, { id: 'a', name: {} }];
  assert.equal(C.pickClass(rows), rows[1]);
});

test('load: 生徒1クラス。authだけに通行証を入れ、GET・転送禁止で読む', async () => {
  const f = fixture({ config: { dbUrl: CONFIG.dbUrl + '/' } });
  assert.deepEqual(await f.client.load(), { status: 'ok', unitId: 'light', classId: 'ClassA' });
  assert.deepEqual(f.calls, ['accounts/' + UID, 'memberOf/test-student', 'classes/ClassA', 'rika/classUnit/ClassA']);
});

test('load: 先生・未登録・文字列でない accounts は ok・null', async () => {
  for (const value of [null, 42, {}, [], true]) {
    const f = fixture({ data: { ['accounts/' + UID]: value } });
    assert.deepEqual(await f.client.load(), { status: 'ok', unitId: null, classId: null });
    assert.equal(f.calls.length, 1);
  }
});

test('load: 不正・空の生徒IDは broken、memberOf の親は読まない', async () => {
  for (const value of ['', 'a/b', 'a.b', 'a#b', 'a$b', 'a[b', 'a]b']) {
    const f = fixture({ data: { ['accounts/' + UID]: value } });
    assert.deepEqual(await f.client.load(), { status: 'broken' }); assert.equal(f.calls.length, 1);
  }
});

test('load: 所属0件・不正なmemberOfは ok・null。trueかつ英数字のキーだけ使う', async () => {
  for (const value of [null, 'ClassA', [], [true], true, {}, { ClassA: 1, ClassB: 'true', ClassC: false, 'bad/id': true }]) {
    const f = fixture({ data: { 'memberOf/test-student': value } });
    assert.deepEqual(await f.client.load(), { status: 'ok', unitId: null, classId: null }); assert.equal(f.calls.length, 2);
  }
  const f = fixture({ data: { 'memberOf/test-student': { 'bad-id': true, 'bad.id': true, ClassA: true, ClassB: false } } });
  assert.equal((await f.client.load()).classId, 'ClassA'); assert.equal(f.calls.length, 4);
});

test('load: 2クラスなら新しい年度、同じ年度なら名前の文字コード順', async () => {
  const f = fixture({ data: { 'memberOf/test-student': { ClassA: true, ClassB: true },
    'classes/ClassB': { year: 2027, name: '2組' }, 'rika/classUnit/ClassB': 'sound' } });
  assert.deepEqual(await f.client.load(), { status: 'ok', unitId: 'sound', classId: 'ClassB' });
  f.data['classes/ClassB'] = { year: 2026, name: '0組' };
  assert.equal((await f.client.load()).classId, 'ClassB');
});

test('load: 形の違うclassesは年度なしの行として残す', async () => {
  for (const value of [null, [], 'text', 42, { year: '2028', name: {} }]) {
    const f = fixture({ data: { 'memberOf/test-student': { ClassA: true, ClassB: true },
      'classes/ClassA': value, 'classes/ClassB': { year: 2025, name: 'B' }, 'rika/classUnit/ClassB': 'force' } });
    assert.equal((await f.client.load()).classId, 'ClassB');
    delete f.data['memberOf/test-student'].ClassB;
    assert.deepEqual(await f.client.load(), { status: 'ok', unitId: 'light', classId: 'ClassA' });
  }
});

test('load: 未指定・形の違う単元は null。教材の有無は呼び出し側で決める', async () => {
  for (const value of [null, 123, [], {}, '', 'a'.repeat(41), 'LIGHT']) {
    const f = fixture({ data: { 'rika/classUnit/ClassA': value } });
    assert.deepEqual(await f.client.load(), { status: 'ok', unitId: null, classId: 'ClassA' });
  }
  const f = fixture({ data: { 'rika/classUnit/ClassA': 'unknown-unit' } });
  assert.equal((await f.client.load()).unitId, 'unknown-unit');
});

test('load: 各段階のエラーで止め、途中の値を返さない', async () => {
  const paths = ['accounts/' + UID, 'memberOf/test-student', 'classes/ClassA', 'rika/classUnit/ClassA'];
  for (const [http, status] of [[401, 'denied'], [403, 'denied'], [500, 'offline'], [503, 'offline'], [301, 'broken'], [404, 'broken']]) {
    for (let i = 0; i < paths.length; i++) {
      const f = fixture({ fetch: (path) => response(path === paths[i] ? http : 200, f.data[path]) });
      assert.deepEqual(await f.client.load(), { status }); assert.equal(f.calls.length, i + 1);
    }
  }
});

test('load: JSONでない返事は broken、例外は offline、本文待ちも時間切れになる', async () => {
  for (const [fetch, status] of [
    [() => ({ status: 200, json: async () => { throw new Error('not json'); } }), 'broken'],
    [() => { throw new Error(TOKEN); }, 'offline'],
    [() => new Promise(() => {}), 'offline'],
    [() => ({ status: 200, json: () => new Promise(() => {}) }), 'offline'],
  ]) assert.deepEqual(await fixture({ fetch }).client.load(), { status });
});

test('load: 不正なuid・トークンなし・別uid・トークン取得例外は offline、通信しない', async () => {
  for (const uid of [null, 1, '', 'a/b', 'a.b', 'a#b', 'a$b', 'a[b', 'a]b']) {
    const f = fixture({ uid }); assert.deepEqual(await f.client.load(), { status: 'offline' }); assert.equal(f.calls.length, 0);
  }
  for (const link of [
    { getToken: async () => null, savedUid: () => UID },
    { getToken: async () => TOKEN, savedUid: () => 'other-user' },
    { getToken: async () => { throw new Error(TOKEN); }, savedUid: () => UID },
  ]) {
    const f = fixture({ link }); assert.deepEqual(await f.client.load(), { status: 'offline' }); assert.equal(f.calls.length, 0);
  }
});

test('load: 同時呼び出しは同じPromiseにまとめ、終わったら再び読める', async () => {
  const gate = deferred(); let tokens = 0;
  const f = fixture({ link: { getToken: () => { tokens++; return gate.promise; }, savedUid: () => UID } });
  const first = f.client.load(); assert.equal(f.client.load(), first);
  gate.resolve(TOKEN);
  assert.equal((await first).unitId, 'light'); assert.equal(tokens, 1); assert.equal(f.calls.length, 4);
  await f.client.load(); assert.equal(tokens, 2); assert.equal(f.calls.length, 8);
});

test('load: 11クラスあっても先頭10件まで読み、11件目は選ばない', async () => {
  const ids = Array.from({ length: 11 }, (_, i) => 'Class' + i);
  const data = { 'memberOf/test-student': Object.fromEntries(ids.map((id) => [id, true])) };
  ids.forEach((id, i) => { data['classes/' + id] = { year: 2026 + i, name: id }; data['rika/classUnit/' + id] = 'light'; });
  const f = fixture({ data });
  assert.equal((await f.client.load()).classId, 'Class9');
  assert.equal(f.calls.filter((p) => p.startsWith('classes/')).length, 10);
  assert.equal(f.calls.some((p) => p.endsWith('/Class10')), false);
});
