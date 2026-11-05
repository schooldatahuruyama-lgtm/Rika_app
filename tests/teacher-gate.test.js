// tests/teacher-gate.test.js — 先生画面のパスコード
const test = require('node:test'); const assert = require('node:assert/strict');
const gate = require('../js/teacher-gate.js');
const { fakeStorage } = require('./helpers.js');

const t0 = new Date(2026, 10, 5, 10, 0, 0).getTime();

test('isValidCode: 4〜8 桁の数字だけ', () => {
  ['1234', '00000000', '5678901'].forEach((c) => assert.equal(gate.isValidCode(c), true, c));
  ['123', '123456789', '12a4', ' 1234', '', 1234, null, undefined, { toString: null }].forEach((c) => assert.equal(gate.isValidCode(c), false, String(typeof c)));
});

test('簡易ハッシュ（fnv）は決まった値を返し、コード・salt が違えば変わる', async () => {
  const a = await gate.hashCode('1234', 'salt', 'fnv');
  const b = await gate.hashCode('1234', 'salt', 'fnv');
  assert.equal(a.algo, 'fnv');
  assert.match(a.hash, /^[0-9a-f]{32}$/);
  assert.equal(a.hash, b.hash);
  assert.notEqual((await gate.hashCode('1235', 'salt', 'fnv')).hash, a.hash);
  assert.notEqual((await gate.hashCode('1234', 'salu', 'fnv')).hash, a.hash);
});

test('hashCode: SHA-256 が使えればそれ（64 文字）', async () => {
  const h = await gate.hashCode('1234', 'salt');
  assert.equal(h.algo, 'sha256');
  assert.match(h.hash, /^[0-9a-f]{64}$/);
  assert.equal((await gate.hashCode('1234', 'salt', 'sha256')).hash, h.hash);
});

test('verify: 合えば true、ちがえば false（sha256 と fnv のどちらも、保存した方式で照合する）', async () => {
  const data = await gate.create('2580');
  assert.equal(data.algo, 'sha256'); assert.equal(data.failed, 0); assert.equal(data.lockUntil, 0);
  assert.equal(await gate.verify(data, '2580'), true);
  assert.equal(await gate.verify(data, '2581'), false);
  assert.equal(await gate.verify(data, 'abcd'), false);
  const salt = 'abc';
  const fnv = { algo: 'fnv', salt, hash: (await gate.hashCode('13579', salt, 'fnv')).hash, failed: 0, lockUntil: 0 };
  assert.equal(await gate.verify(fnv, '13579'), true);
  assert.equal(await gate.verify(fnv, '13570'), false);
  assert.equal(await gate.verify(null, '13579'), false);
  await assert.rejects(gate.create('12'));
});

test('recordFailure: 5 回でロック、60 秒後に解除、成功で 0', () => {
  let d = { algo: 'fnv', salt: 's', hash: 'h', failed: 0, lockUntil: 0 };
  for (let i = 1; i <= 4; i++) {
    d = gate.recordFailure(d, t0);
    assert.equal(d.failed, i); assert.equal(gate.canTry(d, t0), true); assert.equal(gate.triesLeft(d), 5 - i);
  }
  d = gate.recordFailure(d, t0);
  assert.equal(d.lockUntil, t0 + 60000);
  assert.equal(gate.canTry(d, t0), false);
  assert.equal(gate.canTry(d, t0 + 59999), false);
  assert.equal(gate.lockSecondsLeft(d, t0 + 30500), 30);
  assert.equal(gate.canTry(d, t0 + 60000), true);
  assert.equal(gate.canTry(d, new Date(t0 + 60001)), true);
  assert.equal(gate.lockSecondsLeft(d, t0 + 60000), 0);
  const ok = gate.recordSuccess(gate.recordFailure(d, t0 + 61000));
  assert.equal(ok.failed, 0); assert.equal(ok.lockUntil, 0);
  // 元は変えない
  const before = { algo: 'fnv', salt: 's', hash: 'h', failed: 2, lockUntil: 0 };
  gate.recordFailure(before, t0);
  assert.equal(before.failed, 2);
});

test('load / save: 保存して読める。未設定・壊れたデータは null で、例外を出さない', async () => {
  const s = fakeStorage();
  assert.equal(gate.load(s), null);
  const data = await gate.create('1234');
  assert.equal(gate.save(s, data), true);
  assert.deepEqual(gate.load(s), data);
  assert.deepEqual(JSON.parse(s.getItem('rika-quest:teacher')), data);
  ['{broken', 'null', '[]', '"x"', '{"algo":"md5","salt":"s","hash":"h"}', '{"algo":"fnv","salt":1,"hash":"h"}', '{"algo":"fnv","salt":"s","hash":""}'].forEach((raw) => {
    assert.equal(gate.load(fakeStorage({ 'rika-quest:teacher': raw })), null, raw);
  });
  // 失敗回数・ロックの形が違えば 0 にする
  assert.deepEqual(gate.load(fakeStorage({ 'rika-quest:teacher': '{"algo":"fnv","salt":"s","hash":"h","failed":"x","lockUntil":null}' })), { algo: 'fnv', salt: 's', hash: 'h', failed: 0, lockUntil: 0 });
  // 読むだけで例外を出す storage
  assert.equal(gate.load({ getItem() { throw new Error('denied'); } }), null);
  assert.equal(gate.load(null), null);
  // 書けない storage・正しくない形は false
  assert.equal(gate.save(fakeStorage({}, { throwOn: () => true }), data), false);
  assert.equal(gate.save(s, { algo: 'x' }), false);
});

test('crypto.subtle が使えない開き方では fnv で作り、sha256 のデータは照合できない（false）', async () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const sha = await gate.create('4321');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
  try {
    const data = await gate.create('4321');
    assert.equal(data.algo, 'fnv');
    assert.match(data.salt, /^[0-9a-f]{32}$/);
    assert.equal(await gate.verify(data, '4321'), true);
    assert.equal(gate.canVerify(sha), false);
    assert.equal(await gate.verify(sha, '4321'), false);
  } finally {
    Object.defineProperty(globalThis, 'crypto', desc);
  }
  assert.equal(gate.canVerify(sha), true);
});

test('stricter: 同じパスコードなら失敗回数・ロックの大きいほう、違えば保存データ、保存データがなければ null', () => {
  const a = { algo: 'fnv', salt: 's', hash: 'h', failed: 1, lockUntil: 0 };
  assert.deepEqual(gate.stricter(a, Object.assign({}, a, { failed: 3, lockUntil: 50 })), Object.assign({}, a, { failed: 3, lockUntil: 50 }));
  assert.deepEqual(gate.stricter(Object.assign({}, a, { failed: 4 }), a), Object.assign({}, a, { failed: 4 }));
  assert.equal(gate.stricter(a, Object.assign({}, a, { salt: 'x', failed: 4 })), a);
  assert.equal(gate.stricter(a, null), a);
  assert.equal(gate.stricter(null, a), null);
  assert.equal(gate.sameCode(a, Object.assign({}, a, { failed: 9 })), true);
  assert.equal(gate.sameCode(a, null), false);
});

// 書きこみの失敗を切りかえられる storage
function flakyStorage() {
  let fail = false;
  const s = fakeStorage({}, { throwOn: () => fail });
  s.setFail = (v) => { fail = v; };
  return s;
}

test('attempt: 毎回読み直す。合う・ちがう（5 回でロック）・形式ちがいは数えない・ロック後に解除', async () => {
  const s = fakeStorage();
  gate.save(s, await gate.create('2468'));
  let r = await gate.attempt(s, '12', t0, null);
  assert.equal(r.status, 'invalid'); assert.equal(gate.load(s).failed, 0);
  for (let i = 1; i <= 4; i++) {
    r = await gate.attempt(s, '1111', t0, null);
    assert.equal(r.status, 'wrong'); assert.equal(r.triesLeft, 5 - i); assert.equal(gate.load(s).failed, i);
  }
  r = await gate.attempt(s, '1111', t0, null);
  assert.equal(r.status, 'locked'); assert.equal(r.seconds, 60); assert.equal(gate.load(s).lockUntil, t0 + 60000);
  r = await gate.attempt(s, '2468', t0 + 30000, null);
  assert.equal(r.status, 'locked'); assert.equal(r.seconds, 30);
  r = await gate.attempt(s, '2468', t0 + 60000, null);
  assert.equal(r.status, 'ok'); assert.equal(r.data.saved, true); assert.equal(r.held, null);
  assert.equal(gate.load(s).failed, 0); assert.equal(gate.load(s).lockUntil, 0);
});

test('attempt: 保存データがなければ unset（古いデータは使わない）。照合のあいだに消えた・変わったら上書きしない', async () => {
  assert.equal((await gate.attempt(fakeStorage(), '2468', t0, null)).status, 'unset');
  const data = await gate.create('2468');
  // held だけがあっても使わない
  assert.equal((await gate.attempt(fakeStorage(), '2468', t0, data)).status, 'unset');

  // 1 回目の読みこみのあとで消える storage
  const raw = JSON.stringify(data);
  let reads = 0;
  const vanishing = { getItem: () => (reads++ === 0 ? raw : null), setItem: () => { throw new Error('書いてはいけない'); }, removeItem() {} };
  assert.equal((await gate.attempt(vanishing, '1111', t0, null)).status, 'unset');

  // 1 回目の読みこみのあとで別のパスコードに変わる storage
  const other = JSON.stringify(await gate.create('1357'));
  let n = 0; let written = false;
  const changing = { getItem: () => (n++ === 0 ? raw : other), setItem: () => { written = true; }, removeItem() {} };
  const r = await gate.attempt(changing, '1111', t0, null);
  assert.equal(r.status, 'changed'); assert.equal(written, false);
});

test('attempt: 保存に失敗したら失敗回数・ロックを held で持ち続け、保存できるまで照合しない', async () => {
  const s = flakyStorage();
  gate.save(s, await gate.create('2468'));
  // 4 回まちがえておく
  let held = null;
  for (let i = 0; i < 4; i++) held = (await gate.attempt(s, '1111', t0, held)).held;
  assert.equal(held, null); assert.equal(gate.load(s).failed, 4);
  s.setFail(true);
  // 5 回目: ロックを保存できない → blocked。held にロックが入る
  let r = await gate.attempt(s, '1111', t0, held);
  assert.equal(r.status, 'blocked'); assert.equal(r.held.lockUntil, t0 + 60000);
  assert.equal(gate.load(s).failed, 4); assert.equal(gate.load(s).lockUntil, 0);   // storage は古いまま
  held = r.held;
  // 保存できないあいだは、正しいコードでも照合しない
  r = await gate.attempt(s, '2468', t0 + 1000, held);
  assert.equal(r.status, 'blocked'); assert.equal(r.held.lockUntil, t0 + 60000);
  held = r.held;
  // 保存できるようになったら、持っていたロックを先に保存し、ロック中として扱う（保存済みの「失敗 4 回・未ロック」は使わない）
  s.setFail(false);
  r = await gate.attempt(s, '2468', t0 + 2000, held);
  assert.equal(r.status, 'locked'); assert.equal(r.seconds, 58); assert.equal(r.held, null);
  assert.equal(gate.load(s).lockUntil, t0 + 60000);
  // 成功の保存に失敗しても、合っていれば ok（saved: false）
  s.setFail(true);
  r = await gate.attempt(s, '2468', t0 + 61000, null);
  assert.equal(r.status, 'ok'); assert.equal(r.data.saved, false);
});

test('isGone: 一度見た保存データが今はないときだけ true（画面はページを読み込み直す）', async () => {
  const data = await gate.create('2468');
  assert.equal(gate.isGone(true, null), true);
  assert.equal(gate.isGone(true, data), false);
  assert.equal(gate.isGone(false, null), false);   // はじめて決める端末は、決めるフォームでよい
  assert.equal(gate.isGone(false, data), false);
  // 送信の時点で保存データがない → unset（画面は読み込み直す）。storage には何も書かない
  const s = fakeStorage();
  const r = await gate.attempt(s, '2468', t0, data);
  assert.equal(r.status, 'unset'); assert.equal(r.held, null); assert.equal(r.data, null);
  assert.equal(gate.isGone(true, gate.load(s)), true);
  assert.deepEqual(s.keys(), []);
});

test('storeVanished: 学習記録のキーがない（null）のにメモリに生徒がいるときだけ true', () => {
  assert.equal(gate.storeVanished(null, 2), true);    // ほかのタブで「すべて削除」された
  assert.equal(gate.storeVanished(null, 0), false);   // はじめての端末・まだだれもいない
  assert.equal(gate.storeVanished('{"version":1}', 2), false);
  assert.equal(gate.storeVanished(undefined, 2), false);   // 読めなかった（確かめられない）
  assert.equal(gate.storeVanished(null, undefined), false);
  // fakeStorage でキーを消したあと
  const s = fakeStorage({ 'rika-quest:v1': '{"version":1,"profiles":[]}' });
  assert.equal(gate.storeVanished(s.getItem('rika-quest:v1'), 1), false);
  s.removeItem('rika-quest:v1');
  assert.equal(gate.storeVanished(s.getItem('rika-quest:v1'), 1), true);
});
