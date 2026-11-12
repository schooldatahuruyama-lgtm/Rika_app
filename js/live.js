// ライブクイズ（設計書 14 章）: 部屋のデータ・得点・集計・状態遷移の純粋関数
// 通信は js/live-db.js。ここの関数はどれも引数を変えず、新しい値を返す。
// 部屋のデータ rooms/<CODE> = { meta, questions（id → 問題。順番は order）, state, players（pid → { name, score, ... }）,
//   answers（問題 id → pid → { choice, at }） }
(function (root) {
  'use strict';

  // 読みまちがえにくい文字（I, O, 0, 1 を除く）。firebase-rules.json の正規表現 [A-HJ-NP-Z2-9] と同じ
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const CODE_LENGTH = 6;
  const MAX_PROMPT = 120;          // 出題できる問題文の長さ（スクリーンに映すため）
  const MAX_OPTIONS = 4;           // 自作の問題の選択肢の数
  const MAX_NAME = 12;             // ニックネームの長さ（規則と同じ）
  const DEFAULT_SECONDS = 20;
  const MIN_SECONDS = 5;
  const MAX_SECONDS = 120;
  const STALE_MS = 24 * 60 * 60 * 1000;
  const RECORDED_KEEP_MS = 7 * 24 * 60 * 60 * 1000;   // 作成時刻のわからない部屋の処理済みの一覧を残す目安
  const BASE_POINTS = 500;         // 正解の点
  const SPEED_POINTS = 500;        // 速さの点の上限（残り時間の割合をかける）
  const PHASES = ['lobby', 'show', 'reveal', 'ended'];
  const CUSTOM_IDS = 'abcd';
  // 出題の形: choice（選択式）・multi（複数回答）・text（自由記述）・order（並びかえ）。kind の無い古い問題は choice
  // 答えはどれも文字列（データベースの規則を変えないため）:
  //   choice: 選択肢の id、multi: 選んだ id を選択肢の順に ',' で結ぶ、order: 並べた順の id を ',' で結ぶ、text: 打った文字列
  const KINDS = ['choice', 'multi', 'text', 'order'];
  const MAX_TEXT_ANSWER = 40;      // 自由記述の答えの長さ
  const MAX_ACCEPT = 5;            // 自由記述の正解（別解をふくむ）の数
  const NUM_EPS = 1e-9;            // 数の答えの許容誤差の比べで足す小さな値

  let customCount = 0;

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function toMs(now) {
    if (now instanceof Date) return now.getTime();
    return isNum(now) ? now : Date.now();
  }
  function pick(chars, n, random) {
    const r = typeof random === 'function' ? random : Math.random;
    let out = '';
    for (let i = 0; i < n; i++) {
      const v = r();
      const k = Math.min(chars.length - 1, Math.max(0, Math.floor((isNum(v) ? v : 0) * chars.length)));
      out += chars[k];
    }
    return out;
  }
  // Firebase の object は配列のこともあり、配列は object のこともある。どちらでも値の並びにする
  function valuesOf(v) {
    if (Array.isArray(v)) return v;
    if (isObject(v)) return Object.keys(v).map(k => v[k]);
    return [];
  }

  function newRoomCode(random) { return pick(CODE_CHARS, CODE_LENGTH, random); }
  function newPlayerId(random) { return 'p' + pick(ID_CHARS, 8, random); }
  function isRoomCode(text) { return typeof text === 'string' && new RegExp('^[' + CODE_CHARS + ']{' + CODE_LENGTH + '}$').test(text); }

  function clampSeconds(v) {
    if (!isNum(v)) return DEFAULT_SECONDS;
    return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(v)));
  }

  // 選択肢を { id, text } の配列に。2 つ未満・id の重なり・文の欠けがあれば null
  function cleanOptions(options) {
    const list = valuesOf(options);
    const out = [];
    const seen = {};
    for (const o of list) {
      if (!isObject(o) || typeof o.id !== 'string' || !o.id || typeof o.text !== 'string' || !o.text.trim()) return null;
      if (seen[o.id]) return null;
      seen[o.id] = true;
      out.push({ id: o.id, text: o.text });
    }
    return out.length >= 2 ? out : null;
  }

  // 問題の形。KINDS に無ければ choice
  function kindOf(q) {
    return isObject(q) && KINDS.indexOf(q.kind) !== -1 ? q.kind : 'choice';
  }

  // 自由記述の比べ用: NFKC（全角の英数・記号を半角に）→ 小文字 → 空白をすべて除く → 末尾の「。」「．」「.」を除く
  function normalizeText(s) {
    if (typeof s !== 'string') return '';
    return s.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[。．.]+$/, '');
  }

  function optionIds(question) {
    return valuesOf(isObject(question) ? question.options : null)
      .filter(o => isObject(o) && typeof o.id === 'string' && o.id)
      .map(o => o.id);
  }

  // 答えの文字列を問題の形に合わせて整える。合わなければ null
  //   choice: 選択肢の id。multi: 選択肢の id を 1 つ以上・重なりなしで、選択肢の順に並べ直す
  //   order: 選択肢の id のちょうど並べかえ。text: 前後の空白を取り、空や MAX_TEXT_ANSWER 文字を超えるものは null
  function cleanAnswer(question, value) {
    if (!isObject(question) || typeof value !== 'string') return null;
    const kind = kindOf(question);
    if (kind === 'text') {
      const t = value.trim();
      return t && t.length <= MAX_TEXT_ANSWER ? t : null;
    }
    const ids = optionIds(question);
    if (kind === 'choice') return ids.indexOf(value) !== -1 ? value : null;
    const parts = value.split(',');
    const seen = {};
    for (const p of parts) {
      if (ids.indexOf(p) === -1 || seen[p]) return null;
      seen[p] = true;
    }
    if (kind === 'multi') return ids.filter(id => seen[id]).join(',');
    return parts.length === ids.length ? parts.join(',') : null;   // order
  }

  // 自由記述の正解の一覧（accept が無ければ answer）
  function acceptOf(question) {
    const list = valuesOf(question.accept).filter(a => typeof a === 'string' && a.trim());
    return list.length > 0 ? list : typeof question.answer === 'string' && question.answer.trim() ? [question.answer] : [];
  }

  // 正誤。answer は文字列か { choice, at }。形に合わない答えは不正解
  //   choice・order: 一致。multi: 選択肢の順に並べ直して一致（部分点なし）
  //   text: number があれば数にして value ± tolerance、無ければ accept のどれかと normalizeText が一致
  function isCorrect(question, answer) {
    const c = cleanAnswer(question, choiceOf(answer));
    if (c === null) return false;
    const kind = kindOf(question);
    if (kind === 'text') {
      const n = isObject(question.number) ? question.number : null;
      if (n && isNum(n.value)) {
        const t = normalizeText(c);
        const v = t ? Number(t) : NaN;
        const tol = isNum(n.tolerance) && n.tolerance >= 0 ? n.tolerance : 0;
        return Number.isFinite(v) && Math.abs(v - n.value) <= tol + NUM_EPS;
      }
      const t = normalizeText(c);
      return !!t && acceptOf(question).some(a => normalizeText(a) === t);
    }
    const right = cleanAnswer(question, str(question.answer));
    return right !== null && c === right;
  }

  // 教材の問題から出題用の形へ。図は落として文だけ。問題文が長いものは出さない
  //   choice: 選択式。fill: 空欄が 1 つだけのとき自由記述（text）として。ほかの形は null
  function questionFromProblem(problem, where) {
    if (!isObject(problem) || typeof problem.id !== 'string' || !problem.id) return null;
    const w = isObject(where) ? where : {};
    const common = {
      conceptId: typeof problem.concept === 'string' && problem.concept ? problem.concept : null,
      unitId: typeof w.unitId === 'string' ? w.unitId : null,
      stageId: typeof w.stageId === 'string' ? w.stageId : null,
      source: 'content',
    };
    // 図のある穴埋め（グラフや目盛りを読む問題）は、図を出さないライブでは答えられないので取りこまない
    if (problem.type === 'fill') return problem.figure === null || problem.figure === undefined ? textFromFill(problem, common) : null;
    if (problem.type !== 'choice') return null;
    const prompt = str(problem.prompt).trim();
    if (!prompt || prompt.length > MAX_PROMPT) return null;
    const options = cleanOptions(problem.options);
    if (!options || !options.some(o => o.id === problem.answer)) return null;
    return Object.assign({ id: problem.id, kind: 'choice', prompt, options, answer: problem.answer }, common);
  }

  // 空欄 1 つの穴埋めを自由記述に。問題文の [<id>] を（　　）に。'**' はそのまま（画面側で外す）
  function textFromFill(problem, common) {
    const blanks = valuesOf(problem.blanks);
    if (blanks.length !== 1) return null;
    const b = blanks[0];
    if (!isObject(b) || typeof b.id !== 'string' || !b.id) return null;
    const body = str(problem.text).split('[' + b.id + ']').join('（　　）');
    let prompt = [str(problem.prompt).trim(), body.trim()].filter(Boolean).join(' ');
    let accept;
    let number = null;
    if (b.kind === 'word') {
      const a = b.answer === null || b.answer === undefined ? '' : String(b.answer).trim();
      if (!a) return null;
      accept = [a];
    } else if (b.kind === 'number') {
      if (!isNum(b.answer)) return null;
      number = { value: b.answer, tolerance: isNum(b.tolerance) ? b.tolerance : 0 };
      accept = [String(b.answer)];
      if (typeof b.unit === 'string' && b.unit.trim()) prompt += '（' + b.unit.trim() + ' で答える）';
    } else {
      return null;
    }
    if (!prompt || prompt.length > MAX_PROMPT) return null;
    const q = { id: problem.id, kind: 'text', prompt, options: [], answer: accept[0], accept };
    if (number) q.number = number;
    return Object.assign(q, common);
  }

  // 0〜1 の乱数で表示順（元の番号の並び）を作る。正しい順と同じになったら末尾を先頭に回す
  function shuffledOrder(len, random) {
    const r = typeof random === 'function' ? random : Math.random;
    const idx = [];
    for (let i = 0; i < len; i++) idx.push(i);
    for (let i = len - 1; i > 0; i--) {
      const v = r();
      const j = Math.min(i, Math.max(0, Math.floor((isNum(v) ? v : 0) * (i + 1))));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    if (len >= 2 && idx.every((v, i) => v === i)) idx.unshift(idx.pop());
    return idx;
  }

  // 先生が書く短い問題。input.kind（無ければ choice）で分ける。n は id の番号（省略時はこのページで数えた番号）。
  // random は 0〜1 の関数（並びかえのシャッフル用。省略時 Math.random）
  //   choice: options は文の配列（4 つまで。空の文は落とす）、answer は 0〜3 の番号
  //   multi: options は choice と同じ、answers は正解の番号の配列（1 つ以上、文のある選択肢だけ）
  //   order: options は正しい順の文（4 つまで。空は落とし 2 つ以上）。表示順にシャッフルして id を a, b, c… と付ける
  //   text: accept は正解の文字列の配列（空・重なりを落として 1〜MAX_ACCEPT）
  function customQuestion(input, n, random) {
    if (!isObject(input)) return null;
    const prompt = str(input.prompt).trim();
    if (!prompt) return null;
    const kind = kindOf(input);
    let body = null;
    if (kind === 'text') body = customText(input);
    else if (kind === 'order') body = customOrder(input, random);
    else if (kind === 'multi') body = customMulti(input);
    else body = customChoice(input);
    if (!body) return null;
    const num = Number.isInteger(n) && n >= 0 ? n : ++customCount;
    return Object.assign({ id: 'c-' + num, kind, prompt }, body, { conceptId: null, source: 'custom' });
  }

  function customChoice(input) {
    const texts = valuesOf(input.options).slice(0, MAX_OPTIONS);
    if (!Number.isInteger(input.answer) || input.answer < 0 || input.answer >= texts.length) return null;
    const options = [];
    let answer = null;
    texts.forEach((t, i) => {
      const text = str(t).trim();
      if (!text) return;
      const id = CUSTOM_IDS[options.length];
      if (i === input.answer) answer = id;
      options.push({ id, text });
    });
    if (options.length < 2 || answer === null) return null;
    return { options, answer };
  }

  function customMulti(input) {
    const texts = valuesOf(input.options).slice(0, MAX_OPTIONS);
    const picks = valuesOf(input.answers);
    if (picks.length === 0 || !picks.every(i => Number.isInteger(i) && i >= 0 && i < texts.length)) return null;
    const options = [];
    const chosen = [];
    texts.forEach((t, i) => {
      const text = str(t).trim();
      if (!text) return;
      const id = CUSTOM_IDS[options.length];
      if (picks.indexOf(i) !== -1) chosen.push(id);
      options.push({ id, text });
    });
    // 選んだ番号の文が空なら chosen が足りない
    const want = picks.filter((v, i) => picks.indexOf(v) === i).length;
    if (options.length < 2 || chosen.length === 0 || chosen.length !== want) return null;
    return { options, answer: chosen.join(',') };
  }

  function customOrder(input, random) {
    const texts = valuesOf(input.options).slice(0, MAX_OPTIONS).map(t => str(t).trim()).filter(Boolean);
    if (texts.length < 2) return null;
    const shown = shuffledOrder(texts.length, random);   // 表示の位置 → 正しい順の番号
    const options = shown.map((k, pos) => ({ id: CUSTOM_IDS[pos], text: texts[k] }));
    const answer = texts.map((t, k) => CUSTOM_IDS[shown.indexOf(k)]).join(',');
    return { options, answer };
  }

  function customText(input) {
    const accept = [];
    const seen = new Set();   // 答えの文字列をキーにするので object ではなく Set（'__proto__' や 'constructor' も通常の答えとして扱う）
    valuesOf(input.accept).forEach(a => {
      const t = str(a).trim();
      const key = normalizeText(t);
      if (!t || !key || seen.has(key)) return;
      seen.add(key);
      accept.push(t);
    });
    if (accept.length === 0) return null;
    const list = accept.slice(0, MAX_ACCEPT);
    return { options: [], answer: list[0], accept: list };
  }

  // 部屋の初期データ。questions は出す順の配列（id の重なりは先のものを残す）
  function newRoom(o, now) {
    const opts = isObject(o) ? o : {};
    const seconds = clampSeconds(opts.seconds);
    const questions = {};
    let count = 0;
    valuesOf(opts.questions).forEach(q => {
      if (!isObject(q) || typeof q.id !== 'string' || !q.id || questions[q.id]) return;
      questions[q.id] = Object.assign({}, q, { order: count });
      count++;
    });
    return {
      meta: { createdAt: toMs(now), title: str(opts.title), status: 'lobby', seconds, hostId: typeof opts.hostId === 'string' ? opts.hostId : null, count },
      questions,
      state: { index: -1, phase: 'lobby', startedAt: null, seconds },
    };
  }

  function choiceOf(answer) {
    if (typeof answer === 'string') return answer;
    return isObject(answer) && typeof answer.choice === 'string' ? answer.choice : null;
  }

  // 正解 500 ＋ round(500 × 残り時間の割合)。不正解 0。時刻がわからないときは速さの点なし
  function scoreFor(question, answer, startedAt, seconds) {
    if (!isObject(question) || !isCorrect(question, answer)) return 0;
    const at = isObject(answer) ? answer.at : null;
    const total = isNum(seconds) && seconds > 0 ? seconds : null;
    if (!isNum(at) || !isNum(startedAt) || total === null) return BASE_POINTS;
    const left = Math.min(total, Math.max(0, total - (at - startedAt) / 1000));
    return BASE_POINTS + Math.round(SPEED_POINTS * left / total);
  }

  // 1 問ぶんの集計。形に合わない答え（cleanAnswer が null）は数えない。
  //   counts: 選択肢 id → 人数（choice・multi。multi は選んだ id をそれぞれ数える）
  //   groups: 答えごとの [{ value, count, correct }] を人数の多い順に（text・order。text は normalizeText が同じものを
  //   まとめ、最初に出た答えを代表に）。choice・multi では []
  function tally(question, answers) {
    const counts = {};
    optionIds(question).forEach(id => { counts[id] = 0; });
    const kind = kindOf(question);
    const groups = [];
    const byKey = new Map();   // 答えの文字列をキーにするので object ではなく Map（'__proto__' なども通常の答え）
    let total = 0;
    let correctCount = 0;
    if (isObject(question) && isObject(answers)) {
      Object.keys(answers).forEach(pid => {
        const c = cleanAnswer(question, choiceOf(answers[pid]));
        if (c === null) return;
        total++;
        const ok = isCorrect(question, c);
        if (ok) correctCount++;
        if (kind === 'choice' || kind === 'multi') {
          c.split(',').forEach(id => { counts[id]++; });
          return;
        }
        const key = kind === 'text' ? normalizeText(c) : c;
        let g = byKey.get(key);
        if (!g) {
          g = { value: c, count: 0, correct: ok };
          byKey.set(key, g);
          groups.push(g);
        }
        g.count++;
      });
    }
    groups.sort((a, b) => b.count - a.count);
    return { counts, total, correctCount, groups };
  }

  // 得点を足した新しい players。足した問題は lastQ に残し、同じ問題で二重に足さない（lastPoints はその問題の点）
  function applyScores(players, question, answers, startedAt, seconds) {
    const out = {};
    const src = isObject(players) ? players : {};
    const qid = isObject(question) ? question.id : null;
    Object.keys(src).forEach(pid => {
      const p = src[pid];
      if (!isObject(p)) return;
      const score = isNum(p.score) ? p.score : 0;
      if (qid !== null && p.lastQ === qid) { out[pid] = Object.assign({}, p, { score }); return; }
      const a = isObject(answers) ? answers[pid] : null;
      const points = a ? scoreFor(question, a, startedAt, seconds) : 0;
      out[pid] = Object.assign({}, p, { score: score + points, lastQ: qid, lastPoints: points });
    });
    return out;
  }

  // 答え合わせの得点を players に書くマルチパス更新（{ '<pid>/score': …, '<pid>/lastQ': …, '<pid>/lastPoints': … }）。
  // players・answers（この問題の pid → 回答）はサーバーから取り直した生の値を渡す（受信した写しは遅れることがあるので使わない）。
  // 足し終わった人（lastQ がこの問題）は入れないので、何度呼んでも二重に足さない。書くものがなければ空の object
  function scoreUpdate(players, question, answers, startedAt, seconds) {
    if (!isObject(question) || typeof question.id !== 'string') return {};
    const one = {};
    one[question.id] = answers;
    const safe = safeRoom({ players, answers: one });
    const before = safe.players;
    const after = applyScores(before, question, safe.answers[question.id] || {}, startedAt, seconds);
    const update = {};
    Object.keys(after).forEach(pid => {
      if (before[pid] && before[pid].lastQ === question.id) return;
      const p = after[pid];
      update[pid + '/score'] = p.score;
      update[pid + '/lastQ'] = p.lastQ;
      update[pid + '/lastPoints'] = p.lastPoints;
    });
    return update;
  }

  // 順位表。score の高い順、同点は同じ rank（次の順位は飛ぶ）で name 順
  function leaderboard(players) {
    const src = isObject(players) ? players : {};
    const rows = Object.keys(src)
      .filter(pid => isObject(src[pid]))
      .map(pid => ({ pid, name: str(src[pid].name), score: isNum(src[pid].score) ? src[pid].score : 0 }));
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ja') || (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0));
    let rank = 0;
    return rows.map((r, i) => {
      if (i === 0 || r.score !== rows[i - 1].score) rank = i + 1;
      return { pid: r.pid, name: r.name, score: r.score, rank };
    });
  }

  // 生徒の端末で学習記録に入れる出来事（record.applyEvents に渡す）。
  // 教材の問題は履歴（phase 'live'）・経験値・理解度。自作の問題は経験値だけ
  function recordEvents(question, choice, correct, sessionId) {
    if (!isObject(question)) return [];
    const ok = !!correct;
    const xpEvents = [{ kind: 'answer' }].concat(ok ? [{ kind: 'correct' }] : []);
    if (question.source !== 'content') return xpEvents;
    const conceptId = typeof question.conceptId === 'string' && question.conceptId ? question.conceptId : null;
    const events = [{ kind: 'history', sessionId: typeof sessionId === 'string' ? sessionId : null, attempt: 1, stageId: typeof question.stageId === 'string' ? question.stageId : null, problemId: question.id, conceptId, correct: ok, phase: 'live' }]
      .concat(xpEvents);
    if (conceptId) events.push({ kind: 'mastery', conceptId, change: ok ? 'later' : 'wrong' });
    return events;
  }

  function safeQuestion(q, key) {
    if (!isObject(q)) return null;
    const id = typeof q.id === 'string' && q.id ? q.id : typeof key === 'string' ? key : null;
    const prompt = str(q.prompt);
    if (!id || !prompt) return null;
    const kind = kindOf(q);
    const common = {
      conceptId: typeof q.conceptId === 'string' && q.conceptId ? q.conceptId : null,
      unitId: typeof q.unitId === 'string' ? q.unitId : null,
      stageId: typeof q.stageId === 'string' ? q.stageId : null,
      source: q.source === 'content' ? 'content' : 'custom',
      order: isNum(q.order) ? q.order : 0,
    };
    if (kind === 'text') {
      // 自由記述: 選択肢なし（Firebase は空の配列を保存しないので届かない）
      const answer = typeof q.answer === 'string' ? q.answer.trim() : '';
      if (!answer) return null;
      let accept = valuesOf(q.accept).filter(a => typeof a === 'string' && a.trim()).slice(0, MAX_ACCEPT);
      if (accept.length === 0) accept = [answer];
      const n = isObject(q.number) && isNum(q.number.value) && isNum(q.number.tolerance)
        ? { value: q.number.value, tolerance: q.number.tolerance } : null;
      return Object.assign({ id, kind, prompt, options: [], answer, accept, number: n }, common);
    }
    const options = cleanOptions(q.options);
    if (!options) return null;
    const answer = cleanAnswer({ kind, options }, q.answer);
    if (answer === null) return null;
    return Object.assign({ id, kind, prompt, options, answer }, common);
  }

  function safeState(s) {
    const v = isObject(s) ? s : {};
    return {
      index: Number.isInteger(v.index) && v.index >= -1 ? v.index : -1,
      phase: PHASES.indexOf(v.phase) !== -1 ? v.phase : 'lobby',
      startedAt: isNum(v.startedAt) ? v.startedAt : null,
      seconds: clampSeconds(v.seconds),
    };
  }

  // 受信した部屋データの守り。形の崩れた値は既定に、崩れた項目は落とす
  function safeRoom(raw) {
    const r = isObject(raw) ? raw : {};
    const m = isObject(r.meta) ? r.meta : {};
    const meta = {
      createdAt: isNum(m.createdAt) ? m.createdAt : null,
      title: str(m.title),
      status: typeof m.status === 'string' && m.status ? m.status : 'lobby',
      seconds: clampSeconds(m.seconds),
      hostId: typeof m.hostId === 'string' ? m.hostId : null,
      count: Number.isInteger(m.count) && m.count >= 0 ? m.count : 0,
    };
    const qsrc = isObject(r.questions) || Array.isArray(r.questions) ? r.questions : {};
    const questions = Object.keys(qsrc)
      .map(k => safeQuestion(qsrc[k], Array.isArray(qsrc) ? null : k))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const players = {};
    if (isObject(r.players)) {
      Object.keys(r.players).forEach(pid => {
        const p = r.players[pid];
        if (!isObject(p) || typeof p.name !== 'string') return;
        const out = { name: p.name.slice(0, MAX_NAME), score: isNum(p.score) ? p.score : 0 };
        if (isNum(p.joinedAt)) out.joinedAt = p.joinedAt;
        if (typeof p.lastQ === 'string') out.lastQ = p.lastQ;
        if (isNum(p.lastPoints)) out.lastPoints = p.lastPoints;
        players[pid] = out;
      });
    }
    const answers = {};
    if (isObject(r.answers)) {
      Object.keys(r.answers).forEach(qid => {
        const byPid = r.answers[qid];
        if (!isObject(byPid)) return;
        const one = {};
        Object.keys(byPid).forEach(pid => {
          const a = byPid[pid];
          if (isObject(a) && typeof a.choice === 'string') one[pid] = { choice: a.choice, at: isNum(a.at) ? a.at : null };
        });
        answers[qid] = one;
      });
    }
    return { meta, questions, state: safeState(r.state), players, answers };
  }

  // 学習記録に入れた部屋のキー（生徒・参加者・部屋の組み）'<profileId>:<pid>:<code>'
  function recordRoomKey(profileId, pid, code) {
    return [profileId, pid, code].map(v => String(v === null || v === undefined ? '' : v)).join(':');
  }

  // 学習記録に入れた問題のキー（生徒・参加者・部屋・問題の組み）'<profileId>:<pid>:<code>:<qid>'
  function recordKey(profileId, pid, code, qid) {
    return recordRoomKey(profileId, pid, code) + ':' + String(qid === null || qid === undefined ? '' : qid);
  }

  // 学習記録に入れるべき問題の一覧 [{ key, qid, question, choice, correct }]（出題の順）。
  // room は safeRoom の形（受信した部屋データ）。答え合わせが済んだ問題（いまより前の問題と、
  // いまの問題で段階が reveal か ended のもの）のうち、サーバーにある自分の回答（answers[qid][pid]）で、
  // まだ記録していない（doneQids にこの部屋の問題 id がない）もの。doneQids は profileId・pid・code の部屋で処理済みの問題 id の配列か Set。
  // 送信中の回答は受信に入らないので入らない。問題の形に合わない答え（cleanAnswer が null）は入れない
  function pendingRecords(room, pid, doneQids, profileId, code) {
    if (!isObject(room) || !isObject(room.state) || typeof pid !== 'string' || !pid) return [];
    const questions = Array.isArray(room.questions) ? room.questions : [];
    const answers = isObject(room.answers) ? room.answers : {};
    const done = doneQids instanceof Set ? doneQids : new Set(Array.isArray(doneQids) ? doneQids : []);
    const s = room.state;
    const out = [];
    questions.forEach((q, i) => {
      if (!isObject(q) || typeof q.id !== 'string') return;
      const revealed = i < s.index || (i === s.index && (s.phase === 'reveal' || s.phase === 'ended'));
      if (!revealed) return;
      const choice = choiceOf(isObject(answers[q.id]) ? answers[q.id][pid] : null);
      if (choice === null || cleanAnswer(q, choice) === null) return;
      if (done.has(q.id)) return;
      out.push({ key: recordKey(profileId, pid, code, q.id), qid: q.id, question: q, choice, correct: isCorrect(q, choice) });
    });
    return out;
  }

  // 処理済みの一覧（sessionStorage に置く形）の守り:
  //   { '<profileId>:<pid>:<code>': { qids: [問題 id...], createdAt: 部屋の作成時刻 | null, savedAt: 最後に足した時刻 } }
  // 形の崩れた項目は落とす（古い形の配列などは空の一覧になる）
  function safeRecorded(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    Object.keys(raw).forEach(k => {
      const v = raw[k];
      if (!isObject(v) || !Array.isArray(v.qids) || !isNum(v.savedAt)) return;
      out[k] = {
        qids: v.qids.filter(q => typeof q === 'string'),
        createdAt: isNum(v.createdAt) ? v.createdAt : null,
        savedAt: v.savedAt,
      };
    });
    return out;
  }

  // 一覧のうち roomKey の部屋で処理済みの問題 id の配列
  function recordedQids(map, roomKey) {
    const v = safeRecorded(map)[roomKey];
    return v ? v.qids.slice() : [];
  }

  // roomKey の部屋に qids（問題 id の配列）を足した新しい一覧。部屋ごとの一覧に上限はない（出題数で頭打ち）。
  // createdAt が数なら部屋の作成時刻として持つ。ほかの部屋は、作成時刻から 24 時間（作成時刻がわからなければ
  // 最後に足してから 7 日）たったら消す。now はサーバー時刻に合わせた時刻（ms か Date）
  function addRecorded(map, roomKey, qids, createdAt, now) {
    const t = toMs(now);
    const cur = safeRecorded(map);
    const out = {};
    Object.keys(cur).forEach(k => {
      if (k === roomKey) return;
      const v = cur[k];
      const old = isNum(v.createdAt) ? t - v.createdAt >= STALE_MS : t - v.savedAt >= RECORDED_KEEP_MS;
      if (!old) out[k] = v;
    });
    const prev = cur[roomKey] || { qids: [], createdAt: null };
    const list = prev.qids.slice();
    (Array.isArray(qids) ? qids : []).forEach(q => { if (typeof q === 'string' && list.indexOf(q) === -1) list.push(q); });
    out[roomKey] = { qids: list, createdAt: isNum(createdAt) ? createdAt : prev.createdAt, savedAt: t };
    return out;
  }

  // ---- 処理済みの状態（生徒の画面。js/ui-live.js） ----
  // state = { memDone: { roomKey: [問題 id...] }（学習記録のメモリに入れた分。この画面のあいだ・読み込み直すまで）,
  //           unsavedDone: [{ roomKey, qid, createdAt }]（記録には入れたが、まだ persisted に書いていない分）,
  //           persisted: 処理済みの一覧（sessionStorage の形。safeRecorded） }
  // 処理済みとみなす問題 = persisted ∪ memDone。どの関数も元の state を変えない

  function safeMemDone(v) {
    const out = {};
    if (!isObject(v)) return out;
    Object.keys(v).forEach(k => { if (Array.isArray(v[k])) out[k] = v[k].filter(q => typeof q === 'string'); });
    return out;
  }

  function safeUnsaved(v) {
    return (Array.isArray(v) ? v : []).filter(d => isObject(d) && typeof d.roomKey === 'string' && typeof d.qid === 'string')
      .map(d => ({ roomKey: d.roomKey, qid: d.qid, createdAt: isNum(d.createdAt) ? d.createdAt : null }));
  }

  // roomKey の部屋で処理済みの問題 id の Set（persisted に書いた分と memDone の分）
  function doneQidsOf(state, roomKey) {
    const s = isObject(state) ? state : {};
    const set = new Set(recordedQids(s.persisted, roomKey));
    (safeMemDone(s.memDone)[roomKey] || []).forEach(q => set.add(q));
    return set;
  }

  // unsavedDone の分をすべて persisted に足す（記録の保存が成功した = メモリの記録がまるごと保存されたとき）。
  // 戻り値 { persisted: 新しい一覧, unsavedDone: [] }。unsavedDone が空なら persisted はそのまま（同じ値）
  function flushState(state, now) {
    const s = isObject(state) ? state : {};
    const list = safeUnsaved(s.unsavedDone);
    if (list.length === 0) return { persisted: s.persisted, unsavedDone: [] };
    let map = s.persisted;
    const order = [];
    const byRoom = {};
    list.forEach(d => {
      if (!byRoom[d.roomKey]) { byRoom[d.roomKey] = { qids: [], createdAt: null }; order.push(d.roomKey); }
      byRoom[d.roomKey].qids.push(d.qid);
      if (isNum(d.createdAt)) byRoom[d.roomKey].createdAt = d.createdAt;
    });
    order.forEach(k => { map = addRecorded(map, k, byRoom[k].qids, byRoom[k].createdAt, now); });
    return { persisted: map, unsavedDone: [] };
  }

  // 1 問を学習記録に入れようとした結果で、処理済みの状態を進める。
  // ev = { key: 部屋のキー, qid, createdAt?: 部屋の作成時刻, now?: サーバー時刻に合わせた時刻, result: { applied, saved } }
  //   applied でない（入れなかった・例外）: memDone にも unsavedDone にも入れない（次の受信で取り直す）
  //   applied で saved でない: memDone と unsavedDone に入れる（あとで記録の保存が成功したら flushState で persisted へ）
  //   applied で saved: memDone に入れ、unsavedDone（これまでの分も）をすべて persisted へ
  // 同じ問題を何度通しても、memDone・unsavedDone・persisted に 1 つだけ
  function nextDoneState(state, ev) {
    const s = isObject(state) ? state : {};
    const e = isObject(ev) ? ev : {};
    const memDone = safeMemDone(s.memDone);
    const unsavedDone = safeUnsaved(s.unsavedDone);
    const persisted = s.persisted;
    if (typeof e.key !== 'string' || typeof e.qid !== 'string') return { memDone, unsavedDone, persisted };
    const r = isObject(e.result) ? e.result : {};
    const applied = r.applied === true;
    const saved = applied && r.saved === true;
    // 入れなかった: 処理済みにしない（前に入れた分は、もう記録のメモリにあるのでそのまま）
    if (!applied) return { memDone, unsavedDone, persisted };
    const cur = memDone[e.key] || [];
    if (cur.indexOf(e.qid) === -1) memDone[e.key] = cur.concat([e.qid]);
    if (!unsavedDone.some(d => d.roomKey === e.key && d.qid === e.qid)) {
      unsavedDone.push({ roomKey: e.key, qid: e.qid, createdAt: isNum(e.createdAt) ? e.createdAt : null });
    }
    if (!saved) return { memDone, unsavedDone, persisted };
    const flushed = flushState({ unsavedDone, persisted }, e.now === undefined ? Date.now() : e.now);
    return { memDone, unsavedDone: flushed.unsavedDone, persisted: flushed.persisted };
  }

  // 作成から 24 時間以上たった部屋（作成時刻がわからない部屋も古いとみなす）
  function isStale(meta, now) {
    if (!isObject(meta) || !isNum(meta.createdAt)) return true;
    return toMs(now) - meta.createdAt >= STALE_MS;
  }

  // 先生の操作による状態遷移。questions は問題の配列（数でもよい）
  function nextState(state, questions, action, now) {
    const s = safeState(state);
    const n = Array.isArray(questions) ? questions.length : Number.isInteger(questions) && questions > 0 ? questions : 0;
    const t = toMs(now);
    const ended = Object.assign({}, s, { phase: 'ended' });
    switch (action) {
      case 'start':
        if (n === 0) return ended;
        return Object.assign({}, s, { index: 0, phase: 'show', startedAt: t });
      case 'reveal':
        return s.phase === 'show' ? Object.assign({}, s, { phase: 'reveal' }) : s;
      case 'next':
        if (s.phase === 'ended') return s;
        if (s.index + 1 >= n) return ended;
        return Object.assign({}, s, { index: s.index + 1, phase: 'show', startedAt: t });
      case 'end':
        return ended;
      default:
        return s;
    }
  }

  const api = {
    CODE_CHARS, STALE_MS, RECORDED_KEEP_MS, MAX_PROMPT, MAX_OPTIONS, MAX_NAME, DEFAULT_SECONDS, MIN_SECONDS, MAX_SECONDS,
    KINDS, MAX_TEXT_ANSWER, MAX_ACCEPT, kindOf, normalizeText, cleanAnswer, isCorrect,
    newRoomCode, newPlayerId, isRoomCode, questionFromProblem, customQuestion, newRoom,
    scoreFor, tally, applyScores, scoreUpdate, leaderboard, recordEvents, recordRoomKey, recordKey, pendingRecords,
    safeRecorded, recordedQids, addRecorded, doneQidsOf, flushState, nextDoneState, safeRoom, isStale, nextState,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { live: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
