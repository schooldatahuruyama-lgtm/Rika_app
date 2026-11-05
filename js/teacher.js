// 先生用の確認画面の集計（純粋関数。Node でもブラウザでも動く）
// この端末の store と、ほかの端末で書き出した記録ファイルの store をまとめて、生徒ごと・クラス全体の様子を出す。
// 読みこんだ記録は集計に使うだけで、この端末の学習記録には入れない（どの関数も元の store・record を変えない）。
//
// summarizeStudent(profile, rec, reg, config, now) → 1 人分のまとめ
//   { id, nickname, avatar, unitId, unitTitle, level, xp, streak, lastAt, daysSince,
//     stages: { cleared, total }, badges（取ったバッジの数）, mastery: { できた, もう少し, まだ, 未学習 }, weak: [...最大 5] }
//   streak は記録画面と同じ数え方（最後に学習した日が今日かきのうなら rec.streak.count、それより前なら 0）。
//   weak は「まだ」「もう少し」の概念を、誤答数の多い順（同じなら理解度の低い順、教材の順）に最大 5 つ。
//   誤答数・解答数は history の予想（warmup）以外の解答で数える（予想は正誤を問わないため）。
// summarizeAll(stores, reg, config, now) → { students: [...ニックネーム順], weakConcepts: [...] }
//   同じ profile.id が複数の store にあるときは、history の最後の at が新しいほうを使う（同じなら先の store）。
//   weakConcepts は「まだ」の生徒が 1 人以上いる概念を、人数の多い順（同じなら誤答率の高い順、教材の順）に並べる。
// latestEntries(stores) → [{ profile, rec }]（上の重なりを除いた生徒と、形を整えた記録。画面の詳細に使う）
// safeRecord(rec) → 形の崩れた項目を空にした record の写し（history・mastery・stages・streak・xp・level・badges だけ）
// parseAt(at) → 日時（Date）か null。文字列で、Date として読めるものだけ（集計と画面の詳細で同じものを使う）
// nicknameOf(profile) → ニックネーム。文字列で空でないときだけそのまま、それ以外は「（名前なし）」
// toCsv(summary) → 先頭に BOM の付いた CSV 文字列（行の区切りは CRLF）
(function (root) {
  'use strict';

  const xp = typeof require === 'function' ? require('./xp.js') : root.RikaQuest.xp;
  const mastery = typeof require === 'function' ? require('./mastery.js') : root.RikaQuest.mastery;
  const record = typeof require === 'function' ? require('./record.js') : root.RikaQuest.record;
  const badges = typeof require === 'function' ? require('./badges.js') : root.RikaQuest.badges;

  const UNLEARNED = '未学習';
  const NO_NAME = '（名前なし）';
  const WEAK_LIMIT = 5;

  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function isFiniteNumber(x) { return typeof x === 'number' && Number.isFinite(x); }

  // 文字列で、Date として読める日時だけを Date にする（null・数値・オブジェクトは null。1970 年にしない）
  function parseAt(at) {
    if (typeof at !== 'string' || at === '') return null;
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function timeOf(at) {
    const d = parseAt(at);
    return d ? d.getTime() : null;
  }

  function nicknameOf(profile) {
    const name = isObject(profile) ? profile.nickname : undefined;
    return typeof name === 'string' && name !== '' ? name : NO_NAME;
  }

  // app.normalizeStore の守りを軽くしたもの。足りない・形の違う項目は空にする。
  // 読みこんだファイルの知らない項目（"__proto__" などのキーを含む）は写さず、使う項目だけを持つ
  function safeRecord(rec) {
    const r = isObject(rec) ? rec : {};
    const streak = isObject(r.streak) ? r.streak : {};
    return {
      xp: isFiniteNumber(r.xp) ? r.xp : 0,
      level: isFiniteNumber(r.level) ? r.level : null,
      streak: { count: isFiniteNumber(streak.count) ? streak.count : 0, lastDate: typeof streak.lastDate === 'string' ? streak.lastDate : null },
      mastery: isObject(r.mastery) ? r.mastery : {},
      stages: isObject(r.stages) ? r.stages : {},
      history: arr(r.history).filter(isObject),
      badges: isObject(r.badges) ? r.badges : {},
    };
  }

  // 登録済みの全単元と、そのステージ・概念（教材の順）
  function unitsOf(reg) {
    return reg && typeof reg.units === 'function' ? arr(reg.units()).filter((u) => isObject(u) && typeof u.id === 'string') : [];
  }

  function allConcepts(reg) {
    const out = [];
    unitsOf(reg).forEach((unit) => {
      arr(unit.concepts).filter((c) => isObject(c) && typeof c.id === 'string').forEach((c) => {
        out.push({ conceptId: c.id, title: typeof c.title === 'string' ? c.title : c.id, unitId: unit.id, unitTitle: typeof unit.title === 'string' ? unit.title : unit.id });
      });
    });
    return out;
  }

  function allStages(reg) {
    const out = [];
    unitsOf(reg).forEach((unit) => {
      const list = typeof reg.stagesInOrder === 'function' ? arr(reg.stagesInOrder(unit.id)) : [];
      list.filter((s) => isObject(s) && typeof s.id === 'string').forEach((s) => out.push(s.id));
    });
    return out;
  }

  // 最後に学習した時刻（history の中でいちばん新しい at）。なければ null
  function lastEntry(rec) {
    let best = null;
    rec.history.forEach((h) => {
      const t = timeOf(h.at);
      if (t === null) return;
      if (!best || t >= best.t) best = { t, at: h.at };
    });
    return best;
  }

  function labelNames(config) {
    return config.mastery.labels.map((l) => l[1]);
  }

  // 概念ごとの理解度ラベル・誤答数・解答数（rec は safeRecord の形）
  function conceptStats(rec, reg, config) {
    // "__proto__" などの conceptId でも Object.prototype にふれないよう、プロトタイプのない辞書で数える
    const counts = Object.create(null);
    rec.history.forEach((h) => {
      if (h.phase === 'warmup' || typeof h.correct !== 'boolean' || typeof h.conceptId !== 'string') return;
      const c = counts[h.conceptId] || (counts[h.conceptId] = { wrong: 0, total: 0 });
      c.total += 1;
      if (!h.correct) c.wrong += 1;
    });
    return allConcepts(reg).map((c, order) => {
      const m = Object.prototype.hasOwnProperty.call(rec.mastery, c.conceptId) ? rec.mastery[c.conceptId] : null;
      const learned = isObject(m);
      const value = learned && isFiniteNumber(m.value) ? m.value : 0;
      const n = counts[c.conceptId] || { wrong: 0, total: 0 };
      return Object.assign({}, c, { order, learned, value, label: learned ? mastery.label(value, config) : UNLEARNED, wrong: n.wrong, total: n.total });
    });
  }

  function summarizeStudent(profile, rec, reg, config, now) {
    const p = isObject(profile) ? profile : {};
    const r = safeRecord(rec);
    const nowDate = now instanceof Date ? now : new Date(now);
    const today = xp.localDate(nowDate);
    const names = labelNames(config);
    const weakNames = names.slice(0, -1);   // いちばん上（できた）以外 = まだ・もう少し

    const last = lastEntry(r);
    const lastAt = last ? new Date(last.t).toISOString() : null;
    const daysSince = last ? xp.daysBetween(xp.localDate(new Date(last.t)), today) : null;

    const stageIds = allStages(reg);
    const cleared = stageIds.filter((id) => record.stageState(r, id).status === 'cleared').length;

    const stats = conceptStats(r, reg, config);
    const counts = {};
    names.forEach((n) => { counts[n] = 0; });
    counts[UNLEARNED] = 0;
    stats.forEach((s) => { counts[s.label] = (counts[s.label] || 0) + 1; });

    const weak = stats
      .filter((s) => s.learned && weakNames.indexOf(s.label) !== -1)
      .sort((a, b) => b.wrong - a.wrong || a.value - b.value || a.order - b.order)
      .slice(0, WEAK_LIMIT)
      .map((s) => ({ conceptId: s.conceptId, title: s.title, unitId: s.unitId, unitTitle: s.unitTitle, value: s.value, wrong: s.wrong, total: s.total }));

    // 連続学習は記録画面と同じく、最後の日が今日かきのうのときだけ続いているとみなす
    const alive = r.streak.lastDate ? xp.daysBetween(r.streak.lastDate, today) <= 1 : false;
    const unitId = typeof p.unitId === 'string' ? p.unitId : null;
    const unit = unitId && reg && typeof reg.unit === 'function' ? reg.unit(unitId) : null;

    return {
      id: typeof p.id === 'string' ? p.id : '',
      nickname: nicknameOf(p),
      avatar: typeof p.avatar === 'string' ? p.avatar : null,
      unitId,
      unitTitle: unit && typeof unit.title === 'string' ? unit.title : '',
      level: r.level !== null ? r.level : xp.levelFor(r.xp, config),
      xp: r.xp,
      streak: alive ? r.streak.count : 0,
      lastAt,
      daysSince,
      stages: { cleared, total: stageIds.length },
      badges: badges.count(r),
      mastery: counts,
      weak,
    };
  }

  // store の配列から生徒を集める。同じ id は history の最後が新しいほう（同じなら先に出たほう）を残す
  function latestEntries(stores) {
    const byId = new Map();
    const order = [];
    arr(stores).forEach((store) => {
      if (!isObject(store)) return;
      const records = isObject(store.records) ? store.records : {};
      arr(store.profiles).forEach((profile) => {
        if (!isObject(profile) || typeof profile.id !== 'string') return;
        const rec = safeRecord(records[profile.id]);
        const last = lastEntry(rec);
        const entry = { profile, rec, t: last ? last.t : -Infinity };
        const prev = byId.get(profile.id);
        if (!prev) {
          byId.set(profile.id, entry);
          order.push(profile.id);
        } else if (entry.t > prev.t) {
          byId.set(profile.id, entry);
        }
      });
    });
    return order.map((id) => ({ profile: byId.get(id).profile, rec: byId.get(id).rec }));
  }

  function summarizeAll(stores, reg, config, now) {
    const entries = latestEntries(stores).sort((a, b) => {
      const c = nicknameOf(a.profile).localeCompare(nicknameOf(b.profile), 'ja');
      return c !== 0 ? c : a.profile.id < b.profile.id ? -1 : a.profile.id > b.profile.id ? 1 : 0;
    });
    const students = entries.map((e) => summarizeStudent(e.profile, e.rec, reg, config, now));

    const lowest = labelNames(config)[0];   // まだ
    const totals = new Map();
    entries.forEach((e) => {
      conceptStats(e.rec, reg, config).forEach((s) => {
        const t = totals.get(s.conceptId) || { info: s, students: 0, wrong: 0, total: 0 };
        if (s.label === lowest) t.students += 1;
        t.wrong += s.wrong;
        t.total += s.total;
        totals.set(s.conceptId, t);
      });
    });
    const rateOf = (t) => (t.total > 0 ? t.wrong / t.total : null);
    const weakConcepts = [...totals.values()]
      .filter((t) => t.students > 0)
      .sort((a, b) => b.students - a.students || (rateOf(b) === null ? -1 : rateOf(b)) - (rateOf(a) === null ? -1 : rateOf(a)) || a.info.order - b.info.order)
      .map((t) => ({ conceptId: t.info.conceptId, title: t.info.title, unitId: t.info.unitId, unitTitle: t.info.unitTitle, students: t.students, wrongRate: rateOf(t) }));

    return { students, weakConcepts };
  }

  // CSV の 1 つのます。表計算ソフトが式として読まないよう、= + - @ などで始まる文字には ' を前に付ける
  function cell(value) {
    let s = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  const CSV_HEADER = ['ニックネーム', '単元', 'レベル', '経験値', '連続日数', '最終学習日', 'クリア/全ステージ', 'できた', 'もう少し', 'まだ', '未学習', 'バッジ', '苦手'];

  function toCsv(summary) {
    const students = summary && Array.isArray(summary.students) ? summary.students : [];
    const rows = [CSV_HEADER];
    students.forEach((s) => {
      const m = s.mastery || {};
      rows.push([
        s.nickname,
        s.unitTitle || '',
        s.level,
        s.xp,
        s.streak,
        s.lastAt ? xp.localDate(s.lastAt) : '',
        // 「3/10」は表計算ソフトが日付に変えてしまうので、空白を入れる
        s.stages.cleared + ' / ' + s.stages.total,
        m['できた'] || 0,
        m['もう少し'] || 0,
        m['まだ'] || 0,
        m[UNLEARNED] || 0,
        isFiniteNumber(s.badges) ? s.badges : 0,
        arr(s.weak).map((w) => w.title).join('・'),
      ]);
    });
    return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  }

  const api = { summarizeStudent, summarizeAll, latestEntries, safeRecord, parseAt, nicknameOf, toCsv };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { teacher: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
