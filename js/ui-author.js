// 先生画面の「教材を作る（AI）」（ブラウザ専用。ui-teacher.js の後に読み込む）。RikaQuest.ui.screens.author を足す。設計書 13 章。
// 入力 → 生成（Claude API か、指示文をチャットに貼る道）→ 編集 → この端末でためす → 書き出し、を 1 画面で行う。
// ロジックは js/author.js（RikaQuest.author）、API の呼び出しは js/author-api.js（RikaQuest.authorApi）。
// 下書きの読み書き・ためす・API キーは ctx.author（js/app.js）を通す:
//   drafts() / saveDrafts(list) / setPreview(id, on) → { ok, errors } / apiKey() / setApiKey(key|null) / builtinIds()
// 開けるのは先生画面を解錠しているときだけ（ctx.state.teacherUnlocked。teacher ↔ author の行き来では消えない）。
// 利用者の文字はすべて textContent で入れる（innerHTML は使わない）。先生の画面なので、ふりがなは付けない（section に data-no-ruby）。
// 生成は画面を離れても続け、結果は下書きに保存する（画面がいまのものでなければ描かない。ui-teacher.js の renderSeq と同じ守り）。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const H = RQ.ui.helpers;
  const el = H.el;
  const button = H.button;
  const card = H.card;
  const cardTitle = H.cardTitle;

  // 読み込み順に頼らないよう、使うときに取る
  function A() { return RQ.author; }
  function API() { return RQ.authorApi; }

  const MODELS = [
    { value: 'claude-opus-5-5', label: 'claude-opus-5-5（既定）' },
    { value: 'claude-sonnet-5-5', label: 'claude-sonnet-5-5' },
  ];
  const GRADES = [1, 2, 3];
  const FIELDS = ['物理', '化学', '生物', '地学'];
  const STAGE_COUNTS = [2, 3, 4, 5, 6];
  const DEFAULT_STAGE_COUNT = 4;
  const MAX_BINARY = 10 * 1024 * 1024;   // PDF・画像は 1 本 10 MB まで
  const MAX_TEXT = 500 * 1024;           // テキストのプリントは下書き（localStorage）に入れるので 500 KB まで
  const ERROR_LIMIT = 60;                // 照合の一覧に出す件数
  const TYPE_LABEL = { choice: '選択', fill: '穴埋め', 'figure-choice': '図から選ぶ' };
  const STATUS_LABEL = { draft: '下書き', checked: '確認済み' };
  const KEY_NOTE = 'キーはこの端末のブラウザにだけ保存されます。プリントの中身はキーで Anthropic に送られます。';
  const SAVE_FAIL = '下書きを保存できませんでした（ブラウザの保存領域がいっぱいかもしれません）。';
  const PUBLISH_NOTE = '書き出した content/<id>.js を Claude Code（開発者）に渡すと、公開版に入ります。';
  const BUSY_NOTE = '生成中は編集できません（生成が終わるか、キャンセルしてから直してください）。';
  const IMPORT_BUSY = '生成中は読みこめません（生成が終わるか、キャンセルしてから読みこんでください）。';
  const REPLACED_NOTE = '下書きが置きかわったので、生成結果は入れませんでした。';

  function list(x) { return Array.isArray(x) ? x : []; }
  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

  // ---- 画面をまたいで持つ状態（ページを読み込み直すまで） ----

  let renderSeq = 0;
  let active = null;                  // いまの描画 { ctx, isCurrent, paint, show, refresh }
  let view = { mode: 'list', draftId: null };   // 'list' | 'new' | 'edit'
  let job = null;                     // 進んでいる生成 { draftId, label, chars, controller, textNode }
  const notes = new Map();            // 生成・読みこみの結果の文（その場に残す）。キー → { kind: 'ok'|'warn'|'error'|'info', lines }
  const memFiles = new Map();         // 下書き id → PDF・画像の添付（base64 は大きいので下書きに保存しない）
  const expanded = new Set();         // 編集を開いたステージ（'<下書き id>|<番号>'）

  function repaintActive() {
    if (active && active.isCurrent()) active.paint();
  }

  // この下書きを生成中か（生成中は、画面が持つ古い下書きで保存しないよう編集を止める）
  function generating(d) {
    return !!job && !!d && job.draftId === d.id;
  }

  // 生成中なら知らせて描き直し、true を返す（保存する操作の入口で呼ぶ）
  function blocked(ui, d) {
    if (!generating(d)) return false;
    ui.ctx.message(BUSY_NOTE, 'warn');
    if (ui.isCurrent()) ui.paint();
    return true;
  }

  // 生成中の下書きの画面で、入力欄とボタンを使えなくする（data-keep の付いたもの＝読むだけの操作は残す）
  function lockControls(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return node;
    node.querySelectorAll('input, textarea, select, button').forEach((c) => {
      if (!c.hasAttribute('data-keep')) c.disabled = true;
    });
    return node;
  }

  function noteKey(draftId, step) {
    return draftId + '|' + (step.kind === 'plan' ? 'plan' : 'stage|' + step.index);
  }

  function clearNotes(draftId, prefix) {
    Array.from(notes.keys()).forEach((k) => { if (k.indexOf(draftId + '|' + (prefix || '')) === 0) notes.delete(k); });
  }

  // ---- 小さな道具 ----

  function fmtSize(n) {
    if (!(n >= 0)) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (Math.round(n / 1024 / 1024 * 10) / 10) + ' MB';
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return RQ.xp.localDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function draftTitle(d) {
    return (d.plan && d.plan.unitTitle) || (d.input && d.input.title) || d.id;
  }

  function stageTotal(d) {
    return d.plan ? list(d.plan.stages).length : (d.input && d.input.stageCount) || list(d.stages).length;
  }

  function stageDone(d) {
    return list(d.stages).filter((s) => isObject(s) && isObject(s.stage)).length;
  }

  function textInput(value, attrs) {
    return el('input', Object.assign({ class: 'text-input', type: 'text', value: value === undefined || value === null ? '' : String(value) }, attrs || {}));
  }

  function textArea(value, rows, attrs) {
    const t = el('textarea', Object.assign({ class: 'text-input author-textarea', rows: rows || 3 }, attrs || {}));
    t.value = value === undefined || value === null ? '' : String(value);
    return t;
  }

  // options: [{ value, label }]
  function selectBox(options, current, attrs) {
    return el('select', Object.assign({ class: 'text-input author-select' }, attrs || {}), options.map((o) => el('option', {
      value: o.value, selected: String(o.value) === String(current), text: o.label,
    })));
  }

  // ラベルつきの入力欄（label で囲んで結びつける）
  function field(label, control, note) {
    return el('label', { class: 'author-field' }, [
      el('span', { class: 'field-label', text: label }),
      control,
      note ? el('span', { class: 'muted author-hint', text: note }) : null,
    ]);
  }

  function checkLine(label, checked, onChange) {
    const box = el('input', { type: 'checkbox', checked: !!checked });
    box.addEventListener('change', () => onChange(box.checked, box));
    return { box, line: el('label', { class: 'author-check' }, [box, el('span', { text: label })]) };
  }

  function noteBox(key) {
    const n = notes.get(key);
    if (!n || n.lines.length === 0) return null;
    if (n.kind === 'ok') return el('p', { class: 'author-ok', role: 'status', text: n.lines.join(' ') });
    if (n.kind === 'info') return el('p', { class: 'author-info', role: 'status', text: n.lines.join(' ') });
    const [head, ...rest] = n.lines;
    return el('div', { class: n.kind === 'warn' ? 'author-errors is-warn' : 'author-errors', role: 'alert' }, [
      el('p', { class: 'author-errors-head', text: head }),
      rest.length > 0 ? el('ul', null, rest.map((t) => el('li', { text: t }))) : null,
    ]);
  }

  function errorList(errors) {
    if (errors.length === 0) return el('p', { class: 'author-ok', text: '問題ありません。' });
    const shown = errors.slice(0, ERROR_LIMIT);
    return el('div', { class: 'author-errors' }, [
      el('p', { class: 'author-errors-head', text: errors.length + ' 件の直すところがあります。' }),
      el('ul', null, shown.map((t) => el('li', { text: t }))),
      errors.length > shown.length ? el('p', { class: 'muted', text: 'ほか ' + (errors.length - shown.length) + ' 件' }) : null,
    ]);
  }

  // ---- 下書きの保存 ----

  function findDraft(ctx, id) {
    return ctx.author.drafts().find((d) => d.id === id) || null;
  }

  // 下書き 1 つを一覧に入れて（同じ id は置きかえ）保存する
  function saveDraft(ctx, d) {
    const all = ctx.author.drafts();
    const i = all.findIndex((x) => x.id === d.id);
    if (i >= 0) all[i] = d; else all.push(d);
    return ctx.author.saveDrafts(all);
  }

  // ためし中の下書きを変えたら、登録し直す。教材の決まりに合わなくなったら、ためすを止める
  function syncPreview(ctx, d) {
    if (!d.preview) return;
    const r = ctx.author.setPreview(d.id, true);
    if (r.ok) return;
    ctx.author.setPreview(d.id, false);
    d.preview = false;
    ctx.message('教材の決まりに合わなくなったため、「この端末でためす」を止めました（照合の一覧を見てください）。', 'warn');
  }

  // 編集の確定。確認済みの下書きは内容が変わったので下書きに戻す
  function commit(ui, d) {
    if (blocked(ui, d)) return;
    const ctx = ui.ctx;
    const wasChecked = d.status === 'checked';
    if (wasChecked) d.status = 'draft';
    A().touch(d, ctx.now());
    if (!saveDraft(ctx, d)) ctx.message(SAVE_FAIL, 'warn');
    else if (wasChecked) ctx.message('内容を変えたので「下書き」に戻しました。確かめ直してから「確認済みにする」を押してください。', 'info');
    syncPreview(ctx, d);
    if (ui.refresh) ui.refresh(d);
  }

  // ---- プリント（添付） ----

  // 下書きに保存するプリントの記録（テキストは本文ごと、PDF・画像は名前と大きさだけ）
  function materialRecord(f) {
    const a = f.att;
    if (a.kind === 'text') return { kind: 'text', name: a.name, text: a.text };
    return { kind: a.kind, name: a.name, size: f.size };
  }

  function binaryOf(d) {
    return memFiles.get(d.id) || [];
  }

  // PDF・画像のうち、この画面で選び直していない（ページを読み込み直して消えた）もの
  function missingFiles(d) {
    const mem = binaryOf(d);
    return list(d.materials).filter((m) => isObject(m) && m.kind !== 'text' && !mem.some((x) => x.kind === m.kind && x.name === m.name));
  }

  // 指示文に入れるプリント（テキストは本文、PDF・画像は名前だけ）
  function materialsFor(d) {
    return list(d.materials).filter(isObject).map((m) => (m.kind === 'text' ? { kind: 'text', name: m.name, text: m.text } : { kind: m.kind, name: m.name }));
  }

  function isTextFile(file) {
    const type = String(file.type || '').toLowerCase();
    return type.indexOf('text/') === 0 || /\.(txt|md)$/i.test(String(file.name || ''));
  }

  // 選んだファイルを読む。{ files: [{ att, size }], failed: [文] }
  async function readFiles(files) {
    const out = { files: [], failed: [] };
    for (const file of files) {
      const limit = isTextFile(file) ? MAX_TEXT : MAX_BINARY;
      if (file.size > limit) {
        out.failed.push(file.name + ' は大きすぎます（' + fmtSize(file.size) + '。' + (limit === MAX_TEXT ? 'テキストは 500 KB' : 'PDF・画像は 10 MB') + ' まで）');
        continue;
      }
      try {
        const att = await API().readFileAsAttachment(file);
        out.files.push({ att, size: file.size });
      } catch (e) {
        out.failed.push(String((e && e.message) || e));
      }
    }
    return out;
  }

  function fileInput(onFiles) {
    const input = el('input', { type: 'file', multiple: true, accept: '.txt,.md,.pdf,image/png,image/jpeg,image/webp', hidden: true });
    input.addEventListener('change', () => {
      const files = input.files ? Array.from(input.files) : [];
      input.value = '';
      if (files.length > 0) onFiles(files);
    });
    return input;
  }

  // ---- 生成（API） ----

  function stepLabel(d, step) {
    if (step.kind === 'plan') return '計画';
    const s = d.plan ? list(d.plan.stages)[step.index] : null;
    return 'ステージ ' + (step.index + 1) + (s ? '「' + s.title + '」' : '');
  }

  function progressText() {
    return job ? '「' + job.title + '」の' + job.label + 'を生成中… ' + job.chars + ' 文字' : '';
  }

  function updateProgress() {
    if (job && job.textNode && job.textNode.isConnected) job.textNode.textContent = progressText();
  }

  // 生成中の表示とキャンセル（生成していなければ null）
  function progressBox(ui, withOpen) {
    if (!job) return null;
    const text = el('span', { class: 'author-progress-text', text: progressText() });
    job.textNode = text;
    const id = job.draftId;
    return el('div', { class: 'author-progress', role: 'status', 'aria-live': 'polite' }, [
      text,
      el('div', { class: 'btn-row' }, [
        button('キャンセル', () => { if (job) job.controller.abort(); }),
        withOpen ? button('開く', () => ui.show('edit', id)) : null,
      ]),
    ]);
  }

  // モデルの出力（文字列）を下書きに入れて保存する。{ ok, lines }。保存のときに下書きを読み直す
  // （生成のあいだに編集したもの・画面を離れたあとの結果も取りこぼさないように）
  // startedUpdatedAt（API の生成のときだけ）: 生成を始めたときの下書きの updatedAt。読み直した下書きと
  // ちがえば（取り込みなどで置きかわっていれば）結果は入れない。ここから保存までは await をはさまない
  function applyOutput(ctx, draftId, step, text, startedUpdatedAt) {
    const d = findDraft(ctx, draftId);
    if (!d) return { ok: false, lines: ['下書きが見つかりません（消された可能性があります）。'] };
    if (startedUpdatedAt !== undefined && d.updatedAt !== startedUpdatedAt) return { ok: false, lines: [REPLACED_NOTE] };
    const o = A().parseJson(text);
    if (!o) return { ok: false, lines: ['結果を JSON として読めませんでした。JSON の部分だけを貼ってください。'] };
    let lines;
    let kind = 'ok';
    if (step.kind === 'plan') {
      const r = A().normalizePlan(o, d.input);
      if (!r.plan || r.errors.length > 0) {
        return { ok: false, lines: ['計画に直すところがあるため、入れませんでした。もう一度作ってください。'].concat(r.errors) };
      }
      d.plan = r.plan;
      d.stages = new Array(r.plan.stages.length).fill(null);   // 計画が変わったので、ステージは作り直す
      clearNotes(d.id, 'stage|');
      lines = ['計画を作りました（ステージ ' + r.plan.stages.length + ' 個）。次にステージを作ってください。'];
    } else {
      if (!d.plan) return { ok: false, lines: ['先に計画を作ってください。'] };
      const r = A().normalizeStage(o, d.plan, step.index, d.input);
      if (!r.stage) return { ok: false, lines: ['ステージを読みこめませんでした。'].concat(r.errors) };
      while (d.stages.length < d.plan.stages.length) d.stages.push(null);
      d.stages[step.index] = { stage: r.stage, checkPool: r.checkPool };
      if (r.errors.length > 0) {
        kind = 'warn';
        lines = ['作りました。次の点を確かめて、直すか作り直してください。'].concat(r.errors);
      } else {
        lines = ['作りました。'];
      }
    }
    if (d.status === 'checked') d.status = 'draft';
    A().touch(d, ctx.now());
    if (!saveDraft(ctx, d)) return { ok: false, lines: [SAVE_FAIL] };
    syncPreview(ctx, d);
    return { ok: true, kind, lines };
  }

  // 1 段階を API で作る。できたら true
  async function apiStep(ctx, draftId, step) {
    const key = noteKey(draftId, step);
    const d = findDraft(ctx, draftId);
    if (!d) return false;
    const apiKey = ctx.author.apiKey();
    if (!apiKey) { notes.set(key, { kind: 'error', lines: ['API キーが設定されていません。下書きの一覧の「API キー」で保存するか、「指示文をコピー」の道を使ってください。'] }); return false; }
    if (step.kind === 'stage' && !d.plan) { notes.set(key, { kind: 'error', lines: ['先に計画を作ってください。'] }); return false; }
    const missing = missingFiles(d);
    if (missing.length > 0) {
      notes.set(key, { kind: 'error', lines: ['PDF・画像のプリントを選び直してください（ページを開き直すと消えます）: ' + missing.map((m) => m.name).join('、')] });
      return false;
    }
    const mats = materialsFor(d);
    const prompt = step.kind === 'plan' ? A().buildPlanPrompt(d.input, mats) : A().buildStagePrompt(d.input, d.plan, step.index, mats);
    const startedUpdatedAt = d.updatedAt;   // 生成のあいだに下書きが置きかわったら結果を入れない（applyOutput）
    job.label = stepLabel(d, step);
    job.chars = 0;
    updateProgress();
    notes.delete(key);
    try {
      const r = await API().generate({
        apiKey, model: d.model || A().DEFAULT_MODEL,
        system: prompt.system, user: prompt.user, attachments: binaryOf(d),
        schema: step.kind === 'plan' ? A().SCHEMAS.plan : A().SCHEMAS.stage,
        signal: job.controller.signal,
        onProgress: (n) => { if (job) { job.chars = n; updateProgress(); } },
      });
      const res = applyOutput(ctx, draftId, step, r.text, startedUpdatedAt);
      notes.set(key, { kind: res.ok ? res.kind : 'error', lines: res.lines });
      return res.ok;
    } catch (e) {
      if (job && job.controller.signal.aborted) notes.set(key, { kind: 'info', lines: ['キャンセルしました。'] });
      else notes.set(key, { kind: 'error', lines: ['生成できませんでした: ' + String((e && e.message) || e)] });
      return false;
    }
  }

  // steps を順に作る（途中で失敗・キャンセルしたら止める。できた分は保存済み）
  async function runJob(ctx, draftId, steps) {
    if (job) return;
    const d = findDraft(ctx, draftId);
    if (!d) return;
    job = { draftId, title: draftTitle(d), label: stepLabel(d, steps[0]), chars: 0, controller: new AbortController(), textNode: null };
    repaintActive();
    try {
      for (const step of steps) {
        if (job.controller.signal.aborted) break;
        const ok = await apiStep(ctx, draftId, step);
        // 段階ごとの保存のあと描き直す（画面が持つ下書きを、保存した最新のものに置きかえる）
        repaintActive();
        if (!ok) break;
      }
    } finally {
      job = null;
      repaintActive();
    }
  }

  // ---- 貼り付けの道（指示文をコピー・結果を貼る） ----

  async function copyText(ctx, text) {
    try {
      await root.navigator.clipboard.writeText(text);
      ctx.message('指示文をコピーしました。チャット（Claude など）に貼り、返ってきた JSON を「結果を貼る」に入れてください。', 'ok');
    } catch (e) {
      ctx.message('自動でコピーできませんでした。下の欄の文をすべて選んでコピーしてください。', 'warn');
    }
  }

  // 「指示文をコピー」「結果を貼る」のボタンと、開く箱。onPaste(text) は読みこむ処理
  function pasteTools(ui, d, step, onPaste) {
    const ctx = ui.ctx;
    const box = el('div', { class: 'author-panel' });
    let open = null;
    const toggle = (name, build) => {
      if (open === name) { box.replaceChildren(); open = null; return; }
      open = name;
      box.replaceChildren(...build());
    };
    const copyBtn = button('指示文をコピー', () => {
      if (step.kind === 'stage' && !d.plan) return;
      const mats = materialsFor(d);
      const prompt = step.kind === 'plan' ? A().buildPlanPrompt(d.input, mats) : A().buildStagePrompt(d.input, d.plan, step.index, mats);
      const text = A().promptText(prompt);
      open = null;
      toggle('prompt', () => {
        const ta = textArea(text, 8, { readonly: true, class: 'text-input author-textarea author-prompt', 'aria-label': '指示文' });
        ta.addEventListener('focus', () => ta.select());
        const hasBinary = list(d.materials).some((m) => isObject(m) && m.kind !== 'text');
        return [
          el('p', { class: 'muted', text: 'この文をチャット（Claude や ChatGPT）に貼って送ります。' + (hasBinary ? 'PDF・画像のプリントは、チャットに自分で添付してください。' : '') }),
          ta,
        ];
      });
      copyText(ctx, text);
    }, '', { 'data-keep': true });
    const pasteBtn = button('結果を貼る', () => toggle('paste', () => {
      const ta = textArea('', 6, { 'aria-label': '返ってきた JSON', placeholder: '返ってきた JSON をここに貼る' });
      const load = button('読みこむ', () => onPaste(ta.value), 'btn-primary');
      return [ta, el('div', { class: 'btn-row' }, [load])];
    }));
    return { buttons: [copyBtn, pasteBtn], box };
  }

  // ---- 一覧 ----

  function apiKeyCard(ui) {
    const ctx = ui.ctx;
    const key = ctx.author.apiKey();
    const input = el('input', { class: 'text-input', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'sk-ant-…', 'aria-label': 'API キー' });
    return card([
      cardTitle('API キー'),
      el('p', null, ['いまのキー: ', el('span', { class: 'author-key', text: key ? key.slice(0, 7) + '…' : '未設定' })]),
      input,
      el('div', { class: 'btn-row author-gap' }, [
        button('保存', () => {
          const v = input.value.trim();
          if (!v) { ctx.message('キーを入力してください。', 'warn'); return; }
          if (!ctx.author.setApiKey(v)) { ctx.message('キーを保存できませんでした。', 'warn'); return; }
          ui.paint();
          ctx.message('API キーを保存しました（この端末だけ）。', 'ok');
        }, 'btn-primary'),
        key ? button('消す', () => {
          ctx.author.setApiKey(null);
          ui.paint();
          ctx.message('API キーを消しました。', 'ok');
        }, 'btn-danger') : null,
      ]),
      el('p', { class: 'caution author-gap', text: KEY_NOTE }),
      el('p', { class: 'muted', text: 'キーがなくても、各段階の「指示文をコピー」でチャットに貼り、返ってきた JSON を「結果を貼る」で読みこめます。使うモデルは下書きごとに選べます。' }),
    ]);
  }

  // 下書きファイル（JSON）を読みこむボタンと input。生成中（どの下書きでも）は使えない
  // （生成中の下書きを置きかえると、古い生成結果で上書きされるため。applyOutput でも確かめる）
  function importButton(ui) {
    const ctx = ui.ctx;
    const input = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (job) { ctx.message(IMPORT_BUSY, 'warn'); return; }
      let text = null;
      try { text = await file.text(); } catch (e) { text = null; }
      const r = text === null ? { draft: null, error: 'ファイルを読めませんでした' } : A().importDraftJson(text);
      if (!ui.isCurrent()) return;
      if (!r.draft) { ctx.message('読みこめませんでした: ' + r.error, 'warn', { noRuby: true }); return; }
      const d = r.draft;
      const old = findDraft(ctx, d.id);
      if (old) {
        const ok = await ctx.confirm('同じ id（' + d.id + '）の下書きがあります。読みこんだもので置きかえますか？', '置きかえる', { noRuby: true });
        if (!ok || !ui.isCurrent()) return;
      }
      // ファイルを読む・確かめるあいだに生成が始まっていないか、保存の直前にもう一度見る
      if (job) { ctx.message(IMPORT_BUSY, 'warn'); return; }
      if (old && old.preview) ctx.author.setPreview(old.id, false);
      if (!saveDraft(ctx, d)) { ctx.message(SAVE_FAIL, 'warn'); return; }
      ui.show('edit', d.id);
      ctx.message('下書き「' + draftTitle(d) + '」を読みこみました。', 'ok', { noRuby: true });
    });
    const btn = button('下書きファイルを読みこむ', () => {
      if (job) { ctx.message(IMPORT_BUSY, 'warn'); return; }
      input.click();
    });
    // 生成の始まり・終わりで画面を描き直す（runJob の repaintActive）ので、描くときの状態で決めてよい
    if (job) { btn.disabled = true; btn.title = IMPORT_BUSY; }
    return { input, btn };
  }

  function listView(ui, drafts) {
    const ctx = ui.ctx;
    const imp = importButton(ui);
    const rows = drafts.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((d) => el('li', null, [
      el('div', { class: 'author-draft-main' }, [
        el('div', { class: 'author-draft-title', text: draftTitle(d) }),
        el('div', { class: 'author-draft-meta' }, [
          el('span', { text: 'id: ' + d.id }),
          el('span', { class: d.status === 'checked' ? 'tag tag-ok' : 'tag', text: STATUS_LABEL[d.status] || d.status }),
          el('span', { text: 'ステージ ' + stageDone(d) + '/' + stageTotal(d) + ' 生成済み' }),
          d.preview ? el('span', { class: 'tag tag-warn', text: 'ためし中' }) : null,
          el('span', { text: '更新 ' + fmtDate(d.updatedAt) }),
        ]),
      ]),
      button('開く', () => ui.show('edit', d.id), 'btn-primary'),
    ]));
    return [
      H.topBar('教材を作る', '先生画面', () => ctx.go('teacher')),
      progressBox(ui, true),
      card([
        cardTitle('下書き'),
        el('ul', { class: 'author-draft-list' }, rows),
        el('div', { class: 'btn-row' }, [button('新しく作る', () => ui.show('new'), 'btn-primary'), imp.btn]),
        imp.input,
      ]),
      apiKeyCard(ui),
    ];
  }

  // ---- 新しく作る ----

  function newView(ui, drafts) {
    const ctx = ui.ctx;
    const builtin = new Set(ctx.author.builtinIds());
    const tableIds = new Set(ctx.curriculum && typeof ctx.curriculum.units === 'function' ? ctx.curriculum.units().map((u) => u.id) : []);
    const mascots = (RQ.mascot && RQ.mascot.MASCOTS) || {};
    let files = [];

    const idInput = textInput('', { placeholder: '例: magnet', autocomplete: 'off', spellcheck: 'false', inputmode: 'latin' });
    const idNote = el('p', { class: 'author-hint-warn', role: 'status' });
    const checkId = () => {
      const v = idInput.value.trim();
      let t = '';
      if (drafts.some((d) => d.id === v)) t = '同じ id の下書きがあります（別の id にしてください）。';
      else if (builtin.has(v)) t = '公開中の教材と同じ id です。この id では「この端末でためす」が使えません（別の id にしてください）。';
      else if (tableIds.has(v)) t = '単元一覧の表にある id です。公開するときに表の単元と重なります。';
      idNote.textContent = t;
    };
    idInput.addEventListener('input', checkId);
    const titleInput = textInput('', { placeholder: '例: 磁石のはたらき' });
    const gradeSel = selectBox(GRADES.map((g) => ({ value: g, label: '中学' + g + '年' })), 1);
    const fieldSel = selectBox(FIELDS.map((f) => ({ value: f, label: f })), FIELDS[0]);
    const mascotSel = selectBox(Object.keys(mascots).map((k) => ({ value: k, label: k + ' ' + mascots[k].name + '（' + mascots[k].subjects + '）' })), 'A');
    const textbookInput = textInput('', { placeholder: '例: 〇〇の理科 1 年（範囲と順番を合わせるためだけに使います）' });
    const scopeInput = textArea('', 3, { placeholder: '例: 磁石の極、磁界と磁力線、電流がつくる磁界' });
    const notesInput = textArea('', 3, { placeholder: '例: 実験の安全の注意を入れる。計算問題は少なめに。' });
    const countSel = selectBox(STAGE_COUNTS.map((n) => ({ value: n, label: n + ' 個' })), DEFAULT_STAGE_COUNT);
    const modelSel = selectBox(MODELS, A().DEFAULT_MODEL);

    const fileList = el('ul', { class: 'author-file-list' });
    const paintFiles = () => {
      fileList.replaceChildren(...files.map((f, i) => el('li', null, [
        el('span', { class: 'author-file-name', text: f.att.name }),
        el('span', { class: 'muted', text: fmtSize(f.size) }),
        button('外す', () => { files.splice(i, 1); paintFiles(); }),
      ])));
    };
    const picker = fileInput(async (picked) => {
      const r = await readFiles(picked);
      if (!ui.isCurrent()) return;
      files = files.concat(r.files);
      paintFiles();
      if (r.failed.length > 0) ctx.message('読みこめなかったファイル: ' + r.failed.join('、'), 'warn', { noRuby: true });
    });

    const errorsBox = el('div');
    const start = button('作成を始める', () => {
      const input = {
        unitId: idInput.value.trim(), title: titleInput.value.trim(), grade: Number(gradeSel.value), field: fieldSel.value,
        mascot: mascotSel.value, textbook: textbookInput.value.trim(), scope: scopeInput.value.trim(), notes: notesInput.value.trim(),
        stageCount: Number(countSel.value), model: modelSel.value,
      };
      const errors = A().validateInput(input);
      if (ctx.author.drafts().some((d) => d.id === input.unitId)) errors.push('同じ id の下書きがあります（別の id にしてください）');
      if (errors.length > 0) { errorsBox.replaceChildren(errorList(errors)); return; }
      const d = A().newDraft(input, ctx.now());
      d.materials = files.map(materialRecord);
      if (!saveDraft(ctx, d)) { errorsBox.replaceChildren(errorList([SAVE_FAIL])); return; }
      const bin = files.filter((f) => f.att.kind !== 'text').map((f) => f.att);
      if (bin.length > 0) memFiles.set(d.id, bin); else memFiles.delete(d.id);
      clearNotes(d.id);
      ui.show('edit', d.id);
      ctx.message('下書きを作りました。次に「計画を作る」を押してください。', 'ok');
    }, 'btn-primary btn-block');

    const out = [
      H.topBar('教材を作る', drafts.length > 0 ? '下書きの一覧' : '先生画面', () => (drafts.length > 0 ? ui.show('list') : ctx.go('teacher'))),
      progressBox(ui, true),
      card([
        cardTitle('新しく作る'),
        el('p', { class: 'muted', text: '単元の情報とプリントから、AI が教材の下書きを作ります。下書きは先生が確かめて直してから公開します（生徒には見えません）。' }),
        el('div', { class: 'author-form' }, [
          field('単元の id（英小文字・数字・ハイフン）', idInput, 'ファイル名（content/<id>.js）とステージの id に使います。'),
          idNote,
          field('題名（単元名）', titleInput),
          field('学年', gradeSel),
          field('分野', fieldSel),
          field('担当の先生（マスコット）', mascotSel),
          field('教科書名', textbookInput, '教材の文には入りません。'),
          field('学習範囲', scopeInput),
          field('先生の注意', notesInput),
          field('ステージ数', countSel),
          field('モデル', modelSel),
          el('div', { class: 'author-field' }, [
            el('span', { class: 'field-label', text: 'プリント（テキスト・PDF・画像）' }),
            el('p', { class: 'muted', text: 'PDF・画像は 1 本 10 MB まで。プリントの中身はモデルに送られます。' }),
            fileList,
            button('ファイルを選ぶ', () => picker.click()),
            picker,
          ]),
          errorsBox,
          start,
        ]),
      ]),
    ];
    if (drafts.length === 0) {
      const imp = importButton(ui);
      out.push(card([cardTitle('下書きファイルを読みこむ'), el('p', { class: 'muted', text: 'ほかの端末で書き出した下書き（JSON）を読みこめます。' }), imp.btn, imp.input]));
    }
    out.push(apiKeyCard(ui));
    return out;
  }

  // ---- 問題の編集 ----

  // 枠選び（boxesScene）で作った図なら枠の文の配列、ちがえば null
  function boxLabels(p) {
    const fig = p.figure;
    if (!isObject(fig) || !Array.isArray(fig.items)) return null;
    const groups = [];
    for (const it of fig.items) {
      if (!isObject(it)) return null;
      if (it.type === 'rect') groups.push([]);
      else if (it.type === 'text') { if (groups.length === 0) return null; groups[groups.length - 1].push(String(it.text)); }
      else if (it.type !== 'region') return null;
    }
    const labels = groups.map((g) => g.join(''));
    if (labels.length < 2) return null;
    // 枠と選ぶ場所（rect・region）が boxesScene と同じなら枠選びの図とみなす。文の行は比べない
    // （折り返しで空白が落ちる・長い文の末尾が「…」になるため、文から作り直すと同じにならないことがある）
    const frame = (items) => JSON.stringify(items.filter((it) => it.type !== 'text'));
    try {
      return fig.width === 320 && fig.height === 240 && frame(A().boxesScene(labels).items) === frame(fig.items) ? labels : null;
    } catch (e) {
      return null;
    }
  }

  function regionsOf(p) {
    return isObject(p.figure) ? list(p.figure.items).filter((it) => isObject(it) && it.type === 'region') : [];
  }

  // 正解の select。current が候補にないときは「（選択肢にない）」を足して選んでおく
  function answerSelect(options, current, onChange) {
    const opts = options.slice();
    if (!opts.some((o) => String(o.value) === String(current))) opts.unshift({ value: current === null || current === undefined ? '' : current, label: '（正解が選択肢にありません）' });
    const sel = selectBox(opts, current === null || current === undefined ? '' : current);
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  // 文の欄。確定（change）で setter を呼んで保存する
  function bindText(control, setter, changed) {
    control.addEventListener('change', () => { setter(control.value); changed(); });
    return control;
  }

  // 壊れた要素（null・形ちがい）の行。消すボタンだけを出す
  function brokenRow(text, delLabel, onDelete) {
    return el('div', { class: 'author-problem' }, [
      el('p', { class: 'author-info', text }),
      onDelete ? el('div', { class: 'btn-row' }, [button(delLabel, onDelete, 'btn-danger')]) : null,
    ]);
  }

  // 問題 1 つの編集欄。opts: { concepts: [{ id, title }]（null なら概念は変えない）, onDelete, changed }
  // 形のちがう問題（null、選択肢・空らんの形ちがいなど）は、例外を出さずに消すボタンだけを出す
  // （onDelete がなければ onDeleteBroken を使う。予想問題のように、ふだんは消さない問題のため）
  function problemEditor(p, opts) {
    if (!A().isProblemShape(p)) return brokenRow('（壊れた問題。消してください）', '問題を消す', opts.onDelete || opts.onDeleteBroken);
    const changed = opts.changed;
    const kids = [];
    kids.push(el('h4', { class: 'author-problem-head' }, [
      el('span', { class: 'tag', text: TYPE_LABEL[p.type] || p.type }),
      el('span', { class: 'author-problem-id', text: p.id }),
      p.term ? el('span', { class: 'tag tag-ok', text: '用語' }) : null,
    ]));
    if (opts.concepts) {
      const sel = selectBox(opts.concepts.map((c) => ({ value: c.id, label: c.title + '（' + c.id + '）' })), p.concept);
      sel.addEventListener('change', () => { p.concept = sel.value; changed(); });
      kids.push(field('概念', sel));
    }
    kids.push(field('問題文', bindText(textArea(p.prompt, 3), (v) => { p.prompt = v.trim(); }, changed)));

    if (p.type === 'choice') {
      const box = el('div', { class: 'author-answer' });
      const paintAnswer = () => box.replaceChildren(field('正解', answerSelect(list(p.options).map((o) => ({ value: o.id, label: o.id + ': ' + (o.text || '（空）') })), p.answer, (v) => { p.answer = v; changed(); })));
      kids.push(el('div', { class: 'author-field' }, [el('span', { class: 'field-label', text: '選択肢' })].concat(list(p.options).map((o) => el('div', { class: 'author-option-row' }, [
        el('span', { class: 'author-option-id', text: o.id }),
        bindText(textInput(o.text, { 'aria-label': '選択肢 ' + o.id }), (v) => { o.text = v.trim(); paintAnswer(); }, changed),
      ])))));
      paintAnswer();
      kids.push(box);
    } else if (p.type === 'figure-choice') {
      const labels = boxLabels(p);
      const box = el('div', { class: 'author-answer' });
      const paintAnswer = () => {
        const rs = regionsOf(p);
        box.replaceChildren(field('正解', answerSelect(rs.map((r, k) => ({ value: r.id, label: (r.label || r.id) + (labels ? ': ' + (labels[k] || '（空）') : '') })), p.answer, (v) => { p.answer = v; changed(); })));
      };
      if (labels) {
        kids.push(el('div', { class: 'author-field' }, [el('span', { class: 'field-label', text: '枠の文（ア・イ・ウ…）' })].concat(labels.map((t, k) => el('div', { class: 'author-option-row' }, [
          el('span', { class: 'author-option-id', text: (regionsOf(p)[k] || {}).label || String(k + 1) }),
          bindText(textInput(t, { 'aria-label': '枠の文 ' + (k + 1) }), (v) => {
            labels[k] = v.trim();
            p.figure = A().boxesScene(labels);
            paintAnswer();
          }, changed),
        ])))));
      } else {
        kids.push(el('p', { class: 'muted', text: '図は編集できません（AI が部品で描いた図）。正解の場所だけ選べます。' }));
      }
      paintAnswer();
      kids.push(box);
    } else if (p.type === 'fill') {
      kids.push(field('穴埋めの文', bindText(textArea(p.text, 3), (v) => { p.text = v.trim(); }, changed), '空らんは [b1] [b2] のように書きます。'));
      list(p.blanks).forEach((b) => {
        if (!isObject(b)) return;
        const parts = [el('span', { class: 'field-label', text: '空らん ' + b.id + (b.kind === 'number' ? '（数）' : '（言葉）') })];
        if (b.kind === 'number') {
          parts.push(el('div', { class: 'author-option-row' }, [
            bindText(textInput(Number.isFinite(b.answer) ? b.answer : '', { type: 'number', step: 'any', 'aria-label': '空らん ' + b.id + ' の正解' }), (v) => { b.answer = v.trim() === '' ? NaN : Number(v); }, changed),
            bindText(textInput(b.unit || '', { 'aria-label': '空らん ' + b.id + ' の単位', placeholder: '単位' }), (v) => { if (v.trim()) b.unit = v.trim(); else delete b.unit; }, changed),
          ]));
        } else {
          if (!Array.isArray(b.options)) b.options = [];
          const box = el('div', { class: 'author-answer' });
          const paintAnswer = () => box.replaceChildren(field('正解', answerSelect(b.options.map((t) => ({ value: t, label: t || '（空）' })), b.answer, (v) => { b.answer = v; changed(); })));
          b.options.forEach((t, j) => parts.push(bindText(textInput(t, { 'aria-label': '空らん ' + b.id + ' の言葉 ' + (j + 1) }), (v) => {
            const old = b.options[j];
            b.options[j] = v.trim();
            if (b.answer === old) b.answer = b.options[j];   // 正解の言葉を直したら、正解もそれにする
            paintAnswer();
          }, changed)));
          paintAnswer();
          parts.push(box);
        }
        kids.push(el('div', { class: 'author-field author-blank' }, parts));
      });
    } else {
      kids.push(el('p', { class: 'muted', text: 'この形式（' + p.type + '）は編集できません。' }));
    }

    kids.push(field('解説', bindText(textArea(p.explanation, 3), (v) => { p.explanation = v.trim(); }, changed)));
    kids.push(field('ヒント', bindText(textArea(p.hint, 3), (v) => { p.hint = v.trim(); }, changed)));
    kids.push(checkLine('用語を答える問題（term）', p.term === true, (on) => {
      if (on) p.term = true; else delete p.term;
      changed();
    }).line);
    if (opts.onDelete) kids.push(el('div', { class: 'btn-row' }, [button('問題を消す', opts.onDelete, 'btn-danger')]));
    return el('div', { class: 'author-problem' }, kids);
  }

  // 下書きの中で使っている id（新しい問題の id がぶつからないように）
  function usedIds(d) {
    const ids = new Set();
    const add = (x) => { if (isObject(x) && typeof x.id === 'string') ids.add(x.id); };
    if (d.plan) { list(d.plan.stages).forEach(add); list(d.plan.concepts).forEach(add); list(d.plan.areas).forEach(add); }
    list(d.stages).forEach((sd) => {
      if (!isObject(sd)) return;
      if (isObject(sd.stage)) {
        list(sd.stage.lessons).forEach(add);
        add(sd.stage.warmup);
        list(sd.stage.problems).forEach(add);
        list(sd.stage.retryPool).forEach(add);
      }
      if (isObject(sd.checkPool)) Object.keys(sd.checkPool).forEach((k) => list(sd.checkPool[k]).forEach(add));
    });
    return ids;
  }

  function newId(d, prefix) {
    const used = usedIds(d);
    let n = 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }

  function newChoice(id, concept) {
    return {
      id, type: 'choice', concept, prompt: '', figure: null, explanation: '', hint: '',
      options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }], answer: 'a',
    };
  }

  // 問題の一覧（消す・選択問題を足す）
  function problemList(ui, d, arr, opts) {
    const ctx = ui.ctx;
    const changed = () => commit(ui, d);
    const items = arr.map((p, i) => problemEditor(p, {
      concepts: opts.concepts, changed,
      onDelete: async () => {
        if (blocked(ui, d)) return;
        const ok = await ctx.confirm('問題 ' + (isObject(p) && typeof p.id === 'string' ? p.id : '（壊れた問題）') + ' を消します。よろしいですか？', '消す', { noRuby: true });
        if (!ok || !ui.isCurrent() || blocked(ui, d)) return;
        const k = arr.indexOf(p);
        if (k >= 0) arr.splice(k, 1);
        commit(ui, d);
        ui.paint();
      },
    }));
    return el('div', { class: 'author-problem-list' }, items.concat([
      arr.length === 0 ? el('p', { class: 'muted', text: '問題はありません。' }) : null,
      el('div', { class: 'btn-row' }, [button('選択問題を足す', () => {
        if (blocked(ui, d)) return;
        arr.push(newChoice(newId(d, opts.prefix), opts.defaultConcept));
        commit(ui, d);
        ui.paint();
      })]),
    ]));
  }

  // ステージ 1 つの編集（カードの文・予想・問題・類題・確認問題）
  function stageEditor(ui, d, i) {
    const sd = d.stages[i];
    const st = sd.stage;
    const changed = () => commit(ui, d);
    const concepts = list(d.plan.concepts).filter(isObject).map((c) => ({ id: c.id, title: c.title }));
    const first = list(d.plan.stages)[i] ? list(d.plan.stages)[i].concepts[0] : (concepts[0] || {}).id;
    const titleOf = (cid) => { const c = concepts.find((x) => x.id === cid); return c ? c.title : cid; };
    const kids = [];

    kids.push(el('h3', { class: 'author-sub', text: 'カードの文' }));
    list(st.lessons).forEach((c, k) => {
      if (!A().isCardShape(c)) {
        kids.push(brokenRow('（壊れたカード。消してください）', 'カードを消す', () => {
          if (blocked(ui, d)) return;
          const j = st.lessons.indexOf(c);
          if (j >= 0) st.lessons.splice(j, 1);
          commit(ui, d);
          ui.paint();
        }));
        return;
      }
      const count = el('span', { class: 'muted author-hint' });
      const ta = textArea(c.text, 4);
      const paintCount = () => { count.textContent = Array.from(ta.value.split('**').join('')).length + ' 字（40〜160 字。用語は **用語**）'; };
      ta.addEventListener('input', paintCount);
      bindText(ta, (v) => { c.text = v.trim(); }, changed);
      paintCount();
      kids.push(el('label', { class: 'author-field' }, [el('span', { class: 'field-label', text: 'カード ' + (k + 1) + '（' + c.id + '）' }), ta, count]));
    });

    kids.push(el('h3', { class: 'author-sub', text: '予想問題（学ぶ前に 1 問）' }));
    if (st.warmup !== null && st.warmup !== undefined) {
      kids.push(problemEditor(st.warmup, {
        concepts, changed,
        onDeleteBroken: () => {
          if (blocked(ui, d)) return;
          st.warmup = null;
          commit(ui, d);
          ui.paint();
        },
      }));
    }
    else kids.push(el('p', { class: 'muted', text: '予想問題がありません。作り直してください。' }));

    kids.push(el('h3', { class: 'author-sub', text: '問題（4〜6 問。図から選ぶ問題と用語の問題を 1 問以上）' }));
    if (!Array.isArray(st.problems)) st.problems = [];
    kids.push(problemList(ui, d, st.problems, { concepts, prefix: st.id + '-p', defaultConcept: first }));

    kids.push(el('h3', { class: 'author-sub', text: 'まちがえたときの類題（概念ごとに 2 問以上）' }));
    if (!Array.isArray(st.retryPool)) st.retryPool = [];
    kids.push(problemList(ui, d, st.retryPool, { concepts, prefix: st.id + '-r', defaultConcept: first }));

    if (!isObject(sd.checkPool)) sd.checkPool = {};
    Object.keys(sd.checkPool).forEach((cid) => {
      kids.push(el('h3', { class: 'author-sub', text: '後日の確認問題「' + titleOf(cid) + '」（3 問以上）' }));
      if (!Array.isArray(sd.checkPool[cid])) sd.checkPool[cid] = [];
      kids.push(problemList(ui, d, sd.checkPool[cid], { concepts: null, prefix: cid + '-k', defaultConcept: cid }));
    });
    return el('div', { class: 'author-stage-editor' }, kids);
  }

  // ---- 計画の編集 ----

  function planEditor(ui, d) {
    const plan = d.plan;
    const changed = () => commit(ui, d);
    const kids = [
      field('単元の題名', bindText(textInput(plan.unitTitle), (v) => { plan.unitTitle = v.trim(); }, changed)),
    ];
    kids.push(el('h3', { class: 'author-sub', text: '領域' }));
    list(plan.areas).forEach((a) => kids.push(field('領域の名前（' + a.id + '）', bindText(textInput(a.title), (v) => { a.title = v.trim(); }, changed))));
    kids.push(el('h3', { class: 'author-sub', text: 'ステージ' }));
    list(plan.stages).forEach((s, i) => {
      kids.push(el('div', { class: 'author-plan-stage' }, [
        field('ステージ ' + (i + 1) + ' の名前（' + s.id + '）', bindText(textInput(s.title), (v) => { s.title = v.trim(); }, changed)),
        field('分（3〜6）', bindText(textInput(s.minutes, { type: 'number', min: 3, max: 6, step: 1, inputmode: 'numeric' }), (v) => {
          const m = Math.round(Number(v));
          s.minutes = Number.isFinite(m) ? Math.min(6, Math.max(3, m)) : s.minutes;
        }, changed)),
        s.goal ? el('p', { class: 'muted', text: 'ねらい: ' + s.goal }) : null,
      ]));
    });
    kids.push(el('h3', { class: 'author-sub', text: '概念' }));
    list(plan.concepts).forEach((c) => kids.push(field('概念の名前（' + c.id + '）', bindText(textInput(c.title), (v) => { c.title = v.trim(); }, changed))));
    return el('div', { class: 'author-form' }, kids);
  }

  // ---- 下書き 1 つの画面 ----

  function inputCard(ui, d) {
    const ctx = ui.ctx;
    const inp = d.input || {};
    const mascots = (RQ.mascot && RQ.mascot.MASCOTS) || {};
    const rows = [
      ['単元の id', d.id], ['題名', inp.title], ['学年', '中学' + inp.grade + '年'], ['分野', inp.field],
      ['担当の先生', inp.mascot + (mascots[inp.mascot] ? ' ' + mascots[inp.mascot].name : '')],
      ['教科書名', inp.textbook || '（なし）'], ['学習範囲', inp.scope || '（なし）'], ['先生の注意', inp.notes || '（なし）'],
      ['ステージ数', String(inp.stageCount)],
    ];
    const modelSel = selectBox(MODELS.some((m) => m.value === d.model) ? MODELS : MODELS.concat([{ value: d.model, label: d.model }]), d.model || A().DEFAULT_MODEL);
    modelSel.addEventListener('change', () => {
      if (blocked(ui, d)) return;
      d.model = modelSel.value;
      A().touch(d, ctx.now());
      if (!saveDraft(ctx, d)) ctx.message(SAVE_FAIL, 'warn');
    });

    const mem = binaryOf(d);
    const mats = list(d.materials).filter(isObject);
    const picker = fileInput(async (picked) => {
      const r = await readFiles(picked);
      if (blocked(ui, d)) return;
      const fresh = findDraft(ctx, d.id);
      if (!fresh) return;
      const bin = binaryOf(fresh).slice();
      fresh.materials = list(fresh.materials).filter(isObject);
      r.files.forEach((f) => {
        // 同じ名前・形式のものは置きかえる
        fresh.materials = fresh.materials.filter((m) => !(m.name === f.att.name && m.kind === f.att.kind));
        fresh.materials.push(materialRecord(f));
        if (f.att.kind !== 'text') {
          const k = bin.findIndex((x) => x.name === f.att.name && x.kind === f.att.kind);
          if (k >= 0) bin.splice(k, 1);
          bin.push(f.att);
        }
      });
      memFiles.set(d.id, bin);
      A().touch(fresh, ctx.now());
      if (!saveDraft(ctx, fresh)) ctx.message(SAVE_FAIL, 'warn');
      if (!ui.isCurrent()) return;
      ui.paint();
      if (r.failed.length > 0) ctx.message('読みこめなかったファイル: ' + r.failed.join('、'), 'warn', { noRuby: true });
    });
    const fileRows = mats.map((m) => {
      const lost = m.kind !== 'text' && !mem.some((x) => x.kind === m.kind && x.name === m.name);
      return el('li', null, [
        el('span', { class: 'author-file-name', text: m.name }),
        el('span', { class: 'muted', text: (m.kind === 'text' ? 'テキスト' : m.kind === 'pdf' ? 'PDF' : '画像') + (m.size ? '・' + fmtSize(m.size) : '') }),
        lost ? el('span', { class: 'tag tag-warn', text: '選び直しが必要' }) : null,
        button('外す', () => {
          if (blocked(ui, d)) return;
          d.materials = mats.filter((x) => x !== m);
          memFiles.set(d.id, binaryOf(d).filter((x) => !(x.kind === m.kind && x.name === m.name)));
          A().touch(d, ctx.now());
          if (!saveDraft(ctx, d)) ctx.message(SAVE_FAIL, 'warn');
          ui.paint();
        }),
      ]);
    });

    return card([
      cardTitle('入力'),
      el('dl', { class: 'author-summary' }, rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])),
      field('モデル', modelSel),
      el('div', { class: 'author-field' }, [
        el('span', { class: 'field-label', text: 'プリント' }),
        mats.length > 0 ? el('ul', { class: 'author-file-list' }, fileRows) : el('p', { class: 'muted', text: 'プリントはありません。' }),
        mats.some((m) => m.kind !== 'text') ? el('p', { class: 'muted', text: 'PDF・画像は下書きに保存しません。ページを開き直したら、API で作る前に選び直してください。' }) : null,
        button('プリントを足す', () => picker.click()),
        picker,
      ]),
    ]);
  }

  function planCard(ui, d) {
    const ctx = ui.ctx;
    const hasKey = !!ctx.author.apiKey();
    const step = { kind: 'plan' };
    const built = list(d.stages).some((s) => isObject(s));
    const askReplace = () => (built
      ? ctx.confirm('計画を作り直すと、作ったステージ（' + stageDone(d) + ' 個）は消えます。よろしいですか？', '作り直す')
      : Promise.resolve(true));
    const tools = pasteTools(ui, d, step, async (text) => {
      if (blocked(ui, d)) return;
      if (!(await askReplace()) || !ui.isCurrent() || blocked(ui, d)) return;
      const r = applyOutput(ctx, d.id, step, text);
      notes.set(noteKey(d.id, step), { kind: r.ok ? r.kind : 'error', lines: r.lines });
      ui.paint();
    });
    const gen = button(d.plan ? '計画を作り直す（API）' : '計画を作る（API）', async () => {
      if (!(await askReplace()) || !ui.isCurrent()) return;
      runJob(ctx, d.id, [step]);
    }, 'btn-primary', { disabled: !!job || !hasKey });
    return card([
      cardTitle('1. 計画'),
      el('p', { class: 'muted', text: '単元の領域・ステージ・概念の一覧を作ります。' }),
      el('div', { class: 'btn-row' }, [gen].concat(tools.buttons)),
      hasKey ? null : el('p', { class: 'muted', text: 'API キーが未設定です。「指示文をコピー」でチャットに貼って作れます。' }),
      tools.box,
      noteBox(noteKey(d.id, step)),
      d.plan ? el('details', { class: 'author-details', open: true }, [el('summary', { text: '計画を編集する' }), planEditor(ui, d)]) : null,
    ]);
  }

  function stagesCard(ui, d) {
    const ctx = ui.ctx;
    const hasKey = !!ctx.author.apiKey();
    const stages = list(d.plan.stages);
    const rows = stages.map((s, i) => {
      const step = { kind: 'stage', index: i };
      const sd = d.stages[i];
      const done = isObject(sd) && isObject(sd.stage);
      const ek = d.id + '|' + i;
      const tools = pasteTools(ui, d, step, async (text) => {
        if (blocked(ui, d)) return;
        if (done) {
          const ok = await ctx.confirm('このステージを読みこんだもので置きかえます（編集した内容は消えます）。よろしいですか？', '置きかえる');
          if (!ok || !ui.isCurrent() || blocked(ui, d)) return;
        }
        const r = applyOutput(ctx, d.id, step, text);
        notes.set(noteKey(d.id, step), { kind: r.ok ? r.kind : 'error', lines: r.lines });
        ui.paint();
      });
      const gen = button(done ? '作り直す（API）' : 'このステージを作る（API）', async () => {
        if (done) {
          const ok = await ctx.confirm('作り直すと、このステージの編集は消えます。よろしいですか？', '作り直す');
          if (!ok || !ui.isCurrent()) return;
        }
        runJob(ctx, d.id, [step]);
      }, done ? '' : 'btn-primary', { disabled: !!job || !hasKey });
      const editBtn = done ? button(expanded.has(ek) ? '編集を閉じる' : '編集する', () => {
        if (expanded.has(ek)) expanded.delete(ek); else expanded.add(ek);
        ui.paint();
      }, '', { 'data-keep': true }) : null;
      return el('div', { class: 'author-stage-row' }, [
        el('div', { class: 'author-stage-head' }, [
          el('span', { text: 'ステージ ' + (i + 1) + ': ' + s.title }),
          el('span', { class: done ? 'tag tag-ok' : 'tag', text: done ? '生成済み' : '未生成' }),
          el('span', { class: 'muted author-hint', text: s.minutes + ' 分' }),
        ]),
        el('div', { class: 'btn-row' }, [gen].concat(tools.buttons, [editBtn])),
        tools.box,
        noteBox(noteKey(d.id, step)),
        done && expanded.has(ek) ? stageEditor(ui, d, i) : null,
      ]);
    });
    const none = stages.every((_, i) => !(isObject(d.stages[i]) && isObject(d.stages[i].stage)));
    return card([
      cardTitle('2. ステージ'),
      el('p', { class: 'muted', text: 'ステージごとに、カード・予想問題・問題・類題・確認問題を作ります。作ったあと「編集する」で直せます。' }),
      none && hasKey ? button('すべて作る（API。順に 1 つずつ）', () => runJob(ctx, d.id, stages.map((_, i) => ({ kind: 'stage', index: i }))), 'btn-primary btn-block', { disabled: !!job }) : null,
      el('div', { class: 'author-stage-list' }, rows),
    ]);
  }

  // 照合（教材の決まり）の箱と、ためす・公開の箱。編集のたびに描き直す（ui.refresh）
  function checksContent(d) {
    const r = A().assembleUnit(d);
    return { unit: r.unit, errors: r.errors };
  }

  function publishContent(ui, d, check) {
    const ctx = ui.ctx;
    const ok = check.errors.length === 0;
    const kids = [el('p', null, ['状態: ', el('span', { class: d.status === 'checked' ? 'tag tag-ok' : 'tag', text: STATUS_LABEL[d.status] || d.status }), d.preview ? ' ' : null, d.preview ? el('span', { class: 'tag tag-warn', text: 'ためし中' }) : null])];

    // この端末でためす
    kids.push(el('h3', { class: 'author-sub', text: 'この端末でためす' }));
    if (d.preview) {
      kids.push(el('p', { text: 'この端末の「単元をえらぶ」の「その他」に出ています。生徒と同じ画面で解いて確かめられます（生徒の端末には出ません）。' }));
    } else {
      kids.push(el('p', { class: 'muted', text: ok ? '入れると、この端末の「単元をえらぶ」の「その他」に出ます。' : '照合の直すところがなくなると、ためせます。' }));
    }
    kids.push(noteBox(d.id + '|preview'));
    kids.push(el('div', { class: 'btn-row' }, [
      button(d.preview ? 'ためすのをやめる' : 'この端末でためす', () => {
        if (blocked(ui, d)) return;
        const on = !d.preview;
        if (!saveDraft(ctx, d)) { ctx.message(SAVE_FAIL, 'warn'); return; }
        const r = ctx.author.setPreview(d.id, on);
        if (!r.ok) {
          notes.set(d.id + '|preview', { kind: 'error', lines: ['ためせませんでした。'].concat(r.errors) });
        } else {
          notes.delete(d.id + '|preview');
          d.preview = on;
          ctx.message(on ? '「単元をえらぶ」の「その他」に出しました。' : 'ためすのをやめました。', 'ok');
        }
        ui.refresh(d);
      }, d.preview ? '' : 'btn-primary', { disabled: !d.preview && !ok }),
      d.preview ? button('単元をえらぶ画面へ（先生画面は閉じます）', () => ctx.go('units')) : null,
    ]));

    // 確認済み
    kids.push(el('h3', { class: 'author-sub', text: '確認' }));
    if (d.status === 'checked') {
      kids.push(el('p', { text: '確認済みです。内容を直すと下書きに戻ります。' }));
      kids.push(el('div', { class: 'btn-row' }, [button('下書きに戻す', () => {
        if (blocked(ui, d)) return;
        d.status = 'draft';
        A().touch(d, ctx.now());
        if (!saveDraft(ctx, d)) ctx.message(SAVE_FAIL, 'warn');
        ui.refresh(d);
      })]));
    } else {
      const mark = button('確認済みにする', () => {
        if (blocked(ui, d)) return;
        d.status = 'checked';
        A().touch(d, ctx.now());
        if (!saveDraft(ctx, d)) { d.status = 'draft'; ctx.message(SAVE_FAIL, 'warn'); }
        else ctx.message('確認済みにしました。content/' + d.id + '.js を書き出せます。', 'ok', { noRuby: true });
        ui.refresh(d);
      }, 'btn-primary', { disabled: true });
      const chk = checkLine('内容を確かめました（文・正解・解説・図に誤りがないこと、教科書の文を写していないこと）', false, (on) => { mark.disabled = !(on && ok); });
      kids.push(chk.line);
      if (!ok) kids.push(el('p', { class: 'muted', text: '照合の直すところがなくなると、確認済みにできます。' }));
      kids.push(el('div', { class: 'btn-row' }, [mark]));
    }

    // 書き出し
    kids.push(el('h3', { class: 'author-sub', text: '書き出し' }));
    const canExport = d.status === 'checked' && ok;
    kids.push(el('div', { class: 'btn-row' }, [
      button('content/' + d.id + '.js を書き出す', () => {
        const fresh = checksContent(d);
        if (d.status !== 'checked' || fresh.errors.length > 0) return;
        H.downloadText(d.id + '.js', A().toContentJs(fresh.unit, d.input, ctx.now()));
        ctx.message(d.id + '.js を書き出しました。', 'ok', { noRuby: true });
      }, 'btn-primary', { disabled: !canExport }),
      button('下書き（JSON）を書き出す', () => {
        const name = 'rika-quest-draft-' + d.id + '.json';
        H.downloadText(name, A().exportDraftJson(d));
        ctx.message(name + ' を書き出しました。', 'ok', { noRuby: true });
      }),
    ]));
    if (!canExport) kids.push(el('p', { class: 'muted', text: 'content/' + d.id + '.js は「確認済み」にしてから書き出せます。' }));
    kids.push(el('p', { class: 'caution', text: PUBLISH_NOTE.replace('<id>', d.id) }));

    // 消す
    kids.push(el('div', { class: 'btn-row author-gap' }, [button('下書きを消す', async () => {
      if (blocked(ui, d)) return;
      const yes = await ctx.confirm('下書き「' + draftTitle(d) + '」を消します。元に戻せません（必要なら先に JSON で書き出してください）。よろしいですか？', '消す', { noRuby: true });
      if (!yes || !ui.isCurrent() || blocked(ui, d)) return;
      if (d.preview) ctx.author.setPreview(d.id, false);
      const rest = ctx.author.drafts().filter((x) => x.id !== d.id);
      if (!ctx.author.saveDrafts(rest)) { ctx.message(SAVE_FAIL, 'warn'); return; }
      memFiles.delete(d.id);
      clearNotes(d.id);
      Array.from(expanded).forEach((k) => { if (k.indexOf(d.id + '|') === 0) expanded.delete(k); });
      ui.show('list');
      ctx.message('下書きを消しました。', 'ok');
    }, 'btn-danger')]));
    return kids;
  }

  function editView(ui, d) {
    const checksBox = el('div', { 'aria-live': 'polite' });
    const publishBox = el('div', { class: 'stack' });
    const busy = generating(d);
    // 生成中は、この下書きの編集欄とボタンを使えなくする（生成の結果を古い下書きで上書きしないため）
    const lock = (node) => (busy ? lockControls(node) : node);
    ui.refresh = (cur) => {
      const check = checksContent(cur);
      checksBox.replaceChildren(errorList(check.errors));
      publishBox.replaceChildren(...publishContent(ui, cur, check).filter(Boolean));
      lock(publishBox);
    };
    ui.refresh(d);
    return [
      H.topBar('教材を作る', '下書きの一覧', () => ui.show('list')),
      el('p', { class: 'author-draft-heading' }, [
        el('strong', { text: draftTitle(d) }), ' ',
        el('span', { class: 'muted', text: '（' + d.id + '・更新 ' + fmtDate(d.updatedAt) + '）' }),
      ]),
      busy ? progressBox(ui, false) : progressBox(ui, true),
      busy ? el('p', { class: 'author-info', role: 'status', text: BUSY_NOTE }) : null,
      lock(inputCard(ui, d)),
      lock(planCard(ui, d)),
      d.plan ? lock(stagesCard(ui, d)) : null,
      card([cardTitle('教材の決まりとの照合'), checksBox]),
      card([cardTitle('3. ためす・公開'), publishBox]),
    ];
  }

  // ---- 画面 ----

  function renderAuthor(section, ctx, params) {
    section.setAttribute('data-no-ruby', '');
    if (!ctx.state.teacherUnlocked) { ctx.go('teacher'); return; }
    const mine = ++renderSeq;
    const isCurrent = () => mine === renderSeq && ctx.state.screen === 'author' && !!ctx.state.teacherUnlocked;
    const p = params || {};
    view = p.draftId ? { mode: 'edit', draftId: p.draftId } : { mode: p.mode === 'new' ? 'new' : 'list', draftId: null };

    const ui = { ctx, isCurrent, refresh: null };
    function paint(keepScroll) {
      if (!isCurrent()) return;
      const y = keepScroll ? root.scrollY : 0;
      ui.refresh = null;
      const drafts = ctx.author.drafts();
      let children = null;
      if (view.mode === 'edit') {
        const d = drafts.find((x) => x.id === view.draftId);
        if (d) children = editView(ui, d);
        else view = { mode: 'list', draftId: null };
      }
      if (!children) children = view.mode === 'new' || drafts.length === 0 ? newView(ui, drafts) : listView(ui, drafts);
      section.replaceChildren(...children.filter(Boolean));
      root.scrollTo(0, y);
    }
    ui.paint = () => paint(true);
    ui.show = (mode, draftId) => {
      view = { mode, draftId: draftId || null };
      paint(false);
    };
    active = ui;
    paint(false);
  }

  RQ.ui.screens.author = renderAuthor;
  RQ.ui.renderAuthor = renderAuthor;
})(typeof globalThis !== 'undefined' ? globalThis : this);
