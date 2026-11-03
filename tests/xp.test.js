// tests/xp.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const xp = require('../js/xp.js');
const config = require('../js/config.js');
test('xp.amountFor: answer 10, retryCorrect 15, stageClear 50, daily は 10×連続日数で上限 50', () => {
  assert.equal(xp.amountFor('answer', config), 10);
  assert.equal(xp.amountFor('retryCorrect', config), 15);
  assert.equal(xp.amountFor('stageClear', config), 50);
  assert.equal(xp.amountFor('daily', config, { streak: 3 }), 30);
  assert.equal(xp.amountFor('daily', config, { streak: 9 }), 50);
  assert.equal(xp.amountFor('unknown', config), 0);
});
test('levelFor: 0→1, 99→1, 100→2, 700→5, 1000→6, 1299→6, 1300→7', () => {
  const cases = [[0, 1], [99, 1], [100, 2], [700, 5], [1000, 6], [1299, 6], [1300, 7]];
  for (const [total, level] of cases) assert.equal(xp.levelFor(total, config), level, `${total} XP`);
});
test('nextLevelXp: Lv1 → 100, Lv5 → 1000, Lv6 → 1300', () => {
  assert.equal(xp.nextLevelXp(1, config), 100);
  assert.equal(xp.nextLevelXp(5, config), 1000);
  assert.equal(xp.nextLevelXp(6, config), 1300);
});
test('streak: 同じ日は変化なし、翌日は +1、1 日空くと 1', () => {
  let r = xp.updateStreak({ count: 0, lastDate: null }, '2026-11-03'); assert.deepEqual(r, { streak: { count: 1, lastDate: '2026-11-03' }, isFirstToday: true });
  r = xp.updateStreak(r.streak, '2026-11-03'); assert.equal(r.isFirstToday, false); assert.equal(r.streak.count, 1);
  r = xp.updateStreak(r.streak, '2026-11-04'); assert.equal(r.streak.count, 2);
  r = xp.updateStreak(r.streak, '2026-11-06'); assert.equal(r.streak.count, 1);
});
test('localDate は端末ローカルの日付（23:59 と翌 0:01 で日が変わる）', () => { assert.equal(xp.localDate(new Date(2026, 10, 3, 23, 59)), '2026-11-03'); assert.equal(xp.localDate(new Date(2026, 10, 4, 0, 1)), '2026-11-04'); });
test('daysBetween: 翌日は 1、同じ日は 0、前の日は負、月またぎも数える', () => {
  assert.equal(xp.daysBetween('2026-11-03', '2026-11-04'), 1);
  assert.equal(xp.daysBetween('2026-11-03', '2026-11-03'), 0);
  assert.equal(xp.daysBetween('2026-11-06', '2026-11-03'), -3);
  assert.equal(xp.daysBetween('2026-10-31', '2026-11-01'), 1);
});
