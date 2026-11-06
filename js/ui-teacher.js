// 先生用の確認画面（ブラウザ専用。ui-screens.js の後に読み込む）。RikaQuest.ui.screens.teacher を足す。
// この端末の記録（ctx.store）と、読みこんだ記録ファイルの store（ctx.state.teacherImports。この端末の記録には入れない）を
// teacher.summarizeAll でまとめ、生徒の一覧・生徒の詳細・クラスのまとめを出す。CSV で書き出せる。
// 利用者の文字はすべて textContent で入れる。先生の画面なので、ふりがなは付けない（section に data-no-ruby）。
// 入り口はパスコード（js/teacher-gate.js）。ctx.state.teacherUnlocked が真でなければ、中身の代わりに入り口を出す。
//   入り口はいつも「パスコードを入力」だけ（生徒が決める画面はない）。端末の上書き（rika-quest:teacher）があればそれ、
//   なければ js/config.js の初期パスコード（teacher.passcode）と照合する。合えば teacherUnlocked = true にして描き直す。
//   変えるのは開いた先生画面の「パスコードを変える」だけ（端末の上書きとして保存）。
//   ほかの画面へ移ると app.go が teacherUnlocked を false に戻す（教材を作る画面 author との行き来では戻さない）。保存先は ctx.state.storageObj（ふつうは localStorage）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const H = RQ.ui.helpers;
  const G = RQ.teacherGate;
  const el = H.el;
  const button = H.button;
  const card = H.card;
  const cardTitle = H.cardTitle;

  const RECENT_LIMIT = 20;        // 詳細に出す最近の取り組みの件数
  const CLASS_WEAK_LIMIT = 10;    // クラスのまとめに出す概念の数
  const TABLE_WEAK_LIMIT = 2;     // 一覧の「苦手」に出す概念の数
  const PHASE_LABEL = { retry: '類題', check: '確認問題', review: '復習', warmup: '予想', live: 'ライブクイズ' };

  const CAUTION = 'この端末に保存された記録を表示します。ほかの端末の記録は『記録ファイルを読みこむ』で合わせて見られます（この端末の記録には入れません）。';

  function pad2(n) { return String(n).padStart(2, '0'); }

  // ---- パスコード ----

  function gateStorage(ctx) {
    return ctx.state.storageObj || null;
  }

  // パスコードの入力欄（数字だけのキーボード、ブラウザに覚えさせない）
  function codeField(id, label) {
    const input = el('input', {
      class: 'text-input gate-input', id, type: 'password', inputmode: 'numeric', autocomplete: 'off',
      maxlength: 8, pattern: '[0-9]*', required: true,
    });
    return { input, field: el('div', { class: 'gate-field' }, [el('label', { class: 'field-label', for: id, text: label }), input]) };
  }

  function errorLine() {
    return el('p', { class: 'gate-error', role: 'alert' });
  }

  function lockText(data, now) {
    return 'しばらく待ってから（残り ' + G.lockSecondsLeft(data, now) + ' 秒）';
  }

  // 新しいコード 2 回の確かめ。よければ null、だめなら文
  function checkNewCodes(a, b) {
    if (!G.isValidCode(a)) return 'パスコードは 4〜8 桁の数字で入力してください。';
    if (a !== b) return '2 回の入力が同じではありません。';
    return null;
  }

  function submitButton(label, cls) {
    return el('button', { type: 'submit', class: 'btn btn-primary ' + (cls || ''), text: label });
  }

  // 描画の世代。描き直し・非同期の処理は、自分の世代がいまの画面のときだけ画面を変える
  // （読みこみの途中で画面を離れて戻ったときなどに、古い処理が入り口を一覧で置きかえないように）
  let renderSeq = 0;

  // 保存できなかった失敗回数・ロック（teacherGate.attempt の held）。画面の世代とは別にこのモジュールで持ち、
  // 照合のあいだに画面を離れても、次に入り口を描くとき・次の送信に引き継ぐ（ページを読み込み直すまで）
  let pendingLock = null;
  // このページで端末の上書き（保存データ）を一度でも見たか。見たあとで消えていたら（ほかのタブで「すべて削除」など）、
  // このタブのメモリに残る古い記録・読みこんだ記録を新しいパスコードで見られないよう、ページを読み込み直す
  let seenPasscode = false;

  const BLOCKED_TEXT = '保存できないため先生画面を開けません（ブラウザの保存領域を確かめてください）。';
  const UNSET_TEXT = 'パスコードが組みこまれていません（js/config.js の teacher.passcode）。';

  // 初期パスコード（config）
  function defaultOf(ctx) {
    return G.defaultData(ctx.config);
  }

  // いま照合に使うデータ（端末の上書きか初期パスコード）
  function effectiveOf(ctx, stored) {
    return G.effective(stored, defaultOf(ctx));
  }

  // いま進んでいる照合（Promise）。画面をまたいで 1 つだけにし、終わるまで次の照合を始めない
  // （画面を往復して照合が重なると、先に終わった失敗回数を後の照合が取りこぼすため）
  let verifying = null;

  // 照合する（teacherGate.attempt）。結果は画面がいまのものでなくても必ず受けとる（保存できなかったロックを持つ）。
  // ほかの照合が進んでいれば null
  async function runAttempt(storage, code, now, fallback) {
    if (verifying) return null;
    verifying = G.attempt(storage, code, now, pendingLock, fallback).then((r) => {
      pendingLock = r.held;
      if (G.load(storage)) seenPasscode = true;
      return r;
    });
    try {
      return await verifying;
    } finally {
      verifying = null;
    }
  }

  // 照合のあいだは送信ボタンと入力を使えなくする。照合が進んでいるときに描いたフォームも、終わるまで使えない
  function setDisabled(controls, value) {
    controls.forEach((c) => { c.disabled = value; });
  }

  // after は照合が終わったあとに呼ぶ（そのときの結果の文を出すなど）
  function waitVerifying(controls, after) {
    if (!verifying) return;
    setDisabled(controls, true);
    const done = () => {
      setDisabled(controls, false);
      if (after) after();
    };
    verifying.then(done, done);
  }

  // メモリの記録を捨ててページを読み込み直す
  function reloadPage(ctx, section) {
    ctx.state.teacherUnlocked = false;
    ctx.state.teacherImports = [];
    pendingLock = null;
    section.replaceChildren();
    root.location.reload();
  }

  // パスコードが消えていたら、読み込み直す。読み込み直すなら true
  function reloadIfGone(ctx, section, stored) {
    if (stored) seenPasscode = true;
    if (!G.isGone(seenPasscode, stored)) return false;
    reloadPage(ctx, section);
    return true;
  }

  // 学習記録のキーがないのに、メモリに生徒がいる（ほかのタブで「すべて削除」された）なら、読み込み直す。
  // 先生画面をまだ一度も開いていないタブでも、開くときに確かめる。読み込み直すなら true
  function reloadIfStoreGone(ctx, section) {
    let raw;
    try {
      raw = ctx.state.storageObj ? ctx.state.storageObj.getItem(ctx.config.storageKey) : undefined;
    } catch (e) {
      return false;   // 読めない環境では確かめられない
    }
    const count = ctx.store && Array.isArray(ctx.store.profiles) ? ctx.store.profiles.length : 0;
    if (!G.storeVanished(raw, count)) return false;
    reloadPage(ctx, section);
    return true;
  }

  // attempt の結果の文（ok・unset 以外）。prefix は「今のパスコードが」など
  function attemptText(r, prefix) {
    if (r.status === 'blocked') return BLOCKED_TEXT;
    if (r.status === 'locked') return 'しばらく待ってから（残り ' + r.seconds + ' 秒）';
    if (r.status === 'cantVerify') return 'この開き方ではパスコードを確かめられません。パスコードを変えたときと同じ開き方（https か、このパソコンの http://127.0.0.1）で開いてください。';
    if (r.status === 'unset') return UNSET_TEXT;
    if (r.status === 'invalid') return (prefix ? prefix.replace(/が$/, 'を') : 'パスコードを') + ' 4〜8 桁の数字で入力してください。';
    if (r.status === 'changed') return 'パスコードがほかの画面で変わりました。もう一度入力してください。';
    return (prefix || '') + 'ちがいます（あと ' + r.triesLeft + ' 回）';
  }

  // 入り口（いつも「パスコードを入力」だけ）。isCurrent() が偽になったら何もしない
  function renderGate(section, ctx, onUnlock, isCurrent) {
    const storage = gateStorage(ctx);
    const stored = G.load(storage);
    if (reloadIfGone(ctx, section, stored)) return;
    const data = G.stricter(effectiveOf(ctx, stored), pendingLock);
    const error = errorLine();
    const show = (text) => { error.textContent = text; };
    const children = [H.topBar('先生用の確認画面', '設定', () => ctx.go('settings'))];

    if (!data) {
      // 初期パスコードが config にない（組みこみの誤り）。生徒が決める画面は出さない
      children.push(card([cardTitle('パスコード'), el('p', { class: 'caution', text: UNSET_TEXT })]));
      section.replaceChildren(...children);
      return;
    }

    const code = codeField('teacher-code', 'パスコード');
    const submit = submitButton('開く', 'btn-block');
    const form = el('form', { class: 'gate-form', novalidate: true }, [code.field, error, submit]);
    const controls = [code.input, submit];
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (verifying || !isCurrent()) return;
      setDisabled(controls, true);
      // 送信のたびに保存データを読み直す（ほかのタブの失敗・ロック・削除も反映する）
      const r = await runAttempt(storage, code.input.value, ctx.now(), defaultOf(ctx));
      setDisabled(controls, false);
      if (!r) return;
      if (!isCurrent()) return;
      if (r.status === 'ok') {
        ctx.state.teacherUnlocked = true;
        ctx.message('');
        onUnlock();
        return;
      }
      code.input.value = '';
      code.input.focus();
      show(attemptText(r, ''));
    });
    if (G.sameCode(data, pendingLock) && G.sameCode(effectiveOf(ctx, stored), pendingLock)) show(BLOCKED_TEXT);
    else if (!G.canTry(data, ctx.now())) show(lockText(data, ctx.now()));
    children.push(card([
      cardTitle('パスコード'),
      el('p', { text: '先生用の確認画面を開くには、先生のパスコードを入力してください。' }),
      form,
    ]));
    section.replaceChildren(...children);
    // 前の画面の照合が終わって保存できなかったと分かったら、その文を出す
    waitVerifying(controls, () => { if (G.sameCode(effectiveOf(ctx, G.load(storage)), pendingLock)) show(BLOCKED_TEXT); });
    code.input.focus();
  }

  // 開いた先生画面の「パスコードを変える」（今のコード → 新しいコード 2 回）
  function passcodeCard(ctx, isCurrent) {
    const box = el('div', { class: 'gate-change' });
    const storage = gateStorage(ctx);
    function closed() {
      box.replaceChildren(button('パスコードを変える', opened, 'btn-block'));
    }
    function opened() {
      const cur = codeField('teacher-code-current', '今のパスコード');
      const a = codeField('teacher-code-next', '新しいパスコード');
      const b = codeField('teacher-code-next-again', 'もう一度');
      const error = errorLine();
      const show = (text) => { error.textContent = text; };
      let busy = false;   // 新しいコードを作って保存するまで
      const send = submitButton('変える');
      const form = el('form', { class: 'gate-form', novalidate: true }, [
        cur.field, a.field, b.field, error,
        el('div', { class: 'btn-row' }, [send, button('やめる', closed)]),
      ]);
      const controls = [cur.input, a.input, b.input, send];
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy || verifying || !isCurrent()) return;
        const bad = checkNewCodes(a.input.value, b.input.value);
        if (bad) { show(bad); return; }
        busy = true;
        setDisabled(controls, true);
        // 今のコードを確かめる（入り口と同じ失敗回数・ロック）
        const r = await runAttempt(storage, cur.input.value, ctx.now(), defaultOf(ctx));
        setDisabled(controls, false);
        if (!r) { busy = false; return; }
        if (!isCurrent()) { busy = false; return; }
        if (r.status !== 'ok') {
          busy = false;
          cur.input.value = '';
          cur.input.focus();
          show(attemptText(r, '今のパスコードが'));
          return;
        }
        let next = null;
        try { next = await G.create(a.input.value); } catch (err) { console.error(err); }
        busy = false;
        if (!isCurrent()) return;
        // 照合のあとにほかのタブで変わった・消えたら上書きしない（上書きが消えていたら読み込み直す）
        const now = G.load(storage);
        if (reloadIfGone(ctx, box, now)) return;
        if (!G.sameCode(effectiveOf(ctx, now), r.data)) { show('パスコードがほかの画面で変わりました。もう一度入力してください。'); return; }
        if (!next || !G.save(storage, next)) { show('パスコードを保存できませんでした。'); return; }
        seenPasscode = true;
        pendingLock = null;
        closed();
        ctx.message('パスコードを変えました。', 'ok');
      });
      box.replaceChildren(form);
      waitVerifying(controls);
      cur.input.focus();
    }
    closed();
    return card([
      cardTitle('パスコード'),
      el('p', { class: 'muted', text: '先生用の確認画面を開くときのパスコードです。変えるとこの端末だけに保存され、設定の「すべて削除」で初期のパスコードに戻ります。使い終わったら「先生画面を閉じる」を押してください。' }),
      box,
    ]);
  }

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

  // ファイルを読んで整えた store と、読めなかったファイル名を返す（teacherImports にはまだ入れない）
  async function importFiles(ctx, files) {
    const loaded = [];
    const failed = [];
    for (const file of files) {
      const text = await readText(file);
      const result = text === null ? { store: null, error: true } : RQ.storage.importJson(text);
      const store = result.error || !result.store ? null : prepareImport(ctx, result.store);
      if (store) loaded.push(store);
      else failed.push(file.name);
    }
    return { loaded, failed };
  }

  function reportImport(ctx, failed, added) {
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
    const mine = ++renderSeq;
    const isCurrent = () => mine === renderSeq && ctx.state.screen === 'teacher';
    if (reloadIfStoreGone(ctx, section)) return;
    if (!ctx.state.teacherUnlocked) {
      renderGate(section, ctx, () => renderTeacher(section, ctx), isCurrent);
      return;
    }
    let selectedId = null;

    const fileInput = el('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true });
    fileInput.addEventListener('change', async () => {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      fileInput.value = '';
      if (files.length === 0) return;
      const r = await importFiles(ctx, files);
      // 読みこみのあいだに画面を離れた・閉じたら、何も入れない・描かない（入り口を一覧で置きかえない）
      if (!isCurrent() || !ctx.state.teacherUnlocked) return;
      r.loaded.forEach((store) => importsOf(ctx).push(store));
      if (paint()) reportImport(ctx, r.failed, r.loaded.length);
    });

    // 描き直し。解錠していなければ入り口を描く。古い世代なら何もしない。中身を描いたら true
    function paint() {
      if (!isCurrent()) return false;
      if (!ctx.state.teacherUnlocked) {
        renderTeacher(section, ctx);
        return false;
      }
      if (reloadIfGone(ctx, section, G.load(gateStorage(ctx))) || reloadIfStoreGone(ctx, section)) return false;
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
          cardTitle('教材を作る（AI）'),
          el('p', { text: '単元名やプリントから教材の下書きを作り、確かめてから公開します。' }),
          button('教材を作る', () => ctx.go('author'), 'btn-primary btn-block'),
        ]),
        card([
          cardTitle('ライブクイズ'),
          el('p', { text: '先生が出題し、生徒が自分の端末でいっせいに答えます（Kahoot! のような形。通信が必要）。' }),
          button('ライブクイズを始める', () => ctx.go('live-host'), 'btn-primary btn-block'),
        ]),
        card([
          cardTitle('書き出す'),
          el('p', { text: '生徒の一覧を CSV ファイル（表計算ソフトで開けます）に書き出します。' }),
          button('CSV で書き出す', () => {
            const name = 'rika-quest-teacher-' + RQ.xp.localDate(now) + '.csv';
            H.downloadText(name, RQ.teacher.toCsv(summary));
            ctx.message(name + ' を書き出しました。', 'ok');
          }, 'btn-block', { disabled: summary.students.length === 0 }),
        ]),
        passcodeCard(ctx, isCurrent),
        button('先生画面を閉じる', () => {
          ctx.state.teacherUnlocked = false;
          ctx.go('settings');
        }, 'btn-block'),
      ];
      section.replaceChildren(...children.filter(Boolean));
      showDetail();
      return true;
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
    const head = el('tr', null, ['ニックネーム', '単元', 'Lv', '連続', '最終学習', 'クリア', 'バッジ', '理解度', '苦手'].map((t) => el('th', { scope: 'col', text: t })));
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
        el('td', { class: 'num', text: String(s.badges || 0) }),
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
