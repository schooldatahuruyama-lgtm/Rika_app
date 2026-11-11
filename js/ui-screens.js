// 各画面の描画（プロフィール、ホーム、単元をえらぶ、学習マップ、ステージ入口、設定、解説・問題・学び直し・結果、記録）
// ブラウザ専用。RikaQuest.ui = { screens, helpers } を作る。
// 画面の描画関数はすべて screens[name](section, ctx, params) の形。app.go が section を空にしてから呼ぶ。
//   ctx = { store, record, reg, config, curriculum, unitId, setUnit, prefs, setPrefs, go, save, now, message, setRecord,
//           markBadgesSeen, replaceStore, confirm, clearAll, state, app }
//   （message(text, kind, options) と confirm(text, okLabel, options) は options.noRuby で、その文にふりがなを付けない）
//   （store・record・unitId は getter で、いつも最新の値を返す。unitId はいま選んでいる単元の id か null。
//     curriculum は content/curriculum.js の単元一覧か null。setUnit(id) は単元を変えて保存し、できなければ false。
//     prefs は今の生徒の見た目の設定 { theme, ruby, sound }（getter）。setPrefs({ theme?, ruby?, sound? }) は変えてすぐ反映・保存し、できなければ false）
// 描画関数が関数を返すと、次に別の画面へ移るときに app がそれを呼ぶ（後片付け用）。
// 利用者の文字はすべて textContent で入れる。innerHTML は figures・mascot が返す SVG 文字列だけに使う。
// ニックネームを出す要素には data-no-ruby を付ける（名前の読みは辞書では決められないので、ふりがなを付けない。js/ruby.js）。
// 問題の操作部品は ui-problems.js（RikaQuest.ui.problems。このファイルより先に読み込む）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
  const STATUS_LABEL = { none: '未着手', inprogress: '途中', cleared: 'クリア' };
  // 画面の表示だけに使う目安（判定・計算には使わない）
  const REVIEW_MINUTES = 2;      // 復習クエスト（類題 3 問）のおよその時間
  const HISTORY_LIMIT = 30;      // 記録画面の取り組み履歴に出す件数

  // オリジナルキャラクター 6 種。保存済みプロフィールと互換性を保つため id は従来の値を使う。
  // jump はレベルアップの祝いに出す、飛び跳ねている画像（320×320 の透明 PNG）。
  const AVATARS = [
    { id: 'fox', image: 'assets/avatars/poyon.png', jump: 'assets/avatars/jump/poyon.png', label: 'ポヨン' },
    { id: 'cat', image: 'assets/avatars/mojari.png', jump: 'assets/avatars/jump/mojari.png', label: 'モジャリ' },
    { id: 'dog', image: 'assets/avatars/nyokki.png', jump: 'assets/avatars/jump/nyokki.png', label: 'ニョッキ' },
    { id: 'panda', image: 'assets/avatars/purumo.png', jump: 'assets/avatars/jump/purumo.png', label: 'プルモ' },
    { id: 'frog', image: 'assets/avatars/mukuri.png', jump: 'assets/avatars/jump/mukuri.png', label: 'ムクリ' },
    { id: 'penguin', image: 'assets/avatars/nemune.png', jump: 'assets/avatars/jump/nemune.png', label: 'ネムネ' },
  ];

  // プロフィール画面の注意書き（別のブラウザ・別の URL では別の記録になることも伝える）
  const PROFILE_STORAGE_NOTICE = '記録はこの端末の、いま使っているブラウザの中にだけ保存されます。いつも同じブラウザ・同じ URL で開いてください（別のブラウザで開くと、別の記録になります）。ブラウザのデータを消すと記録も消えます。';
  const DATA_LOSS_NOTICE = '記録はこの端末のブラウザ内だけに保存され、ブラウザのデータ削除や端末の変更で消えることがあります。';

  // ---- DOM を組み立てる道具 ----

  // el('button', { class: 'btn', onclick: fn, disabled: true }, ['文字', 子要素])
  // attrs: class / text / dataset / on<イベント名> / true は空の属性 / false・null は付けない
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = String(v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, String(v));
      });
    }
    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return node;
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  // figures・mascot が作った SVG 文字列だけを入れる箱
  function svgBox(markup, cls) {
    const box = el('div', { class: cls || 'svg-box' });
    box.innerHTML = markup;
    return box;
  }

  function button(label, onClick, cls, attrs) {
    return el('button', Object.assign({ type: 'button', class: 'btn ' + (cls || ''), onclick: onClick }, attrs || {}), label);
  }

  function card(children, cls) {
    return el('div', { class: 'card ' + (cls || '') }, children);
  }

  function cardTitle(text) {
    return el('h2', { class: 'card-title', text });
  }

  // 画面の上の「戻る」と見出し
  function topBar(title, backLabel, onBack) {
    return el('div', { class: 'top-bar' }, [
      backLabel ? button('← ' + backLabel, onBack) : null,
      el('h1', { class: 'screen-title', text: title }),
    ]);
  }

  function avatarOf(id) {
    return AVATARS.find((a) => a.id === id) || AVATARS[0];
  }

  function avatarBadge(id, small) {
    const a = avatarOf(id);
    return el('span', { class: 'avatar avatar-' + a.id + (small ? ' avatar-small' : ''), 'aria-hidden': 'true' }, [
      el('img', { class: 'avatar-image', src: a.image, alt: '', width: 256, height: 256, draggable: 'false' }),
    ]);
  }

  // ★ の並び（0〜3）。読み上げ用に「星 2 つ」
  function starsView(n) {
    const count = Math.max(0, Math.min(3, Number(n) || 0));
    const box = el('span', { class: 'stars', role: 'img', 'aria-label': '星 ' + count + ' つ' });
    for (let i = 0; i < 3; i++) box.append(el('span', { class: i < count ? 'star-on' : 'star-off', 'aria-hidden': 'true', text: '★' }));
    return box;
  }

  function statusTag(status) {
    const cls = status === 'cleared' ? 'tag tag-ok' : status === 'inprogress' ? 'tag tag-warn' : 'tag';
    return el('span', { class: cls, text: STATUS_LABEL[status] || STATUS_LABEL.none });
  }

  function currentProfile(store) {
    return store.profiles.find((p) => p.id === store.currentProfileId) || null;
  }

  // ---- バッジ ----

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, String(attrs[k])));
    return node;
  }

  // 文字入りの簡易メダル（SVG の丸）。画像が読めないときの代わり。色は親の .badge-medal が決める
  function badgeMedalSvg(def) {
    const glyph = String(def.glyph || '');
    const size = glyph.length <= 1 ? 22 : glyph.length === 2 ? 17 : glyph.length === 3 ? 14 : 12;
    const svg = svgEl('svg', { viewBox: '0 0 48 48', width: 44, height: 44, 'aria-hidden': 'true', focusable: 'false' });
    svg.append(svgEl('circle', { class: 'badge-medal-outer', cx: 24, cy: 24, r: 23 }));
    svg.append(svgEl('circle', { class: 'badge-medal-inner', cx: 24, cy: 24, r: 18 }));
    const text = svgEl('text', { class: 'badge-medal-glyph', x: 24, y: 24, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size });
    text.textContent = glyph;
    svg.append(text);
    return svg;
  }

  // バッジの絵（assets/images/badges/<id>.png、size px の正方形。省略時 44）。取っていなければ灰色（CSS）。
  // 画像が読めなければ SVG メダルに置きかえる。名前は親の aria-label が持つので画像の alt は空。ふりがなは付けない
  function badgeMedal(def, earnedState, size) {
    const got = !!earnedState;
    const px = Number(size) > 0 ? Number(size) : 44;
    const img = el('img', {
      class: 'badge-img', src: 'assets/images/badges/' + def.id + '.png', alt: '', width: px, height: px, draggable: 'false',
      onerror: () => { if (img.parentNode) img.replaceWith(badgeMedalSvg(def)); },
    });
    return el('span', {
      class: 'badge-medal badge-' + def.color + (got ? '' : ' is-locked'),
      role: 'img',
      'aria-label': def.title + '（' + (got ? '取った' : 'まだ') + '）',
      'data-no-ruby': true,
      style: '--badge-size:' + px + 'px',
    }, img);
  }

  // 取った日（YYYY/M/D）。日時が読めなければ null
  function badgeDate(at) {
    const d = typeof at === 'string' ? new Date(at) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  // 取ったバッジ（at の新しい順。日時の読めないものは後ろ）
  function earnedBadges(rec) {
    return RQ.badges.DEFS
      .map((d, i) => ({ def: d, i, entry: RQ.badges.entry(rec, d.id) }))
      .filter((x) => x.entry !== null)
      .map((x) => Object.assign(x, { t: x.entry.at ? Date.parse(x.entry.at) : NaN }))
      .sort((a, b) => (Number.isNaN(b.t) ? -Infinity : b.t) - (Number.isNaN(a.t) ? -Infinity : a.t) || a.i - b.i);
  }

  function badgeCountText(rec) {
    return RQ.badges.count(rec) + ' / ' + RQ.badges.DEFS.length + ' 個';
  }

  // ホームのバッジのカード: 取った数と、最近取った 3 つ
  function badgeHomeCard(ctx, rec) {
    const recent = earnedBadges(rec).slice(0, 3);
    return card([
      cardTitle('バッジ'),
      el('p', { class: 'badge-count', text: badgeCountText(rec) }),
      recent.length > 0
        ? el('ul', { class: 'badge-recent' }, recent.map((x) => el('li', { class: 'badge-item' }, [
          badgeMedal(x.def, true),
          el('span', { class: 'badge-title', text: x.def.title }),
        ])))
        : el('p', { class: 'muted', text: 'ステージをクリアしたり、続けて学習したりすると取れるよ' }),
      button('バッジを見る', () => ctx.go('record'), 'btn-block'),
    ]);
  }

  // 記録画面のバッジの一覧（DEFS の順に全部）
  function badgeListCard(rec) {
    const list = el('ul', { class: 'badge-grid' });
    RQ.badges.DEFS.forEach((d) => {
      const e = RQ.badges.entry(rec, d.id);
      const date = e ? badgeDate(e.at) : null;
      list.append(el('li', { class: 'badge-item' + (e ? '' : ' is-locked') }, [
        badgeMedal(d, !!e),
        el('div', { class: 'badge-text' }, [
          el('span', { class: 'badge-title', text: d.title }),
          e
            ? el('span', { class: 'badge-sub badge-date', 'data-no-ruby': true, text: date ? date : '取った' })
            : el('span', { class: 'badge-sub', text: d.description }),
        ]),
      ]));
    });
    return card([cardTitle('バッジ'), el('p', { class: 'badge-count', text: badgeCountText(rec) }), list], 'badge-card');
  }

  function areasInOrder(unit) {
    return (unit && Array.isArray(unit.areas) ? unit.areas.filter(Boolean) : []).slice().sort((a, b) => a.order - b.order);
  }

  function areaOfStage(unit, stageId) {
    return areasInOrder(unit).find((a) => (a.stages || []).some((s) => s && s.id === stageId)) || null;
  }

  // 単元一覧の表（content/curriculum.js）の項目。表がない・載っていなければ null
  function curriculumItem(ctx, unitId) {
    const cur = ctx.curriculum;
    return cur && typeof cur.unit === 'function' ? cur.unit(unitId) : null;
  }

  // 学年の見出し（'1年' など。表がなければ 0 だけ「その他」）
  function gradeLabel(ctx, grade) {
    const labels = (ctx.curriculum && ctx.curriculum.GRADE_LABELS) || { 0: 'その他' };
    return labels[grade] || labels[0] || 'その他';
  }

  // 今週（月〜日）のローカル日付 'YYYY-MM-DD' を 7 つ
  function weekDates(now) {
    const offset = (now.getDay() + 6) % 7;   // 月曜からの日数
    const out = [];
    for (let i = 0; i < 7; i++) {
      out.push(RQ.xp.localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + i)));
    }
    return out;
  }

  // 文字列をファイルとして保存させる
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // 確認ダイアログ。OK なら true で解決する（dialog が使えないブラウザは window.confirm）
  // options.noRuby が true なら、確認の文にふりがなを付けない（ニックネームを含む文）
  function confirmDialog(text, okLabel, options) {
    const dialog = document.getElementById('confirm-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(root.confirm(text));
    }
    const textBox = document.getElementById('confirm-text');
    if (options && options.noRuby) textBox.setAttribute('data-no-ruby', '');
    else textBox.removeAttribute('data-no-ruby');
    textBox.textContent = text;
    document.getElementById('confirm-ok').textContent = okLabel || 'はい';
    dialog.returnValue = '';
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
      dialog.showModal();
      document.getElementById('confirm-cancel').focus();
    });
  }

  // ---- プロフィール ----

  function renderProfile(section, ctx) {
    const store = ctx.store;
    const hasProfiles = store.profiles.length > 0;
    let chosenAvatar = AVATARS[0].id;

    section.append(topBar(hasProfiles ? 'だれが学習する？' : 'ようこそ！', currentProfile(store) ? 'ホーム' : null, () => ctx.go('home')));

    if (hasProfiles) {
      const list = el('ul', { class: 'profile-list' });
      store.profiles.forEach((p) => {
        const isCurrent = p.id === store.currentProfileId;
        list.append(el('li', { class: 'profile-item' }, [
          avatarBadge(p.avatar),
          el('span', { class: 'profile-name', 'data-no-ruby': true, text: p.nickname }),
          isCurrent ? el('span', { class: 'tag', text: '使用中' }) : null,
          button(isCurrent ? 'このまま始める' : '切り替え', () => {
            store.currentProfileId = p.id;
            const saved = ctx.save();
            ctx.go('home');
            reportSave(ctx, saved, null);
          }, isCurrent ? 'btn-primary' : ''),
        ]));
      });
      section.append(card([cardTitle('作ったプロフィール'), list]));
    }

    // 新しく作る
    const input = el('input', {
      class: 'text-input', id: 'nickname-input', type: 'text', maxlength: 12, autocomplete: 'off',
      placeholder: '例: ひかりマン',
    });
    const createBtn = button('プロフィールを作る', null, 'btn-primary btn-block', { disabled: true });
    const updateCreate = () => { createBtn.disabled = input.value.trim().length === 0; };
    input.addEventListener('input', updateCreate);

    const grid = el('div', { class: 'avatar-grid', role: 'group', 'aria-label': 'アバターを選ぶ' });
    const choices = AVATARS.map((a) => {
      const b = el('button', {
        type: 'button', class: 'avatar-choice', 'aria-pressed': a.id === chosenAvatar ? 'true' : 'false',
        onclick: () => {
          chosenAvatar = a.id;
          choices.forEach((c) => c.setAttribute('aria-pressed', c.dataset.avatar === chosenAvatar ? 'true' : 'false'));
        },
        dataset: { avatar: a.id },
      }, [avatarBadge(a.id), el('span', { text: a.label })]);
      return b;
    });
    append(grid, choices);

    createBtn.addEventListener('click', () => {
      const nickname = input.value.trim().slice(0, 12);
      if (!nickname) return;
      RQ.record.createProfile(ctx.store, { nickname, avatar: chosenAvatar }, ctx.now());
      const saved = ctx.save();
      ctx.go('home');
      reportSave(ctx, saved, null);
    });

    section.append(card([
      cardTitle(hasProfiles ? '新しいプロフィールを作る' : 'まずはプロフィールを作ろう'),
      el('div', { class: 'stack' }, [
        el('div', {}, [
          el('label', { class: 'field-label', for: 'nickname-input', text: 'ニックネーム（12 文字まで）' }),
          input,
        ]),
        el('p', { class: 'caution', text: '実名（本当の名前）は入れないでください。ニックネームにしよう。' }),
        el('div', {}, [el('span', { class: 'field-label', text: 'アバター' }), grid]),
        el('p', { class: 'caution', text: PROFILE_STORAGE_NOTICE }),
        createBtn,
      ]),
    ]));

    section.append(button('設定', () => ctx.go('settings'), 'btn-block'));
  }

  // ---- ホーム ----

  function renderHome(section, ctx) {
    const store = ctx.store;
    const profile = currentProfile(store);
    const rec = ctx.record;
    const now = ctx.now();
    const today = RQ.xp.localDate(now);

    // あいさつとマスコット（いま選んでいる単元の担当の先生。単元がなければ まる先生）
    const unitId = ctx.unitId;
    const unit = unitId ? ctx.reg.unit(unitId) : null;
    const teacher = RQ.mascot.forUnit(unit);
    section.append(el('div', { class: 'hero' }, [
      svgBox(RQ.mascot.svg(96, teacher), 'mascot-box'),
      el('div', { class: 'hero-text' }, [
        el('h1', null, ['こんにちは、', el('span', { 'data-no-ruby': true, text: profile.nickname }), 'さん！']),
        el('p', { text: teacher.name + '「今日も' + (unit ? unit.title : '理科の世界') + 'を探検しよう」' }),
      ]),
    ]));

    // いまの単元（単元一覧の表に項目があれば「1年・物理」のように学年と分野も出す）
    const item = unitId ? curriculumItem(ctx, unitId) : null;
    section.append(card([
      cardTitle('いまの単元'),
      el('p', { class: 'unit-current', text: unit ? unit.title : '単元がえらばれていません' }),
      item ? el('p', { class: 'muted', text: gradeLabel(ctx, item.grade) + '・' + item.field }) : null,
      button('単元をえらぶ', () => ctx.go('units'), 'btn-block'),
    ]));

    section.append(questCard(ctx, rec, now));
    section.append(levelCard(ctx, rec, 'レベルと経験値'));
    section.append(streakCard(rec, now, today));
    section.append(badgeHomeCard(ctx, rec));

    section.append(el('div', { class: 'stack' }, [
      button('学習マップへ', () => ctx.go('map'), 'btn-primary btn-block'),
      button('記録を見る', () => ctx.go('record'), 'btn-block'),
    ]));

    section.append(liveJoinCard(ctx));

    section.append(card([
      cardTitle('班の協力チャレンジ（準備中）'),
      el('p', { text: '班のみんなで力を合わせるチャレンジです。今はまだ使えません。' }),
    ], 'is-disabled'));

    section.append(button('設定', () => ctx.go('settings'), 'btn-block'));
  }

  // ライブクイズに参加（js/ui-live.js）。通信が必要なので、オフラインなら押せない
  function liveJoinCard(ctx) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return card([
      cardTitle('ライブクイズに参加'),
      el('p', { text: offline ? '通信が必要です（インターネットにつながると参加できます）。' : '先生から部屋コードをもらったら押そう。' }),
      button('ライブクイズに参加', () => ctx.go('live'), 'btn-primary btn-block', { disabled: offline }),
    ], offline ? 'is-disabled' : '');
  }

  function questCard(ctx, rec, now) {
    const unitId = ctx.unitId;
    const quest = RQ.recommend.todayQuest(ctx.reg, rec, unitId, now, ctx.config);
    const children = [cardTitle('今日のクエスト')];
    if (!quest) {
      children.push(el('p', { class: 'quest-title', text: '全部クリア！' }));
      children.push(el('p', { class: 'muted', text: '学習マップから好きなステージにもう一度挑戦するか、ほかの単元をえらぼう。' }));
      children.push(button('単元をえらぶ', () => ctx.go('units'), 'btn-block'));
      return card(children);
    }
    if (quest.kind === 'review') {
      children.push(el('p', { class: 'muted', text: '復習クエスト' }));
      children.push(el('p', { class: 'quest-title', text: quest.title }));
      children.push(el('p', { class: 'muted', text: '約 ' + REVIEW_MINUTES + ' 分　少しだけ問題を解いて、思い出そう。' }));
      children.push(button('復習する', () => ctx.go('problem', { review: quest.conceptId }), 'btn-primary btn-block'));
      return card(children);
    }
    const stage = ctx.reg.stage(quest.stageId);
    const area = areaOfStage(ctx.reg.unit(unitId), quest.stageId);
    if (area) children.push(el('p', { class: 'muted', text: area.title }));
    children.push(el('p', { class: 'quest-title', text: quest.title }));
    if (stage) children.push(el('p', { class: 'muted', text: '約 ' + stage.minutes + ' 分' }));
    children.push(button(quest.resume ? '続きから' : 'はじめる', () => ctx.go('stage', { stageId: quest.stageId }), 'btn-primary btn-block'));
    return card(children);
  }

  // レベルと経験値のカード（ホームと記録画面で使う）
  function levelCard(ctx, rec, title) {
    const level = rec.level;
    const total = rec.xp;
    const next = RQ.xp.nextLevelXp(level, ctx.config);
    // バーは今のレベルの中での進み具合（今のレベルの下限 → 次のレベル）
    const lower = level > 1 ? RQ.xp.nextLevelXp(level - 1, ctx.config) : 0;
    const span = Math.max(1, next - lower);
    const ratio = Math.max(0, Math.min(1, (total - lower) / span));
    const percent = Math.round(ratio * 100);
    const bar = el('div', {
      class: 'xp-bar', role: 'progressbar', 'aria-label': '次のレベルまで',
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent,
    }, el('div', { class: 'xp-bar-fill' }));
    bar.firstChild.style.width = percent + '%';
    return card([
      cardTitle(title),
      el('div', { class: 'level-row' }, [
        el('span', { class: 'level-num', text: 'Lv ' + level }),
        el('span', { text: total + ' / ' + next + ' XP' }),
      ]),
      bar,
      el('p', { class: 'muted', text: 'あと ' + Math.max(0, next - total) + ' XP で Lv ' + (level + 1) }),
    ]);
  }

  // 連続学習のカード（ホームと記録画面で使う）。
  // 曜日の丸は「学習した日」= 予想（warmup）以外の解答があった日（連続学習の数え方と同じ）
  function streakCard(rec, now, today) {
    const streak = rec.streak || {};
    const alive = streak.lastDate ? RQ.xp.daysBetween(streak.lastDate, today) <= 1 : false;
    const count = alive ? streak.count || 0 : 0;
    const studied = new Set((rec.history || []).filter((h) => h && h.phase !== 'warmup').map((h) => RQ.xp.localDate(h.at)));
    const dots = el('ol', { class: 'week-dots', 'aria-label': '今週学習した日' });
    weekDates(now).forEach((date, i) => {
      const done = studied.has(date);
      const isToday = date === today;
      dots.append(el('li', {
        class: 'week-day' + (done ? ' is-done' : '') + (isToday ? ' is-today' : ''),
        'aria-label': WEEKDAYS[i] + '曜日' + (isToday ? '（今日）' : '') + (done ? ' 学習した' : ' まだ'),
      }, [
        el('span', { class: 'week-dot', 'aria-hidden': 'true', text: done ? '✓' : '' }),
        el('span', { 'aria-hidden': 'true', 'data-no-ruby': true, text: WEEKDAYS[i] }),   // 曜日の漢字にふりがなを付けない
      ]));
    });
    let note = '今日から始めよう！';
    if (streak.lastDate === today) note = '今日も学習したね！';
    else if (alive) note = '今日も学習して、記録をのばそう。';
    return card([
      cardTitle('連続学習'),
      el('p', {}, [el('span', { class: 'streak-count', text: count + ' 日' }), ' 連続']),
      el('p', { class: 'muted', text: note }),
      dots,
    ]);
  }

  // ---- 単元をえらぶ ----
  // 学年ごと（1 → 2 → 3 → その他）のカードに単元を並べる。教材のない単元は「準備中」で押せない。

  const GRADE_ORDER = [1, 2, 3, 0];

  function renderUnits(section, ctx) {
    section.append(topBar('単元をえらぶ', 'ホーム', () => ctx.go('home')));
    const items = RQ.units.list(ctx.reg, ctx.curriculum);
    const current = ctx.unitId;
    const rec = ctx.record;

    GRADE_ORDER.forEach((grade) => {
      const inGrade = items.filter((x) => x.grade === grade);
      if (inGrade.length === 0) return;
      const list = el('ul', { class: 'unit-list' });
      inGrade.forEach((item) => list.append(el('li', {}, unitButton(ctx, rec, item, item.id === current))));
      section.append(card([cardTitle(gradeLabel(ctx, grade)), list]));
    });

    section.append(button('ホームへ', () => ctx.go('home'), 'btn-block'));
  }

  // 単元 1 つのボタン（先生の絵、単元名、分野とクリア数か「準備中」、いまの単元の印）
  function unitButton(ctx, rec, item, isCurrent) {
    const title = item.title;
    const parts = [];
    if (item.field) parts.push(item.field);
    if (item.ready) {
      const stages = ctx.reg.stagesInOrder(item.id);
      const cleared = stages.filter((s) => RQ.record.stageState(rec, s.id).status === 'cleared').length;
      parts.push('クリア ' + cleared + ' / ' + stages.length + ' ステージ');
    } else {
      parts.push('準備中');
    }
    const meta = parts.join('　');
    // 先生の絵（mascot.svg が返す <img> の文字列）。button の中なので div ではなく span に入れる
    const picture = el('span', { class: 'unit-teacher', 'aria-hidden': 'true' });
    picture.innerHTML = RQ.mascot.svg(44, item.teacher);
    return el('button', {
      type: 'button',
      class: 'unit-card' + (item.ready ? '' : ' is-soon'),
      disabled: !item.ready,
      'aria-current': isCurrent ? 'true' : null,
      'aria-label': title + '（' + meta + (isCurrent ? '、いまの単元' : '') + '）',
      onclick: item.ready ? () => {
        if (!ctx.setUnit(item.id)) {
          ctx.message('単元を変えられませんでした。', 'warn');
          return;
        }
        ctx.go('home');
        ctx.message('単元を「' + title + '」にしました。', 'ok');
      } : null,
    }, [
      picture,
      el('span', { class: 'unit-body' }, [
        el('span', { class: 'unit-title', text: title }),
        el('span', { class: 'unit-meta muted', text: meta }),
      ]),
      isCurrent ? el('span', { class: 'tag tag-ok unit-now', text: 'いまの単元' }) : null,
    ]);
  }

  // ---- 学習マップ ----

  function renderMap(section, ctx) {
    const unit = ctx.reg.unit(ctx.unitId);
    const rec = ctx.record;
    section.append(topBar('学習マップ', 'ホーム', () => ctx.go('home')));
    if (!unit) {
      section.append(card([
        el('p', { text: '単元がえらばれていません。' }),
        button('単元をえらぶ', () => ctx.go('units'), 'btn-primary btn-block'),
      ]));
      return;
    }
    section.append(el('p', { class: 'muted', text: unit.title + '　どの領域から始めてもよいよ。領域の中は順番に開きます（ミニプリントはどれからでも開けます）。' }));

    areasInOrder(unit).forEach((area, ai) => {
      const stages = (area.stages || []).filter(Boolean);
      const path = el('ol', { class: 'map-path' });
      if (stages.length === 0) {
        path.append(el('li', { class: 'map-step is-soon' }, el('div', { class: 'map-node' }, [
          el('span', { class: 'node-circle', 'aria-hidden': 'true', text: '…' }),
          el('span', { class: 'node-label' }, [
            el('span', { class: 'node-title', text: '準備中' }),
            el('span', { class: 'muted', text: 'もうすぐ遊べるようになります' }),
          ]),
        ])));
      }
      stages.forEach((stage, si) => {
        const st = RQ.record.stageState(rec, stage.id);
        const unlocked = RQ.recommend.isUnlocked(ctx.reg, rec, stage.id);
        const stepCls = 'map-step ' + (unlocked ? 'is-' + st.status : 'is-locked');
        const circleText = !unlocked ? '🔒' : st.status === 'cleared' ? '✓' : String(si + 1);
        const meta = unlocked
          ? el('span', { class: 'node-meta' }, [statusTag(st.status), starsView(st.stars)])
          : el('span', { class: 'node-meta muted', text: '前のステージをクリアすると開く' });
        const node = el('button', {
          type: 'button', class: 'map-node', disabled: !unlocked,
          'aria-label': stage.title + '（' + (unlocked ? STATUS_LABEL[st.status] + '、星 ' + st.stars + ' つ' : 'まだ開いていない') + '）',
          onclick: unlocked ? () => ctx.go('stage', { stageId: stage.id }) : null,
        }, [
          el('span', { class: 'node-circle', 'aria-hidden': 'true', text: circleText }),
          el('span', { class: 'node-label', 'aria-hidden': 'true' }, [el('span', { class: 'node-title', text: stage.title }), meta]),
        ]);
        path.append(el('li', { class: stepCls }, node));
      });
      section.append(card([
        el('div', { class: 'map-area-head' }, [
          el('span', { class: 'map-area-num', 'aria-hidden': 'true', text: String(ai + 1) }),
          el('h2', { class: 'card-title', style: 'margin:0', text: area.title }),
        ]),
        path,
      ], 'map-area'));
    });
  }

  // ---- ステージ入口 ----

  function renderStage(section, ctx, params) {
    const stageId = params && params.stageId;
    const stage = stageId ? ctx.reg.stage(stageId) : null;
    section.append(topBar('ステージ', 'マップ', () => ctx.go('map')));
    if (!stage) {
      section.append(card(el('p', { text: 'ステージが見つかりません。マップから選んでください。' })));
      return;
    }
    const rec = ctx.record;
    if (!RQ.recommend.isUnlocked(ctx.reg, rec, stage.id)) {
      section.append(card([
        el('p', { class: 'stage-title', text: '🔒 ' + stage.title }),
        el('p', { text: '前のステージをクリアすると開きます。' }),
      ]));
      return;
    }
    const st = RQ.record.stageState(rec, stage.id);
    const area = areaOfStage(ctx.reg.unitOfStage(stage.id), stage.id);
    const concepts = (stage.concepts || []).map((id) => ctx.reg.concept(id)).filter(Boolean);

    section.append(card([
      area ? el('p', { class: 'muted', text: area.title }) : null,
      el('h2', { class: 'stage-title', text: stage.title }),
      el('div', { class: 'row' }, [
        el('span', { text: '約 ' + stage.minutes + ' 分' }),
        statusTag(st.status),
        starsView(st.stars),
      ]),
      el('h3', { style: 'margin-top:16px', text: '扱う内容' }),
      el('ul', { class: 'concept-list' }, concepts.map((c) => el('li', { text: c.title }))),
    ]));

    const buttons = el('div', { class: 'stack' });
    if (st.resume) {
      buttons.append(el('button', {
        type: 'button', class: 'btn btn-primary btn-big',
        onclick: () => ctx.go('problem', { stageId: stage.id, resume: true }),
      }, [el('span', { text: '続きから' }), el('span', { class: 'btn-sub', text: '前回止めたところから' })]));
    } else if (st.status === 'inprogress') {
      buttons.append(el('p', { class: 'muted', text: '前回は途中で終わりました。今回は最初から始めます。' }));
    }
    buttons.append(el('button', {
      type: 'button', class: 'btn btn-big' + (st.resume ? '' : ' btn-primary'),
      onclick: () => ctx.go('lesson', { stageId: stage.id, mode: 'lesson' }),
    }, [el('span', { text: '解説から学ぶ' }), el('span', { class: 'btn-sub', text: '解説カードを読んでから問題へ' })]));
    buttons.append(el('button', {
      type: 'button', class: 'btn btn-big',
      onclick: () => ctx.go('problem', { stageId: stage.id, mode: 'problem' }),
    }, [el('span', { text: '問題から挑戦' }), el('span', { class: 'btn-sub', text: 'すぐに問題を解く' })]));
    if (st.resume) buttons.append(el('p', { class: 'muted', text: '「解説から学ぶ」「問題から挑戦」を選ぶと、最初からやり直します。' }));
    section.append(buttons);
  }

  // ---- 設定 ----

  // アクセントカラーの選択肢（id は app.js の THEME_COLORS・css の :root[data-theme] と同じ）
  const THEMES = [
    { id: 'blue', label: 'あお' },
    { id: 'teal', label: 'みずいろ' },
    { id: 'green', label: 'みどり' },
    { id: 'purple', label: 'むらさき' },
    { id: 'pink', label: 'ピンク' },
  ];
  const RUBY_CHOICES = [
    { id: 'off', label: 'なし' },
    { id: 'on', label: 'つける' },
  ];
  // 効果音（profile.sound は true / false）
  const SOUND_CHOICES = [
    { value: false, label: 'なし' },
    { value: true, label: '鳴らす' },
  ];

  // 効果音を鳴らす（js/sfx.js が読み込めなかったときや失敗しても、画面は止めない）
  function playSfx(kind) {
    if (!RQ.sfx || typeof RQ.sfx.play !== 'function') return;
    try {
      RQ.sfx.play(kind);
    } catch (e) {
      console.error(e);
    }
  }

  // 「見た目と読みやすさ」: アクセントカラー・ふりがな・効果音。押すとすぐ反映して保存する（生徒ごとの設定）
  function prefsCard(ctx) {
    const hasProfile = !!currentProfile(ctx.store);
    const prefs = ctx.prefs || { theme: 'blue', ruby: 'off', sound: true };
    // 押したボタンだけ aria-pressed を true にする（画面は描き直さない）
    const press = (buttons, chosen) => buttons.forEach((b) => b.setAttribute('aria-pressed', b === chosen ? 'true' : 'false'));
    const change = (patch, buttons, chosen, okText) => {
      if (ctx.setPrefs(patch)) {
        press(buttons, chosen);
        ctx.message(okText, 'ok');
        return true;
      } else {
        ctx.message('保存できなかったため、元の設定に戻しました。' + (ctx.state.protectedStorage
          ? '読み込めない記録が残っているため、「読み込めない記録を上書きして新しく始める」で対処してください。' : ''), 'warn');
        return false;
      }
    };

    const swatches = THEMES.map((t) => el('button', {
      type: 'button', class: 'color-swatch swatch-' + t.id, 'aria-label': t.label,
      'aria-pressed': prefs.theme === t.id ? 'true' : 'false', title: t.label, disabled: !hasProfile,
    }));
    swatches.forEach((b, i) => b.addEventListener('click', () => change({ theme: THEMES[i].id }, swatches, b, '色を「' + THEMES[i].label + '」にしました。')));

    const rubyButtons = RUBY_CHOICES.map((c) => el('button', {
      type: 'button', class: 'btn ruby-choice', 'aria-pressed': prefs.ruby === c.id ? 'true' : 'false', disabled: !hasProfile,
    }, c.label));
    rubyButtons.forEach((b, i) => b.addEventListener('click', () => change({ ruby: RUBY_CHOICES[i].id }, rubyButtons, b,
      RUBY_CHOICES[i].id === 'on' ? 'ふりがなをつけました。' : 'ふりがなを消しました。')));

    const soundButtons = SOUND_CHOICES.map((c) => el('button', {
      type: 'button', class: 'btn sound-choice', 'aria-pressed': prefs.sound === c.value ? 'true' : 'false', disabled: !hasProfile,
    }, c.label));
    soundButtons.forEach((b, i) => b.addEventListener('click', () => {
      const on = SOUND_CHOICES[i].value;
      // 鳴らすにしたら、押した操作の中で試しに鳴らす（なしのときは sfx.js が鳴らさない）
      if (change({ sound: on }, soundButtons, b, on ? '効果音を鳴らします。' : '効果音を消しました。')) playSfx('correct');
    }));

    return card([
      cardTitle('見た目と読みやすさ'),
      hasProfile ? null : el('p', { class: 'muted', text: 'プロフィールを選ぶと色を変えられます。' }),
      el('h3', { class: 'prefs-label', text: 'アクセントカラー' }),
      el('div', { class: 'swatch-row', role: 'group', 'aria-label': 'アクセントカラー' }, swatches),
      el('h3', { class: 'prefs-label', text: 'ふりがな' }),
      el('p', { class: 'muted', text: '漢字に読みがなをつけます。' }),
      el('div', { class: 'btn-row', role: 'group', 'aria-label': 'ふりがな' }, rubyButtons),
      el('h3', { class: 'prefs-label', text: '効果音' }),
      el('p', { class: 'muted', text: '正解・不正解・レベルアップのときに短い音を鳴らします。' }),
      el('div', { class: 'btn-row', role: 'group', 'aria-label': '効果音' }, soundButtons),
    ], 'prefs-card');
  }

  // 保存の結果をお知らせにする。失敗したら成功の文は出さない
  // options は ctx.message にそのまま渡す（{ noRuby: true } でふりがなを付けない）
  function reportSave(ctx, ok, successText, options) {
    if (ok) {
      if (successText) ctx.message(successText, 'ok', options);
      return;
    }
    ctx.message('保存できませんでした。' + (ctx.state.protectedStorage
      ? '読み込めない記録が残っているため、「読み込めない記録を上書きして新しく始める」で対処してください。'
      : 'この変更は、ページを閉じると消えます。'), 'warn');
  }

  function renderSettings(section, ctx) {
    const store = ctx.store;
    section.append(topBar('設定', currentProfile(store) ? 'ホーム' : 'もどる', () => ctx.go(currentProfile(store) ? 'home' : 'profile')));

    // 読み込めない記録が残っているとき（新しい記録が保存されない）
    if (ctx.state.protectedStorage) {
      section.append(card([
        cardTitle('読み込めない記録があります'),
        el('p', { text: '前の記録が読み込めず、別の場所にも残せませんでした。このままでは新しい記録が保存されません。' }),
        button('読み込めない記録を上書きして新しく始める', async () => {
          const ok = await ctx.confirm('読み込めない記録を上書きします。前の記録は元に戻せません。よろしいですか？', '上書きする');
          if (!ok) return;
          if (ctx.save({ allowOverwrite: true })) {
            ctx.state.protectedStorage = false;
            const notice = document.getElementById('load-notice');
            if (notice) notice.hidden = true;
            ctx.go(currentProfile(ctx.store) ? 'settings' : 'profile');
            ctx.message('新しい記録で始めました。', 'ok');
          } else {
            ctx.message('保存できませんでした。ブラウザの設定を確かめてください。', 'warn');
          }
        }, 'btn-danger btn-block'),
      ], 'card-warn'));
    }

    // プロフィール
    const list = el('ul', { class: 'profile-list' });
    store.profiles.forEach((p) => {
      const isCurrent = p.id === store.currentProfileId;
      list.append(el('li', { class: 'profile-item' }, [
        avatarBadge(p.avatar),
        el('span', { class: 'profile-name', 'data-no-ruby': true, text: p.nickname }),
        isCurrent ? el('span', { class: 'tag', text: '使用中' }) : button('切り替え', () => {
          store.currentProfileId = p.id;
          const saved = ctx.save();
          ctx.go('settings');
          reportSave(ctx, saved, p.nickname + ' に切り替えました。', { noRuby: true });
        }),
        button('削除', async () => {
          const ok = await ctx.confirm('「' + p.nickname + '」の記録をすべて削除します。元に戻せません。よろしいですか？', '削除する', { noRuby: true });
          if (!ok) return;
          RQ.record.deleteProfile(ctx.store, p.id);
          const saved = ctx.save();
          ctx.go(ctx.store.profiles.length > 0 ? 'settings' : 'profile');
          reportSave(ctx, saved, '「' + p.nickname + '」を削除しました。', { noRuby: true });
        }, 'btn-danger'),
      ]));
    });
    section.append(card([
      cardTitle('プロフィール'),
      store.profiles.length > 0 ? list : el('p', { class: 'muted', text: 'まだプロフィールがありません。' }),
      button('新しいプロフィールを作る', () => ctx.go('profile'), 'btn-block', { style: 'margin-top:12px' }),
    ]));

    section.append(prefsCard(ctx));

    // バックアップ（書き出し・読み込み）
    const fileInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (file) importFile(ctx, file);
    });
    section.append(card([
      cardTitle('記録のバックアップ'),
      el('p', { text: '記録をファイルに書き出しておくと、あとで読み込んで元に戻せます。' }),
      el('div', { class: 'btn-row' }, [
        button('記録を書き出す', () => {
          const name = 'rika-quest-' + RQ.xp.localDate(ctx.now()) + '.json';
          downloadText(name, RQ.storage.exportJson(ctx.store));
          ctx.message(name + ' を書き出しました。', 'ok');
        }, 'btn-primary'),
        button('記録を読み込む', () => fileInput.click()),
      ]),
      fileInput,
    ]));

    // 先生用の確認画面（js/ui-teacher.js。プロフィールがなくても開ける）
    section.append(card([
      cardTitle('先生用'),
      el('p', { text: '生徒の進捗・理解度・苦手を一覧します（先生が使う画面です）。' }),
      button('先生用の確認画面を開く（パスコード）', () => ctx.go('teacher'), 'btn-block'),
    ]));

    section.append(card([cardTitle('記録の保存について'), el('p', { class: 'caution', text: DATA_LOSS_NOTICE })]));

    // オフライン教材の状態。ctx.state.offline（app.js が書く）を使い、なければ localStorage の印を読む。
    // sw.js の知らせで状態が変わると app.js が 'rika-quest:offline' を送るので、この箱だけ描き直す
    const offlineBox = el('div', { id: 'offline-status', 'aria-live': 'polite' });
    let unitTitles = '';
    try {
      unitTitles = ctx.reg.units().map((u) => u.title).join('、');
    } catch (e) {
      unitTitles = '';
    }
    const paintOffline = () => {
      let off = ctx.state.offline;
      if (!off) {
        let mark = null;
        try {
          mark = root.location.protocol === 'file:' ? null : JSON.parse(root.localStorage.getItem('rika-quest:offline'));
        } catch (e) {
          mark = null;
        }
        if (root.location.protocol === 'file:') off = { state: 'unsupported-file' };
        else if (!(root.navigator && 'serviceWorker' in root.navigator)) off = { state: 'unsupported-insecure' };
        else off = mark && typeof mark.version === 'string' ? { state: 'ready', version: mark.version } : { state: 'pending' };
      }
      let lines;
      if (off.state === 'ready') {
        lines = [
          el('p', { text: 'オフラインで使える: ' + (unitTitles || '教材') + '（版 ' + off.version + '、済）' }),
          el('p', { class: 'muted', text: '通信がなくても、この端末で学習を続けられます。' }),
        ];
      } else if (off.state === 'failed') {
        lines = [el('p', { text: 'オフライン対応を準備できませんでした' })];
      } else if (off.state === 'unsupported-file') {
        lines = [el('p', { text: 'この開き方（file://）ではオフライン対応は使えません。http で開くと使えます。' })];
      } else if (off.state === 'unsupported-insecure') {
        // Service Worker は https か localhost（127.0.0.1）でだけ動く。LAN の IP を http で開いたときなど
        lines = [el('p', { text: 'この開き方ではオフライン対応は使えません。https か、このパソコンの http://127.0.0.1 で開くと使えます。' })];
      } else {
        lines = [el('p', { text: 'オフライン対応: 準備中（読み込み中）' })];
      }
      offlineBox.replaceChildren(...lines);
    };
    const onOffline = () => {
      // 画面を離れたあと（箱が外れたあと）に届いたら、受け取りをやめる
      if (!offlineBox.isConnected) {
        document.removeEventListener('rika-quest:offline', onOffline);
        return;
      }
      paintOffline();
    };
    paintOffline();
    document.addEventListener('rika-quest:offline', onOffline);
    section.append(card([cardTitle('オフラインで使える教材'), offlineBox]));

    section.append(card([
      cardTitle('すべて削除'),
      el('p', { text: 'この端末に保存した、すべてのプロフィールと記録を削除します。' }),
      button('すべて削除', async () => {
        const ok = await ctx.confirm('すべてのプロフィールと記録を削除します。元に戻せません。\n先に「記録を書き出す」でバックアップすることをおすすめします。よろしいですか？', 'すべて削除する');
        if (ok) ctx.clearAll();
      }, 'btn-danger btn-block'),
    ]));
  }

  // ファイルを読み込み、成功したときだけ store を置きかえる（失敗したら今の記録は変えない）
  function importFile(ctx, file) {
    const reader = new FileReader();
    reader.onerror = () => ctx.message('ファイルを読み込めません。', 'warn');
    reader.onload = async () => {
      const result = RQ.storage.importJson(String(reader.result));
      if (result.error) {
        ctx.message(result.error, 'warn');
        return;
      }
      const ok = await ctx.confirm('今の記録を、ファイルの記録で置きかえます。よろしいですか？', '置きかえる');
      if (!ok) return;
      const saved = ctx.replaceStore(result.store);
      ctx.go(currentProfile(ctx.store) ? 'settings' : 'profile');
      reportSave(ctx, saved, '記録を読み込みました（プロフィール ' + ctx.store.profiles.length + ' 人）。');
    };
    reader.readAsText(file);
  }

  // ---- 学習画面（解説・問題・学び直しの提案・結果） ----
  // 進行は ctx.state.session（session.js の形）。画面は app.renderSession() が current() の view で選ぶ。
  // 操作は ctx.app.next() / answer(value) / choose(choice) / stopSession() を呼ぶ（記録・保存は app がする）。

  const LEVELUP_MS = 2000;   // レベルアップの祝いを出しておく時間（ジャンプが 3 回ほど見える。タップで消せる）

  // レベルアップの祝いの部品。いまの生徒のアバターが飛び跳ねる画像と吹き出し。
  // プロフィールが取れないときは、今までどおり先生のマスコットにする（mascot が作る SVG 文字列）。
  // ジャンプの画像が読みこめなかったときは、1 回だけ、ふつうのアバターの画像に差しかえる。
  function levelupFigure(profile, message, teacher) {
    if (!profile) {
      const box = el('div');
      box.innerHTML = RQ.mascot.celebrateMarkup(message, teacher);
      return box.firstElementChild;
    }
    const a = avatarOf(profile.avatar);
    const img = el('img', { class: 'levelup-avatar', src: a.jump, alt: a.label, width: 320, height: 320, draggable: 'false' });
    const onError = () => {
      img.removeEventListener('error', onError);
      img.src = a.image;
    };
    img.addEventListener('error', onError);
    return el('div', { class: 'mascot-celebrate' }, [
      img,
      el('p', { class: 'mascot-bubble', text: message }),
    ]);
  }

  // 経験値の種類の名前（結果画面の内訳。並びもこの順）
  const XP_LABEL = {
    answer: '答えた',
    correct: '正解',
    firstTry: '1回目で正解',
    retryCorrect: '復習で正解',
    learnback: '学び直し',
    lessonRead: '解説を読んだ',
    stageClear: 'ステージクリア',
    daily: '今日の学習',
  };

  function sessionStep(session) {
    return session && Array.isArray(session.queue) ? session.queue[session.index] || null : null;
  }

  function stageTitleOf(ctx, stageId) {
    const stage = stageId ? ctx.reg.stage(stageId) : null;
    return stage ? stage.title : '';
  }

  // 画面の上: 何の学習か（左）と「やめる」（右）
  function learnBar(ctx, title) {
    return el('div', { class: 'learn-bar' }, [
      el('p', { class: 'learn-title', text: title }),
      button('やめる', () => ctx.app.stopSession(), 'btn-quiet'),
    ]);
  }

  // そのセッションの単元の担当の先生（復習は概念から、ステージはステージから単元を引く）
  function sessionMascot(ctx, session) {
    const unit = session && session.kind === 'review' ? ctx.reg.unitOfConcept(session.conceptId) : ctx.reg.unitOfStage(session && session.stageId);
    return RQ.mascot.forUnit(unit);
  }

  function sessionTitle(ctx, session) {
    if (session.kind === 'review') {
      const c = ctx.reg.concept(session.conceptId);
      return '復習: ' + (c ? c.title : '');
    }
    return stageTitleOf(ctx, session.stageId);
  }

  // **語句** 記法の文を段落にする（用語は strong.term。innerHTML は使わず、テキストノードで入れる）
  function richParagraph(className, text) {
    const p = el('p', { class: className });
    RQ.richtext.parse(text).forEach((part) => {
      p.append(part.term ? el('strong', { class: 'term', text: part.text }) : document.createTextNode(part.text));
    });
    return p;
  }

  // 解説カードの図: anim（動く図の種類）があり anim.js が使えれば動く図、なければ静止図（figure）
  // 動く図は要素が画面から外れると自分で止まる（anim.js）
  function lessonFigure(card) {
    const anim = RQ.anim;
    if (typeof card.anim === 'string' && anim && anim.KINDS.includes(card.anim)) {
      const a = anim.create(card.anim);
      if (!anim.prefersReducedMotion()) a.start();
      return a.element;
    }
    return card.figure ? svgBox(RQ.figures.sceneSvg(card.figure), 'figure-box') : null;
  }

  // 解説カードの中身（図、文、カードに出てきた大切な言葉の一覧）
  function lessonCardBody(card) {
    const children = [];
    const figure = lessonFigure(card);
    if (figure) children.push(figure);
    children.push(richParagraph('lesson-text', card.text));
    const terms = RQ.richtext.terms(card.text);
    if (terms.length > 0) {
      children.push(el('div', { class: 'term-list' }, [
        el('span', { class: 'term-list-label', text: '大切な言葉' }),
      ].concat(terms.map((t) => el('span', { class: 'term-chip', text: t })))));
    }
    return children;
  }

  // 「解説を見る」で開く解説のステージ: ステージの warmup・main・retry はそのステージ、
  // check 問題と復習は、表示中の問題の概念の lessonStageId
  function lessonStageForProblem(ctx, session, problem, phase) {
    if (session.kind === 'stage' && phase !== 'check') return session.stageId;
    const concept = problem ? ctx.reg.concept(problem.concept) : null;
    return concept ? concept.lessonStageId : session.stageId;
  }

  // 解説のモーダル（進行は変えない。lessonRead も出さない）
  function openLessonDialog(ctx, stageId) {
    const stage = stageId ? ctx.reg.stage(stageId) : null;
    const dialog = document.getElementById('lesson-dialog');
    if (!dialog || !stage) return;
    document.getElementById('lesson-dialog-title').textContent = '解説: ' + stage.title;
    const body = document.getElementById('lesson-dialog-body');
    body.replaceChildren();
    (stage.lessons || []).forEach((c, i) => {
      body.append(card([
        el('p', { class: 'muted', text: (i + 1) + ' / ' + stage.lessons.length }),
      ].concat(lessonCardBody(c)), 'lesson-card'));
    });
    body.scrollTop = 0;
    // 閉じたら中身を外す（動く図のループを止める。「閉じる」ボタン・Esc のどちらで閉じても close が来る）
    dialog.onclose = () => body.replaceChildren();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.getElementById('lesson-dialog-close').focus();
  }

  function closeLessonDialog() {
    const dialog = document.getElementById('lesson-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    const body = document.getElementById('lesson-dialog-body');
    if (body) body.replaceChildren();
  }

  // ---- 解説カード ----

  function renderLesson(section, ctx) {
    const session = ctx.state.session;
    const view = RQ.session.current(session, ctx.reg);
    const step = sessionStep(session);
    const lessonStageId = step && step.lessonStageId;
    const isOwn = lessonStageId === session.stageId;
    section.append(learnBar(ctx, (isOwn ? '解説: ' : '学び直し: ') + stageTitleOf(ctx, lessonStageId)));

    const after = session.queue[session.index + 1];
    const isLast = view.index === view.total - 1;
    const nextLabel = isLast && after && after.kind === 'warmup' ? '予想してみよう' : '次へ';
    const nextBtn = button(nextLabel, () => ctx.app.next(), 'btn-primary btn-block');

    section.append(card([
      el('p', { class: 'card-count', text: (view.index + 1) + ' / ' + view.total }),
    ].concat(lessonCardBody(view.card)), 'lesson-card'));
    section.append(nextBtn);
    nextBtn.focus({ preventScroll: true });
    // 別の画面へ移るとき、隠れた画面に動く図が残って動き続けないよう、中身を外す
    return () => section.replaceChildren();
  }

  // ---- 問題とフィードバック ----

  // answered: 解答済み（フィードバック表示中）なら、いま答えた問題の番号を出す
  function phaseLabel(ctx, session, phase, answered) {
    if (phase === 'warmup') return '予想';
    if (phase === 'retry') return '類題';
    if (phase === 'check') {
      const lb = session.learnback;
      const basic = lb ? ctx.reg.concept(lb.basicId) : null;
      return '確認問題' + (basic ? '（' + basic.title + '）' : '');
    }
    if (phase === 'review') {
      const done = (session.results.review || []).length;
      const total = session.queue.filter((s) => s.phase === 'review').length;
      return '復習 ' + Math.min(answered ? done : done + 1, total) + ' / ' + total;
    }
    const stage = ctx.reg.stage(session.stageId);
    const total = stage ? (stage.problems || []).length : 0;
    const done = (session.results.main || []).length;
    return '問題 ' + Math.min(answered ? done : done + 1, total) + ' / ' + total;
  }

  function feedbackPanel(ctx, correct, feedback, phase) {
    const fb = feedback || {};
    const panel = el('div', { class: 'card feedback ' + (correct ? 'is-ok' : 'is-warn'), role: 'status', tabindex: '-1' }, [
      el('p', { class: 'feedback-head', text: correct ? '正解！' : 'おしい' }),
      !correct ? el('p', { class: 'feedback-sub', text: 'ここを見直そう' }) : null,
      fb.explanation ? richParagraph('feedback-text', fb.explanation) : null,
      !correct && fb.hint ? el('p', { class: 'feedback-hint' }, [el('strong', { text: 'ヒント: ' }), fb.hint]) : null,
      phase === 'warmup' ? el('p', { class: 'muted', text: '予想は経験値に関係しません。' }) : null,
    ]);
    const nextBtn = button('次へ', () => ctx.app.next(), 'btn-primary btn-block');
    panel.append(nextBtn);
    return { panel, nextBtn };
  }

  function renderProblem(section, ctx) {
    const session = ctx.state.session;
    const view = RQ.session.current(session, ctx.reg);
    const problem = view.problem;
    const phase = view.phase;
    section.append(learnBar(ctx, sessionTitle(ctx, session)));

    const lessonStageId = lessonStageForProblem(ctx, session, problem, phase);
    section.append(el('div', { class: 'problem-head' }, [
      el('span', { class: 'tag phase-tag phase-' + phase, text: phaseLabel(ctx, session, phase, view.kind === 'feedback') }),
      lessonStageId ? button('解説を見る', () => openLessonDialog(ctx, lessonStageId), 'btn-quiet') : null,
    ]));

    const body = el('div', { class: 'card problem-card' }, [el('p', { class: 'prompt', text: problem.prompt })]);
    section.append(body);

    function showFeedback(correct, feedback) {
      const f = feedbackPanel(ctx, correct, feedback, phase);
      section.append(f.panel);
      f.panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      f.nextBtn.focus({ preventScroll: true });
    }

    if (view.kind === 'feedback') {
      // 解答済み（再読み込みで戻ってきたときなど）: 図だけを見せてフィードバックへ
      const fig = RQ.ui.problems.staticFigure(problem);
      if (fig) body.append(fig);
      showFeedback(view.correct, view.feedback);
      return closeLessonDialog;
    }

    RQ.ui.problems.render(body, problem, (value) => {
      const r = ctx.app.answer(value);
      if (!r || r.invalid) return { invalid: true };
      showFeedback(r.correct, r.feedback);
      return r;
    }, { config: ctx.config });
    return closeLessonDialog;
  }

  // ---- 学び直しの提案 ----

  function renderOffer(section, ctx) {
    const session = ctx.state.session;
    const view = RQ.session.current(session, ctx.reg);
    const concept = view.concept || {};
    const basic = view.basic || {};
    section.append(learnBar(ctx, sessionTitle(ctx, session)));
    section.append(el('div', { class: 'hero offer-hero' }, [
      svgBox(RQ.mascot.svg(88, sessionMascot(ctx, session)), 'mascot-box'),
      el('div', { class: 'hero-text' }, [
        el('h1', { text: basic.title + 'に戻って確かめよう' }),
        el('p', { text: '「' + concept.title + '」で 2 回続けておしかったね。' }),
      ]),
    ]));
    section.append(card([
      el('p', { text: '「' + basic.title + '」の確認問題を ' + ctx.config.learnback.checkCount + ' 問だけ解いてから、続きに戻ります。' }),
      el('p', { class: 'muted', text: '「あとで」を選ぶと、このまま続きに進みます。' }),
    ]));
    section.append(el('div', { class: 'stack' }, [
      button('戻る', () => ctx.app.choose('accept'), 'btn-primary btn-block'),
      button('あとで', () => ctx.app.choose('later'), 'btn-block'),
    ]));
  }

  // ---- 結果 ----

  // この学習でついた経験値（xpLog の、学習を始めてからの分。ステージの学習はそのステージの分だけ）
  function sessionXpEntries(rec, session) {
    const start = Date.parse(session.startedAt);
    const stageId = session.kind === 'stage' ? session.stageId : null;
    return (rec.xpLog || []).filter((e) => {
      const at = Date.parse(e.at);
      if (!(at >= start)) return false;
      return (e.stageId === undefined || e.stageId === null ? null : e.stageId) === stageId;
    });
  }

  function xpBreakdown(entries) {
    const groups = {};
    entries.forEach((e) => {
      const g = groups[e.kind] || (groups[e.kind] = { count: 0, amount: 0 });
      g.count += 1;
      g.amount += e.amount;
    });
    const kinds = Object.keys(XP_LABEL).filter((k) => groups[k]).concat(Object.keys(groups).filter((k) => !XP_LABEL[k]));
    return kinds.map((k) => ({ kind: k, label: XP_LABEL[k] || k, count: groups[k].count, amount: groups[k].amount }));
  }

  function renderResult(section, ctx) {
    const result = ctx.state.lastResult;
    const session = result.session;
    const sum = result.summary;
    const rec = ctx.record;
    const stopped = sum.ended === 'stopped';
    const isStage = session.kind === 'stage';

    const entries = sessionXpEntries(rec, session);
    const gained = entries.reduce((a, e) => a + e.amount, 0);
    const levelAfter = rec.level;
    const levelBefore = RQ.xp.levelFor(rec.xp - gained, ctx.config);

    // 見出しとマスコット
    const heading = stopped ? '今日はここまで。明日また挑戦しよう'
      : isStage ? 'ステージクリア！' : '復習おつかれさま！';
    const say = stopped ? 'よくがんばったね。続きはまた明日！'
      : sum.firstTryCount === sum.mainCount && sum.mainCount > 0 ? '全部 1 回目で正解！すごい！' : 'よくがんばったね！';
    const teacher = sessionMascot(ctx, session);
    section.append(el('div', { class: 'hero' }, [
      svgBox(RQ.mascot.svg(96, teacher), 'mascot-box'),
      el('div', { class: 'hero-text' }, [
        el('h1', { text: heading }),
        el('p', { text: teacher.name + '「' + say + '」' }),
      ]),
    ]));

    // できたこと
    const done = [cardTitle('できたこと')];
    if (isStage) {
      done.push(el('p', { class: 'muted', text: stageTitleOf(ctx, session.stageId) }));
      done.push(el('p', { class: 'result-big' }, [
        '1 回目で正解 ', el('strong', { text: sum.firstTryCount + ' / ' + sum.mainCount }), ' 問',
      ]));
      if (!stopped) done.push(el('div', { class: 'row' }, [el('span', { text: '星' }), starsView(sum.stars)]));
      else done.push(el('p', { class: 'muted', text: 'このステージは「途中」のまま。次はもう一度、最初から挑戦しよう。' }));
    } else {
      const rs = session.results.review || [];
      done.push(el('p', { class: 'result-big' }, ['正解 ', el('strong', { text: rs.filter((r) => r.correct).length + ' / ' + rs.length }), ' 問']));
    }
    section.append(card(done));

    // 新しいバッジ（学習の途中で取ったものも含めて、まだ見せていないもの）。表示したら「見た」にする
    const newBadges = (result.newBadges || []).map((id) => RQ.badges.def(id)).filter(Boolean);
    if (newBadges.length > 0) {
      section.append(card([
        cardTitle('新しいバッジ！'),
        el('ul', { class: 'badge-new-list' }, newBadges.map((d) => el('li', { class: 'badge-item' }, [
          badgeMedal(d, true, 64),
          el('div', { class: 'badge-text' }, [
            el('span', { class: 'badge-title', text: d.title }),
            el('span', { class: 'badge-sub', text: d.description }),
          ]),
        ]))),
      ], 'badge-new'));
      if (!ctx.markBadgesSeen(newBadges.map((d) => d.id))) reportSave(ctx, false, null);
    }

    // 効果音: レベルが上がったら levelup、上がらず新しいバッジがあれば badge（両方でも 1 回。同じ結果では描き直しても鳴らさない）
    if (!result.sfxPlayed) {
      result.sfxPlayed = true;
      if (levelAfter > levelBefore) playSfx('levelup');
      else if (newBadges.length > 0) playSfx('badge');
    }

    // 復習で伸びたこと
    const improved = (sum.improvedConcepts || []).map((id) => ctx.reg.concept(id)).filter(Boolean);
    section.append(card([
      cardTitle('復習で伸びたこと'),
      improved.length > 0
        ? el('ul', { class: 'concept-list' }, improved.map((c) => el('li', { text: c.title })))
        : el('p', { class: 'muted', text: '次は復習で伸ばそう' }),
    ]));

    // 獲得した経験値の内訳
    const rows = xpBreakdown(entries);
    const table = el('table', { class: 'xp-table' }, [
      el('tbody', {}, rows.map((r) => el('tr', {}, [
        el('th', { scope: 'row', text: r.label }),
        el('td', { class: 'xp-count', text: r.count > 1 ? '×' + r.count : '' }),
        el('td', { class: 'xp-amount', text: '+' + r.amount }),
      ]))),
      el('tfoot', {}, el('tr', {}, [
        el('th', { scope: 'row', text: '合計' }), el('td', {}), el('td', { class: 'xp-amount', text: '+' + gained + ' XP' }),
      ])),
    ]);
    section.append(card([
      cardTitle('獲得した経験値'),
      rows.length > 0 ? table : el('p', { class: 'muted', text: '今回の経験値はありません。' }),
      session.xpMultiplier < 1 ? el('p', { class: 'muted', text: 'もう一度の挑戦なので、経験値は半分です。' }) : null,
      el('p', { class: 'level-change' }, levelAfter > levelBefore
        ? ['レベル ', el('strong', { text: 'Lv ' + levelBefore + ' → Lv ' + levelAfter }), ' にアップ！']
        : ['レベル ', el('strong', { text: 'Lv ' + levelAfter }), '（あと ' + Math.max(0, RQ.xp.nextLevelXp(levelAfter, ctx.config) - rec.xp) + ' XP で Lv ' + (levelAfter + 1) + '）']),
    ]));

    // 次のおすすめ
    const next = [cardTitle('次のおすすめ')];
    const suggested = sum.suggestedConcept ? ctx.reg.concept(sum.suggestedConcept) : null;
    if (suggested) {
      next.push(el('p', { text: suggested.title + 'を確かめるのがおすすめ' }));
      next.push(button(suggested.title + 'を復習する', () => ctx.go('problem', { review: suggested.id }), 'btn-block'));
    }
    const nextStage = isStage && !stopped ? ctx.reg.nextStage(session.stageId) : null;
    const canNext = nextStage && RQ.recommend.isUnlocked(ctx.reg, rec, nextStage.id);
    if (stopped && isStage) next.push(el('p', { text: '明日、もう一度「' + stageTitleOf(ctx, session.stageId) + '」に挑戦しよう。' }));
    else if (canNext) {
      // 次のステージが free の領域（ミニプリント）なら、もともと開いているので「挑戦してみよう」にする
      const nextArea = areaOfStage(ctx.reg.unitOfStage(nextStage.id), nextStage.id);
      const text = nextArea && nextArea.free === true
        ? '次は「' + nextStage.title + '」にも挑戦してみよう。'
        : '次のステージ「' + nextStage.title + '」が開いたよ。';
      next.push(el('p', { text }));
    }
    else if (!suggested) next.push(el('p', { class: 'muted', text: '学習マップから、好きなステージを選ぼう。' }));
    section.append(card(next));

    const buttons = el('div', { class: 'stack' });
    if (canNext) buttons.append(button('次のステージへ', () => ctx.go('stage', { stageId: nextStage.id }), 'btn-primary btn-block'));
    buttons.append(button('ホームへ', () => ctx.go('home'), 'btn-block' + (canNext ? '' : ' btn-primary')));
    buttons.append(button('マップへ', () => ctx.go('map'), 'btn-block'));
    section.append(buttons);

    // レベルアップの祝い（2 秒。タップで消える）。一度見せたら同じ結果では出さない
    let timer = null;
    let overlay = null;
    if (levelAfter > levelBefore && !result.celebrated) {
      result.celebrated = true;
      overlay = el('div', { class: 'levelup-overlay', role: 'dialog', 'aria-label': 'レベルアップ', tabindex: '-1' });
      overlay.append(levelupFigure(currentProfile(ctx.store), 'レベル ' + levelAfter + ' になった！', teacher));
      overlay.append(el('p', { class: 'levelup-skip', text: 'タップでとじる' }));
      const close = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        if (overlay) overlay.remove();
        overlay = null;
      };
      overlay.addEventListener('click', close);
      overlay.addEventListener('keydown', close);
      document.body.append(overlay);
      overlay.focus({ preventScroll: true });
      timer = setTimeout(close, LEVELUP_MS);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (overlay) overlay.remove();
    };
  }

  // ---- 記録 ----
  // 進捗（単元ごと・領域ごとのクリア数）、理解度の目安（単元ごと。経験値とは別のカード）、経験値とレベル、
  // 連続学習、バッジ、取り組み履歴。教材のある単元はすべて出す。履歴は長くなるので一番下に置く。

  function renderRecord(section, ctx) {
    const rec = ctx.record;
    const readyItems = RQ.units.list(ctx.reg, ctx.curriculum).filter((x) => x.ready);
    const now = ctx.now();
    const today = RQ.xp.localDate(now);
    section.append(topBar('記録', 'ホーム', () => ctx.go('home')));
    section.append(progressCard(ctx, rec, readyItems));
    readyItems.forEach((item) => section.append(masteryCard(ctx, rec, item.unit, item.title)));
    section.append(levelCard(ctx, rec, '経験値とレベル'));
    section.append(streakCard(rec, now, today));
    section.append(badgeListCard(rec));
    section.append(historyCard(ctx, rec, now));
    section.append(button('ホームへ', () => ctx.go('home'), 'btn-block'));
  }

  // 進捗: 単元ごとに見出しを置き、領域ごとに「クリア n / N ステージ」と小さなバー。ステージのない領域は「準備中」
  function progressCard(ctx, rec, readyItems) {
    const children = [cardTitle('進捗')];
    if (readyItems.length === 0) {
      children.push(el('p', { text: '教材が読み込まれていません。' }));
      return card(children);
    }
    readyItems.forEach((item) => {
      children.push(el('h3', { class: 'progress-unit', text: item.title }));
      children.push(progressList(rec, item.unit));
    });
    return card(children);
  }

  // 1 つの単元の領域の行
  function progressList(rec, unit) {
    const list = el('ul', { class: 'progress-list' });
    areasInOrder(unit).forEach((area) => {
      const stages = (area.stages || []).filter(Boolean);
      if (stages.length === 0) {
        list.append(el('li', { class: 'progress-row is-soon' }, [
          el('span', { class: 'progress-name', text: area.title }),
          el('span', { class: 'muted', text: '準備中' }),
        ]));
        return;
      }
      const cleared = stages.filter((s) => RQ.record.stageState(rec, s.id).status === 'cleared').length;
      const percent = Math.round((cleared / stages.length) * 100);
      const bar = el('div', {
        class: 'progress-bar', role: 'progressbar', 'aria-label': area.title + 'のクリア',
        'aria-valuemin': 0, 'aria-valuemax': stages.length, 'aria-valuenow': cleared,
      }, el('div', { class: 'progress-bar-fill' }));
      bar.firstChild.style.width = percent + '%';
      list.append(el('li', { class: 'progress-row' + (cleared === stages.length ? ' is-complete' : '') }, [
        el('div', { class: 'progress-head' }, [
          el('span', { class: 'progress-name', text: area.title }),
          el('span', { class: 'progress-count', text: 'クリア ' + cleared + ' / ' + stages.length + ' ステージ' }),
        ]),
        bar,
      ]));
    });
    return list;
  }

  // 理解度の目安（単元 1 つ分）: 概念ごとに 3 段階（config.mastery.labels の順）。一度も取り組んでいなければ灰色で「未学習」
  function masteryCard(ctx, rec, unit, title) {
    const steps = ctx.config.mastery.labels.map((l) => l[1]);
    const list = el('ul', { class: 'mastery-list' });
    (unit.concepts || []).filter(Boolean).forEach((concept) => {
      const learned = !!(rec.mastery && rec.mastery[concept.id]);
      const label = RQ.mastery.label(RQ.record.masteryOf(rec, concept.id), ctx.config);
      const level = Math.max(0, steps.indexOf(label));
      const chip = el('span', {
        class: 'mastery-chip' + (learned ? ' level-' + level : ' is-unlearned'),
        role: 'img',
        'aria-label': concept.title + 'の理解のめやす: ' + label + (learned ? '' : '（未学習）'),
      });
      steps.forEach((name, i) => {
        chip.append(el('span', { class: 'mastery-step' + (i === level ? ' is-current' : ''), 'aria-hidden': 'true', text: name }));
      });
      list.append(el('li', { class: 'mastery-row' + (learned ? '' : ' is-unlearned') }, [
        el('span', { class: 'mastery-name' }, [
          concept.title,
          learned ? null : el('span', { class: 'mastery-note', text: '未学習' }),
        ]),
        chip,
      ]));
    });
    return card([
      cardTitle('理解度の目安（' + title + '）'),
      el('p', { class: 'muted', text: 'これは理解のめやす。経験値とは別です' }),
      list,
    ], 'mastery-card');
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // 'YYYY-MM-DD' → 「11月4日（水）」。今日・きのうはそう添える
  function dateHeading(ymd, today) {
    const d = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));
    const text = (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEKDAYS[(d.getDay() + 6) % 7] + '）';
    const diff = RQ.xp.daysBetween(ymd, today);
    if (diff === 0) return '今日 ' + text;
    if (diff === 1) return 'きのう ' + text;
    return text;
  }

  // 履歴 1 件の題名: ステージ名、復習なら「復習: 概念名」
  function historyTitle(ctx, h) {
    if (h.phase === 'review' || !h.stageId) {
      const c = h.conceptId ? ctx.reg.concept(h.conceptId) : null;
      return '復習: ' + (c ? c.title : '（見つからない内容）');
    }
    const s = ctx.reg.stage(h.stageId);
    return s ? s.title : '（見つからないステージ）';
  }

  const HISTORY_PHASE_LABEL = { retry: '類題', check: '確認問題', live: 'ライブクイズ' };

  // 取り組み履歴: 新しい順に HISTORY_LIMIT 件。日付ごとに見出しをつける
  function historyCard(ctx, rec, now) {
    const today = RQ.xp.localDate(now);
    const entries = (rec.history || [])
      .filter((h) => h && h.at && !Number.isNaN(new Date(h.at).getTime()))
      .map((h, i) => ({ h, i, t: new Date(h.at).getTime() }))
      .sort((a, b) => b.t - a.t || b.i - a.i)   // 新しい順（同じ時刻なら後に入ったもの）
      .slice(0, HISTORY_LIMIT)
      .map((x) => x.h);
    const children = [cardTitle('取り組み履歴')];
    if (entries.length === 0) {
      children.push(el('p', { class: 'muted', text: 'まだ取り組んだ記録がありません。' }));
      return card(children);
    }
    const truncated = (rec.history || []).length > entries.length;
    children.push(el('p', { class: 'muted', text: truncated ? '最近の ' + entries.length + ' 件（新しい順）' : '新しい順に ' + entries.length + ' 件' }));
    let list = null;
    let currentDate = null;
    entries.forEach((h) => {
      const at = new Date(h.at);
      const date = RQ.xp.localDate(at);
      if (date !== currentDate) {
        currentDate = date;
        children.push(el('h3', { class: 'history-date', 'data-no-ruby': true, text: dateHeading(date, today) }));   // 日付の漢字（月・日・曜日）にふりがなを付けない
        list = el('ol', { class: 'history-list' });
        children.push(list);
      }
      let result;
      if (h.phase === 'warmup') result = el('span', { class: 'tag', text: '予想' });
      else if (h.correct) result = el('span', { class: 'tag tag-ok', text: '正解' });
      else result = el('span', { class: 'tag tag-warn', text: 'おしい' });
      const phase = HISTORY_PHASE_LABEL[h.phase];
      list.append(el('li', { class: 'history-row' }, [
        el('time', { class: 'history-time', datetime: h.at, text: pad2(at.getHours()) + ':' + pad2(at.getMinutes()) }),
        el('span', { class: 'history-title' }, [
          historyTitle(ctx, h),
          phase ? el('span', { class: 'history-phase', text: phase }) : null,
        ]),
        result,
      ]));
    });
    return card(children, 'history-card');
  }

  const screens = {
    profile: renderProfile,
    home: renderHome,
    units: renderUnits,
    map: renderMap,
    stage: renderStage,
    settings: renderSettings,
    lesson: renderLesson,
    problem: renderProblem,
    offer: renderOffer,
    result: renderResult,
    record: renderRecord,
  };

  const helpers = {
    el, append, svgBox, button, card, cardTitle, topBar, avatarOf, avatarBadge, starsView, statusTag,
    currentProfile, areasInOrder, areaOfStage, weekDates, downloadText, confirm: confirmDialog,
    openLessonDialog, closeLessonDialog, sessionXpEntries, xpBreakdown,
    progressList, masteryCard,   // 先生用の確認画面（ui-teacher.js）でも使う
    badgeMedal,
    AVATARS, STATUS_LABEL, XP_LABEL,
  };

  const api = {
    screens, helpers,
    // 実装計画の名前でも呼べるようにする
    renderProfile, renderHome, renderUnits, renderMap, renderSettings,
    renderStageEntry: (section, ctx, stageId) => renderStage(section, ctx, { stageId }),
    renderLesson, renderProblem, renderOffer, renderResult, renderRecord,
  };

  // 先に読み込んだ ui-problems.js（RikaQuest.ui.problems）を残したまま足す
  root.RikaQuest = Object.assign(root.RikaQuest || {}, { ui: Object.assign((root.RikaQuest && root.RikaQuest.ui) || {}, api) });
})(typeof globalThis !== 'undefined' ? globalThis : this);
