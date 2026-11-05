// 先生用の確認画面（ブラウザ専用。ui-screens.js の後に読み込む）。RikaQuest.ui.screens.teacher を足す。
// この端末の記録（ctx.store）と、読みこんだ記録ファイルの store（ctx.state.teacherImports。この端末の記録には入れない）を
// teacher.summarizeAll でまとめ、生徒の一覧・生徒の詳細・クラスのまとめを出す。CSV で書き出せる。
// 利用者の文字はすべて textContent で入れる。先生の画面なので、ふりがなは付けない（section に data-no-ruby）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const H = RQ.ui.helpers;
  const el = H.el;
  const button = H.button;
  const card = H.card;
  const cardTitle = H.cardTitle;

  const RECENT_LIMIT = 20;        // 詳細に出す最近の取り組みの件数
  const CLASS_WEAK_LIMIT = 10;    // クラスのまとめに出す概念の数
  const TABLE_WEAK_LIMIT = 2;     // 一覧の「苦手」に出す概念の数
  const PHASE_LABEL = { retry: '類題', check: '確認問題', review: '復習', warmup: '予想' };

  const CAUTION = 'この端末に保存された記録を表示します。ほかの端末の記録は『記録ファイルを読みこむ』で合わせて見られます（この端末の記録には入れません）。';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function importsOf(ctx) {
    if (!Array.isArray(ctx.state.teacherImports)) ctx.state.teacherImports = [];
    return ctx.state.teacherImports;
  }

  // 最終学習: 今日・きのう・n 日前・なし
  function lastLabel(s) {
    if (s.daysSince === null) return 'なし';
    if (s.daysSince <= 0) return '今日';
    if (s.daysSince === 1) return 'きのう';
    return s.daysSince + ' 日前';
  }

  // 理解度の 3 色の小さな数（できた・もう少し・まだ）
  function masteryCounts(ctx, s) {
    const names = ctx.config.mastery.labels.map((l) => l[1]).slice().reverse();   // できた, もう少し, まだ
    const levels = names.map((_, i) => names.length - 1 - i);
    return el('span', {
      class: 'teacher-mastery', role: 'img',
      'aria-label': names.map((n) => n + ' ' + (s.mastery[n] || 0)).join('、'),
    }, names.map((n, i) => el('span', { class: 'teacher-m level-' + levels[i], title: n, 'aria-hidden': 'true', text: String(s.mastery[n] || 0) })));
  }

  // 1 件の取り組みの題名（ステージ名、復習なら「復習: 概念名」）
  function historyTitle(ctx, h) {
    if (h.phase === 'review' || !h.stageId) {
      const c = h.conceptId ? ctx.reg.concept(h.conceptId) : null;
      return '復習: ' + (c ? c.title : '（見つからない内容）');
    }
    const st = ctx.reg.stage(h.stageId);
    return st ? st.title : '（見つからないステージ）';
  }

  // 単元: 生徒が選んだ単元がない（未選択・教材のない id）ときは、ホームと同じく既定の単元になるので、その名前を出す。
  // 名前は単元一覧の表（curriculum）の題名を使う（ホーム・単元をえらぶ画面と同じ）。CSV にもこの名前が入る
  function fillUnitTitles(ctx, summary, entries) {
    const items = RQ.units.list(ctx.reg, ctx.curriculum);
    summary.students.forEach((s) => {
      const entry = entries.find((e) => e.profile.id === s.id);
      const id = RQ.units.currentId(ctx.reg, ctx.curriculum, entry ? entry.profile : null);
      const item = items.find((x) => x.id === id);
      s.unitId = id;
      s.unitTitle = item ? item.title : s.unitTitle;
    });
  }

  // ---- 記録ファイルを読みこむ ----

  function readText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(file);
    });
  }

  // 読みこんだ store を、端末の記録と同じ形に整える（app.normalizeStore）。整えられなければ null。
  // ニックネームが文字列でないもの（{ toString: null } など）は先に空にする（normalizeStore の String() が例外になるため）。
  // 空のニックネームは画面・CSV で「（名前なし）」になる（teacher.nicknameOf）
  function prepareImport(ctx, store) {
    try {
      (Array.isArray(store.profiles) ? store.profiles : []).forEach((p) => {
        if (p && typeof p === 'object' && typeof p.nickname !== 'string') p.nickname = '';
      });
      const normalize = ctx.app && typeof ctx.app.normalizeStore === 'function' ? ctx.app.normalizeStore : null;
      return normalize ? normalize(store) : store;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function importFiles(ctx, files, repaint) {
    const failed = [];
    let added = 0;
    for (const file of files) {
      const text = await readText(file);
      const result = text === null ? { store: null, error: true } : RQ.storage.importJson(text);
      const store = result.error || !result.store ? null : prepareImport(ctx, result.store);
      if (!store) {
        failed.push(file.name);
        continue;
      }
      importsOf(ctx).push(store);
      added += 1;
    }
    repaint();
    // ファイル名は利用者の文字なので、ふりがなを付けない
    if (failed.length > 0) {
      ctx.message('読みこめなかったファイル: ' + failed.join('、') + '（壊れているか、形式が違います）' + (added > 0 ? '。ほかの ' + added + ' 件は読みこみました。' : ''), 'warn', { noRuby: true });
    } else if (added > 0) {
      ctx.message(added + ' 件の記録ファイルを読みこみました（この端末の記録には入れていません）。', 'ok', { noRuby: true });
    }
  }

  // ---- 画面 ----

  function renderTeacher(section, ctx) {
    section.setAttribute('data-no-ruby', '');
    let selectedId = null;

    const fileInput = el('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true });
    fileInput.addEventListener('change', () => {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      fileInput.value = '';
      if (files.length > 0) importFiles(ctx, files, paint);
    });

    function paint() {
      const now = ctx.now();
      const stores = [ctx.store].concat(importsOf(ctx));
      const summary = RQ.teacher.summarizeAll(stores, ctx.reg, ctx.config, now);
      const entries = RQ.teacher.latestEntries(stores);
      fillUnitTitles(ctx, summary, entries);
      if (selectedId && !summary.students.some((s) => s.id === selectedId)) selectedId = null;

      const detailBox = el('div', { class: 'teacher-detail-box', 'aria-live': 'polite' });
      const rows = [];

      const showDetail = () => {
        rows.forEach(({ tr, btn, id }) => {
          const on = id === selectedId;
          tr.classList.toggle('is-selected', on);
          btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        const s = summary.students.find((x) => x.id === selectedId);
        const entry = entries.find((e) => e.profile.id === selectedId);
        detailBox.replaceChildren(...(s && entry ? [detailCard(ctx, s, entry.rec, now)] : []));
      };
      const select = (id) => {
        selectedId = selectedId === id ? null : id;
        showDetail();
        if (selectedId && detailBox.firstChild && detailBox.scrollIntoView) detailBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      const imports = importsOf(ctx);
      const children = [
        H.topBar('先生用の確認画面', '設定', () => ctx.go('settings')),
        el('p', { class: 'caution', text: CAUTION }),
        card([
          cardTitle('記録を合わせて見る'),
          el('p', { text: imports.length > 0 ? '読みこんだ記録ファイル: ' + imports.length + ' 件' : '読みこんだ記録ファイルはありません。' }),
          el('div', { class: 'btn-row' }, [
            button('記録ファイルを読みこむ', () => fileInput.click(), 'btn-primary'),
            imports.length > 0 ? button('読みこんだ記録を消す', () => {
              ctx.state.teacherImports = [];
              paint();
              ctx.message('読みこんだ記録を消しました（この端末の記録はそのままです）。', 'ok');
            }) : null,
          ]),
          fileInput,
        ]),
        studentsCard(ctx, summary, rows, select),
        detailBox,
        classCard(summary),
        card([
          cardTitle('書き出す'),
          el('p', { text: '生徒の一覧を CSV ファイル（表計算ソフトで開けます）に書き出します。' }),
          button('CSV で書き出す', () => {
            const name = 'rika-quest-teacher-' + RQ.xp.localDate(now) + '.csv';
            H.downloadText(name, RQ.teacher.toCsv(summary));
            ctx.message(name + ' を書き出しました。', 'ok');
          }, 'btn-block', { disabled: summary.students.length === 0 }),
        ]),
        button('設定へ', () => ctx.go('settings'), 'btn-block'),
      ];
      section.replaceChildren(...children.filter(Boolean));
      showDetail();
    }

    paint();
  }

  // 生徒の一覧の表。行（またはニックネームのボタン）を押すと詳細を出す
  function studentsCard(ctx, summary, rows, select) {
    const children = [cardTitle('生徒の一覧（' + summary.students.length + ' 人）')];
    if (summary.students.length === 0) {
      children.push(el('p', { class: 'muted', text: 'まだ生徒の記録がありません。' }));
      return card(children);
    }
    children.push(el('p', { class: 'muted', text: '行を押すと、その生徒の詳細が下に出ます。' }));
    const head = el('tr', null, ['ニックネーム', '単元', 'Lv', '連続', '最終学習', 'クリア', '理解度', '苦手'].map((t) => el('th', { scope: 'col', text: t })));
    const body = el('tbody');
    summary.students.forEach((s) => {
      const btn = el('button', { type: 'button', class: 'teacher-name', 'aria-expanded': 'false' }, [
        H.avatarBadge(s.avatar, true),
        el('span', { text: s.nickname }),
      ]);
      const weak = s.weak.slice(0, TABLE_WEAK_LIMIT).map((w) => w.title).join('・');
      const tr = el('tr', { class: 'teacher-row' }, [
        el('th', { scope: 'row' }, btn),
        el('td', { text: s.unitTitle || '—' }),
        el('td', { class: 'num', text: String(s.level) }),
        el('td', { class: 'num', text: s.streak + ' 日' }),
        el('td', { text: lastLabel(s) }),
        el('td', { class: 'num', text: s.stages.cleared + ' / ' + s.stages.total }),
        el('td', null, masteryCounts(ctx, s)),
        el('td', { class: 'teacher-weak', text: weak || '—' }),
      ]);
      // ボタンの押下は行の押下でも拾うので、ここでは行だけに付ける
      tr.addEventListener('click', () => select(s.id));
      rows.push({ tr, btn, id: s.id });
      body.append(tr);
    });
    children.push(el('div', { class: 'teacher-table-wrap' }, el('table', { class: 'teacher-table' }, [el('thead', null, head), body])));
    children.push(el('p', { class: 'muted teacher-legend' }, [
      '理解度の数: ',
      el('span', { class: 'teacher-m level-2', text: 'できた' }), ' ',
      el('span', { class: 'teacher-m level-1', text: 'もう少し' }), ' ',
      el('span', { class: 'teacher-m level-0', text: 'まだ' }),
    ]));
    return card(children);
  }

  // 生徒 1 人の詳細: 単元ごとの進捗と理解度（取り組んだ単元と、選んでいる単元）、苦手、最近の取り組み
  function detailCard(ctx, s, rec, now) {
    const children = [el('h2', { class: 'card-title teacher-detail-title' }, [H.avatarBadge(s.avatar, true), ' ', s.nickname, ' さんの詳細'])];
    children.push(el('p', { class: 'muted', text: 'Lv ' + s.level + '・経験値 ' + s.xp + '・連続 ' + s.streak + ' 日・最終学習 ' + lastLabel(s) + (s.lastAt ? '（' + RQ.xp.localDate(s.lastAt) + '）' : '') }));

    // 取り組んだ単元（ステージ・理解度・解答のどれかがある単元）と、選んでいる単元
    const items = RQ.units.list(ctx.reg, ctx.curriculum).filter((x) => x.ready);
    const touched = items.filter((item) => {
      if (item.id === s.unitId) return true;
      const stageIds = ctx.reg.stagesInOrder(item.id).map((st) => st.id);
      const conceptIds = (item.unit.concepts || []).filter(Boolean).map((c) => c.id);
      return stageIds.some((id) => RQ.record.stageState(rec, id).status !== 'none')
        || conceptIds.some((id) => rec.mastery[id])
        || rec.history.some((h) => stageIds.indexOf(h.stageId) !== -1 || conceptIds.indexOf(h.conceptId) !== -1);
    });

    children.push(el('h3', { class: 'teacher-sub', text: '単元ごとの進捗' }));
    if (touched.length === 0) {
      children.push(el('p', { class: 'muted', text: 'まだ取り組んだ単元がありません。' }));
    } else {
      touched.forEach((item) => {
        children.push(el('h4', { class: 'progress-unit', text: item.title }));
        children.push(H.progressList(rec, item.unit));
      });
    }

    children.push(el('h3', { class: 'teacher-sub', text: '苦手な概念' }));
    if (s.weak.length === 0) {
      children.push(el('p', { class: 'muted', text: '「まだ」「もう少し」の概念はありません。' }));
    } else {
      children.push(el('ul', { class: 'teacher-weak-list' }, s.weak.map((w) => el('li', null, [
        el('span', { class: 'teacher-weak-name', text: w.title }),
        el('span', { class: 'muted', text: w.unitTitle }),
        el('span', { class: 'teacher-weak-count', text: '誤答 ' + w.wrong + ' / 解答 ' + w.total }),
      ]))));
    }

    children.push(el('h3', { class: 'teacher-sub', text: '最近の取り組み' }));
    // 日時は集計と同じ teacher.parseAt で読む。読めない日時は「日付不明」として、日時のあるものの後に並べる
    const recent = rec.history
      .map((h, i) => ({ h, i, at: RQ.teacher.parseAt(h.at) }))
      .sort((a, b) => (b.at ? b.at.getTime() : -Infinity) - (a.at ? a.at.getTime() : -Infinity) || b.i - a.i)
      .slice(0, RECENT_LIMIT);
    if (recent.length === 0) {
      children.push(el('p', { class: 'muted', text: 'まだ取り組んだ記録がありません。' }));
    } else {
      children.push(el('ol', { class: 'history-list' }, recent.map(({ h, at }) => {
        let result;
        if (h.phase === 'warmup') result = el('span', { class: 'tag', text: '予想' });
        else if (h.correct === true) result = el('span', { class: 'tag tag-ok', text: '正解' });
        else if (h.correct === false) result = el('span', { class: 'tag tag-warn', text: 'おしい' });
        else result = el('span', { class: 'tag', text: '判定なし' });   // 真偽値でない記録は正誤として断定しない（teacher.js の集計と同じ）
        // phase は文字列のときだけ見る（読みこんだ記録に変な値があっても例外にしない）
        const phase = typeof h.phase === 'string' && h.phase !== 'warmup' && h.phase !== 'review' && Object.prototype.hasOwnProperty.call(PHASE_LABEL, h.phase) ? PHASE_LABEL[h.phase] : null;
        return el('li', { class: 'history-row' }, [
          at
            ? el('time', { class: 'history-time', datetime: at.toISOString(), text: (at.getMonth() + 1) + '/' + at.getDate() + ' ' + pad2(at.getHours()) + ':' + pad2(at.getMinutes()) })
            : el('span', { class: 'history-time', text: '日付不明' }),
          el('span', { class: 'history-title' }, [historyTitle(ctx, h), phase ? el('span', { class: 'history-phase', text: phase }) : null]),
          result,
        ]);
      })));
    }

    const box = card(children, 'teacher-detail');
    // 理解度は単元ごとのカード（記録画面と同じ形）
    const masteryCards = touched.map((item) => H.masteryCard(ctx, rec, item.unit, item.title));
    return el('div', { class: 'teacher-detail-wrap' }, [box].concat(masteryCards));
  }

  // クラスのまとめ: 「まだ」の人数が多い概念
  function classCard(summary) {
    const children = [cardTitle('クラスのまとめ（「まだ」の人数が多い概念）')];
    const list = summary.weakConcepts.slice(0, CLASS_WEAK_LIMIT);
    if (list.length === 0) {
      children.push(el('p', { class: 'muted', text: '「まだ」の概念がある生徒はいません。' }));
      return card(children);
    }
    const head = el('tr', null, ['概念', '単元', '「まだ」の人数', '誤答率'].map((t) => el('th', { scope: 'col', text: t })));
    const body = el('tbody', null, list.map((w) => el('tr', null, [
      el('th', { scope: 'row', text: w.title }),
      el('td', { text: w.unitTitle }),
      el('td', { class: 'num', text: w.students + ' 人' }),
      el('td', { class: 'num', text: w.wrongRate === null ? '—' : Math.round(w.wrongRate * 100) + '%' }),
    ])));
    children.push(el('div', { class: 'teacher-table-wrap' }, el('table', { class: 'teacher-table teacher-class-table' }, [el('thead', null, head), body])));
    return card(children);
  }

  RQ.ui.screens.teacher = renderTeacher;
  RQ.ui.renderTeacher = renderTeacher;
})(typeof globalThis !== 'undefined' ? globalThis : this);
