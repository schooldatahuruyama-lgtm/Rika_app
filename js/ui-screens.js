// 各画面の描画（プロフィール、ホーム、学習マップ、ステージ入口、設定）
// ブラウザ専用。RikaQuest.ui = { screens, helpers } を作る。
// 画面の描画関数はすべて screens[name](section, ctx, params) の形。app.go が section を空にしてから呼ぶ。
//   ctx = { store, record, reg, config, go, save, now, message, setRecord, replaceStore, confirm, clearAll, state, app }
//   （store・record は getter で、いつも最新の値を返す）
// 描画関数が関数を返すと、次に別の画面へ移るときに app がそれを呼ぶ（後片付け用）。
// 利用者の文字はすべて textContent で入れる。innerHTML は figures・mascot が返す SVG 文字列だけに使う。
// Task 12 は lesson・problem・offer・result を、Task 13 は record を、screens に上書きで登録する。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const UNIT_ID = 'light';
  const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
  const STATUS_LABEL = { none: '未着手', inprogress: '途中', cleared: 'クリア' };

  // アバター 6 種（id を profile.avatar に保存する。背景色は CSS の .avatar-<id>）
  const AVATARS = [
    { id: 'fox', emoji: '🦊', label: 'キツネ' },
    { id: 'cat', emoji: '🐱', label: 'ネコ' },
    { id: 'dog', emoji: '🐶', label: 'イヌ' },
    { id: 'panda', emoji: '🐼', label: 'パンダ' },
    { id: 'frog', emoji: '🐸', label: 'カエル' },
    { id: 'penguin', emoji: '🐧', label: 'ペンギン' },
  ];

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
    return el('span', { class: 'avatar avatar-' + a.id + (small ? ' avatar-small' : ''), 'aria-hidden': 'true', text: a.emoji });
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

  function areasInOrder(unit) {
    return (unit && Array.isArray(unit.areas) ? unit.areas.filter(Boolean) : []).slice().sort((a, b) => a.order - b.order);
  }

  function areaOfStage(unit, stageId) {
    return areasInOrder(unit).find((a) => (a.stages || []).some((s) => s && s.id === stageId)) || null;
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
  function confirmDialog(text, okLabel) {
    const dialog = document.getElementById('confirm-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(root.confirm(text));
    }
    document.getElementById('confirm-text').textContent = text;
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
          el('span', { class: 'profile-name', text: p.nickname }),
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
        el('p', { class: 'caution', text: '記録はこの端末のブラウザ内にだけ保存され、消えることがあります。' }),
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

    // あいさつとマスコット
    section.append(el('div', { class: 'hero' }, [
      svgBox(RQ.mascot.svg(96), 'mascot-box'),
      el('div', { class: 'hero-text' }, [
        el('h1', { text: 'こんにちは、' + profile.nickname + 'さん！' }),
        el('p', { text: RQ.mascot.NAME + '「今日も光の世界を探検しよう」' }),
      ]),
    ]));

    section.append(questCard(ctx, rec, now));
    section.append(levelCard(ctx, rec));
    section.append(streakCard(rec, now, today));

    section.append(el('div', { class: 'stack' }, [
      button('学習マップへ', () => ctx.go('map'), 'btn-primary btn-block'),
      button('記録を見る', () => ctx.go('record'), 'btn-block'),
    ]));

    section.append(card([
      cardTitle('班の協力チャレンジ（準備中）'),
      el('p', { text: '班のみんなで力を合わせるチャレンジです。今はまだ使えません。' }),
    ], 'is-disabled'));

    section.append(button('設定', () => ctx.go('settings'), 'btn-block'));
  }

  function questCard(ctx, rec, now) {
    const quest = RQ.recommend.todayQuest(ctx.reg, rec, UNIT_ID, now, ctx.config);
    const children = [cardTitle('今日のクエスト')];
    if (!quest) {
      children.push(el('p', { class: 'quest-title', text: '全部クリア！' }));
      children.push(el('p', { class: 'muted', text: '学習マップから、好きなステージにもう一度挑戦できます。' }));
      return card(children);
    }
    if (quest.kind === 'review') {
      children.push(el('p', { class: 'quest-title', text: quest.title }));
      children.push(el('p', { class: 'muted', text: '少しだけ問題を解いて、思い出そう。' }));
      children.push(button('復習する', () => ctx.go('problem', { review: quest.conceptId }), 'btn-primary btn-block'));
      return card(children);
    }
    const stage = ctx.reg.stage(quest.stageId);
    const area = areaOfStage(ctx.reg.unit(UNIT_ID), quest.stageId);
    if (area) children.push(el('p', { class: 'muted', text: area.title }));
    children.push(el('p', { class: 'quest-title', text: quest.title }));
    if (stage) children.push(el('p', { class: 'muted', text: '約 ' + stage.minutes + ' 分' }));
    children.push(button(quest.resume ? '続きから' : 'はじめる', () => ctx.go('stage', { stageId: quest.stageId }), 'btn-primary btn-block'));
    return card(children);
  }

  function levelCard(ctx, rec) {
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
      cardTitle('レベルと経験値'),
      el('div', { class: 'level-row' }, [
        el('span', { class: 'level-num', text: 'Lv ' + level }),
        el('span', { text: total + ' / ' + next + ' XP' }),
      ]),
      bar,
      el('p', { class: 'muted', text: 'あと ' + Math.max(0, next - total) + ' XP で Lv ' + (level + 1) }),
    ]);
  }

  function streakCard(rec, now, today) {
    const streak = rec.streak || {};
    const alive = streak.lastDate ? RQ.xp.daysBetween(streak.lastDate, today) <= 1 : false;
    const count = alive ? streak.count || 0 : 0;
    const studied = new Set((rec.history || []).map((h) => RQ.xp.localDate(h.at)));
    const dots = el('ol', { class: 'week-dots', 'aria-label': '今週学習した日' });
    weekDates(now).forEach((date, i) => {
      const done = studied.has(date);
      const isToday = date === today;
      dots.append(el('li', {
        class: 'week-day' + (done ? ' is-done' : '') + (isToday ? ' is-today' : ''),
        'aria-label': WEEKDAYS[i] + '曜日' + (isToday ? '（今日）' : '') + (done ? ' 学習した' : ' まだ'),
      }, [
        el('span', { class: 'week-dot', 'aria-hidden': 'true', text: done ? '✓' : '' }),
        el('span', { 'aria-hidden': 'true', text: WEEKDAYS[i] }),
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

  // ---- 学習マップ ----

  function renderMap(section, ctx) {
    const unit = ctx.reg.unit(UNIT_ID);
    const rec = ctx.record;
    section.append(topBar('学習マップ', 'ホーム', () => ctx.go('home')));
    if (!unit) {
      section.append(card(el('p', { text: '教材が読み込まれていません。' })));
      return;
    }
    section.append(el('p', { class: 'muted', text: unit.title + '　どの領域から始めてもよいよ。領域の中は順番に開きます。' }));

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
    const area = areaOfStage(ctx.reg.unit(UNIT_ID), stage.id);
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

  // 保存の結果をお知らせにする。失敗したら成功の文は出さない
  function reportSave(ctx, ok, successText) {
    if (ok) {
      if (successText) ctx.message(successText, 'ok');
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
        el('span', { class: 'profile-name', text: p.nickname }),
        isCurrent ? el('span', { class: 'tag', text: '使用中' }) : button('切り替え', () => {
          store.currentProfileId = p.id;
          const saved = ctx.save();
          ctx.go('settings');
          reportSave(ctx, saved, p.nickname + ' に切り替えました。');
        }),
        button('削除', async () => {
          const ok = await ctx.confirm('「' + p.nickname + '」の記録をすべて削除します。元に戻せません。よろしいですか？', '削除する');
          if (!ok) return;
          RQ.record.deleteProfile(ctx.store, p.id);
          const saved = ctx.save();
          ctx.go(ctx.store.profiles.length > 0 ? 'settings' : 'profile');
          reportSave(ctx, saved, '「' + p.nickname + '」を削除しました。');
        }, 'btn-danger'),
      ]));
    });
    section.append(card([
      cardTitle('プロフィール'),
      store.profiles.length > 0 ? list : el('p', { class: 'muted', text: 'まだプロフィールがありません。' }),
      button('新しいプロフィールを作る', () => ctx.go('profile'), 'btn-block', { style: 'margin-top:12px' }),
    ]));

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

    section.append(card([cardTitle('記録の保存について'), el('p', { class: 'caution', text: DATA_LOSS_NOTICE })]));

    // オフライン教材の状態（Task 14 で中身を作る。id="offline-status" を差しかえる）
    section.append(card([
      cardTitle('オフラインで使える教材'),
      el('div', { id: 'offline-status' }, [
        el('p', { text: 'オフライン対応: 準備中' }),
        el('p', { class: 'muted', text: '未対応（Task 14 で実装）' }),
      ]),
    ]));

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

  // ---- まだ作っていない画面（Task 12・13 が置きかえる） ----

  function placeholder(title) {
    return function (section, ctx) {
      section.append(topBar(title, 'ホーム', () => ctx.go('home')));
      section.append(card([
        el('p', { class: 'quest-title', text: '準備中' }),
        el('p', { class: 'muted', text: 'この画面はまだ作っています。' }),
      ], 'placeholder'));
    };
  }

  const screens = {
    profile: renderProfile,
    home: renderHome,
    map: renderMap,
    stage: renderStage,
    settings: renderSettings,
    lesson: placeholder('解説'),
    problem: placeholder('問題'),
    offer: placeholder('学び直し'),
    result: placeholder('結果'),
    record: placeholder('記録'),
  };

  const helpers = {
    el, append, svgBox, button, card, cardTitle, topBar, avatarOf, avatarBadge, starsView, statusTag,
    currentProfile, areasInOrder, areaOfStage, weekDates, downloadText, confirm: confirmDialog,
    AVATARS, STATUS_LABEL, UNIT_ID,
  };

  const api = {
    screens, helpers,
    // 実装計画の名前でも呼べるようにする
    renderProfile, renderHome, renderMap, renderSettings,
    renderStageEntry: (section, ctx, stageId) => renderStage(section, ctx, { stageId }),
  };

  root.RikaQuest = Object.assign(root.RikaQuest || {}, { ui: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
