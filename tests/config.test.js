// tests/config.test.js
const test = require('node:test'); const assert = require('node:assert/strict');

test('授業ログとのつながりの設定は、文字列・https の URL・正の時間を持つ', () => {
  const c = require('../js/config.js').link;
  ['authKey', 'apiKey', 'tokenUrl', 'jugyoUrl', 'dbUrl', 'acctKeyPrefix', 'syncKeyPrefix'].forEach((key) => {
    assert.equal(typeof c[key], 'string');
    assert.ok(c[key].trim().length > 0);
  });
  ['tokenUrl', 'jugyoUrl', 'dbUrl'].forEach((key) => assert.ok(c[key].startsWith('https://')));
  ['timeoutMs', 'recheckMs', 'pushDelayMs', 'pullMinMs', 'stateMaxChars', 'chunkMaxChars'].forEach((key) => {
    assert.equal(typeof c[key], 'number');
    assert.ok(Number.isFinite(c[key]) && c[key] > 0);
  });
});
test('config の暫定値は設計書どおり', () => {
  const c = require('../js/config.js');
  assert.equal(c.xp.stageClear, 50); assert.equal(c.tolerance.reflectDeg, 5); assert.deepEqual(c.levels, [0, 100, 250, 450, 700]);
});

test('ライブクイズのデータベースの URL は https で、live-db の normalizeUrl を通る', () => {
  const c = require('../js/config.js');
  const liveDb = require('../js/live-db.js');
  assert.ok(c.live && typeof c.live.dbUrl === 'string');
  assert.ok(c.live.dbUrl.startsWith('https://'));
  assert.equal(liveDb.normalizeUrl(c.live.dbUrl), c.live.dbUrl);
});

test('末尾に / やパスの付いた URL も、normalizeUrl で組みこみの URL と同じになる', () => {
  const c = require('../js/config.js');
  const liveDb = require('../js/live-db.js');
  const builtin = liveDb.normalizeUrl(c.live.dbUrl);
  assert.equal(liveDb.normalizeUrl(c.live.dbUrl + '/'), builtin);
  assert.equal(liveDb.normalizeUrl('  ' + c.live.dbUrl + '/  '), builtin);
  assert.equal(liveDb.normalizeUrl(c.live.dbUrl + '/rooms.json'), builtin);
  assert.equal(liveDb.normalizeUrl(c.live.dbUrl.toUpperCase().replace('HTTPS://', 'https://')), builtin);
});
