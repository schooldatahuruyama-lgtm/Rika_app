// テスト用の小道具
// fakeStorage: localStorage の代わりになる Map ラッパー（getItem/setItem/removeItem）
// options.throwOn(key) が true を返すキーへの setItem は例外を投げる（退避の失敗を再現する）
function fakeStorage(initial, options) {
  const map = new Map(Object.entries(initial || {}));
  const throwOn = options && typeof options.throwOn === 'function' ? options.throwOn : null;
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) {
      if (throwOn && throwOn(key)) throw new Error('quota');
      map.set(key, String(value));
    },
    removeItem(key) { map.delete(key); },
    keys() { return [...map.keys()]; },
  };
}

module.exports = { fakeStorage };
