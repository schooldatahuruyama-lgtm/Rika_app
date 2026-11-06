// ライブクイズの先生の画面（ブラウザ専用。ui-teacher.js の後に読み込む）。RikaQuest.ui.screens['live-host'] を足す。設計書 14 章。
// 準備（データベースの URL）→ 問題を選ぶ → 部屋を作る（ロビー）→ 出題 → 答え合わせ → … → 最終結果、を 1 画面で行う。
// 部屋のデータの形・得点・状態遷移は js/live.js（RikaQuest.live）、通信は js/live-db.js（RikaQuest.liveDb）。
// データベースの URL は ctx.live.dbUrl() / setDbUrl(url|null)（js/app.js。この端末の localStorage）。
// 開けるのは先生画面を解錠しているときだけ（app.go が teacher に回す。teacher ↔ live-host の行き来では解錠は消えない）。
// 利用者の文字はすべて textContent で入れる（innerHTML は使わない）。先生の画面なので、ふりがなは付けない（section に data-no-ruby）。
// 部屋の受信（watch）は画面を離れたら止める（後片付けの関数を返す）。部屋と選んだ問題はページを読み込み直すまで残し、
// 戻ってきたら受信をつなぎ直す。非同期の処理は ui-teacher.js の renderSeq と同じ守りで、いまの画面のときだけ描く。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const H = RQ.ui.helpers;
  const el = H.el;
  const button = H.button;
  const card = H.card;
  const cardTitle = H.cardTitle;

  // 読み込み順に頼らないよう、使うときに取る（確認では createDb を差しかえることもある）
  function L() { return RQ.live; }
  function LD() { return RQ.liveDb; }

  const SECONDS = [10, 20, 30, 60];
  const LABELS = ['ア', 'イ', 'ウ', 'エ'];
  const OPT_CLASSES = ['live-opt-a', 'live-opt-b', 'live-opt-c', 'live-opt-d'];
  const TOP = 5;                  // 答え合わせに出す上位の人数
  const TICK_MS = 250;            // 残り時間を描き直す間隔
  const RETRY_MS = 3000;          // 受信が止まったあと、つなぎ直すまでの時間
  const ROOM_TRIES = 5;           // 部屋コードがほかの部屋と重なったときに作り直す回数
  const SETUP_NOTE = 'docs/live/setup.md の手順で Firebase を準備してください（10 分ほど）。準備したデータベースの URL をここに貼ります。';
  const BAD_URL = 'Firebase のデータベースの URL（https://…firebaseio.com か https://…firebasedatabase.app）を入れてください。';
  const RECONNECTING = '接続が切れました。再接続しています';
  const GAVE_UP = '接続できません（通信を確かめてください）';
  const RECONNECTED = '再接続しました';
  const NOTICE_MS = 4000;         // 「再接続しました」を出しておく時間

  function list(x) { return Array.isArray(x) ? x : []; }
  // 文の **語句** 記法は外して、文だけを出す（スクリーンに映すため）
  function plain(text) { return String(text || '').split('**').join(''); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  // ---- 画面をまたいで持つ状態（ページを読み込み直すまで） ----

  let renderSeq = 0;
  let active = null;              // いまの描画 { isCurrent, paint }
  let urlError = '';              // 準備の card の失敗の文
  let setupError = '';            // 部屋を作るときの失敗の文
  let creating = false;           // 部屋を作っている途中
  // 選んだ問題など。questions は出す順（live.questionFromProblem / customQuestion の形）
  const sel = { unitId: null, stages: [], questions: [], seconds: 20, title: '', customN: 0 };
  // 自作の問題の書きかけ
  const draft = { prompt: '', options: ['', '', '', ''], answer: 0 };
  // いまの部屋 { code, db, questions, offset, data（safeRoom）, gone, error, busy, autoIndex, stop, retryTimer, timerNode,
  //   conn（'ok' | 'reconnecting' | 'gave-up'）, connError（受信が止まった理由）, notice, noticeTimer,
  //   scoreFail（得点を書けなかった問題 { index, message } | null） }
  let room = null;
  let ticker = null;

  function repaint() {
    if (active && active.isCurrent()) active.paint();
  }

  function errorLine(text) {
    return el('p', { class: 'live-error', role: 'alert', text: text || '' });
  }

  function roomPath(r, sub) {
    return 'rooms/' + r.code + (sub ? '/' + sub : '');
  }

  // ---- 受信 ----

  function stopWatch(r) {
    if (!r) return;
    if (r.retryTimer) { clearTimeout(r.retryTimer); r.retryTimer = null; }
    if (typeof r.stop === 'function') { try { r.stop(); } catch (e) { /* 無視 */ } }
    r.stop = null;
  }

  // 切れていたのがつながったら「再接続しました」を少しのあいだ出す
  function connBack(r) {
    if (r.conn === 'ok') return;
    r.conn = 'ok';
    r.connError = '';
    r.notice = RECONNECTED;
    if (r.noticeTimer) clearTimeout(r.noticeTimer);
    r.noticeTimer = setTimeout(() => {
      r.noticeTimer = null;
      r.notice = '';
      if (room === r) repaint();
    }, NOTICE_MS);
  }

  function startWatch(r) {
    stopWatch(r);
    r.stop = r.db.watch(roomPath(r), (raw) => {
      if (room !== r) return;
      connBack(r);
      if (raw === null) {
        r.gone = true;
        stopWatch(r);
      } else {
        r.gone = false;
        r.data = L().safeRoom(raw);
      }
      repaint();
    }, (e) => {
      // 受信が止まった（live-db がつなぎ直しをあきらめた・規則で読めない）
      if (room !== r) return;
      r.conn = 'gave-up';
      r.connError = e && e.kind !== 'gave-up' && e.message ? e.message : GAVE_UP;
      r.notice = '';
      r.stop = null;
      repaint();
      // 少し待ってこちらでつなぎ直す（画面にいるあいだだけ）
      r.retryTimer = setTimeout(() => {
        r.retryTimer = null;
        if (room === r && active && active.isCurrent()) startWatch(r);
      }, RETRY_MS);
    }, (info) => {
      // 切れた（live-db がつなぎ直している）・つながった
      if (room !== r || !info) return;
      if (info.kind === 'reconnecting' && r.conn === 'ok') {
        r.conn = 'reconnecting';
        r.notice = '';
        repaint();
      } else if (info.kind === 'reconnected') {
        connBack(r);
        repaint();
      }
    });
  }

  // 受信の状態の 1 行（ふだんは何も出さない）
  function connLine(r) {
    if (r.conn === 'reconnecting') return errorLine(RECONNECTING);
    if (r.conn === 'gave-up') return errorLine(r.connError || GAVE_UP);
    if (r.notice) return el('p', { class: 'live-status', role: 'status', text: r.notice });
    return null;
  }

  // ---- 時間 ----

  function serverNow(r) {
    return Date.now() + (r.offset || 0);
  }

  // 残り秒（切り上げ）。開始時刻がわからなければ制限秒
  function remaining(r, s) {
    if (typeof s.startedAt !== 'number') return s.seconds;
    return Math.max(0, Math.ceil(s.seconds - (serverNow(r) - s.startedAt) / 1000));
  }

  function tick() {
    const r = room;
    if (!r || !r.data || r.gone || !active || !active.isCurrent()) return;
    const s = r.data.state;
    if (s.phase !== 'show') return;
    const left = remaining(r, s);
    if (r.timerNode) {
      r.timerNode.textContent = String(left);
      r.timerNode.classList.toggle('is-low', left <= 5);
    }
    // 時間切れで自動的に答え合わせ（1 問につき 1 回だけ試す）
    if (left <= 0 && r.autoIndex !== s.index && !r.busy) {
      r.autoIndex = s.index;
      act('reveal');
    }
  }

  // ---- 先生の操作 ----

  // 答え合わせの得点を players に書く。受信した写しは遅れることがあるので、この問題の回答と参加者をサーバーから取り直して採点する
  // （live.scoreUpdate）。足し終わった人（lastQ がこの問題）は飛ばす（何度呼んでも二重に足さない）。
  // 回答・参加者のどちらかを取り直せなければ（通信の失敗・本文を読めない。db.get が投げる）、採点せず得点も lastQ も書かずに投げる。
  // 正常な「データなし」（null）は、回答なら全員が未回答として採点する。
  // Realtime Database の PATCH は子をまるごと置きかえるので、マルチパス（'<pid>/score' など）で得点の項目だけを書く
  async function writeScores(r, q, s) {
    let answers;
    let players;
    try {
      [answers, players] = await Promise.all([r.db.get(roomPath(r, 'answers/' + q.id)), r.db.get(roomPath(r, 'players'))]);
    } catch (e) {
      throw new Error('得点を計算できませんでした。' + (e && e.message ? e.message : String(e)));
    }
    const update = L().scoreUpdate(players, q, answers, s.startedAt, s.seconds);
    if (Object.keys(update).length > 0) {
      try {
        await r.db.patch(roomPath(r, 'players'), update);
      } catch (e) {
        throw new Error('得点を書けませんでした。' + (e && e.message ? e.message : String(e)));
      }
    }
    if (r.scoreFail && r.scoreFail.index === s.index) r.scoreFail = null;
  }

  // 答え合わせの得点を書く。失敗したら答え合わせの画面に「もう一度」を出す（lastQ は書いていないので、やり直せる）
  async function scoreReveal(r, q, s) {
    try {
      await writeScores(r, q, s);
    } catch (e) {
      r.scoreFail = { index: s.index, message: e && e.message ? e.message : String(e) };
    }
  }

  // 「もう一度」: いまの答え合わせの得点を書き直す
  async function retryScores() {
    const r = room;
    if (!r || !r.data || r.busy) return;
    const s = r.data.state;
    const q = r.questions[s.index];
    if (s.phase !== 'reveal' || !q) return;
    r.busy = true;
    repaint();
    try {
      await scoreReveal(r, q, s);
    } finally {
      r.busy = false;
      repaint();
    }
  }

  // kind: 'start' | 'reveal' | 'next' | 'end'
  async function act(kind) {
    const r = room;
    if (!r || !r.data || r.busy) return;
    r.busy = true;
    repaint();
    try {
      const cur = r.data.state;
      // 答え合わせのあとに進むときは、得点を書き終えているか確かめる（書けなかったときの書き直し）
      if ((kind === 'next' || kind === 'end') && cur.phase === 'reveal' && r.questions[cur.index]) {
        await writeScores(r, r.questions[cur.index], cur);
      }
      const s = L().nextState(cur, r.questions, kind, serverNow(r));
      await r.db.patch(roomPath(r, 'state'), s);
      if (room === r && r.data) r.data = Object.assign({}, r.data, { state: s });   // 受信を待たずに画面を進める
      if (kind === 'reveal' && s.phase === 'reveal' && r.questions[s.index]) {
        await scoreReveal(r, r.questions[s.index], s);
      }
      r.error = '';
    } catch (e) {
      r.error = e && e.message ? e.message : String(e);
    } finally {
      r.busy = false;
      repaint();
    }
  }

  async function createRoom() {
    if (creating) return;
    const url = LD().normalizeUrl(active.ctx.live.dbUrl());
    if (!url) { setupError = BAD_URL; repaint(); return; }
    if (sel.questions.length === 0) return;
    creating = true;
    setupError = '';
    repaint();
    try {
      const db = LD().createDb({ baseUrl: url });
      const offset = await db.serverTime();
      let code = null;
      for (let i = 0; i < ROOM_TRIES && !code; i++) {
        const c = L().newRoomCode();
        const meta = await db.get('rooms/' + c + '/meta');
        if (!meta || L().isStale(meta, Date.now() + offset)) code = c;
      }
      if (!code) throw new Error('部屋コードを作れませんでした。もう一度押してください。');
      const data = L().newRoom({ questions: sel.questions, seconds: sel.seconds, title: sel.title.trim(), hostId: L().newPlayerId() }, Date.now() + offset);
      await db.put('rooms/' + code, data);
      const safe = L().safeRoom(data);
      room = {
        code, db, questions: safe.questions, offset, data: safe, gone: false, error: '', busy: false, autoIndex: -1, stop: null, retryTimer: null, timerNode: null,
        conn: 'ok', connError: '', notice: '', noticeTimer: null, scoreFail: null,
      };
      if (active && active.isCurrent()) startWatch(room);
    } catch (e) {
      setupError = e && e.message ? e.message : String(e);
    } finally {
      creating = false;
      repaint();
    }
  }

  async function removeRoom() {
    const r = room;
    if (!r || r.busy) return;
    const ok = await active.ctx.confirm('部屋を消して終わりますか？（生徒の画面も終わります）', '消す');
    if (!ok || room !== r) return;
    r.busy = true;
    repaint();
    try {
      await r.db.remove(roomPath(r));
      stopWatch(r);
      room = null;
    } catch (e) {
      r.error = e && e.message ? e.message : String(e);
    } finally {
      r.busy = false;
      repaint();
    }
  }

  // 部屋を忘れて準備に戻る（部屋が消えていたとき）
  function forgetRoom() {
    stopWatch(room);
    room = null;
    repaint();
  }

  // ---- 準備・問題を選ぶ ----

  function setupCard(ctx) {
    const url = LD().normalizeUrl(ctx.live.dbUrl());
    const input = el('input', {
      class: 'text-input', id: 'live-db-url', type: 'url', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'https://○○-default-rtdb.firebaseio.com', value: url || '',
    });
    const saveUrl = () => {
      const u = LD().normalizeUrl(input.value);
      if (!u) { urlError = BAD_URL; repaint(); return; }
      if (!ctx.live.setDbUrl(u)) { urlError = 'URL を保存できませんでした（ブラウザの保存領域を確かめてください）。'; repaint(); return; }
      urlError = '';
      repaint();
      ctx.message('データベースの URL を保存しました。', 'ok');
    };
    return card([
      cardTitle('1. 準備'),
      url ? el('p', null, ['データベース: ', el('span', { class: 'live-url', text: url })]) : el('p', { class: 'caution', text: SETUP_NOTE }),
      el('label', { class: 'field-label', for: 'live-db-url', text: 'データベースの URL' }),
      input,
      el('div', { class: 'btn-row live-row' }, [
        button('保存', saveUrl, url ? '' : 'btn-primary'),
        url ? button('消す', () => { ctx.live.setDbUrl(null); urlError = ''; repaint(); }) : null,
      ]),
      errorLine(urlError),
    ]);
  }

  // ステージの選択式の問題（problems・retryPool の順。出せないものは入れない）
  function stageQuestions(unitId, stage) {
    const out = [];
    list(stage.problems).concat(list(stage.retryPool)).forEach((p) => {
      const q = L().questionFromProblem(p, { unitId, stageId: stage.id });
      if (q && !out.some((x) => x.id === q.id)) out.push(q);
    });
    return out;
  }

  function hasQuestion(id) {
    return sel.questions.some((q) => q.id === id);
  }

  function toggleStage(unitId, stage, on) {
    if (on) {
      if (sel.stages.indexOf(stage.id) === -1) sel.stages.push(stage.id);
      stageQuestions(unitId, stage).forEach((q) => { if (!hasQuestion(q.id)) sel.questions.push(q); });
    } else {
      sel.stages = sel.stages.filter((id) => id !== stage.id);
      sel.questions = sel.questions.filter((q) => !(q.source === 'content' && q.stageId === stage.id));
    }
    repaint();
  }

  function pickCard(ctx) {
    const units = RQ.units.list(ctx.reg, ctx.curriculum).filter((u) => u.ready);
    if (!sel.unitId || !units.some((u) => u.id === sel.unitId)) {
      const cur = ctx.unitId;
      sel.unitId = units.some((u) => u.id === cur) ? cur : units.length > 0 ? units[0].id : null;
    }
    const select = el('select', { class: 'text-input author-select', id: 'live-unit' },
      units.map((u) => el('option', { value: u.id, text: u.title, selected: u.id === sel.unitId })));
    select.addEventListener('change', () => { sel.unitId = select.value; repaint(); });

    const stages = sel.unitId ? ctx.reg.stagesInOrder(sel.unitId) : [];
    const rows = stages.map((stage) => {
      const qs = stageQuestions(sel.unitId, stage);
      const box = el('input', { type: 'checkbox', checked: sel.stages.indexOf(stage.id) !== -1, disabled: qs.length === 0 });
      box.addEventListener('change', () => toggleStage(sel.unitId, stage, box.checked));
      return el('li', null, [el('label', { class: 'author-check' }, [
        box,
        el('span', { text: stage.title + '（選択式 ' + qs.length + ' 問）' }),
      ])]);
    });

    return card([
      cardTitle('2. 問題を選ぶ'),
      el('label', { class: 'field-label', for: 'live-unit', text: '単元' }),
      units.length > 0 ? select : el('p', { class: 'muted', text: '教材がありません。' }),
      el('p', { class: 'muted', text: 'ステージを選ぶと、その選択式の問題が入ります（図だけの問題と長い問題は入りません）。' }),
      el('ul', { class: 'live-stage-list' }, rows),
    ]);
  }

  function customCard() {
    const err = errorLine('');
    const promptInput = el('textarea', { class: 'text-input author-textarea', id: 'live-custom-prompt', maxlength: L().MAX_PROMPT, rows: 2 });
    promptInput.value = draft.prompt;
    promptInput.addEventListener('input', () => { draft.prompt = promptInput.value; });
    const optionInputs = LABELS.map((label, i) => {
      const input = el('input', { class: 'text-input', type: 'text', id: 'live-custom-opt-' + i, autocomplete: 'off', value: draft.options[i] });
      input.addEventListener('input', () => { draft.options[i] = input.value; });
      return el('label', { class: 'author-field live-custom-opt' }, [el('span', { class: 'field-label', text: '選択肢 ' + label }), input]);
    });
    const answer = el('select', { class: 'text-input author-select', id: 'live-custom-answer' },
      LABELS.map((label, i) => el('option', { value: String(i), text: label, selected: i === draft.answer })));
    answer.addEventListener('change', () => { draft.answer = Number(answer.value); });
    const add = () => {
      const q = L().customQuestion({ prompt: draft.prompt, options: draft.options.slice(), answer: draft.answer }, sel.customN + 1);
      if (!q) {
        err.textContent = '問題文と、2 つ以上の選択肢を入れ、文のある選択肢を正解にしてください。';
        return;
      }
      sel.customN++;
      sel.questions.push(q);
      draft.prompt = '';
      draft.options = ['', '', '', ''];
      draft.answer = 0;
      repaint();
    };
    return card([
      cardTitle('自分で書く'),
      el('div', { class: 'author-form' }, [
        el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: '問題文' }), promptInput]),
        el('div', { class: 'live-custom-opts' }, optionInputs),
        el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: '正解' }), answer]),
        button('足す', add, 'btn-block'),
        err,
      ]),
    ]);
  }

  function selectedCard() {
    const items = sel.questions.map((q, i) => el('li', { class: 'live-picked' }, [
      el('span', { class: 'live-picked-text', text: (i + 1) + '. ' + plain(q.prompt) + (q.source === 'custom' ? '（自作）' : '') }),
      button('消す', () => { sel.questions = sel.questions.filter((x) => x.id !== q.id); repaint(); }),
    ]));
    const seconds = el('select', { class: 'text-input author-select', id: 'live-seconds' },
      SECONDS.map((n) => el('option', { value: String(n), text: n + ' 秒', selected: n === sel.seconds })));
    seconds.addEventListener('change', () => { sel.seconds = Number(seconds.value); });
    const title = el('input', { class: 'text-input', type: 'text', id: 'live-title', autocomplete: 'off', maxlength: 40, placeholder: '例: 1 組 光の性質', value: sel.title });
    title.addEventListener('input', () => { sel.title = title.value; });
    return card([
      cardTitle('3. 選んだ問題（' + sel.questions.length + ' 問）'),
      items.length > 0 ? el('ol', { class: 'live-picked-list' }, items) : el('p', { class: 'muted', text: 'まだ選んでいません。' }),
      el('div', { class: 'author-form' }, [
        el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: '1 問の秒数' }), seconds]),
        el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: '題名（なくてもよい）' }), title]),
      ]),
      el('div', { class: 'live-start' }, [
        button(creating ? '部屋を作っています…' : '部屋を作る', createRoom, 'btn-primary btn-block', { disabled: creating || sel.questions.length === 0 }),
        errorLine(setupError),
      ]),
    ]);
  }

  // ---- 部屋 ----

  function codeBox(r) {
    return el('div', { class: 'live-code', 'data-no-ruby': true, 'aria-label': '部屋コード ' + r.code.split('').join(' '), text: r.code });
  }

  function questionHead(r, s) {
    return el('p', { class: 'live-count', text: (s.index + 1) + ' / ' + r.questions.length + ' 問目' });
  }

  function optionsBox(q, correctOnly) {
    return el('div', { class: 'live-options' }, q.options.map((o, i) => el('div', {
      class: 'live-opt ' + OPT_CLASSES[i % OPT_CLASSES.length] + (correctOnly && o.id === q.answer ? ' is-correct' : ''),
    }, [el('span', { class: 'live-opt-label', text: LABELS[i] || '' }), el('span', { text: plain(o.text) })])));
  }

  function rankTable(rows, highlightPid) {
    return el('table', { class: 'live-rank' }, [
      el('thead', null, [el('tr', null, [el('th', { text: '順位' }), el('th', { text: 'ニックネーム' }), el('th', { class: 'num', text: '得点' })])]),
      el('tbody', null, rows.map((row) => el('tr', { class: row.pid === highlightPid ? 'is-me' : null }, [
        el('td', { text: row.rank + ' 位' }),
        el('td', { 'data-no-ruby': true, text: row.name }),
        el('td', { class: 'num', text: String(row.score) }),
      ]))),
    ]);
  }

  function lobbyCard(r) {
    const d = r.data;
    const names = Object.keys(d.players).map((pid) => d.players[pid])
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
      .map((p) => el('li', { text: p.name }));
    return card([
      cardTitle('ロビー' + (d.meta.title ? '（' + d.meta.title + '）' : '')),
      el('p', { text: '部屋コード' }),
      codeBox(r),
      el('p', { text: '生徒はホームの『ライブクイズに参加』でこのコードを入れます。' }),
      el('p', { class: 'live-joined', text: '参加者 ' + names.length + ' 人（' + r.questions.length + ' 問・1 問 ' + d.state.seconds + ' 秒）' }),
      names.length > 0 ? el('ul', { class: 'live-players' }, names) : el('p', { class: 'muted', text: 'まだだれも参加していません。' }),
      errorLine(r.error),
      el('div', { class: 'btn-row' }, [
        button('問題を出す', () => act('start'), 'btn-primary', { disabled: r.busy || names.length === 0 }),
        button('部屋を消してやめる', removeRoom, '', { disabled: r.busy }),
      ]),
    ]);
  }

  function showCard(r) {
    const d = r.data;
    const s = d.state;
    const q = r.questions[s.index];
    if (!q) return errorCard(r, '問題が見つかりません。');
    const left = remaining(r, s);
    r.timerNode = el('span', { class: 'live-timer-num' + (left <= 5 ? ' is-low' : ''), text: String(left) });
    const answered = Object.keys(d.answers[q.id] || {}).filter((pid) => d.players[pid]).length;
    const total = Object.keys(d.players).length;
    return card([
      el('div', { class: 'live-head' }, [questionHead(r, s), el('p', { class: 'live-timer', 'aria-label': '残り時間（秒）' }, [r.timerNode, el('span', { class: 'live-timer-unit', text: '秒' })])]),
      el('p', { class: 'live-question', text: plain(q.prompt) }),
      optionsBox(q, false),
      el('p', { class: 'live-joined', text: '答えた人 ' + answered + ' / ' + total + ' 人' }),
      errorLine(r.error),
      el('div', { class: 'btn-row' }, [
        button('答え合わせ', () => act('reveal'), 'btn-primary', { disabled: r.busy }),
        button('ここで終わる', () => act('end'), '', { disabled: r.busy }),
      ]),
    ]);
  }

  function revealCard(r) {
    const d = r.data;
    const s = d.state;
    const q = r.questions[s.index];
    if (!q) return errorCard(r, '問題が見つかりません。');
    const t = L().tally(q, d.answers[q.id]);
    const max = Math.max(1, ...q.options.map((o) => t.counts[o.id] || 0));
    const bars = q.options.map((o, i) => {
      const n = t.counts[o.id] || 0;
      const bar = el('div', { class: 'live-bar' + (o.id === q.answer ? ' is-correct' : '') });
      bar.style.width = Math.round(n / max * 100) + '%';
      return el('div', { class: 'live-bar-row' }, [
        el('div', { class: 'live-bar-label' }, [el('span', { class: 'live-opt-label', text: LABELS[i] || '' }), el('span', { text: plain(o.text) }), el('span', { class: 'live-bar-num', text: n + ' 人' })]),
        el('div', { class: 'live-bar-track' }, [bar]),
      ]);
    });
    const ci = q.options.findIndex((o) => o.id === q.answer);
    const last = s.index + 1 >= r.questions.length;
    const fail = r.scoreFail && r.scoreFail.index === s.index ? r.scoreFail : null;
    return card([
      el('div', { class: 'live-head' }, [questionHead(r, s), el('p', { class: 'live-phase', text: '答え合わせ' })]),
      el('p', { class: 'live-question', text: plain(q.prompt) }),
      el('div', { class: 'live-bars' }, bars),
      el('p', { class: 'live-answer', text: '正解: ' + (LABELS[ci] || '') + ' ' + plain(ci >= 0 ? q.options[ci].text : '') + '（正解 ' + t.correctCount + ' / ' + t.total + ' 人）' }),
      el('h3', { class: 'live-sub', text: '上位 ' + TOP + ' 人' }),
      rankTable(L().leaderboard(d.players).slice(0, TOP)),
      fail ? errorLine(fail.message + '。「もう一度」を押してください。') : null,
      errorLine(r.error),
      el('div', { class: 'btn-row' }, [
        fail ? button('もう一度', retryScores, 'btn-primary', { disabled: r.busy }) : null,
        button(last ? '結果を見る' : '次の問題', () => act('next'), fail ? '' : 'btn-primary', { disabled: r.busy }),
      ]),
    ]);
  }

  function csvCell(value) {
    let s = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows) {
    const lines = [['順位', 'ニックネーム', '得点']].concat(rows.map((x) => [x.rank, x.name, x.score]));
    return '﻿' + lines.map((cols) => cols.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  function endedCard(r, ctx) {
    const rows = L().leaderboard(r.data.players);
    const now = new Date();
    return card([
      cardTitle('最終結果' + (r.data.meta.title ? '（' + r.data.meta.title + '）' : '')),
      rows.length > 0 ? rankTable(rows) : el('p', { class: 'muted', text: '参加者はいませんでした。' }),
      errorLine(r.error),
      el('div', { class: 'btn-row' }, [
        button('CSV で書き出す', () => {
          const name = 'rika-quest-live-' + r.code + '-' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '.csv';
          H.downloadText(name, toCsv(rows));
          ctx.message(name + ' を書き出しました。', 'ok');
        }, '', { disabled: rows.length === 0 }),
        button('終了して部屋を消す', removeRoom, 'btn-primary', { disabled: r.busy }),
      ]),
    ]);
  }

  function errorCard(r, text) {
    return card([cardTitle('ライブクイズ'), errorLine(text), errorLine(r.error), button('準備に戻る', forgetRoom, 'btn-block')]);
  }

  function roomView(r, ctx) {
    r.timerNode = null;
    if (r.gone) return [card([cardTitle('部屋がありません'), el('p', { text: '部屋が消されました（またはデータベースから見つかりません）。' }), button('準備に戻る', forgetRoom, 'btn-primary btn-block')])];
    const phase = r.data.state.phase;
    const head = phase === 'lobby' ? null : el('p', { class: 'muted live-room-line' }, ['部屋コード ', el('span', { 'data-no-ruby': true, text: r.code }), '・参加者 ' + Object.keys(r.data.players).length + ' 人']);
    let body;
    if (phase === 'show') body = showCard(r);
    else if (phase === 'reveal') body = revealCard(r);
    else if (phase === 'ended') body = endedCard(r, ctx);
    else body = lobbyCard(r);
    return [head, connLine(r), body];
  }

  // ---- 画面 ----

  function renderLiveHost(section, ctx) {
    section.setAttribute('data-no-ruby', '');
    if (!ctx.state.teacherUnlocked) { ctx.go('teacher'); return; }
    const mine = ++renderSeq;
    const isCurrent = () => mine === renderSeq && ctx.state.screen === 'live-host' && !!ctx.state.teacherUnlocked;

    function paint() {
      if (!isCurrent()) return;
      const y = root.scrollY;
      const children = [H.topBar('ライブクイズ（先生）', '先生画面', () => ctx.go('teacher'))];
      if (room) {
        children.push(...roomView(room, ctx));
      } else {
        children.push(setupCard(ctx));
        if (LD().normalizeUrl(ctx.live.dbUrl())) children.push(pickCard(ctx), customCard(), selectedCard());
      }
      section.replaceChildren(...children.filter(Boolean));
      root.scrollTo(0, y);
    }

    active = { ctx, isCurrent, paint };
    if (room && !room.gone) startWatch(room);
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, TICK_MS);
    paint();

    // 画面を離れたら受信と時計を止める（部屋はそのまま。戻ってきたらつなぎ直す）
    return function cleanup() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      stopWatch(room);
      if (room) room.timerNode = null;
    };
  }

  RQ.ui.screens['live-host'] = renderLiveHost;
  RQ.ui.renderLiveHost = renderLiveHost;
})(typeof globalThis !== 'undefined' ? globalThis : this);
