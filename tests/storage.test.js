// tests/storage.test.js
const test = require('node:test'); const assert = require('node:assert/strict');
const storage = require('../js/storage.js');
const record = require('../js/record.js');
const config = require('../js/config.js');
const { fakeStorage } = require('./helpers.js');

function sampleStore() {
  const store = record.createStore();
  const now = new Date(2026, 10, 3, 10, 0);
  const p = record.createProfile(store, { nickname: 'ひかり', avatar: 'cat' }, now);
  store.records[p.id] = record.applyEvents(store.records[p.id], [{ kind: 'answer' }, { kind: 'mastery', conceptId: 'c1', change: 'later' }], { now, stageId: 'st1' }, config);
  return store;
}

test('load: 保存がなければ空の store', () => {
  const r = storage.load(fakeStorage(), config);
  assert.deepEqual(r, { store: record.createStore(), error: null, quarantinedKey: null, originalKept: true });
});

test('save returns false when storage throws', () => { const bad = { setItem() { throw new Error('quota'); }, getItem() { return null; } }; assert.equal(storage.save(bad, record.createStore(), config), false); });

test('load: 退避に失敗したら元のキーを残し、以後の save は allowOverwrite なしでは false', () => {
  const mem = fakeStorage({ [config.storageKey]: '{not json' }, { throwOn: (key) => key.startsWith('rika-quest:corrupt:') });
  const r = storage.load(mem, config);
  assert.equal(r.originalKept, false); assert.equal(r.quarantinedKey, null); assert.match(r.error, /読み込めません/);
  assert.equal(r.store.profiles.length, 0);
  assert.equal(mem.getItem(config.storageKey), '{not json');
  assert.equal(storage.save(mem, sampleStore(), config), false);
  assert.equal(mem.getItem(config.storageKey), '{not json');
  const s = sampleStore();
  assert.equal(storage.save(mem, s, config, { allowOverwrite: true }), true);
  assert.deepEqual(JSON.parse(mem.getItem(config.storageKey)), s);
  // 上書きしたあとは普通に保存できる
  assert.equal(storage.save(mem, s, config), true);
});

test('load quarantines corrupt data', () => {
  const mem = fakeStorage({ 'rika-quest:v1': '{not json' });
  const r = storage.load(mem, config);
  assert.equal(r.store.profiles.length, 0); assert.match(r.error, /読み込めません/); assert.match(r.quarantinedKey, /^rika-quest:corrupt:/); assert.equal(mem.getItem(r.quarantinedKey), '{not json');
});

test('load: version 不明・profiles が配列でないものも退避し、元のキーを消す', () => {
  for (const raw of [JSON.stringify({ version: 2, profiles: [], records: {} }), JSON.stringify({ version: 1, profiles: {} }), 'null']) {
    const mem = fakeStorage({ [config.storageKey]: raw });
    const r = storage.load(mem, config);
    assert.match(r.error, /読み込めません/, raw);
    assert.equal(r.originalKept, true);
    assert.equal(mem.getItem(r.quarantinedKey), raw);
    assert.equal(mem.getItem(config.storageKey), null);
    // 退避できたので保存はできる
    assert.equal(storage.save(mem, r.store, config), true);
  }
});

test('load/save の往復で同じ store', () => {
  const mem = fakeStorage();
  const s = sampleStore();
  assert.equal(storage.save(mem, s, config), true);
  const r = storage.load(mem, config);
  assert.equal(r.error, null); assert.equal(r.originalKept, true); assert.equal(r.quarantinedKey, null);
  assert.deepEqual(r.store, s);
});

test('load: 足りない records・currentProfileId を補う', () => {
  const mem = fakeStorage({ [config.storageKey]: JSON.stringify({ version: 1, profiles: [] }) });
  const r = storage.load(mem, config);
  assert.equal(r.error, null);
  assert.deepEqual(r.store, record.createStore());
});

test('exportJson は 2 字下げ、importJson で戻る', () => {
  const s = sampleStore();
  const text = storage.exportJson(s);
  assert.equal(text, JSON.stringify(s, null, 2));
  assert.deepEqual(storage.importJson(text), { store: s, error: null });
});

test('importJson: version が違えば error', () => {
  const r = storage.importJson(JSON.stringify({ version: 2, profiles: [], records: {} }));
  assert.equal(r.store, null); assert.match(r.error, /読み込めません/);
  const bad = storage.importJson('{not json');
  assert.equal(bad.store, null); assert.match(bad.error, /読み込めません/);
});

// app.js の normalizeStore（見た目の設定）。app.js はブラウザ用なので、document のない vm の中で読み込む（start は呼ばれない）
test('normalizeStore: profile.theme・ruby・sound の知らない値は消し、正しい値は残す', () => {
  const vm = require('node:vm'); const fs = require('node:fs'); const path = require('node:path');
  const context = { RikaQuest: { record, config }, console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'), context);
  const store = record.createStore();
  store.profiles = [
    { id: 'a', nickname: 'A', theme: 'teal', ruby: 'on', sound: false },
    { id: 'b', nickname: 'B', theme: 'red', ruby: 1, sound: 'off' },
    { id: 'c', nickname: 'C', sound: true },
  ];
  const out = context.RikaQuest.app.normalizeStore(store);
  assert.equal(out.profiles[0].theme, 'teal');
  assert.equal(out.profiles[0].ruby, 'on');
  assert.equal(out.profiles[0].sound, false);
  ['theme', 'ruby', 'sound'].forEach((k) => assert.equal(k in out.profiles[1], false, k + ' が残っている'));
  assert.equal(out.profiles[2].sound, true);
});
