// 画面の切り替え、保存のタイミング、起動（ブラウザ専用。index.html の最後に読み込む）
// RikaQuest.app を作る。
//   app.state  = { store, record（getter: 今の生徒の記録）, reg, config, screen, params, session, offline, protectedStorage, contentErrors }
//   app.go(name, params)      … 画面を切り替える。RikaQuest.ui.screens[name](section, ctx, params) を呼ぶ
//   app.save(options)         … storage.save(localStorage, store, config, options)。false なら header に「保存できません」
//   app.message(text, kind, options) … header の下にお知らせ（kind: 'info' | 'ok' | 'warn'）。次の go で消える。
//                               options.noRuby が true なら、その文にふりがなを付けない（ニックネームを含む文など）
//   app.setRecord(record)     … 今の生徒の記録を置きかえて保存（record.js の関数は新しい record を返すため）
//   app.replaceStore(store)   … store 全体を置きかえ（JSON の読み込み）、整えて保存
//   app.record                … 今の生徒の記録（store.records[store.currentProfileId]）
//   画面に渡す ctx には、ほかに curriculum（RikaQuest.curriculum。なければ null）、unitId（getter: いま選んでいる単元の id。
//                               units.currentId で決める。教材が 1 つもなければ null）、setUnit(id)（今の生徒の単元を変えて保存。
//                               教材のない id・プロフィールなしは false）、prefs（getter: 今の生徒の見た目の設定
//                               { theme: 'blue'|'teal'|'green'|'purple'|'pink', ruby: 'off'|'on' }。プロフィールがなければ既定）、
//                               setPrefs({ theme?, ruby? })（今の生徒の設定を変えてすぐ反映し、保存の結果を返す。
//                               プロフィールなし・正しくない値は false。保存できなければ元に戻す）がある
//   見た目の設定（アクセントカラー・ふりがな）は生徒ごと（profile.theme・profile.ruby）。applyPrefs() が
//   <html data-theme>・<meta name="theme-color">・RikaQuest.ruby.setEnabled に反映する（go と start で呼ぶ）
//   app.offline               … オフライン教材の状態 { state: 'ready'|'pending'|'failed'|'unsupported-file'|'unsupported-insecure', version, at }（app.state.offline と同じ値）
//                               書きかえると document に 'rika-quest:offline' を送る（設定画面が表示を更新する）
//   学習の進行: app.startSession(params) / app.renderSession() / app.answer(value) / app.next() /
//               app.choose('accept'|'later') / app.stopSession()。出来事はそのつど record.applyEvents で記録に入れ、
//               ステージの学習なら record.setResume で再開位置も保存する。終わったら finishStage / markReviewDone
// 画面を足すとき: index.html に <section id="screen-<name>" class="screen" hidden> を置き、
//   RikaQuest.ui.screens[name] = function (section, ctx, params) { ... } を登録する（app.js より前に読み込む）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;

  const NOTICE_QUARANTINED = '前回の記録が読み込めなかったため、別の場所に残してあります';
  const NOTICE_KEPT = '読み込めない記録が残っているため、新しい記録は保存されません。設定画面から対処してください';
  const NOTICE_FILE = 'このまま使えますが、オフライン対応は http で開いたときだけ有効です';
  const NOTICE_NO_STORAGE = 'この環境ではブラウザに記録を保存できません。閉じると記録は消えます。';
  // オフラインの準備ができた版と日時（再読み込みしても「済」を出すため。記録とは別のキー）
  const OFFLINE_KEY = 'rika-quest:offline';

  // プロフィールがなくても開ける画面
  const NO_PROFILE_SCREENS = ['profile', 'settings', 'teacher'];

  // アクセントカラー（profile.theme）。値は css/style.css の :root[data-theme] と同じ --blue（theme-color に使う）
  const THEME_COLORS = { blue: '#1A5CFF', teal: '#0E9AA7', green: '#178A4C', purple: '#7A4FD6', pink: '#E0508A' };
  const DEFAULT_THEME = 'blue';
  // ふりがな（profile.ruby）
  const RUBY_VALUES = ['off', 'on'];
  const DEFAULT_RUBY = 'off';

  function isTheme(x) { return typeof x === 'string' && Object.prototype.hasOwnProperty.call(THEME_COLORS, x); }
  function isRubyValue(x) { return typeof x === 'string' && RUBY_VALUES.indexOf(x) !== -1; }

  const state = {
    store: null,
    reg: RQ.content,
    config: RQ.config,
    screen: null,
    params: null,
    session: null,          // いま進めている学習（session.js の形）
    lastResult: null,       // 終わった学習の結果 { session, summary, celebrated }（結果画面が使う）
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
      // 選んだ単元: 文字列でなければ消す（知らない単元 id は残す。表示のときに units.currentId が既定へ戻す）
      if (p.unitId !== undefined && typeof p.unitId !== 'string') delete p.unitId;
      // 見た目の設定: 知らない値は消す（既定の色・ふりがななしに戻る）
      // 文字列かを先に見る（配列や toString のないオブジェクトを、キーの検査で文字列に変えないように）
      if (p.theme !== undefined && !isTheme(p.theme)) delete p.theme;
      if (p.ruby !== undefined && !isRubyValue(p.ruby)) delete p.ruby;
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

  function message(text, kind, options) {
    const box = byId('message');
    if (!box) return;
    // 文を入れる前に付ける（ruby.js の MutationObserver は、属性のある箱の中を飛ばす）
    if (options && options.noRuby) box.setAttribute('data-no-ruby', '');
    else box.removeAttribute('data-no-ruby');
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
    // ニックネームにはふりがなを付けない（名前の読みは辞書では決められない）
    const name = document.createElement('span');
    name.setAttribute('data-no-ruby', '');
    name.textContent = p.nickname;
    box.append(name);
  }

  // ---- 学習の進行（session.js を動かし、出来事を記録に入れて保存する） ----
  // go('lesson' | 'problem', { stageId, mode }) / ({ stageId, resume: true }) / ({ review: conceptId }) で始め、
  // renderSession() が current() の view に合う画面（lesson / problem / offer / result）を { session: true } で開く。

  const SESSION_SCREENS = ['lesson', 'problem', 'offer'];

  // params から学習を始める。始められなければ移れる画面へ回して false
  function startSession(params) {
    const rec = currentRecord();
    const now = new Date();
    const S = RQ.session;
    try {
      if (params.review) {
        state.session = S.startReview(state.reg, rec, params.review, now, state.config);
      } else if (params.resume) {
        const resume = RQ.record.stageState(rec, params.stageId).resume;
        if (!isObject(resume) || !Array.isArray(resume.queue)) {
          go('stage', { stageId: params.stageId });
          message('続きの記録が見つかりませんでした。', 'warn');
          return false;
        }
        state.session = resume;
      } else {
        state.session = S.startStage(state.reg, rec, params.stageId, params.mode === 'lesson' ? 'lesson' : 'problem', now, state.config);
      }
    } catch (e) {
      console.error(e);
      state.session = null;
      go('home');
      message('学習を始められませんでした。', 'warn');
      return false;
    }
    state.lastResult = null;
    return true;
  }

  // 教材が変わって、保存した続きの問題・カードが見つからないとき
  function viewIsBroken(view) {
    if (view.kind === 'lesson') return !view.card;
    if (view.kind === 'problem' || view.kind === 'feedback') return !view.problem;
    if (view.kind === 'offer') return !view.concept || !view.basic;
    return false;
  }

  function renderSession() {
    const s = state.session;
    if (!s) { go('home'); return; }
    const view = RQ.session.current(s, state.reg);
    if (view.kind === 'ended') {
      finishSession();
      return;
    }
    if (viewIsBroken(view)) {
      state.session = null;
      if (s.kind === 'stage') {
        setRecord(RQ.record.setResume(currentRecord(), s.stageId, null));
        go('stage', { stageId: s.stageId });
      } else {
        go('home');
      }
      message('教材が変わったため、続きから始められませんでした。最初から始めてください。', 'warn');
      return;
    }
    go(view.kind === 'lesson' ? 'lesson' : view.kind === 'offer' ? 'offer' : 'problem', { session: true });
  }

  // 出来事を記録に入れ、ステージの学習なら再開位置も保存する。終わっていれば結果をまとめる
  function commitSession(newSession, events) {
    const now = new Date();
    let rec = currentRecord();
    if (events && events.length > 0) {
      rec = RQ.record.applyEvents(rec, events, { now, multiplier: newSession.xpMultiplier, stageId: newSession.stageId }, state.config);
    }
    // 復習は再開しない（ステージの進捗・再開位置を変えない）
    if (newSession.kind === 'stage') rec = RQ.record.setResume(rec, newSession.stageId, newSession);
    // 復習は最初の有効な解答（history が出る answer）で「今日この概念を復習した」と記録する。
    // 途中で「やめる」→ もう一度始めても全額にならないようにするため（結果画面での記録はそのまま。同じ日付を書くだけ）
    if (newSession.kind === 'review' && events && events.some((e) => e.kind === 'history')) {
      rec = RQ.record.markReviewDone(rec, newSession.conceptId, RQ.xp.localDate(now));
    }
    state.session = newSession;
    if (RQ.session.current(newSession, state.reg).kind === 'ended') {
      rec = closeRecord(rec, newSession, now);
    }
    setRecord(rec);
  }

  // 終わった学習を記録に書く: ステージは finishStage（再開位置を消す）、復習は reviewDone
  function closeRecord(rec, s, now) {
    const sum = RQ.session.summary(s, state.reg, state.config);
    let next = rec;
    if (s.kind === 'stage') {
      next = RQ.record.finishStage(rec, { stageId: s.stageId, stars: sum.stars, cleared: sum.ended === 'completed' }, now);
    } else {
      next = RQ.record.markReviewDone(rec, s.conceptId, RQ.xp.localDate(now));
    }
    state.lastResult = { session: s, summary: sum, celebrated: false };
    state.session = null;
    return next;
  }

  // 終わった学習の結果画面へ（まだ記録に書いていなければ書く）
  function finishSession() {
    const s = state.session;
    if (s) setRecord(closeRecord(currentRecord(), s, new Date()));
    if (state.lastResult) go('result', { session: true });
    else go('home');
  }

  function sessionAnswer(value) {
    const s = state.session;
    if (!s) return { invalid: true };
    const r = RQ.session.answer(s, state.reg, value, state.config);
    if (r.invalid) return r;
    commitSession(r.session, r.events);
    return r;
  }

  function sessionNext() {
    const s = state.session;
    if (!s) { go('home'); return; }
    const r = RQ.session.next(s, state.reg, state.config);
    if (r.session !== s || r.events.length > 0) commitSession(r.session, r.events);
    renderAfterCommit();
  }

  // choose も stageClear を返すことがあるので、events は必ず記録に入れる
  function sessionChoose(choice) {
    const s = state.session;
    if (!s) { go('home'); return; }
    const r = RQ.session.choose(s, state.reg, choice, state.config);
    if (r.session !== s || r.events.length > 0) commitSession(r.session, r.events);
    renderAfterCommit();
  }

  function renderAfterCommit() {
    if (state.session) renderSession();
    else if (state.lastResult) go('result', { session: true });
    else go('home');
  }

  // 「やめる」: ステージは再開位置を保存してホームへ（復習は再開しないので捨てる）
  function stopSession() {
    const s = state.session;
    state.session = null;
    if (s && s.kind === 'stage' && !s.ended) {
      setRecord(RQ.record.setResume(currentRecord(), s.stageId, s));
    }
    go('home');
    if (s && s.kind === 'stage') message('途中まで保存しました。ステージの「続きから」で再開できます。', 'ok');
  }

  // ---- 単元 ----

  // 今の生徒の単元を変えて保存する。教材のない id・プロフィールがないときは false
  function setUnit(id) {
    if (!state.reg.unit(id)) return false;
    const profile = currentProfile();
    if (!profile) return false;
    const before = profile.unitId;
    profile.unitId = id;
    if (save()) return true;
    // 保存できなければ選択も元に戻す（画面の「変えられませんでした」と食い違わないように）
    if (before === undefined) delete profile.unitId; else profile.unitId = before;
    return false;
  }

  // ---- 見た目の設定（アクセントカラー・ふりがな） ----

  // 今の生徒の設定（プロフィールがなければ既定）
  function currentPrefs() {
    const profile = currentProfile();
    return {
      theme: profile && profile.theme ? profile.theme : DEFAULT_THEME,
      ruby: profile && profile.ruby ? profile.ruby : DEFAULT_RUBY,
    };
  }

  // 今の生徒の設定を画面に反映する（色は <html data-theme> と theme-color、ふりがなは ruby.js）
  function applyPrefs() {
    const prefs = currentPrefs();
    const html = document.documentElement;
    if (prefs.theme === DEFAULT_THEME) delete html.dataset.theme;
    else html.dataset.theme = prefs.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[prefs.theme]);
    // ruby.js が読み込めなかったときは、ふりがなだけ飛ばす
    if (RQ.ruby && typeof RQ.ruby.setEnabled === 'function') {
      try {
        RQ.ruby.setEnabled(prefs.ruby === 'on');
      } catch (e) {
        console.error(e);
      }
    }
  }

  // 今の生徒の設定を変えて反映・保存する。プロフィールがない・値が正しくないときは false。保存できなければ元に戻す
  function setPrefs(patch) {
    const profile = currentProfile();
    if (!profile || !isObject(patch)) return false;
    if (patch.theme !== undefined && !isTheme(patch.theme)) return false;
    if (patch.ruby !== undefined && !isRubyValue(patch.ruby)) return false;
    const before = { theme: profile.theme, ruby: profile.ruby };
    if (patch.theme !== undefined) profile.theme = patch.theme;
    if (patch.ruby !== undefined) profile.ruby = patch.ruby;
    applyPrefs();
    if (save()) return true;
    ['theme', 'ruby'].forEach((k) => {
      if (before[k] === undefined) delete profile[k]; else profile[k] = before[k];
    });
    applyPrefs();
    return false;
  }

  // ---- 画面の切り替え ----

  function makeCtx() {
    return {
      get store() { return state.store; },
      get record() { return currentRecord(); },
      reg: state.reg,
      config: state.config,
      curriculum: RQ.curriculum || null,
      get unitId() { return RQ.units.currentId(state.reg, RQ.curriculum || null, currentProfile()); },
      setUnit,
      get prefs() { return currentPrefs(); },
      setPrefs,
      go,
      save,
      now: () => new Date(),
      message,
      setRecord,
      replaceStore,
      clearAll,
      confirm: (text, okLabel, options) => RQ.ui.helpers.confirm(text, okLabel, options),
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
    // 学習の画面: 始める指定なら session を作ってから、いまの view の画面へ
    if ((screen === 'lesson' || screen === 'problem') && !p.session && (p.stageId || p.review)) {
      if (startSession(p)) renderSession();
      return;
    }
    if ((SESSION_SCREENS.indexOf(screen) !== -1 && !state.session) || (screen === 'result' && !state.lastResult)) {
      screen = 'home';
      p = {};
    }
    // 生徒ごとの見た目の設定（プロフィールの切りかえ・削除・読み込みで変わるため、画面を描く前に毎回）
    applyPrefs();
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

  // ---- オフライン（Service Worker） ----

  function setOffline(value) {
    state.offline = value;
    try {
      document.dispatchEvent(new CustomEvent('rika-quest:offline', { detail: value }));
    } catch (e) {
      console.error(e);
    }
  }

  function readOfflineMark() {
    try {
      const v = JSON.parse(root.localStorage.getItem(OFFLINE_KEY));
      if (isObject(v) && typeof v.version === 'string') return { version: v.version, at: typeof v.at === 'string' ? v.at : null };
    } catch (e) {
      // localStorage が使えない・中身が壊れている: 印がないものとして続ける
    }
    return null;
  }

  function writeOfflineMark(mark) {
    try {
      root.localStorage.setItem(OFFLINE_KEY, JSON.stringify(mark));
    } catch (e) {
      // 書けなくても続ける（次に開いたとき sw.js に問い合わせ直す）
    }
  }

  // sw.js の { type: 'offline-ready', version } を受けたとき。同じ版の印があれば最初に準備できた日時を残す
  function onOfflineReady(version) {
    const mark = readOfflineMark();
    const at = mark && mark.version === version && mark.at ? mark.at : new Date().toISOString();
    writeOfflineMark({ version, at });
    setOffline({ state: 'ready', version, at });
  }

  // http(s):// で開いて Service Worker が使えるときだけ sw.js を登録する（file:// では登録しない）
  function setupOffline() {
    const protocol = root.location.protocol;
    let container = null;
    try {
      if (root.navigator && 'serviceWorker' in root.navigator) container = root.navigator.serviceWorker;
    } catch (e) {
      container = null;
    }
    const web = protocol === 'http:' || protocol === 'https:';
    // ホーム画面に追加するための manifest（file:// では読めずにエラーになるので、http(s) のときだけここで足す）
    if (web && !document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.webmanifest';
      document.head.append(link);
    }
    // file:// は 'unsupported-file'。http(s) でも Service Worker が使えない（LAN の IP など、https でも localhost でもない）ときは 'unsupported-insecure'
    if (!web) {
      setOffline({ state: 'unsupported-file' });
      return;
    }
    if (!container) {
      setOffline({ state: 'unsupported-insecure' });
      return;
    }
    setOffline({ state: 'pending' });
    container.addEventListener('message', (event) => {
      const data = event.data;
      if (isObject(data) && data.type === 'offline-ready' && typeof data.version === 'string') onOfflineReady(data.version);
    });
    // すでに sw.js が動いている（2 回目以降に開いた）: 前の印で「済」を出し、今の版を問い合わせる
    if (container.controller) {
      const mark = readOfflineMark();
      if (mark) setOffline({ state: 'ready', version: mark.version, at: mark.at });
      try {
        container.controller.postMessage({ type: 'status' });
      } catch (e) {
        console.error(e);
      }
    }
    container.register('sw.js').then((reg) => {
      watchInstall(reg, reg.installing || reg.waiting);
      reg.addEventListener('updatefound', () => watchInstall(reg, reg.installing));
      // 動き出したら今の版を問い合わせる（返事の offline-ready で「済」になる。返事がなければ準備中のまま）
      container.ready.then(() => askStatus(container)).catch(() => {});
    }).catch((e) => {
      console.warn('オフライン対応を準備できませんでした', e);
      setOffline({ state: 'failed' });
    });
  }

  // install に失敗した（PRECACHE が取れない・容量不足・回線切れ）sw.js は redundant になる。
  // register() は成功で返るので、ここで見張って「準備できませんでした」にする。
  // ただし前の版の sw.js が動いている（更新だけ失敗した）ときは、前の版でオフラインで使えるので状態を変えない
  const watchedWorkers = new WeakSet();   // register の戻りと updatefound で同じ worker を二重に見張らない

  function watchInstall(reg, worker) {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    const check = () => {
      if (worker.state !== 'redundant') return;
      worker.removeEventListener('statechange', check);
      if (reg.active && reg.active !== worker) return;
      console.warn('オフライン対応を準備できませんでした（Service Worker の install に失敗）');
      setOffline({ state: 'failed' });
    };
    worker.addEventListener('statechange', check);
    check();
  }

  function askStatus(container) {
    const send = () => {
      try {
        if (container.controller) container.controller.postMessage({ type: 'status' });
      } catch (e) {
        console.error(e);
      }
    };
    if (container.controller) send();
    else container.addEventListener('controllerchange', send, { once: true });
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
    applyPrefs();

    if (root.location.protocol === 'file:') showNotice('file-notice', NOTICE_FILE);
    setupOffline();

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
    // 学習の進行（ui-screens の学習画面が呼ぶ）
    startSession,
    renderSession,
    answer: sessionAnswer,
    next: sessionNext,
    choose: sessionChoose,
    stopSession,
    get record() { return currentRecord(); },
    // オフライン教材の状態（state.offline と同じ値。書くと設定画面の表示も変わる）
    get offline() { return state.offline; },
    set offline(value) { setOffline(value); },
  };

  root.RikaQuest = Object.assign(root.RikaQuest || {}, { app });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
