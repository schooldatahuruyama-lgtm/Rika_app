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
//   ctx.markBadgesSeen(ids)   … 結果画面で見せたバッジを seen: true にして保存（保存の結果を返す）
//   画面に渡す ctx には、ほかに curriculum（RikaQuest.curriculum。なければ null）、unitId（getter: いま選んでいる単元の id。
//                               units.currentId で決める。教材が 1 つもなければ null）、setUnit(id)（今の生徒の単元を変えて保存。
//                               教材のない id・プロフィールなしは false）、prefs（getter: 今の生徒の見た目の設定
//                               { theme: 'blue'|'teal'|'green'|'purple'|'pink', ruby: 'off'|'on', sound: boolean }。プロフィールがなければ既定）、
//                               setPrefs({ theme?, ruby?, sound? })（今の生徒の設定を変えてすぐ反映し、保存の結果を返す。
//                               プロフィールなし・正しくない値は false。保存できなければ元に戻す）がある
//   見た目の設定（アクセントカラー・ふりがな・効果音）は生徒ごと（profile.theme・profile.ruby・profile.sound）。applyPrefs() が
//   <html data-theme>・<meta name="theme-color">・RikaQuest.ruby.setEnabled・RikaQuest.sfx.setEnabled に反映する（go と start で呼ぶ）
//   効果音（js/sfx.js）: 答えた直後に正解・不正解の音（sessionAnswer）。レベルアップ・新しいバッジの音は結果画面（ui-screens.js）
//   ctx.author                … AI 教材作成（js/ui-author.js）の下書き・ためす・API キー:
//                               drafts() / saveDrafts(list)（localStorage の rika-quest:drafts。js/author.js）、
//                               setPreview(id, on) → { ok, errors }（下書きを教材として登録する／外す。教材の決まりに合わなければ入れない）、
//                               apiKey() / setApiKey(key|null)（localStorage の rika-quest:author-key。学習記録には入れない）、
//                               builtinIds()（起動時に登録されていた公開版の教材の id）
//   ctx.live                  … ライブクイズ（js/ui-live-host.js・js/ui-live.js。設計書 14 章）:
//                               dbUrl()（使う Firebase のデータベースの URL。この端末に保存した URL（localStorage の rika-quest:live-db）が
//                               あればそれ、なければ config.live.dbUrl（アプリに組みこみ））、savedDbUrl()（この端末に保存した URL だけ。なければ ''）、
//                               builtinDbUrl()（config.live.dbUrl）、setDbUrl(url|null)（null・空なら保存を消して組みこみに戻す）、
//                               pendingCode()（起動時の URL の ?live=<部屋コード>。1 回読むと消える。なければ null）、
//                               sessionId()（学習記録の履歴に入れる id。呼ぶたびに新しい id）、
//                               record(events, profileId)（今の生徒の記録に record.applyEvents で入れ、バッジも判定して保存。
//                               戻り値 { applied: 記録に入れた, saved: 保存に成功 }。profileId が今の生徒とちがえば入れずに applied: false）、
//                               onSaved(fn)（store 全体の保存が成功するたびに fn() を呼ぶ。setRecord・replaceStore・バッジの既読など
//                               app.save を通るすべての経路。解除の関数を返す）
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
  const NO_PROFILE_SCREENS = ['profile', 'settings', 'teacher', 'author', 'live-host'];
  // 先生画面の解錠を保つ画面（このあいだの行き来ではパスコードを聞き直さない）
  const TEACHER_SCREENS = ['teacher', 'author', 'live-host'];
  // AI 教材作成の API キー（この端末だけ。学習記録 rika-quest:v1 とは別のキー）
  const AUTHOR_KEY = 'rika-quest:author-key';
  // ライブクイズの Firebase のデータベースの URL（この端末だけ。学習記録とは別のキー）
  const LIVE_DB_KEY = 'rika-quest:live-db';

  // アクセントカラー（profile.theme）。値は css/style.css の :root[data-theme] と同じ --blue（theme-color に使う）
  const THEME_COLORS = { blue: '#1A5CFF', teal: '#0E9AA7', green: '#178A4C', purple: '#7A4FD6', pink: '#E0508A' };
  const DEFAULT_THEME = 'blue';
  // ふりがな（profile.ruby）
  const RUBY_VALUES = ['off', 'on'];
  const DEFAULT_RUBY = 'off';
  // 効果音（profile.sound。true / false。ないときは鳴らす）
  const DEFAULT_SOUND = true;

  function isTheme(x) { return typeof x === 'string' && Object.prototype.hasOwnProperty.call(THEME_COLORS, x); }
  function isRubyValue(x) { return typeof x === 'string' && RUBY_VALUES.indexOf(x) !== -1; }

  const state = {
    store: null,
    reg: RQ.content,
    config: RQ.config,
    screen: null,
    params: null,
    session: null,          // いま進めている学習（session.js の形）
    lastResult: null,       // 終わった学習の結果 { session, summary, celebrated, newBadges }（結果画面が使う。newBadges はまだ見せていないバッジの id。
                            // 結果画面が sfxPlayed を足す: レベルアップ・バッジの効果音を鳴らしたか）
    offline: null,          // Task 14: オフライン教材の状態
    protectedStorage: false,
    contentErrors: [],
    storageObj: null,       // 読み書きに使う storage（ふつうは localStorage）
    pendingLive: null,      // 起動時の URL の ?live=<部屋コード>（QR コードで開いたとき）。ライブクイズの参加画面が 1 回読んで消す
  };
  Object.defineProperty(state, 'record', { enumerable: true, get: currentRecord });

  let cleanup = null;   // 今の画面の描画関数が返した後片付け
  let builtinUnitIds = new Set();   // 起動時に登録されていた公開版の教材（「この端末でためす」で置きかえない・外さない）

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
    badges: isObject,   // 中身の各項目の形は badges.js が守る（崩れていても取り消さない）
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
      if (p.sound !== undefined && typeof p.sound !== 'boolean') delete p.sound;
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

  // 保存が成功したときに呼ぶ関数（ctx.live.onSaved。ライブクイズの生徒の画面が、保存できた分の処理済みを書くのに使う）
  const savedListeners = [];

  function onSaved(fn) {
    if (typeof fn !== 'function') return function () {};
    savedListeners.push(fn);
    return function off() {
      const i = savedListeners.indexOf(fn);
      if (i !== -1) savedListeners.splice(i, 1);
    };
  }

  function notifySaved() {
    // 呼んでいるあいだに解除されてもよいように写しで回す
    savedListeners.slice().forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
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
    if (ok) notifySaved();
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
      state.storageObj.removeItem('rika-quest:teacher');   // 先生画面のパスコードも消す（忘れたときに戻す唯一の方法）
      state.storageObj.removeItem(AUTHOR_KEY);   // AI 教材作成の API キーも消す（共用端末のため）。下書き rika-quest:drafts は消さない
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
    rec = awardBadges(rec, now);
    setRecord(rec);
  }

  // 記録を更新したあとに、新しく条件を満たしたバッジを記録に入れる（経験値は付けない）
  function awardBadges(rec, now) {
    const fresh = RQ.badges.newlyEarned(rec, state.reg, state.config);
    return fresh.length > 0 ? RQ.badges.award(rec, fresh, now) : rec;
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
    // クリアで取れたバッジも結果画面に出せるよう、先に記録へ入れてから「まだ見せていないバッジ」を集める
    // （学習の途中で取ったものも含む）
    next = awardBadges(next, now);
    state.lastResult = { session: s, summary: sum, celebrated: false, newBadges: RQ.badges.unseen(next) };
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
    playSfx(r.correct ? 'correct' : 'wrong');
    return r;
  }

  // 効果音を鳴らす（sfx.js が読み込めなかったときや失敗しても、学習は止めない）
  function playSfx(kind) {
    if (!RQ.sfx || typeof RQ.sfx.play !== 'function') return;
    try {
      RQ.sfx.play(kind);
    } catch (e) {
      console.error(e);
    }
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

  // ---- バッジ ----

  // 結果画面で見せたバッジを「見た」にして保存する。変えるものがなければ保存せず true
  function markBadgesSeen(ids) {
    const rec = currentRecord();
    if (!rec) return false;
    const unseen = RQ.badges.unseen(rec);
    const targets = (Array.isArray(ids) ? ids : []).filter((id) => unseen.indexOf(id) !== -1);
    if (targets.length === 0) return true;
    return setRecord(RQ.badges.markSeen(rec, targets));
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

  // ---- 見た目の設定（アクセントカラー・ふりがな・効果音） ----

  // 今の生徒の設定（プロフィールがなければ既定）
  function currentPrefs() {
    const profile = currentProfile();
    return {
      theme: profile && profile.theme ? profile.theme : DEFAULT_THEME,
      ruby: profile && profile.ruby ? profile.ruby : DEFAULT_RUBY,
      sound: profile && typeof profile.sound === 'boolean' ? profile.sound : DEFAULT_SOUND,
    };
  }

  // 今の生徒の設定を画面に反映する（色は <html data-theme> と theme-color、ふりがなは ruby.js、効果音は sfx.js）
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
    if (RQ.sfx && typeof RQ.sfx.setEnabled === 'function') RQ.sfx.setEnabled(prefs.sound);
  }

  // 今の生徒の設定を変えて反映・保存する。プロフィールがない・値が正しくないときは false。保存できなければ元に戻す
  function setPrefs(patch) {
    const profile = currentProfile();
    if (!profile || !isObject(patch)) return false;
    if (patch.theme !== undefined && !isTheme(patch.theme)) return false;
    if (patch.ruby !== undefined && !isRubyValue(patch.ruby)) return false;
    if (patch.sound !== undefined && typeof patch.sound !== 'boolean') return false;
    const before = { theme: profile.theme, ruby: profile.ruby, sound: profile.sound };
    if (patch.theme !== undefined) profile.theme = patch.theme;
    if (patch.ruby !== undefined) profile.ruby = patch.ruby;
    if (patch.sound !== undefined) profile.sound = patch.sound;
    applyPrefs();
    if (save()) return true;
    ['theme', 'ruby', 'sound'].forEach((k) => {
      if (before[k] === undefined) delete profile[k]; else profile[k] = before[k];
    });
    applyPrefs();
    return false;
  }

  // ---- AI 教材作成（下書き・この端末でためす・API キー） ----

  function authorLib() {
    return RQ.author && typeof RQ.author.loadDrafts === 'function' ? RQ.author : null;
  }

  function loadDrafts() {
    const lib = authorLib();
    return lib ? lib.loadDrafts(state.storageObj) : [];
  }

  function saveDrafts(list) {
    const lib = authorLib();
    return lib ? lib.saveDrafts(state.storageObj, list) : false;
  }

  // ためす教材が、公開版の教材やほかの単元の id とぶつからないか
  function previewConflicts(unit) {
    const errors = [];
    if (builtinUnitIds.has(unit.id)) errors.push('単元の id ' + unit.id + ' は公開中の教材と同じです（別の id の下書きにしてください）');
    const ids = [];
    (Array.isArray(unit.areas) ? unit.areas : []).forEach((a) => (a && Array.isArray(a.stages) ? a.stages : []).forEach((s) => {
      if (s) ids.push(['ステージ', s.id, state.reg.unitOfStage(s.id)]);
    }));
    (Array.isArray(unit.concepts) ? unit.concepts : []).forEach((c) => { if (c) ids.push(['概念', c.id, state.reg.unitOfConcept(c.id)]); });
    ids.forEach(([kind, id, owner]) => {
      if (owner && owner.id !== unit.id) errors.push(kind + 'の id ' + id + ' がほかの単元（' + owner.id + '）と重なっています');
    });
    return errors;
  }

  // 下書きを組む。ためせるなら errors が空
  function previewUnit(draft) {
    const r = authorLib().assembleUnit(draft);
    if (!r.unit) return { unit: null, errors: r.errors };
    return { unit: r.unit, errors: r.errors.concat(previewConflicts(r.unit)) };
  }

  // 「この端末でためす」を入れる・やめる（登録・登録の取り消しをして下書きの preview を保存し、教材の検査をし直す）
  function setPreview(id, on) {
    if (!authorLib()) return { ok: false, errors: ['教材作成のプログラムが読み込まれていません'] };
    const drafts = loadDrafts();
    const d = drafts.find((x) => x.id === id);
    if (!d) return { ok: false, errors: ['下書きが見つかりません'] };
    const before = state.reg.unit(id);
    if (on) {
      const r = previewUnit(d);
      if (r.errors.length > 0) return { ok: false, errors: r.errors };
      state.reg.register(r.unit);
    } else if (!builtinUnitIds.has(id)) {
      state.reg.unregister(id);
    }
    d.preview = !!on;
    if (!saveDrafts(drafts)) {
      // 保存できなければ登録も元に戻す（読み込み直したときと食い違わないように）
      if (before) state.reg.register(before); else if (!builtinUnitIds.has(id)) state.reg.unregister(id);
      return { ok: false, errors: ['下書きを保存できませんでした'] };
    }
    checkContent();
    return { ok: true, errors: [] };
  }

  // 起動時: ためし中の下書きを登録する（組めない・ぶつかるものは、ためすを外して保存する）
  function loadPreviews() {
    if (!authorLib()) return;
    try {
      const drafts = loadDrafts();
      let changed = false;
      drafts.forEach((d) => {
        if (!d.preview) return;
        const r = previewUnit(d);
        if (r.errors.length === 0) state.reg.register(r.unit);
        else { d.preview = false; changed = true; }
      });
      if (changed) saveDrafts(drafts);
    } catch (e) {
      console.error(e);
    }
  }

  function apiKey() {
    try {
      return state.storageObj.getItem(AUTHOR_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  // key が空・null なら消す。保存できなければ false
  function setApiKey(key) {
    try {
      if (typeof key === 'string' && key.trim() !== '') state.storageObj.setItem(AUTHOR_KEY, key.trim());
      else state.storageObj.removeItem(AUTHOR_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  const authorCtx = {
    drafts: loadDrafts,
    saveDrafts,
    setPreview,
    apiKey,
    setApiKey,
    builtinIds: () => Array.from(builtinUnitIds),
  };

  // ---- ライブクイズ（データベースの URL・学習記録） ----

  // この端末に保存した URL（なければ ''）
  function savedLiveDbUrl() {
    try {
      return state.storageObj.getItem(LIVE_DB_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  // アプリに組みこんだ URL（config.live.dbUrl。なければ ''）
  function builtinLiveDbUrl() {
    const live = state.config && state.config.live;
    return live && typeof live.dbUrl === 'string' ? live.dbUrl : '';
  }

  // 使う URL: この端末に保存した URL があればそれ、なければ組みこみ
  function liveDbUrl() {
    return savedLiveDbUrl() || builtinLiveDbUrl();
  }

  // URL を比べるための形（RikaQuest.liveDb.normalizeUrl を通した値。通らなければ前後の空白を取った文字列）
  function liveUrlKey(url) {
    const t = typeof url === 'string' ? url.trim() : '';
    if (t === '') return '';
    const LD = RQ.liveDb;
    const n = LD && typeof LD.normalizeUrl === 'function' ? LD.normalizeUrl(t) : null;
    return n || t;
  }

  // この端末に組みこみとちがう URL を保存しているか（末尾の / などのちがいは同じとみなす）
  function isCustomLiveDbUrl() {
    const saved = liveUrlKey(savedLiveDbUrl());
    return saved !== '' && saved !== liveUrlKey(builtinLiveDbUrl());
  }

  // 起動時の ?live=<部屋コード>（1 回読むと消える）
  function livePendingCode() {
    const code = state.pendingLive;
    state.pendingLive = null;
    return code || null;
  }

  // url が空・null・組みこみと同じ（正規化した値どうしで比べる）なら消す（組みこみに戻す）。保存できなければ false
  function setLiveDbUrl(url) {
    try {
      if (typeof url === 'string' && url.trim() !== '' && liveUrlKey(url) !== liveUrlKey(builtinLiveDbUrl())) state.storageObj.setItem(LIVE_DB_KEY, url.trim());
      else state.storageObj.removeItem(LIVE_DB_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function liveSessionId() {
    return 'live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  }

  // ライブクイズで答えた出来事を今の生徒の記録に入れる（学習の進行と同じく、バッジの判定も通す）。
  // profileId を渡したときは、今の生徒がその生徒のときだけ入れる（参加した生徒と記録先を取りちがえない）。
  // 戻り値 { applied, saved }: applied は記録（メモリ）に入れたか、saved は保存に成功したか（setRecord の戻り値。
  // 保存に失敗してもメモリの記録は書きかわっていて、あとでほかの保存が成功すればいっしょに保存される）
  function liveRecord(events, profileId) {
    const profile = currentProfile();
    if (!profile || !Array.isArray(events) || events.length === 0) return { applied: false, saved: false };
    if (profileId !== undefined && profileId !== profile.id) return { applied: false, saved: false };
    const now = new Date();
    let rec = RQ.record.applyEvents(currentRecord(), events, { now, multiplier: 1, stageId: null }, state.config);
    rec = awardBadges(rec, now);
    const saved = setRecord(rec);
    return { applied: true, saved };
  }

  const liveCtx = {
    dbUrl: liveDbUrl,
    savedDbUrl: savedLiveDbUrl,
    builtinDbUrl: builtinLiveDbUrl,
    isCustomDbUrl: isCustomLiveDbUrl,
    setDbUrl: setLiveDbUrl,
    pendingCode: livePendingCode,
    sessionId: liveSessionId,
    record: liveRecord,
    onSaved,
  };

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
      markBadgesSeen,
      replaceStore,
      clearAll,
      confirm: (text, okLabel, options) => RQ.ui.helpers.confirm(text, okLabel, options),
      author: authorCtx,
      live: liveCtx,
      state,
      app,
    };
  }

  function go(name, params) {
    // 先生画面（と教材を作る画面）を離れたら、次はパスコードの入り口から
    if (TEACHER_SCREENS.indexOf(name) === -1) state.teacherUnlocked = false;
    // 教材を作る画面・ライブクイズの出題はパスコードの先。解錠していなければ先生画面の入り口へ
    if ((name === 'author' || name === 'live-host') && !state.teacherUnlocked) {
      go('teacher');
      return;
    }
    let screen = name;
    let p = params || {};
    // QR コードで開いて（?live=<部屋コード>）、まだ参加画面を見ていなければ、ホームの代わりに参加画面へ
    // （プロフィールを作った・選んだあとのホームへの移動もここで参加画面になる）
    if (screen === 'home' && state.pendingLive && currentProfile()) screen = 'live';
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
    // 「この端末でためす」で教材が変わったときにも呼ぶので、0 件なら消す
    const badge = byId('content-error');
    if (badge) {
      badge.textContent = count > 0 ? '教材エラー: ' + count + '件' : '';
      badge.hidden = count === 0;
    }
    return count;
  }

  function readJoinParam() {
    const search = root.location.search || '';
    if (!search || !RQ.qr || typeof RQ.qr.parseJoin !== 'function') return;
    let params;
    try { params = new URLSearchParams(search); } catch (e) { return; }
    if (!params.has('live')) return;
    const code = RQ.qr.parseJoin(search);
    if (code) state.pendingLive = code;
    params.delete('live');
    const rest = params.toString();
    try {
      if (root.history && typeof root.history.replaceState === 'function') {
        root.history.replaceState(root.history.state, '', root.location.pathname + (rest ? '?' + rest : '') + root.location.hash);
      }
    } catch (e) {
      console.error(e);
    }
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

    // 公開版の教材を覚えてから、ためし中の下書きを登録する（そのあとで教材を検査する）
    builtinUnitIds = new Set(state.reg.units().map((u) => u.id));
    loadPreviews();
    checkContent();
    applyPrefs();

    if (root.location.protocol === 'file:') showNotice('file-notice', NOTICE_FILE);
    setupOffline();

    // QR コードの参加用の URL（?live=<部屋コード>）で開いたら、コードを覚えて URL から消す（読み込み直しで入り直さない）。
    // 最初の画面は参加画面（プロフィールがなければプロフィール作成のあと。go の home → live）
    readJoinParam();
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
