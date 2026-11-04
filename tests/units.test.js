// tests/units.test.js — 単元の一覧（教材の登録状況つき）と、いま選んでいる単元（js/units.js）
const test = require('node:test'); const assert = require('node:assert/strict');
const units = require('../js/units.js');
const mascot = require('../js/mascot.js');
const { createRegistry } = require('../js/content-registry.js');
const { unit } = require('./fixtures/unit.js');

// 小さな偽の単元一覧（content/curriculum.js と同じ形）
function fakeCurriculum(rows) {
  return { GRADE_LABELS: { 1: '1年', 2: '2年', 3: '3年', 0: 'その他' }, units: () => rows.slice(), unit: (id) => rows.find((r) => r.id === id) || null };
}
const ROWS = [
  { id: 'u', title: '表の光の単元', grade: 1, field: '物理', mascot: 'B' },
  { id: 'x', title: 'まだない単元', grade: 2, field: '化学', mascot: 'C' },
];

function makeReg(list) {
  const reg = createRegistry();
  (list || [unit]).forEach((u) => reg.register(u));
  return reg;
}

test('list: 表の順に並び、教材のある単元だけ ready。先生は教材の mascot を優先', () => {
  const items = units.list(makeReg(), fakeCurriculum(ROWS));
  assert.equal(items.length, 2);
  const [u, x] = items;
  assert.equal(u.id, 'u');
  assert.equal(u.ready, true);
  assert.equal(u.unit, unit);
  assert.equal(u.title, '表の光の単元');
  assert.equal(u.grade, 1);
  assert.equal(u.field, '物理');
  // 教材 u に mascot がないので、表の 'B' ではなく まる先生
  assert.equal(u.teacher.name, mascot.MASCOTS.A.name);
  assert.equal(x.id, 'x');
  assert.equal(x.ready, false);
  assert.equal(x.unit, null);
  assert.equal(x.teacher.name, 'ぷにカプセル');
});

test('list: 教材に mascot があればその先生', () => {
  const withMascot = Object.assign({}, unit, { mascot: 'E' });
  const items = units.list(makeReg([withMascot]), fakeCurriculum(ROWS));
  assert.equal(items[0].teacher.name, mascot.MASCOTS.E.name);
});

test('list: 表にない登録済みの単元は末尾に grade 0 で足す', () => {
  const items = units.list(makeReg(), fakeCurriculum([ROWS[1]]));
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'x');
  const last = items[1];
  assert.equal(last.id, 'u');
  assert.equal(last.grade, 0);
  assert.equal(last.field, '');
  assert.equal(last.title, unit.title);
  assert.equal(last.ready, true);
  assert.equal(last.unit, unit);
  assert.equal(last.teacher.name, mascot.MASCOTS.A.name);
});

test('list: curriculum が null・{} でも例外を出さず、登録済みだけを返す', () => {
  [null, undefined, {}, { units: 'x' }].forEach((cur) => {
    const items = units.list(makeReg(), cur);
    assert.equal(items.length, 1, String(cur));
    assert.equal(items[0].id, 'u');
    assert.equal(items[0].ready, true);
    assert.equal(items[0].grade, 0);
  });
  assert.deepEqual(units.list(makeReg([]), null), []);
});

test('currentId: profile.unitId が登録済みならそれ、ほかは ready な最初の id、なければ null', () => {
  const reg = makeReg();
  const cur = fakeCurriculum(ROWS);
  assert.equal(units.currentId(reg, cur, { id: 'p1', unitId: 'u' }), 'u');
  // 未登録の id／数値／undefined／profile が null → ready な最初の id
  assert.equal(units.currentId(reg, cur, { id: 'p1', unitId: 'x' }), 'u');
  assert.equal(units.currentId(reg, cur, { id: 'p1', unitId: 'nope' }), 'u');
  assert.equal(units.currentId(reg, cur, { id: 'p1', unitId: 3 }), 'u');
  assert.equal(units.currentId(reg, cur, { id: 'p1' }), 'u');
  assert.equal(units.currentId(reg, cur, null), 'u');
  assert.equal(units.currentId(reg, null, null), 'u');
  // 登録が 0 件
  assert.equal(units.currentId(makeReg([]), cur, { id: 'p1', unitId: 'u' }), null);
});

test('currentId: 2 つ登録されていれば、選んだほう／なければ表で先のほう', () => {
  const other = Object.assign({}, unit, { id: 'x', title: 'もう一つの単元', areas: [], concepts: [] });
  const reg = makeReg([other, unit]);   // 登録順は x → u
  const cur = fakeCurriculum(ROWS);     // 表の順は u → x
  assert.equal(units.currentId(reg, cur, { unitId: 'x' }), 'x');
  assert.equal(units.currentId(reg, cur, {}), 'u');
  // 表がなければ登録順
  assert.equal(units.currentId(reg, null, {}), 'x');
});
