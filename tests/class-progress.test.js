// tests/class-progress.test.js — クラスの今の状態を偽物のデータベースで読む。
const test = require('node:test'); const assert = require('node:assert/strict');
const C = require('../js/class-progress.js'); const S = require('../js/sync.js');
const CONFIG = { dbUrl: 'https://progress.example.invalid', timeoutMs: 30 };
const UID = 'test-teacher'; const TOKEN = 'test-token+&secret';
const clone = (v) => JSON.parse(JSON.stringify(v));
const response = (status, value) => ({ status, json: async () => clone(value) });
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
const state = (profile = { id: 'same-id', nickname: 'テスト' }) => ({ v: 1, updatedAt: 10, json: S.packState(profile, { xp: 5 }) });
function fixture(options = {}) {
  const data = Object.assign({ ['teacherList/' + UID]: true, classes: { ClassA: { year: 2026, name: '1年1組' } },
    'members/ClassA': { 'test-001': 1 }, accounts: { user1: 'test-001' }, 'rika/classUnit/ClassA': 'light', 'rika/state/user1': state() }, options.data);
  const calls = [];
  const client = C.createClassProgress({ config: Object.assign({}, CONFIG, options.config),
    link: options.link || { savedUid: () => UID, status: () => 'ok', getToken: async () => TOKEN },
    unpackState: options.unpackState || S.unpackState,
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

test('sortClasses: 年度降順、同年は名前・IDの文字コード順。元は変えない', () => {
  const value = { z: { year: 2026, name: 'A', extra: true }, a: { year: 2026, name: 'A' },
    b: { year: 2026, name: 'a' }, old: { year: 2000, name: 'A' }, rules: { year: 1999, name: 'A' } };
  const before = clone(value);
  assert.deepEqual(C.sortClasses(value), ['a', 'z', 'b', 'old'].map((id) => ({ id, year: value[id].year, name: value[id].name })));
  assert.deepEqual(value, before);
});

test('sortClasses: 空・配列・文字列・不正なID・年度・名前を捨てる', () => {
  for (const value of [null, undefined, 'text', [], [{ year: 2026, name: 'A' }], 12]) assert.deepEqual(C.sortClasses(value), []);
  for (const id of ['', 'a-b', 'a/b', 'a.b', '日本語']) assert.deepEqual(C.sortClasses({ [id]: { year: 2026, name: 'A' } }), []);
  for (const year of [null, '2026', undefined, NaN, Infinity, -Infinity, 1999]) assert.deepEqual(C.sortClasses({ A: { year, name: 'A' } }), []);
  for (const name of [null, 1, [], {}]) assert.deepEqual(C.sortClasses({ A: { year: 2026, name } }), []);
  for (const row of [null, [], 'text']) assert.deepEqual(C.sortClasses({ A: row }), []);
});

test('memberRows: 番号順・番号なしは後ろ・同番号ならID順。重複は選ばない', () => {
  const members = { C: null, B: 2, A: 2, D: 1, E: '3', F: NaN, G: Infinity };
  const accounts = { u1: 'A', u2: 'A', u3: 'A', u4: 'D', 'bad/key': 'B' };
  assert.deepEqual(C.memberRows(members, accounts), [
    { sid: 'D', number: 1, uid: 'u4' }, { sid: 'A', number: 2, uid: null, dup: true },
    ...['B', 'C', 'E', 'F', 'G'].map((sid) => ({ sid, number: sid === 'B' ? 2 : null, uid: null })),
  ]);
  assert.equal(accounts.u1, 'A'); assert.equal(members.E, '3');
});

test('memberRows: 不正な入力は空、不正なIDとuidは使わない', () => {
  for (const value of [null, undefined, [], [1], 'text', 42]) {
    assert.deepEqual(C.memberRows(value, {}), []);
    assert.deepEqual(C.memberRows({ A: 1 }, value), [{ sid: 'A', number: 1, uid: null }]);
  }
  for (const sid of ['', 'a'.repeat(41), 'a/b', 'a.b', 'a_b', 'あ']) assert.deepEqual(C.memberRows({ [sid]: 1 }, {}), []);
  assert.equal(C.memberRows({ ['a'.repeat(40)]: 1, 'A-1': 2 }, {}).length, 2);
  for (const uid of ['', 'a/b', 'a.b', 'a#b', 'a$b', 'a[b', 'a]b']) {
    assert.deepEqual(C.memberRows({ A: 1 }, { [uid]: 'A', good: 'A' }), [{ sid: 'A', number: 1, uid: 'good' }]);
  }
  assert.deepEqual(C.memberRows({ A: 1 }, { bad: 1 }), [{ sid: 'A', number: 1, uid: null }]);
});

test('isTeacher: trueだけが先生。false・deniedは先生でない。okだけを覚える', async () => {
  for (const value of [true, false, null, 1, 'true']) {
    const f = fixture({ data: { ['teacherList/' + UID]: value } });
    assert.deepEqual(await f.client.isTeacher(), { status: 'ok', teacher: value === true });
    await f.client.isTeacher(); assert.equal(f.calls.length, 1);
  }
  for (const status of [401, 403]) assert.deepEqual(await fixture({ fetch: () => response(status, null) }).client.isTeacher(), { status: 'ok', teacher: false });
  const f = fixture({ fetch: () => response(500, null) });
  await f.client.isTeacher(); await f.client.isTeacher(); assert.equal(f.calls.length, 2);
});

test('ログインなしはnone、通行証なし・取得例外・不正uidはoffline。投げず通信しない', async () => {
  const cases = [
    [{ savedUid: () => null, status: () => 'ok' }, 'none'],
    [{ savedUid: () => UID, status: () => 'none' }, 'none'],
    [{ savedUid: () => UID, status: () => 'ok', getToken: async () => null }, 'offline'],
    [{ savedUid: () => UID, status: () => 'ok', getToken: async () => { throw new Error(TOKEN); } }, 'offline'],
    [{ savedUid: () => 'bad/uid', status: () => 'ok' }, 'offline'],
    [{ savedUid: () => { throw new Error(TOKEN); } }, 'offline'],
  ];
  for (const [link, status] of cases) {
    const f = fixture({ link });
    for (const run of [() => f.client.isTeacher(), () => f.client.listClasses(), () => f.client.load('ClassA')]) assert.deepEqual(await run(), { status });
    assert.equal(f.calls.length, 0);
  }
});

test('先生の確認はuidが変わればやり直す。途中のアカウント変更では値を返さない', async () => {
  let uid = UID;
  const f = fixture({ link: { savedUid: () => uid, status: () => 'ok', getToken: async () => TOKEN } });
  assert.equal((await f.client.isTeacher()).teacher, true);
  uid = 'other'; assert.equal((await f.client.isTeacher()).teacher, false); assert.equal(f.calls.length, 2);
  const gate = deferred(); uid = UID;
  const late = fixture({ link: { savedUid: () => uid, status: () => 'ok', getToken: () => gate.promise } });
  const p = late.client.load('ClassA'); await Promise.resolve(); uid = 'other'; gate.resolve(TOKEN);
  assert.deepEqual(await p, { status: 'offline' }); assert.equal(late.calls.length, 0);
});

test('listClasses: 先生だけが一覧を読む。loadも先生でなければ止まる', async () => {
  const f = fixture();
  assert.deepEqual(await f.client.listClasses(), { status: 'ok', classes: [{ id: 'ClassA', year: 2026, name: '1年1組' }] });
  assert.deepEqual(f.calls, ['teacherList/' + UID, 'classes']);
  for (const value of [null, [], 'text']) {
    assert.deepEqual(await fixture({ data: { classes: value } }).client.listClasses(), { status: 'ok', classes: [] });
  }
  const student = fixture({ data: { ['teacherList/' + UID]: false } });
  assert.deepEqual(await student.client.listClasses(), { status: 'not-teacher' });
  assert.deepEqual(await student.client.load('ClassA'), { status: 'not-teacher' });
  assert.deepEqual(student.calls, ['teacherList/' + UID]);
});

test('load: ok・empty・no-account・dup・broken・failedを残す。GETとauthの決まり', async () => {
  const data = { 'members/ClassA': { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 },
    accounts: { uA: 'A', uB: 'B', uD1: 'D', uD2: 'D', uE: 'E', uF: 'F' },
    'rika/state/uA': state({ id: 'old', nickname: { toString: null } }), 'rika/state/uB': null, 'rika/state/uE': { v: 2 } };
  const f = fixture({ data, config: { dbUrl: CONFIG.dbUrl + '/' }, fetch: (path) => response(path === 'rika/state/uF' ? 403 : 200, f.data[path] ?? null) });
  const result = await f.client.load('ClassA');
  assert.equal(result.status, 'ok'); assert.equal(result.classId, 'ClassA'); assert.equal(result.classUnit, 'light'); assert.equal(result.truncated, false);
  assert.deepEqual(result.rows.map((r) => r.kind), ['ok', 'empty', 'no-account', 'dup', 'broken', 'failed']);
  assert.equal(result.rows[0].profile.nickname, ''); assert.equal(result.rows[0].record.xp, 5); assert.equal(result.rows[0].updatedAt, 10);
  assert.equal(f.calls.some((p) => p.startsWith('rika/log')), false); assert.equal(JSON.stringify(result).includes(TOKEN), false);
  f.data['rika/state/uA'] = state({ id: 'new', nickname: '更新' });
  assert.equal((await f.client.load('ClassA')).rows[0].profile.nickname, '更新');
});

test('load: 不正classIdはbroken。members・accountsの不正な形は空', async () => {
  const f = fixture();
  for (const id of ['', null, 123, [], 'a-b', 'a/b', '日本']) assert.deepEqual(await f.client.load(id), { status: 'broken' });
  assert.equal(f.calls.length, 0);
  for (const value of [null, 'text', [], [1], {}]) {
    const a = await fixture({ data: { 'members/ClassA': value } }).client.load('ClassA');
    assert.deepEqual(a.rows, []); assert.equal(a.truncated, false);
    const b = await fixture({ data: { accounts: value } }).client.load('ClassA');
    assert.equal(b.rows[0].kind, 'no-account');
  }
});

test('load: 不正な状態はbroken、50万文字まで受け取る', async () => {
  for (const value of [[], 'text', {}, { ...state(), v: 2 }, ...[null, '1', Infinity].map((updatedAt) => ({ ...state(), updatedAt })),
    ...[null, {}, 'not json', 'null', '[]', '{}', 'x'.repeat(500001)].map((json) => ({ ...state(), json }))]) {
    assert.equal((await fixture({ data: { 'rika/state/user1': value } }).client.load('ClassA')).rows[0].kind, 'broken');
  }
  const value = state(); value.json += ' '.repeat(500000 - value.json.length);
  assert.equal((await fixture({ data: { 'rika/state/user1': value } }).client.load('ClassA')).rows[0].kind, 'ok');
  assert.equal((await fixture({ unpackState: () => { throw new Error('bad'); } }).client.load('ClassA')).rows[0].kind, 'broken');
});

test('通信エラー: members・accountsは全体失敗、単元はnull、生徒はfailed', async () => {
  for (const [http, status] of [[401, 'denied'], [403, 'denied'], [500, 'offline'], [503, 'offline'], [301, 'broken'], [404, 'broken']]) {
    for (const target of ['members/ClassA', 'accounts', 'rika/classUnit/ClassA', 'rika/state/user1', 'classes']) {
      const f = fixture({ fetch: (path) => response(path === target ? http : 200, f.data[path] ?? null) });
      const r = target === 'classes' ? await f.client.listClasses() : await f.client.load('ClassA');
      if (target === 'rika/classUnit/ClassA') { assert.equal(r.status, 'ok'); assert.equal(r.classUnit, null); }
      else if (target === 'rika/state/user1') assert.equal(r.rows[0].kind, 'failed');
      else assert.deepEqual(r, { status });
    }
  }
});

test('例外・時間切れはoffline、JSONの壊れた応答はbroken。本文待ちも打ち切る', async () => {
  for (const [fetch, status] of [
    [() => { throw new Error(TOKEN); }, 'offline'], [() => new Promise(() => {}), 'offline'],
    [() => ({ status: 200, json: () => new Promise(() => {}) }), 'offline'],
    [() => ({ status: 200, json: () => { throw new Error('bad'); } }), 'broken'],
  ]) assert.deepEqual(await fixture({ fetch }).client.load('ClassA'), { status });
});

test('load: 60人は全員、61人は番号順の60人。同時に5件まで', async () => {
  for (const count of [60, 61]) {
    const ids = Array.from({ length: count }, (_, i) => 's' + i);
    let active = 0; let peak = 0;
    const f = fixture({ data: { 'members/ClassA': Object.fromEntries(ids.map((id, i) => [id, count - i])),
      accounts: Object.fromEntries(ids.map((id) => ['u' + id, id])) }, fetch: async (path) => {
      if (!path.startsWith('rika/state/')) return response(200, f.data[path]);
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setImmediate(resolve));
      active--; return response(200, null);
    } });
    const r = await f.client.load('ClassA');
    assert.equal(r.rows.length, 60); assert.equal(r.truncated, count === 61); assert.equal(peak, 5);
    assert.equal(r.rows[0].number, 1); assert.equal(r.rows.at(-1).number, 60);
    assert.equal(f.calls.filter((p) => p.startsWith('rika/state/')).length, 60);
  }
});

test('load: 同じクラスの重なりは1回。同時の別クラスは別に読む', async () => {
  const gate = deferred(); let tokens = 0;
  const f = fixture({ link: { savedUid: () => UID, status: () => 'ok', getToken: () => { tokens++; return gate.promise; } } });
  const a = f.client.load('ClassA'); assert.equal(f.client.load('ClassA'), a);
  const b = f.client.load('ClassB'); assert.notEqual(b, a); gate.resolve(TOKEN);
  await Promise.all([a, b]); assert.equal(tokens, 2);
  assert.equal(f.calls.filter((p) => p === 'members/ClassA').length, 1);
  await f.client.load('ClassA'); assert.equal(f.calls.filter((p) => p === 'members/ClassA').length, 2);
});
