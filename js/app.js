// 画面の切り替え、保存のタイミング、起動（ブラウザ専用。index.html の最後に読み込む）
// RikaQuest.app を作る。
//   app.state  = { store, record（getter: 今の生徒の記録）, reg, config, screen, params, session, offline, protectedStorage, contentErrors }
//   app.go(name, params)      … 画面を切り替える。RikaQuest.ui.screens[name](section, ctx, params) を呼ぶ
//   app.save(options)         … storage.save(localStorage, store, config, options)。false なら header に「保存できません」
//   app.message(text, kind)   … header の下にお知らせ（kind: 'info' | 'ok' | 'warn'）。次の go で消える
//   app.setRecord(record)     … 今の生徒の記録を置きかえて保存（record.js の関数は新しい record を返すため）
//   app.replaceStore(store)   … store 全体を置きかえ（JSON の読み込み）、整えて保存
//   app.record                … 今の生徒の記録（store.records[store.currentProfileId]）
//   app.offline               … オフライン教材の状態（Task 14 が書く。app.state.offline と同じ値）
// 画面を足すとき: index.html に <section id="screen-<name>" class="screen" hidden> を置き、
//   RikaQuest.ui.screens[name] = function (section, ctx, params) { ... } を登録する（app.js より前に読み込む）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;

  const NOTICE_QUARANTINED = '前回の記録が読み込めなかったため、別の場所に残してあります';
  const NOTICE_KEPT = '読み込めない記録が残っているため、新しい記録は保存されません。設定画面から対処してください';
  const NOTICE_FILE = 'このまま使えますが、オフライン対応は http で開いたときだけ有効です';
  const NOTICE_NO_STORAGE = 'この環境ではブラウザに記録を保存できません。閉じると記録は消えます。';

  // プロフィールがなくても開ける画面
  const NO_PROFILE_SCREENS = ['profile', 'settings'];

  const state = {
    store: null,
    reg: RQ.content,
    config: RQ.config,
    screen: null,
    params: null,
    session: null,          // Task 12: いま進めている学習（session.js の形）
    offline: null,          // Task 14: オフライン教材の状態
    protectedStorage: false,
    contentErrors: [],
    storageObj: null,       // 読み書きに使う storage（ふつうは localStorage）
  };
  Object.defineProperty(state, 'record', { enumerable: true, get: currentRecord });

  let cleanup = null;   // 今の画面の描画関数が返した後片付け

  function byId(id) { return document.getElementById(id); }

  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

  function currentProfile() {
    const store = state.store;
    if (!store) return null;
    return store.profiles.find((p) => p.id === store.currentProfileId) || null;
  }

  function currentRecord() {
    const store = state.store;
    if (!store || !store.currentProfileId) return null;
    return store.records[store.currentProfileId] || null;
  }

  function isFiniteNumber(x) { return typeof x === 'number' && Number.isFinite(x); }

  // record の項目ごとの正しい形
  const RECORD_CHECKS = {
    xp: isFiniteNumber,
    level: isFiniteNumber,
    streak: (s) => isObject(s) && isFiniteNumber(s.count) && (s.lastDate === null || typeof s.lastDate === 'string'),
    mastery: isObject,
    stages: isObject,
    lessonsRead: isObject,
    reviewDone: isObject,
    history: Array.isArray,
    xpLog: Array.isArray,
  };

  // 形の違う項目は createRecord() の同じ項目の値に置きかえる（知らない項目はそのまま残す）
  function normalizeRecord(rec) {
    const fresh = RQ.record.createRecord();
    if (!isObject(rec)) return fresh;
    const out = Object.assign({}, rec);
    Object.keys(RECORD_CHECKS).forEach((key) => {
      if (!RECORD_CHECKS[key](out[key])) out[key] = fresh[key];
    });
    return out;
  }

  // 読み込んだ store を整える: 生徒ごとに記録があるように、形の違う項目は初期値で補う
  function normalizeStore(store) {
    if (!isObject(store.records)) store.records = {};
    store.profiles = (Array.isArray(store.profiles) ? store.profiles : []).filter((p) => isObject(p) && typeof p.id === 'string');
    store.profiles.forEach((p) => {
      if (typeof p.nickname !== 'string') p.nickname = p.nickname === undefined || p.nickname === null ? '' : String(p.nickname);
      store.records[p.id] = normalizeRecord(store.records[p.id]);
    });
    if (!store.profiles.some((p) => p.id === store.currentProfileId)) {
      store.currentProfileId = store.profiles.length > 0 ? store.profiles[0].id : null;
    }
    return store;
  }

  // ---- 保存 ----

  function setSaveStatus(ok) {
    const status = byId('save-status');
    if (!status) return;
    status.textContent = ok ? '保存済み' : '保存できません';
    status.classList.toggle('is-error', !ok);
  }

  function save(options) {
    let ok = false;
    try {
      ok = RQ.storage.save(state.storageObj, state.store, state.config, options || {});
    } catch (e) {
      console.error(e);
      ok = false;
    }
    if (ok && options && options.allowOverwrite) state.protectedStorage = false;
    setSaveStatus(ok);
    return ok;
  }

  function setRecord(newRecord) {
    const id = state.store.currentProfileId;
    if (!id) return false;
    state.store.records[id] = newRecord;
    return save();
  }

  function replaceStore(newStore) {
    state.store = normalizeStore(newStore);
    updateHeader();
    return save();
  }

  // 「すべて削除」: 保存データを消して読み込み直す
  function clearAll() {
    try {
      state.storageObj.removeItem(state.config.storageKey);
    } catch (e) {
      console.error(e);
    }
    root.location.reload();
  }

  // ---- お知らせ ----

  function message(text, kind) {
    const box = byId('message');
    if (!box) return;
    if (!text) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.className = 'notice kind-' + (kind || 'info');
    box.textContent = text;
    box.hidden = false;
  }

  function showNotice(id, text) {
    const p = byId(id);
    if (!p) return;
    p.textContent = text;
    p.hidden = false;
  }

  function updateHeader() {
    const box = byId('header-profile');
    if (!box) return;
    const p = currentProfile();
    box.replaceChildren();
    if (!p) return;
    const ui = RQ.ui && RQ.ui.helpers;
    if (ui) box.append(ui.avatarBadge(p.avatar, true), ' ');
    box.append(document.createTextNode(p.nickname));
  }

  // ---- 画面の切り替え ----

  function makeCtx() {
    return {
      get store() { return state.store; },
      get record() { return currentRecord(); },
      reg: state.reg,
      config: state.config,
      go,
      save,
      now: () => new Date(),
      message,
      setRecord,
      replaceStore,
      clearAll,
      confirm: (text, okLabel) => RQ.ui.helpers.confirm(text, okLabel),
      state,
      app,
    };
  }

  function go(name, params) {
    let screen = name;
    let p = params || {};
    // プロフィールがないと開けない画面は、プロフィール画面へ
    if (NO_PROFILE_SCREENS.indexOf(screen) === -1 && !currentProfile()) {
      screen = 'profile';
      p = {};
    }
    const screens = (RQ.ui && RQ.ui.screens) || {};
    const renderer = screens[screen];
    const section = byId('screen-' + screen);
    if (typeof renderer !== 'function' || !section) {
      console.error('画面がありません: ' + screen);
      if (screen !== 'home' && screen !== 'profile') go('home');
      return;
    }

    if (typeof cleanup === 'function') {
      try { cleanup(); } catch (e) { console.error(e); }
    }
    cleanup = null;

    document.querySelectorAll('.screen').forEach((s) => { s.hidden = true; });
    section.replaceChildren();
    section.hidden = false;
    state.screen = screen;
    state.params = p;
    message('');
    updateHeader();

    try {
      const result = renderer(section, makeCtx(), p);
      if (typeof result === 'function') cleanup = result;
    } catch (e) {
      console.error(e);
      renderFailure(section, screen);
    }
    root.scrollTo(0, 0);
  }

  // 描画に失敗した画面: 詰まないように、移れる先のボタンを出す（ui の道具は使わない）
  function renderFailure(section, screen) {
    function btn(label, onClick, primary) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-block' + (primary ? ' btn-primary' : '');
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }
    const box = document.createElement('div');
    box.className = 'card stack';
    const p = document.createElement('p');
    p.textContent = '画面を表示できませんでした。記録の形が正しくない可能性があります。';
    box.append(p);
    if (screen !== 'home' && currentProfile()) box.append(btn('ホームへ', () => go('home'), true));
    if (screen !== 'settings') {
      box.append(btn('設定へ', () => go('settings'), screen === 'home' || !currentProfile()));
    } else {
      // 設定画面そのものが描けないときは、すべて削除だけはできるようにする
      box.append(btn('すべて削除', () => {
        const ask = RQ.ui && RQ.ui.helpers && RQ.ui.helpers.confirm
          ? RQ.ui.helpers.confirm('すべてのプロフィールと記録を削除します。元に戻せません。よろしいですか？', 'すべて削除する')
          : Promise.resolve(root.confirm('すべてのプロフィールと記録を削除します。元に戻せません。よろしいですか？'));
        ask.then((ok) => { if (ok) clearAll(); });
      }));
    }
    section.replaceChildren(box);
    message('画面を表示できませんでした。', 'warn');
  }

  // ---- 起動 ----

  function openStorage() {
    try {
      const s = root.localStorage;
      if (s) return s;
    } catch (e) {
      // file:// やブラウザの設定によっては localStorage にふれるだけで例外になる
    }
    showNotice('load-notice', NOTICE_NO_STORAGE);
    const mem = {};
    return {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    };
  }

  function checkContent() {
    state.contentErrors = [];
    state.reg.units().forEach((unit) => {
      RQ.contentRegistry.validateUnit(unit).forEach((err) => {
        console.error('教材エラー（' + unit.id + '）: ' + err);
        state.contentErrors.push(err);
      });
    });
    const count = state.contentErrors.length;
    if (count > 0) {
      const badge = byId('content-error');
      badge.textContent = '教材エラー: ' + count + '件';
      badge.hidden = false;
    }
    return count;
  }

  function start() {
    state.storageObj = openStorage();
    const loaded = RQ.storage.load(state.storageObj, state.config);
    state.store = normalizeStore(loaded.store || RQ.record.createStore());
    if (loaded.error) {
      console.error(loaded.error);
      if (loaded.originalKept === false) {
        state.protectedStorage = true;
        showNotice('load-notice', NOTICE_KEPT);
      } else if (loaded.quarantinedKey) {
        showNotice('load-notice', NOTICE_QUARANTINED);
      }
    }

    checkContent();

    if (root.location.protocol === 'file:') showNotice('file-notice', NOTICE_FILE);

    go(currentProfile() ? 'home' : 'profile');
  }

  const app = {
    state,
    go,
    save,
    message,
    setRecord,
    replaceStore,
    clearAll,
    normalizeStore,
    get record() { return currentRecord(); },
    // Task 14: app.offline = { state, version, at } と書ける（state.offline と同じ値）
    get offline() { return state.offline; },
    set offline(value) { state.offline = value; },
  };

  root.RikaQuest = Object.assign(root.RikaQuest || {}, { app });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
