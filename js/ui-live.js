// ライブクイズの生徒の画面（ブラウザ専用。ui-live-host.js の後に読み込む）。RikaQuest.ui.screens.live を足す。設計書 14 章。
// 参加（部屋コード。データベースの URL はアプリに組みこみ。決まっていなければその入力も）→ 待機 → 問題に答える → 答え合わせ → … → 最終順位。
// QR コードでの参加: 端末のカメラアプリで読んだ URL（?live=<部屋コード>）で開くと、js/app.js が覚えたコード（ctx.live.pendingCode()）を
// 部屋コードの欄に入れる。アプリの中で読む「QR コードを読む」は BarcodeDetector と getUserMedia が使える端末だけ（読めたらそのまま参加）。
// カメラは読めたとき・やめたとき・画面を離れたときに止める。
// 部屋のデータの形・得点は js/live.js（RikaQuest.live）、通信は js/live-db.js（RikaQuest.liveDb）。
// 学習記録には ctx.live.record(events, profileId)（js/app.js）で入れる。受信した部屋データから、答え合わせが済んだ問題の
// サーバーにある自分の回答だけを入れる（live.pendingRecords。答え合わせの画面を見ていなくても、戻ったときにまとめて入れる）。1 問につき 1 回。
// 処理済みは 2 段: 記録のメモリに入れた分はメモリ（memDone）、保存に成功した分は sessionStorage（部屋ごとの問題 id の一覧）。
// 状態の進め方は live.nextDoneState・live.flushState。ライブ以外の保存（設定・バッジの既読など）が成功したときも、
// ctx.live.onSaved の通知で保存できた分を sessionStorage に書く。
// 参加者の id（pid）はこのタブの sessionStorage に生徒ごとに持ち、描き直し・読み込み直しでも同じ pid で戻る。
// 利用者の文字はすべて textContent で入れる。ふりがなを付けないのは部屋コードとニックネームだけ（data-no-ruby）。
// 部屋の受信（watch）は画面を離れたら止める（後片付けの関数を返す）。参加中の部屋は、ページを読み込み直すまで覚えておく。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const H = RQ.ui.helpers;
  const el = H.el;
  const button = H.button;
  const card = H.card;
  const cardTitle = H.cardTitle;

  function L() { return RQ.live; }
  function LD() { return RQ.liveDb; }

  const LABELS = ['ア', 'イ', 'ウ', 'エ'];
  const OPT_CLASSES = ['live-opt-a', 'live-opt-b', 'live-opt-c', 'live-opt-d'];
  const TOP = 5;
  const TICK_MS = 250;
  const RETRY_MS = 3000;
  const PID_KEY = 'rika-quest:live-player';        // sessionStorage: 生徒の id → pid
  // sessionStorage: 学習記録に入れて保存できた問題（live.addRecorded の形。'<生徒 id>:<pid>:<部屋コード>' → { qids, createdAt, savedAt }）。
  // 以前の形（キーの配列）は読まれても空の一覧として扱い、次に書くときに置きかわる
  const RECORDED_KEY = 'rika-quest:live-recorded';
  const RECONNECTING = '接続が切れました。再接続しています';
  const GAVE_UP = '接続できません（通信を確かめてください）';
  const RECONNECTED = '再接続しました';
  const NOTICE_MS = 4000;         // 「再接続しました」を出しておく時間
  const BAD_URL = '先生のデータベースの URL（https:// で始まる URL）を入れてください。';
  const SCAN_MS = 300;            // QR コードを探す間隔
  const SCAN_UNSUPPORTED = 'この端末ではアプリの中で読めません。カメラアプリで QR コードを読むか、部屋コードを入れてください。';
  const SCAN_DENIED = 'カメラを使う許可がありません。ブラウザの設定でカメラを許可するか、部屋コードを入れてください。';

  function plain(text) { return String(text || '').split('**').join(''); }
  function errMsg(e) { return e && e.message ? e.message : String(e); }

  // ---- 画面をまたいで持つ状態（ページを読み込み直すまで） ----

  let renderSeq = 0;
  let active = null;              // いまの描画 { ctx, isCurrent, paint }
  let joinError = '';
  let joining = false;
  let editUrl = false;            // URL を入れ直す
  // アプリの中で QR コードを読む { seq, stream, video, timer, detecting, onVisibility } | null。scanError は読めなかった理由。
  // onVisibility は画面が裏に回ったらカメラを止める visibilitychange のリスナー（stopScan で外す）
  let scan = null;
  let scanSeq = 0;
  let scanError = '';
  const typed = { code: '', url: null };   // 入力の書きかけ（描き直しても消さない。url は null なら保存した URL）
  // 参加中の部屋 { code, pid, profileId, name, db, offset, sessionId, data, gone, answering（問題 id → 送った答え（符号化した文字列）。表示だけに使う）,
  //   sendFail（送れなかった答え { qid, choice, message } | null）, stop, retryTimer, timerNode, timeUpIndex,
  //   draft（問題 id → 送る前の回答の書きかけ { picked（multi の選んだ id）, text（text の入力）, seq（order のタップ順の id）}。
  //   描き直しでは消さず、画面を離れたら捨てる）,
  //   conn（'ok' | 'reconnecting' | 'gave-up'）, connError（受信が止まった理由）, notice, noticeTimer }
  // 答えの符号化は js/live.js と同じ: choice 'a'、multi 'a,c'（a→d 順）、order 'c,a,b'（表示順の id を並べた順）、text 文字列
  let joined = null;
  // 自由記述の入力欄で変換（IME）の途中なら、描き直しを変換が終わるまで待つ（描き直すと変換が切れるため）
  let composing = false;
  let paintLater = false;
  // 変換を始めたときの問題 { index, qid }（同じ問題の回答受付中かを確かめるため）
  let composeAt = null;
  // 参加中に ?live= の URL で読んだ、今の部屋とちがう部屋コード（「部屋から出る」で参加画面の部屋コードの欄に 1 回だけ入れる）
  let otherCode = null;
  let ticker = null;
  const memPids = {};             // sessionStorage が使えないとき
  // 学習記録（メモリ）に入れた問題（部屋のキー → 問題 id の配列）。保存の成否によらず入れる（読み込み直すまでの二重加算を防ぐ）。
  // 読み込み直すと消える（そのときは保存できた分だけが sessionStorage に残り、ほかは取り直して入れる）
  let memDone = {};
  // 記録には入れた（いまの記録のメモリにある）が、まだ sessionStorage に書いていない問題 [{ roomKey, qid, createdAt }]。
  // 保存に失敗した分は、あとで store の保存が成功したとき（メモリの記録がまるごと保存される）にいっしょに書く
  let unsavedDone = [];
  // ctx.live.onSaved の解除の関数。unsavedDone があるあいだだけ購読する（ライブの画面を離れてからの保存の成功も拾うため）
  let offSaved = null;
  let savedSource = null;         // 購読に使う ctx.live

  function repaint() {
    if (holdPaint(joined)) { paintLater = true; return; }
    if (active && active.isCurrent()) active.paint();
  }

  // 描き直しを変換の終わりまで待つか。待つのは「変換を始めたのと同じ問題の回答受付中（phase が show で時間が残っている）」だけ。
  // 問題・段階が変わった、または時間切れなら、変換中でもすぐ描き直す（古い問題の画面のまま次の問題に答えられなくなるのを防ぐ）
  function holdPaint(j) {
    if (!composing) return false;
    const s = j && j.data && !j.gone ? j.data.state : null;
    const q = s ? currentQuestion(j) : null;
    const same = !!s && !!composeAt && s.phase === 'show' && s.index === composeAt.index
      && !!q && q.id === composeAt.qid && remaining(j, s) > 0;
    if (!same) { composing = false; paintLater = false; composeAt = null; }
    return same;
  }

  function errorLine(text) {
    return el('p', { class: 'live-error', role: 'alert', text: text || '' });
  }

  function session() {
    try { return root.sessionStorage || null; } catch (e) { return null; }
  }

  function readJson(key, fallback) {
    const s = session();
    if (!s) return fallback;
    try {
      const v = JSON.parse(s.getItem(key) || 'null');
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    const s = session();
    if (!s) return false;
    try { s.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  // 生徒（プロフィール）ごとの pid。同じタブでは同じ pid
  function pidFor(profileId) {
    const map = readJson(PID_KEY, {});
    const saved = map && typeof map === 'object' ? map[profileId] : null;
    if (typeof saved === 'string' && /^p[a-z0-9]{8}$/.test(saved)) return saved;
    if (memPids[profileId]) return memPids[profileId];
    const pid = L().newPlayerId();
    memPids[profileId] = pid;
    const next = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    next[profileId] = pid;
    writeJson(PID_KEY, next);
    return pid;
  }

  function doneState() {
    return { memDone, unsavedDone, persisted: readJson(RECORDED_KEY, {}) };
  }

  // roomKey の部屋で処理済みの問題 id（sessionStorage の保存できた分と、記録のメモリに入れた分）
  function doneQids(roomKey) {
    return L().doneQidsOf(doneState(), roomKey);
  }

  // unsavedDone があるあいだだけ保存の成功を購読する
  function syncSavedListener() {
    if (unsavedDone.length > 0 && !offSaved && savedSource && typeof savedSource.onSaved === 'function') {
      offSaved = savedSource.onSaved(() => flushDone(Date.now() + (joined ? joined.offset || 0 : 0)));
    } else if (unsavedDone.length === 0 && offSaved) {
      const off = offSaved;
      offSaved = null;
      off();
    }
  }

  // 1 問を記録に入れようとした結果で処理済みを進める。sessionStorage に書けなければ、保存できた分も unsavedDone に残して次の機会に回す
  function applyDone(ev) {
    const prev = doneState();
    let next = L().nextDoneState(prev, ev);
    if (next.persisted !== prev.persisted && !writeJson(RECORDED_KEY, next.persisted)) {
      next = L().nextDoneState(prev, Object.assign({}, ev, { result: { applied: true, saved: false } }));
    }
    memDone = next.memDone;
    unsavedDone = next.unsavedDone;
    syncSavedListener();
  }

  // 保存できた記録の分（unsavedDone）を sessionStorage の処理済みに書く（store の保存が成功したとき）。書けなければ次の機会に回す
  function flushDone(now) {
    if (unsavedDone.length === 0) { syncSavedListener(); return; }
    const flushed = L().flushState(doneState(), now);
    if (writeJson(RECORDED_KEY, flushed.persisted)) unsavedDone = flushed.unsavedDone;
    syncSavedListener();
  }

  function roomPath(j, sub) {
    return 'rooms/' + j.code + (sub ? '/' + sub : '');
  }

  // 部屋コードの入力を英大文字だけに
  function normalizeCode(text) {
    return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  // ---- 受信 ----

  function stopWatch(j) {
    if (!j) return;
    if (j.retryTimer) { clearTimeout(j.retryTimer); j.retryTimer = null; }
    if (typeof j.stop === 'function') { try { j.stop(); } catch (e) { /* 無視 */ } }
    j.stop = null;
  }

  // 切れていたのがつながったら「再接続しました」を少しのあいだ出す
  function connBack(j) {
    if (j.conn === 'ok') return;
    j.conn = 'ok';
    j.connError = '';
    j.notice = RECONNECTED;
    if (j.noticeTimer) clearTimeout(j.noticeTimer);
    j.noticeTimer = setTimeout(() => {
      j.noticeTimer = null;
      j.notice = '';
      if (joined === j) repaint();
    }, NOTICE_MS);
  }

  function startWatch(j) {
    stopWatch(j);
    j.stop = j.db.watch(roomPath(j), (raw) => {
      if (joined !== j) return;
      connBack(j);
      if (raw === null) {
        j.gone = true;
        stopWatch(j);
      } else {
        j.data = L().safeRoom(raw);
        recordAnswers(j);
      }
      repaint();
    }, (e) => {
      // 受信が止まった（live-db がつなぎ直しをあきらめた・規則で読めない）。少し待ってこちらでつなぎ直す
      if (joined !== j) return;
      j.conn = 'gave-up';
      j.connError = e && e.kind !== 'gave-up' && e.message ? e.message : GAVE_UP;
      j.notice = '';
      j.stop = null;
      repaint();
      j.retryTimer = setTimeout(() => {
        j.retryTimer = null;
        if (joined === j && active && active.isCurrent()) startWatch(j);
      }, RETRY_MS);
    }, (info) => {
      // 切れた（live-db がつなぎ直している）・つながった
      if (joined !== j || !info) return;
      if (info.kind === 'reconnecting' && j.conn === 'ok') {
        j.conn = 'reconnecting';
        j.notice = '';
        repaint();
      } else if (info.kind === 'reconnected') {
        connBack(j);
        repaint();
      }
    });
  }

  // 受信の状態の 1 行（ふだんは何も出さない）
  function connLine(j) {
    if (j.conn === 'reconnecting') return errorLine(RECONNECTING);
    if (j.conn === 'gave-up') return errorLine(j.connError || GAVE_UP);
    if (j.notice) return el('p', { class: 'live-status', role: 'status', text: j.notice });
    return null;
  }

  function leave() {
    stopWatch(joined);
    if (joined) joined.newBadges = [];   // 最終順位で取ったバッジの表示も捨てる
    joined = null;
  }

  // 生徒が押して部屋から出る。参加中に別の部屋のコードを読んでいたら、部屋コードの欄に入れておく（1 回だけ）
  function exitRoom() {
    leave();
    if (otherCode) {
      typed.code = otherCode;
      joinError = '';
    }
    otherCode = null;
  }

  // ---- 時間 ----

  function serverNow(j) {
    return Date.now() + (j.offset || 0);
  }

  function remaining(j, s) {
    if (typeof s.startedAt !== 'number') return s.seconds;
    return Math.max(0, Math.ceil(s.seconds - (serverNow(j) - s.startedAt) / 1000));
  }

  function tick() {
    const j = joined;
    if (!j || !j.data || j.gone || !active || !active.isCurrent()) return;
    const s = j.data.state;
    if (s.phase !== 'show') return;
    const left = remaining(j, s);
    if (j.timerNode) {
      j.timerNode.textContent = String(left);
      j.timerNode.classList.toggle('is-low', left <= 5);
    }
    // 時間切れになったら、ボタンを押せなくするために描き直す（1 問につき 1 回）
    if (left <= 0 && j.timeUpIndex !== s.index) {
      j.timeUpIndex = s.index;
      repaint();
    }
  }

  // ---- 自分の答え ----

  function currentQuestion(j) {
    const s = j.data.state;
    return s.index >= 0 ? j.data.questions[s.index] || null : null;
  }

  // 画面に出す自分の答え（符号化した文字列。サーバーで確かめられた分。なければ送信中・送った分）。なければ null。
  // 学習記録には使わない（記録は recordAnswers が受信した answers だけから入れる）
  function myChoice(j, q) {
    const a = (j.data.answers[q.id] || {})[j.pid];
    if (a && typeof a.choice === 'string') return a.choice;
    return typeof j.answering[q.id] === 'string' ? j.answering[q.id] : null;
  }

  // 受信した部屋データから、答え合わせが済んだ問題の自分の回答（サーバーにあるものだけ）で、まだ入れていないものを学習記録に入れる。
  // 答え合わせの画面を見ていなくても（切れた・画面を離れたあと、次の問題や最終順位で戻ったときも）まとめて入れる。1 問につき 1 回。
  // 参加した生徒といまの生徒がちがうときは入れない（記録先を取りちがえない）。効果音は、いま答え合わせを見ている問題だけ
  function recordAnswers(j) {
    if (!j.data || !active || !active.isCurrent()) return;
    const ctx = active.ctx;
    const profile = H.currentProfile(ctx.store);
    if (!profile || profile.id !== j.profileId) return;
    if (!ctx.live || typeof ctx.live.record !== 'function') return;
    const s = j.data.state;
    const cur = currentQuestion(j);
    const roomKey = L().recordRoomKey(j.profileId, j.pid, j.code);
    const createdAt = j.data.meta ? j.data.meta.createdAt : null;
    savedSource = ctx.live;
    L().pendingRecords(j.data, j.pid, doneQids(roomKey), j.profileId, j.code).forEach((item) => {
      let result = { applied: false, saved: false };
      try {
        const r = ctx.live.record(L().recordEvents(item.question, item.choice, item.correct, j.sessionId), j.profileId);
        if (r && typeof r === 'object') result = { applied: r.applied === true, saved: r.applied === true && r.saved === true };
      } catch (e) {
        console.error(e);   // 例外は記録に入らなかったものとみなす（次の受信で取り直す）
      }
      // 入れなかった分は処理済みにしない。入れた分はメモリの処理済みに、保存に成功していれば sessionStorage にも書く
      // （保存に失敗した分は unsavedDone に残し、あとで store の保存が成功したときに書く。読み込み直すとメモリの記録とともに消えるので取り直す）
      applyDone({ key: roomKey, qid: item.qid, createdAt, now: Date.now() + (j.offset || 0), result });
      if (!result.applied) return;
      if (s.phase === 'reveal' && cur && cur.id === item.question.id && RQ.sfx && typeof RQ.sfx.play === 'function') {
        try { RQ.sfx.play(item.correct ? 'correct' : 'wrong'); } catch (e) { console.error(e); }
      }
    });
    recordRank(j, ctx, roomKey, createdAt);
  }

  // 部屋が終わったら、自分の最終順位を学習記録に 1 回だけ入れる（処理済みの管理は回答と同じ。問題 id の代わりに RANK_QID）。
  // 新しく取ったバッジは j.newBadges に足して、最終順位の画面に出す
  function recordRank(j, ctx, roomKey, createdAt) {
    if (j.data.state.phase !== 'ended') return;
    // doneQidsOf は Set を返す（配列の indexOf は使えない。使うと例外になり、live-db が黙って飲むので画面も切りかわらない）
    const done = doneQids(roomKey);
    if (done instanceof Set ? done.has(L().RANK_QID) : Array.isArray(done) && done.indexOf(L().RANK_QID) !== -1) return;
    const r = L().rankResult(j.data, j.pid);
    if (!r) return;
    let result = { applied: false, saved: false };
    try {
      const out = ctx.live.record([{ kind: 'liveResult', code: j.code, rank: r.rank, players: r.players, score: r.score }], j.profileId);
      if (out && typeof out === 'object') {
        result = { applied: out.applied === true, saved: out.applied === true && out.saved === true };
        if (Array.isArray(out.newBadges)) j.newBadges = (j.newBadges || []).concat(out.newBadges.filter((id) => (j.newBadges || []).indexOf(id) === -1));
      }
    } catch (e) {
      console.error(e);   // 例外は記録に入らなかったものとみなす（次の受信で取り直す）
    }
    applyDone({ key: roomKey, qid: L().RANK_QID, createdAt, now: Date.now() + (j.offset || 0), result });
  }

  // choice は符号化した答え（L().cleanAnswer を通したもの）。null・空なら送らない
  async function answer(j, q, choice) {
    if (joined !== j || typeof choice !== 'string' || !choice) return;
    const confirmed = (j.data.answers[q.id] || {})[j.pid];
    if (confirmed || typeof j.answering[q.id] === 'string') return;
    if (remaining(j, j.data.state) <= 0) return;
    j.answering[q.id] = choice;
    j.sendFail = null;
    repaint();
    try {
      await j.db.put(roomPath(j, 'answers/' + q.id + '/' + j.pid), { choice, at: { '.sv': 'timestamp' } });
    } catch (e) {
      // 送れなかった: 選び直し・「もう一度送る」ができるように、送信中の印を外す
      delete j.answering[q.id];
      j.sendFail = { qid: q.id, choice, message: errMsg(e) };
    }
    repaint();
  }

  // ---- 参加 ----

  async function join(ctx, codeText, urlText) {
    // カメラで読んでいる途中に手で入れて参加したときも、カメラを止める
    const hadScan = !!scan;
    stopScan();
    if (joining) { if (hadScan) repaint(); return; }
    const profile = H.currentProfile(ctx.store);
    if (!profile) { if (hadScan) repaint(); return; }
    const code = normalizeCode(codeText);
    if (!L().isRoomCode(code)) {
      joinError = '部屋コードは 6 文字です（英字と数字。I・O・0・1 は使いません）。';
      repaint();
      return;
    }
    // URL の欄を空にして参加したら、この端末の URL を消してアプリに組みこみの URL に戻す
    const resetUrl = urlText !== null && String(urlText).trim() === '' && !!ctx.live.builtinDbUrl && !!ctx.live.builtinDbUrl();
    if (resetUrl) ctx.live.setDbUrl(null);
    const url = LD().normalizeUrl(urlText === null || resetUrl ? ctx.live.dbUrl() : urlText);
    if (!url) { joinError = BAD_URL; repaint(); return; }
    if (urlText !== null && !resetUrl) ctx.live.setDbUrl(url);
    joining = true;
    joinError = '';
    // 参加を始めたときの描画の世代と生徒。通信のあいだに画面を離れた・生徒が変わったら、参加を取りやめる（何もしない）
    const seq = renderSeq;
    const stale = () => {
      const now = H.currentProfile(ctx.store);
      return seq !== renderSeq || !now || now.id !== profile.id;
    };
    repaint();
    try {
      const db = LD().createDb({ baseUrl: url });
      const meta = await db.get('rooms/' + code + '/meta');
      if (stale()) return;
      if (!meta) throw new Error('その部屋コードの部屋は見つかりません。コードを確かめてね。');
      const offset = await db.serverTime();
      if (stale()) return;
      if (L().isStale(meta, Date.now() + offset)) throw new Error('古い部屋です。先生に新しい部屋コードを聞いてね。');
      const pid = pidFor(profile.id);
      const name = String(profile.nickname || '').slice(0, L().MAX_NAME) || 'なまえ';
      // 読み込み直して入り直したときは、得点を 0 に戻さない
      const existing = await db.get('rooms/' + code + '/players/' + pid);
      if (stale()) return;
      if (!existing || typeof existing !== 'object') {
        // 終わった部屋に新しく入ることはできない（入れると、答えていない生徒が順位に入りバッジが付く）。参加していた生徒の入り直しはよい
        const st = await db.get('rooms/' + code + '/state');
        if (stale()) return;
        if (L().isEnded(st)) throw new Error('このライブクイズはもう終わっています。先生に新しい部屋コードを聞いてね。');
        await db.put('rooms/' + code + '/players/' + pid, { name, joinedAt: { '.sv': 'timestamp' }, score: 0 });
        if (stale()) return;
      }
      leave();
      joined = {
        code, pid, profileId: profile.id, name, db, offset, sessionId: ctx.live.sessionId(),
        data: null, gone: false, answering: {}, sendFail: null, draft: {}, stop: null, retryTimer: null, timerNode: null, timeUpIndex: -1,
        conn: 'ok', connError: '', notice: '', noticeTimer: null, newBadges: [], badgeSfxPlayed: false,
      };
      editUrl = false;
      otherCode = null;
      typed.code = '';
      typed.url = null;
      if (active && active.isCurrent()) startWatch(joined);
    } catch (e) {
      joinError = errMsg(e);
    } finally {
      joining = false;
      repaint();
    }
  }

  // ---- アプリの中で QR コードを読む ----

  function canScan() {
    const nav = root.navigator;
    return typeof root.BarcodeDetector === 'function' && !!nav && !!nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function';
  }

  function stopScan() {
    scanSeq++;
    const s = scan;
    scan = null;
    if (!s) return;
    if (s.timer) clearInterval(s.timer);
    if (s.onVisibility && root.document) {
      try { root.document.removeEventListener('visibilitychange', s.onVisibility); } catch (e) { /* 無視 */ }
    }
    if (s.stream) {
      try { s.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* 無視 */ }
    }
    if (s.video) {
      try { s.video.pause(); s.video.srcObject = null; } catch (e) { /* 無視 */ }
    }
  }

  async function startScan(ctx) {
    if (scan || joining) return;
    scanError = '';
    joinError = '';
    if (!canScan()) { scanError = SCAN_UNSUPPORTED; repaint(); return; }
    const seq = ++scanSeq;
    const mine = { seq, stream: null, video: null, timer: null, detecting: false, onVisibility: null };
    scan = mine;
    // タブを裏に回した・画面を消したら、カメラを止めて描き直す（リスナーは stopScan で外す）
    if (root.document && typeof root.document.addEventListener === 'function') {
      mine.onVisibility = () => {
        if (scan !== mine || !root.document.hidden) return;
        stopScan();
        repaint();
      };
      root.document.addEventListener('visibilitychange', mine.onVisibility);
    }
    repaint();
    const alive = () => scan === mine && scanSeq === seq && !!active && active.isCurrent();
    try {
      if (typeof root.BarcodeDetector.getSupportedFormats === 'function') {
        const formats = await root.BarcodeDetector.getSupportedFormats();
        if (!alive()) return;
        if (Array.isArray(formats) && formats.indexOf('qr_code') === -1) throw Object.assign(new Error(SCAN_UNSUPPORTED), { unsupported: true });
      }
      const detector = new root.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await root.navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!alive()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      mine.stream = stream;
      const video = el('video', { class: 'live-scan', autoplay: true, playsinline: true, 'aria-label': 'カメラの映像' });
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      mine.video = video;
      repaint();
      try { await video.play(); } catch (e) { /* 描き直しのときにもう一度再生する */ }
      mine.timer = setInterval(async () => {
        if (!alive()) { if (scan === mine) stopScan(); return; }
        // すでに参加している: 検出しても何もしない。カメラを止めて終える
        if (joined) { stopScan(); repaint(); return; }
        if (mine.detecting || video.readyState < 2) return;
        mine.detecting = true;
        try {
          const found = await detector.detect(video);
          if (!alive()) return;
          if (joined) { stopScan(); repaint(); return; }
          const code = (found || []).map((b) => RQ.qr.parseJoin(b && b.rawValue)).find(Boolean);
          if (code) {
            stopScan();
            typed.code = code;
            join(ctx, code, null);
          }
        } catch (e) {
          /* 1 回の検出の失敗は無視して次を待つ */
        } finally {
          mine.detecting = false;
        }
      }, SCAN_MS);
    } catch (e) {
      if (scan !== mine) return;
      stopScan();
      const name = e && e.name;
      if (e && e.unsupported) scanError = SCAN_UNSUPPORTED;
      else if (name === 'NotAllowedError' || name === 'SecurityError') scanError = SCAN_DENIED;
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') scanError = 'カメラが見つかりません。部屋コードを入れてください。';
      else scanError = 'カメラを開けませんでした（' + errMsg(e) + '）。部屋コードを入れてください。';
      repaint();
    }
  }

  // 「QR コードを読む」の部分（使えない端末では、その旨と、カメラアプリで読む方法）
  function scanPart(ctx) {
    if (!canScan()) return el('p', { class: 'muted live-scan-note', text: SCAN_UNSUPPORTED });
    if (scan) {
      return el('div', { class: 'live-scan-box' }, [
        scan.video || el('p', { class: 'muted', text: 'カメラを用意しています…' }),
        el('p', { class: 'live-status', role: 'status', text: '先生の画面の QR コードをカメラに映してね。' }),
        button('読むのをやめる', () => { stopScan(); repaint(); }, 'btn-block live-small'),
      ]);
    }
    return el('div', { class: 'live-scan-box' }, [
      button('QR コードを読む', () => startScan(ctx), 'btn-block', { disabled: joining }),
      errorLine(scanError),
    ]);
  }

  function joinCard(ctx) {
    const profile = H.currentProfile(ctx.store);
    const savedUrl = LD().normalizeUrl(ctx.live.dbUrl());
    const needUrl = !savedUrl || editUrl;
    const codeInput = el('input', {
      class: 'text-input live-code-input', id: 'live-code-input', type: 'text', autocomplete: 'off',
      autocapitalize: 'characters', spellcheck: 'false', maxlength: 6, placeholder: 'ABC234', 'data-no-ruby': true,
    });
    codeInput.value = typed.code;
    codeInput.addEventListener('input', () => {
      const v = normalizeCode(codeInput.value);
      if (v !== codeInput.value) codeInput.value = v;
      typed.code = v;
    });
    const urlInput = needUrl ? el('input', {
      class: 'text-input', id: 'live-url-input', type: 'url', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'https://○○-default-rtdb.firebaseio.com',
    }) : null;
    if (urlInput) {
      urlInput.value = typed.url !== null ? typed.url : savedUrl || '';
      urlInput.addEventListener('input', () => { typed.url = urlInput.value; });
    }
    const submit = (ev) => {
      if (ev) ev.preventDefault();
      join(ctx, codeInput.value, urlInput ? urlInput.value : null);
    };
    const form = el('form', { class: 'author-form', onsubmit: submit }, [
      needUrl ? el('label', { class: 'author-field' }, [
        el('span', { class: 'field-label', text: '先生のデータベースの URL' }),
        urlInput,
        el('span', { class: 'author-hint muted', text: ctx.live.builtinDbUrl && ctx.live.builtinDbUrl()
          ? '先生に言われたときだけ変えてね（空にして参加すると、アプリに組みこみの URL に戻ります）。'
          : '先生が黒板に書いた URL を入れてね（1 度入れたら、この端末が覚えます）。' }),
      ]) : null,
      el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: '部屋コード（6 文字）' }), codeInput]),
      el('p', null, [el('span', { 'data-no-ruby': true, text: profile ? profile.nickname : '' }), ' さんとして参加します。']),
      el('button', { type: 'submit', class: 'btn btn-primary btn-block', disabled: joining, text: joining ? '参加しています…' : '参加する' }),
      errorLine(joinError),
    ]);
    return card([
      cardTitle('ライブクイズに参加'),
      form,
      scanPart(ctx),
      !needUrl ? button('くわしい設定: データベースの URL を変える', () => { editUrl = true; repaint(); }, 'btn-block live-small') : null,
    ]);
  }

  // ---- 部屋の画面 ----

  function roomLine(j) {
    return el('p', { class: 'muted live-room-line' }, [
      '部屋 ', el('span', { 'data-no-ruby': true, text: j.code }), '・', el('span', { 'data-no-ruby': true, text: j.name }), ' さん',
    ]);
  }

  function rankTable(rows, mePid) {
    return el('table', { class: 'live-rank' }, [
      el('thead', null, [el('tr', null, [el('th', { text: '順位' }), el('th', { text: 'ニックネーム' }), el('th', { class: 'num', text: '得点' })])]),
      el('tbody', null, rows.map((row) => el('tr', { class: row.pid === mePid ? 'is-me' : null }, [
        el('td', { text: row.rank + ' 位' }),
        el('td', { 'data-no-ruby': true, text: row.name }),
        el('td', { class: 'num', text: String(row.score) }),
      ]))),
    ]);
  }

  function waitCard(j) {
    const d = j.data;
    return card([
      cardTitle('参加しました'),
      el('p', { class: 'live-wait', text: '先生が問題を出すのを待とう。' }),
      el('p', { class: 'live-joined', text: '参加者 ' + Object.keys(d.players).length + ' 人' }),
    ]);
  }

  // ---- 出題の形 ----

  // 形の印の文（choice は印なし）
  const KIND_MARKS = { multi: 'あてはまるものを全部', text: '（記述）', order: '正しい順に並べる' };

  function kindMark(q) {
    const text = KIND_MARKS[L().kindOf(q)];
    return text ? el('p', { class: 'live-kind', text }) : null;
  }

  // 選択肢 id のラベル（ア〜エ。options の並び＝表示順）
  function labelOf(q, id) {
    const i = q.options.findIndex((o) => o.id === id);
    return LABELS[i] || '?';
  }

  // 符号化した答えを表示用の文に（choice「ア」、multi「ア・ウ」、order「ウ → ア → イ」、text はそのまま）
  function answerText(q, value) {
    const v = typeof value === 'string' ? value : '';
    const kind = L().kindOf(q);
    if (kind === 'text') return v;
    const ids = v ? v.split(',') : [];
    return ids.map((id) => labelOf(q, id)).join(kind === 'order' ? ' → ' : '・');
  }

  // 問題 id ごとの回答の書きかけ（描き直しでは消さない）
  function draftOf(j, q) {
    if (!j.draft[q.id]) j.draft[q.id] = { picked: [], text: '', seq: [] };
    return j.draft[q.id];
  }

  // 選択肢のボタン。state: { picked, disabled, badge（ボタンの中に足す要素の配列） }
  function choiceButton(o, i, state, onclick) {
    return el('button', {
      type: 'button',
      class: 'btn live-choice live-opt ' + OPT_CLASSES[i % OPT_CLASSES.length] + (state.picked ? ' is-picked' : ''),
      disabled: !!state.disabled,
      'aria-pressed': state.picked ? 'true' : 'false',
      onclick,
    }, [el('span', { class: 'live-opt-label', text: LABELS[i] || '' }), el('span', { text: plain(o.text) })].concat(state.badge || []));
  }

  // 形ごとの答える部分 { body: [要素], hint: 答える前の案内 }。送る答えは L().cleanAnswer を通した文字列
  function answerPart(j, q, mine, timeUp) {
    const kind = L().kindOf(q);
    const done = mine !== null;
    if (kind === 'multi') {
      // 押すたびに選ぶ／外す →「決定（N こ）」
      const dr = draftOf(j, q);
      const picked = done ? mine.split(',') : dr.picked;
      const buttons = q.options.map((o, i) => choiceButton(o, i, { picked: picked.indexOf(o.id) !== -1, disabled: done || timeUp }, () => {
        dr.picked = dr.picked.indexOf(o.id) !== -1 ? dr.picked.filter((id) => id !== o.id) : dr.picked.concat([o.id]);
        repaint();
      }));
      return {
        body: [
          el('div', { class: 'live-options' }, buttons),
          done ? null : button('決定（' + dr.picked.length + ' こ）', () => answer(j, q, L().cleanAnswer(q, dr.picked.join(','))),
            'btn-primary btn-block live-decide', { disabled: timeUp || dr.picked.length === 0 }),
        ],
        hint: 'あてはまるものを全部えらんで「決定」',
      };
    }
    if (kind === 'order') {
      // 正しい順にタップ（タップした順に番号。タップした選択肢は押せない）→「決定」。「やり直す」で番号を消す
      const dr = draftOf(j, q);
      const seq = done ? mine.split(',') : dr.seq;   // 答えたあとは送った順
      const buttons = q.options.map((o, i) => {
        const pos = seq.indexOf(o.id);
        return choiceButton(o, i, {
          picked: pos !== -1,
          disabled: done || timeUp || pos !== -1,
          badge: pos !== -1 ? [el('span', { class: 'live-order-num', 'aria-label': (pos + 1) + ' 番目', text: String(pos + 1) })] : [],
        }, () => {
          if (dr.seq.indexOf(o.id) === -1) dr.seq = dr.seq.concat([o.id]);
          repaint();
        });
      });
      const full = dr.seq.length === q.options.length;
      return {
        body: [
          el('div', { class: 'live-options' }, buttons),
          done ? null : el('div', { class: 'btn-row live-decide' }, [
            button('やり直す', () => { dr.seq = []; repaint(); }, '', { disabled: timeUp || dr.seq.length === 0 }),
            button('決定', () => answer(j, q, L().cleanAnswer(q, dr.seq.join(','))), 'btn-primary', { disabled: timeUp || !full }),
          ]),
        ],
        hint: '正しい順にタップして「決定」',
      };
    }
    if (kind === 'text') {
      // 1 行の入力欄 ＋「送る」（Enter でも送る。空なら送らない）
      const dr = draftOf(j, q);
      const attrs = {
        class: 'text-input', id: 'live-text-input', type: 'text', autocomplete: 'off', spellcheck: 'false',
        maxlength: L().MAX_TEXT_ANSWER, 'aria-label': '答え', disabled: done || timeUp,
      };
      if (q.number) attrs.inputmode = 'decimal';
      const input = el('input', attrs);
      input.value = done ? mine : dr.text;
      input.addEventListener('input', () => { dr.text = input.value; });
      input.addEventListener('compositionstart', () => {
        composing = true;
        composeAt = { index: j.data.state.index, qid: q.id };
      });
      input.addEventListener('compositionend', () => {
        composing = false;
        composeAt = null;
        dr.text = input.value;
        if (paintLater) { paintLater = false; repaint(); }
      });
      const submit = (ev) => {
        if (ev) ev.preventDefault();
        // いまの問題が入力を始めた問題と同じで、回答受付中のときだけ送る（古い画面から次の問題へ送らない）
        const now = joined === j && j.data ? currentQuestion(j) : null;
        if (!now || now.id !== q.id || j.data.state.phase !== 'show') return;
        dr.text = input.value;
        answer(j, q, L().cleanAnswer(q, dr.text));   // 空なら null で送らない
      };
      return {
        body: [el('form', { class: 'live-text-form', onsubmit: submit }, [
          input,
          el('button', { type: 'submit', class: 'btn btn-primary', disabled: done || timeUp, text: '送る' }),
        ])],
        hint: '答えを打って「送る」',
      };
    }
    // choice: 今までどおり（押したら送る）
    const buttons = q.options.map((o, i) => choiceButton(o, i, { picked: mine === o.id, disabled: done || timeUp }, () => answer(j, q, o.id)));
    return { body: [el('div', { class: 'live-options' }, buttons)], hint: '答えをえらぼう（1 回だけ）' };
  }

  function showCard(j) {
    const s = j.data.state;
    const q = currentQuestion(j);
    if (!q) return waitCard(j);
    const left = remaining(j, s);
    const mine = myChoice(j, q);
    const timeUp = left <= 0;
    const fail = mine === null && j.sendFail && j.sendFail.qid === q.id ? j.sendFail : null;
    j.timerNode = el('span', { class: 'live-timer-num' + (left <= 5 ? ' is-low' : ''), text: String(left) });
    const part = answerPart(j, q, mine, timeUp);
    return card([
      el('div', { class: 'live-head' }, [
        el('p', { class: 'live-count', text: (s.index + 1) + ' / ' + j.data.questions.length + ' 問目' }),
        el('p', { class: 'live-timer', 'aria-label': '残り時間（秒）' }, [j.timerNode, el('span', { class: 'live-timer-unit', text: '秒' })]),
      ]),
      kindMark(q),
      el('p', { class: 'live-question', text: plain(q.prompt) }),
    ].concat(part.body, [
      el('p', { class: 'live-status', role: 'status', text: mine !== null ? '答えた！ 答え合わせを待とう。' : timeUp ? '時間切れ' : part.hint }),
      fail ? errorLine('送れませんでした。もう一度送ってね（' + fail.message + '）') : null,
      fail && !timeUp ? button('もう一度送る', () => answer(j, q, fail.choice), 'btn-primary btn-block') : null,
    ]));
  }

  // 正解の表示用の文（choice は今までどおり「ア 文」）
  function rightText(q) {
    const kind = L().kindOf(q);
    if (kind === 'choice') {
      const ci = q.options.findIndex((o) => o.id === q.answer);
      return (LABELS[ci] || '') + ' ' + plain(ci >= 0 ? q.options[ci].text : '');
    }
    if (kind === 'text') return q.answer;
    return answerText(q, L().cleanAnswer(q, q.answer) || q.answer);
  }

  function revealCard(j) {
    const d = j.data;
    const s = d.state;
    const q = currentQuestion(j);
    if (!q) return waitCard(j);
    const mine = myChoice(j, q);
    const correct = mine !== null && L().isCorrect(q, mine);
    const player = d.players[j.pid] || null;
    const myAnswer = (d.answers[q.id] || {})[j.pid] || null;
    const scored = !!player && player.lastQ === q.id;
    const points = scored && typeof player.lastPoints === 'number' ? player.lastPoints
      : myAnswer ? L().scoreFor(q, myAnswer, s.startedAt, s.seconds) : 0;
    const board = L().leaderboard(d.players);
    const me = board.find((r) => r.pid === j.pid) || null;
    return card([
      el('p', { class: 'live-count', text: (s.index + 1) + ' / ' + d.questions.length + ' 問目の答え合わせ' }),
      kindMark(q),
      el('p', { class: 'live-question', text: plain(q.prompt) }),
      el('p', { class: 'live-result ' + (mine === null ? 'is-none' : correct ? 'is-ok' : 'is-ng'), text: mine === null ? '答えなかった' : correct ? '○ 正解！' : '× ざんねん' }),
      el('p', { class: 'live-answer', text: '正解: ' + rightText(q) }),
      L().kindOf(q) !== 'choice' && mine !== null ? el('p', { class: 'live-mine', text: 'あなた: ' + answerText(q, mine) }) : null,
      el('p', { class: 'live-points', text: 'この問題 ' + points + ' 点' }),
      me ? el('p', { class: 'live-total', text: 'いまの合計 ' + me.score + ' 点・' + me.rank + ' 位（' + board.length + ' 人中）' + (scored ? '' : '（計算中）') }) : null,
    ]);
  }

  function endedCard(j, ctx) {
    const board = L().leaderboard(j.data.players);
    const top = board.slice(0, TOP);
    const me = board.find((r) => r.pid === j.pid) || null;
    const rows = me && !top.some((r) => r.pid === me.pid) ? top.concat([me]) : top;
    return [card([
      cardTitle('最終順位'),
      me ? el('p', { class: 'live-total', text: 'あなたは ' + me.rank + ' 位（' + me.score + ' 点）' }) : null,
      rows.length > 0 ? rankTable(rows, j.pid) : null,
      button('ホームへ', () => { exitRoom(); ctx.go('home'); }, 'btn-primary btn-block'),
    ]), newBadgesCard(j, ctx)];
  }

  // 最終順位で新しく取ったバッジ（結果画面と同じ見た目）。表示したら「見た」にする。効果音は 1 回だけ
  function newBadgesCard(j, ctx) {
    const defs = (j.newBadges || []).map((id) => RQ.badges.def(id)).filter(Boolean);
    if (defs.length === 0) return null;
    const node = card([
      cardTitle('新しいバッジ！'),
      el('ul', { class: 'badge-new-list' }, defs.map((d) => el('li', { class: 'badge-item' }, [
        H.badgeMedal(d, true, 64),
        el('div', { class: 'badge-text' }, [
          el('span', { class: 'badge-title', text: d.title }),
          el('span', { class: 'badge-sub', text: d.description }),
        ]),
      ]))),
    ], 'badge-new');
    if (typeof ctx.markBadgesSeen === 'function') ctx.markBadgesSeen(defs.map((d) => d.id));
    if (!j.badgeSfxPlayed) {
      j.badgeSfxPlayed = true;
      if (RQ.sfx && typeof RQ.sfx.play === 'function') {
        try { RQ.sfx.play('badge'); } catch (e) { console.error(e); }
      }
    }
    return node;
  }

  // 参加中に別の部屋のコードを読んだときの一文（コードはふりがなを付けない）
  function otherCodeLine() {
    if (!otherCode) return null;
    return el('p', { class: 'caution live-other-code', role: 'status' }, [
      '別の部屋のコード ', el('span', { 'data-no-ruby': true, text: otherCode }), ' を読みました。入るときは『部屋から出る』を押してから参加してね',
    ]);
  }

  function roomView(j, ctx) {
    j.timerNode = null;
    if (j.gone) {
      return [card([
        cardTitle('ライブクイズ'),
        el('p', { text: '先生が部屋を閉じました。' }),
        button('ホームへ', () => { exitRoom(); ctx.go('home'); }, 'btn-primary btn-block'),
      ])];
    }
    if (!j.data) return [roomLine(j), connLine(j), card([el('p', { text: 'つないでいます…' })])];
    const phase = j.data.state.phase;
    let body;
    if (phase === 'show') body = showCard(j);
    else if (phase === 'reveal') body = revealCard(j);
    else if (phase === 'ended') body = endedCard(j, ctx);
    else body = waitCard(j);
    if (phase === 'ended') return [roomLine(j), connLine(j)].concat(body);
    return [otherCodeLine(), roomLine(j), connLine(j), body, button('部屋から出る', () => { exitRoom(); repaint(); }, 'btn-block live-small')];
  }

  // ---- 画面 ----

  function renderLive(section, ctx) {
    const mine = ++renderSeq;
    const isCurrent = () => mine === renderSeq && ctx.state.screen === 'live';
    const profile = H.currentProfile(ctx.store);
    // 生徒が変わっていたら、前の生徒の部屋からは出る
    if (joined && (!profile || joined.profileId !== profile.id)) { leave(); otherCode = null; }

    function paint() {
      if (!isCurrent()) return;
      composing = false;
      paintLater = false;
      composeAt = null;
      const y = root.scrollY;
      // 自由記述の入力欄で打っている途中なら、描き直したあとも入力欄にカーソルを戻す（ほかの人が答えるたびに描き直すため）
      const doc = root.document;
      const focused = doc && doc.activeElement && doc.activeElement.id === 'live-text-input' ? doc.activeElement : null;
      const caret = focused ? [focused.selectionStart, focused.selectionEnd] : null;
      const children = [H.topBar('ライブクイズ', 'ホーム', () => ctx.go('home'))];
      if (joined) children.push(...roomView(joined, ctx));
      else children.push(joinCard(ctx));
      section.replaceChildren(...children.filter(Boolean));
      root.scrollTo(0, y);
      const again = caret ? section.querySelector('#live-text-input') : null;
      if (again && !again.disabled) {
        try { again.focus({ preventScroll: true }); again.setSelectionRange(caret[0], caret[1]); } catch (e) { /* 無視 */ }
      }
      // 描き直しで映像が DOM から外れると止まるので、もう一度再生する
      if (scan && scan.video && scan.video.paused) scan.video.play().catch(() => {});
    }

    active = { ctx, isCurrent, paint };
    // QR コードの URL で開いたとき（?live=<部屋コード>）: 部屋コードの欄に入れておく（「参加する」を押すだけ）
    const pending = ctx.live && typeof ctx.live.pendingCode === 'function' ? ctx.live.pendingCode() : null;
    if (pending && !joined) {
      typed.code = normalizeCode(pending);
      joinError = '';
      otherCode = null;
    } else if (pending && joined) {
      // 参加中: 今の部屋とちがうコードなら伝える（同じ部屋なら何もしない）
      const c = normalizeCode(pending);
      if (c && c !== joined.code) otherCode = c;
    }
    if (joined && !joined.gone) startWatch(joined);
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, TICK_MS);
    paint();

    return function cleanup() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      stopScan();
      scanError = '';
      stopWatch(joined);
      composing = false;
      paintLater = false;
      composeAt = null;
      // 回答の書きかけは画面を離れたら捨てる
      if (joined) { joined.timerNode = null; joined.draft = {}; }
    };
  }

  RQ.ui.screens.live = renderLive;
  RQ.ui.renderLive = renderLive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
