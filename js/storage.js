// localStorage の読み書き・退避・JSON 書き出し/読み込み
// storageObj は getItem/setItem/removeItem を持つもの（本番は localStorage、テストは fakeStorage）
(function (root) {
  'use strict';

  const record = typeof require === 'function' ? require('./record.js') : root.RikaQuest.record;

  const CORRUPT_PREFIX = 'rika-quest:corrupt:';
  const LOAD_ERROR = '保存データを読み込めません（壊れているか、形式が違います）。新しい記録で始めます。';
  const KEEP_ERROR = '保存データを読み込めません。元のデータを退避できなかったので、そのまま残しています。';
  const IMPORT_ERROR = 'ファイルを読み込めません（壊れているか、形式が違います）。';

  // 元のキーに読めないデータが残っている storage。allowOverwrite なしの save を断る
  const protectedStorages = new Set();

  // 文字列を store として読む。読めなければ { store: null, error: true }
  function parseStore(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { store: null, error: true };
    }
    if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.profiles)) {
      return { store: null, error: true };
    }
    // 足りない項目だけ補う
    const records = data.records && typeof data.records === 'object' && !Array.isArray(data.records) ? data.records : {};
    const currentProfileId = typeof data.currentProfileId === 'string' ? data.currentProfileId : null;
    return { store: Object.assign({}, data, { records, currentProfileId }), error: false };
  }

  function load(storageObj, config) {
    const key = config.storageKey;
    protectedStorages.delete(storageObj);
    let raw;
    try {
      raw = storageObj.getItem(key);
    } catch (e) {
      // 中身を確かめられないので、上書きしないように守る
      protectedStorages.add(storageObj);
      return { store: record.createStore(), error: KEEP_ERROR, quarantinedKey: null, originalKept: false };
    }
    if (raw === null || raw === undefined) {
      return { store: record.createStore(), error: null, quarantinedKey: null, originalKept: true };
    }
    const parsed = parseStore(raw);
    if (!parsed.error) {
      return { store: parsed.store, error: null, quarantinedKey: null, originalKept: true };
    }
    // 読めないデータは退避キーへ写してから元のキーを消す
    const quarantinedKey = CORRUPT_PREFIX + new Date().toISOString();
    try {
      storageObj.setItem(quarantinedKey, raw);
    } catch (e) {
      // 退避できなかった: 元のキーは消さず、以後の save で上書きしないようにする
      protectedStorages.add(storageObj);
      return { store: record.createStore(), error: KEEP_ERROR, quarantinedKey: null, originalKept: false };
    }
    try {
      storageObj.removeItem(key);
    } catch (e) {
      // 写しはできているので、元のキーが残っても上書きしてよい
    }
    return { store: record.createStore(), error: LOAD_ERROR, quarantinedKey, originalKept: true };
  }

  function save(storageObj, store, config, { allowOverwrite = false } = {}) {
    if (protectedStorages.has(storageObj) && !allowOverwrite) return false;
    try {
      storageObj.setItem(config.storageKey, JSON.stringify(store));
    } catch (e) {
      return false;
    }
    protectedStorages.delete(storageObj);
    return true;
  }

  function exportJson(store) {
    return JSON.stringify(store, null, 2);
  }

  // 読み込んだファイルは利用者の手元に残るので退避はしない。error のとき store は null
  function importJson(text) {
    const parsed = parseStore(text);
    if (parsed.error) return { store: null, error: IMPORT_ERROR };
    return { store: parsed.store, error: null };
  }

  const api = { load, save, exportJson, importJson };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { storage: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
