// 問題形式ごとの画面部品（タッチ操作を含む）。ブラウザ専用。
// RikaQuest.ui.problems.render(root, problem, onAnswer, opts) で、root の中に問題の図と操作部品を作る。
//   problem  … 教材の problem（type: choice | fill | figure-choice | ray-draw | drag）
//   onAnswer … onAnswer(解答) を呼ぶと app が判定して結果を返す。{ invalid: true } なら受け付けられなかった
//               （部品の状態を保ち、もう一度操作・送信できる）。それ以外なら部品を止める（有効な解答は 1 回だけ）
//   opts     … { config }（config.tolerance.snapPx を使う）
// 戻り値は { disable() }。
// 解答の形（judge.js と同じ）: choice → optionId / fill → { [blankId]: 値 } / figure-choice → regionId /
//   ray-draw → { out: { x, y } } / drag → { x, y }
// 図の操作は Pointer Events（指・マウス・ペンが同じ処理）。図の座標は viewBox の単位（SVG の px）で扱う。
// 利用者に見せる文字は textContent で入れる。innerHTML は figures.sceneSvg の SVG 文字列だけに使う。
(function (root) {
  'use strict';

  const RQ = root.RikaQuest;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 画面の操作だけで使う値（判定には使わない）
  const MIN_DRAG = 8;          // これより短いドラッグは無視する（図の px）
  const GUIDE_HALF = 70;       // 法線の案内線の半分の長さ
  const KEY_STEP = 2;          // 矢印キーで動かす量（Shift で 10 倍）
  const MIN_TOUCH_PX = 44;     // タッチ対象の最小の大きさ（画面の CSS px）
  const HANDLE_R = 22;         // 光線を引く始点・当たる点の印の半径（図の px。縮尺 1 で直径 44px）
  const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥'];
  // 動かすものに名前（label）がないときの呼び名（「〇〇を指で動かそう」に使う）
  const ITEM_NAMES = { screen: 'スクリーン', lens: '凸レンズ', mirror: '鏡', object: '物体', lamp: '電球', eye: '目' };
  const INVALID_TEXT = 'もう一度操作してね';

  function figures() { return RQ.figures; }
  function geometry() { return RQ.geometry; }

  // ---- DOM の道具（ui-screens.js より先に読み込むので、自前で持つ） ----

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = String(v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, String(v));
    });
    (Array.isArray(children) ? children : children === undefined || children === null ? [] : [children]).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.append(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function button(label, onClick, cls) {
    return el('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: onClick }, label);
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, String(attrs[k])));
    return node;
  }

  function setLine(line, a, b) {
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
  }

  function round2(n) { return Math.round(n * 100) / 100; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // 図を入れる箱。SVG を返す
  function figureBox(scene, opts, cls) {
    const box = el('div', { class: 'figure-box ' + (cls || '') });
    box.innerHTML = figures().sceneSvg(scene, opts || {});
    return box;
  }

  // 画面上の点（clientX/Y）→ 図の座標（viewBox の単位）
  function toLocal(svg, evt) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  // 解答の送信を 1 回にまとめる。invalid なら受け付け直す
  function makeSubmitter(onAnswer, hooks) {
    let done = false;
    let busy = false;
    function submit(value) {
      if (done || busy) return null;
      busy = true;
      let res;
      try {
        res = onAnswer(value);
      } finally {
        busy = false;
      }
      if (res && res.invalid) {
        hooks.invalid(res);
        return res;
      }
      done = true;
      hooks.done(res || {});
      return res;
    }
    return { submit, isDone: () => done, finish: () => { done = true; } };
  }

  // 「もう一度操作してね」などの一言（読み上げあり）
  function noteLine() {
    return el('p', { class: 'widget-note', role: 'status', 'aria-live': 'polite' });
  }

  function setNote(note, text, kind) {
    note.textContent = text || '';
    note.className = 'widget-note' + (kind ? ' is-' + kind : '');
  }

  // 正誤で、選んだものに色を付ける（正解=緑、おしい=オレンジ）
  function resultClass(res) {
    return res && res.correct ? 'is-ok' : 'is-warn';
  }

  // ---- 選択式 ----

  function renderChoice(rootEl, problem, onAnswer) {
    if (problem.figure) rootEl.append(figureBox(problem.figure));
    const note = noteLine();
    const list = el('div', { class: 'choice-list', role: 'group', 'aria-label': '答えを選ぶ' });
    const buttons = (problem.options || []).map((o) => {
      const b = button(o.text, () => {
        if (sub.isDone()) return;
        buttons.forEach((x) => x.classList.toggle('is-chosen', x === b));
        setNote(note, '');
        const res = sub.submit(o.id);
        if (res && !res.invalid) b.classList.add(resultClass(res));
      }, 'btn-block choice-btn');
      return b;
    });
    const sub = makeSubmitter(onAnswer, {
      invalid: () => {
        buttons.forEach((x) => x.classList.remove('is-chosen'));
        setNote(note, INVALID_TEXT, 'warn');
      },
      done: () => buttons.forEach((x) => { x.disabled = true; }),
    });
    buttons.forEach((b) => list.append(b));
    rootEl.append(list, note);
    return { disable: () => { sub.finish(); buttons.forEach((x) => { x.disabled = true; }); } };
  }

  // ---- 穴埋め ----

  function renderFill(rootEl, problem, onAnswer) {
    if (problem.figure) rootEl.append(figureBox(problem.figure));
    const blanks = problem.blanks || [];
    const values = {};
    // 同じ空欄 id が文中に何度出てもよい。値は id ごとに 1 つ
    const slots = {};      // 値を表示する文中の枠（id → 配列）。語の空欄はすべて、数値の空欄は 2 回目以降
    const inputs = {};     // 数値の空欄の input（id ごとに 1 つ。文中で最初に出た位置）
    const groups = [];     // 語群のボタン
    const note = noteLine();
    const submitBtn = button('答える', () => {
      if (!allFilled()) return;
      const answer = {};
      blanks.forEach((b) => {
        const v = values[b.id];
        answer[b.id] = b.kind === 'number' ? Number(v) : v;
      });
      setNote(note, '');
      sub.submit(answer);
    }, 'btn-primary btn-block');

    function allFilled() {
      return blanks.every((b) => {
        const v = values[b.id];
        if (v === undefined || v === null || String(v).trim() === '') return false;
        return b.kind !== 'number' || Number.isFinite(Number(v));
      });
    }
    function update() { submitBtn.disabled = sub.isDone() || !allFilled(); }

    // 文を [b1] で分けて、空欄を差しこむ
    const textBox = el('p', { class: 'fill-text' });
    const parts = String(problem.text || '').split(/\[([A-Za-z0-9_-]+)\]/);
    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part) textBox.append(document.createTextNode(part));
        return;
      }
      const bi = blanks.findIndex((b) => b.id === part);
      const b = blanks[bi];
      if (!b) { textBox.append(document.createTextNode('[' + part + ']')); return; }
      const mark = CIRCLED[bi] || '(' + (bi + 1) + ')';
      if (b.kind === 'number' && !inputs[b.id]) {
        const input = el('input', {
          type: 'number', inputmode: 'decimal', step: 'any', class: 'blank-input',
          'aria-label': '空らん' + mark + (b.unit ? '（単位 ' + b.unit + '）' : ''),
        });
        input.addEventListener('input', () => { values[b.id] = input.value; showValue(b.id, input.value); setNote(note, ''); update(); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click(); });
        inputs[b.id] = input;
        textBox.append(el('span', { class: 'blank blank-number' }, [
          el('span', { class: 'blank-mark', 'aria-hidden': 'true', text: mark }), input,
          b.unit ? el('span', { class: 'blank-unit', text: b.unit }) : null,
        ]));
      } else {
        // 語の空欄、または 2 回目以降に出た数値の空欄（入力は最初の欄で行い、ここには同じ値を映す）
        const slot = el('span', { class: 'blank blank-word is-empty', 'aria-label': '空らん' + mark }, [
          el('span', { class: 'blank-mark', 'aria-hidden': 'true', text: mark }),
          el('span', { class: 'blank-value', text: '　　' }),
          b.kind === 'number' && b.unit ? el('span', { class: 'blank-unit', text: b.unit }) : null,
        ]);
        (slots[b.id] || (slots[b.id] = [])).push(slot);
        textBox.append(slot);
      }
    });
    rootEl.append(el('div', { class: 'card fill-card' }, textBox));

    // 同じ id の枠すべてに値を表示する
    function showValue(id, text) {
      const empty = text === undefined || text === null || String(text).trim() === '';
      (slots[id] || []).forEach((slot) => {
        slot.querySelector('.blank-value').textContent = empty ? '　　' : String(text);
        slot.classList.toggle('is-empty', empty);
      });
    }

    // 語群（空欄ごとに 1 列）
    blanks.forEach((b, bi) => {
      if (b.kind === 'number') return;
      const mark = CIRCLED[bi] || '(' + (bi + 1) + ')';
      const row = el('div', { class: 'word-row', role: 'group', 'aria-label': '空らん' + mark + 'に入る言葉' });
      const opts = (b.options || []).map((text) => {
        const ob = el('button', {
          type: 'button', class: 'btn word-btn', 'aria-pressed': 'false',
          onclick: () => {
            if (sub.isDone()) return;
            values[b.id] = text;
            opts.forEach((x) => x.setAttribute('aria-pressed', x === ob ? 'true' : 'false'));
            showValue(b.id, text);
            setNote(note, '');
            update();
          },
        }, text);
        return ob;
      });
      opts.forEach((x) => row.append(x));
      groups.push(opts);
      rootEl.append(el('div', { class: 'word-group' }, [el('p', { class: 'word-label', text: mark + ' に入る言葉' }), row]));
    });

    const sub = makeSubmitter(onAnswer, {
      invalid: () => { setNote(note, INVALID_TEXT, 'warn'); update(); },
      done: () => disableAll(),
    });
    function disableAll() {
      submitBtn.disabled = true;
      groups.forEach((opts) => opts.forEach((x) => { x.disabled = true; }));
      Object.keys(inputs).forEach((k) => { inputs[k].disabled = true; });
    }
    rootEl.append(note, submitBtn);
    update();
    return { disable: () => { sub.finish(); disableAll(); } };
  }

  // ---- 図を使った選択 ----

  function renderFigureChoice(rootEl, problem, onAnswer) {
    const items = (problem.figure && problem.figure.items) || [];
    const labelOf = (id) => {
      const it = items.find((x) => x.type === 'region' && x.id === id);
      // label は図の丸の中に描く名前、name は図に描かない呼び名（名前を丸の横に label 項目で描くとき）
      return it && (it.label || it.name) ? (it.label || it.name) : id;
    };
    let selected = null;
    const box = el('div', { class: 'figure-box is-tappable' });
    const note = noteLine();
    const chosen = el('p', { class: 'live-value', 'aria-live': 'polite', text: '図の中の場所をタップして選ぼう' });
    const submitBtn = button('答える', () => {
      if (!selected) return;
      setNote(note, '');
      sub.submit(selected);
    }, 'btn-primary btn-block');

    function draw() {
      box.innerHTML = figures().sceneSvg(problem.figure, { highlightRegion: selected });
      box.querySelectorAll('g[data-item-type="region"]').forEach((g) => {
        const id = g.getAttribute('data-item-id');
        g.setAttribute('tabindex', sub.isDone() ? '-1' : '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', labelOf(id));
        g.setAttribute('aria-pressed', id === selected ? 'true' : 'false');
      });
    }
    function pick(id) {
      if (sub.isDone() || !id) return;
      selected = id;
      draw();
      chosen.textContent = '選んだ場所: ' + labelOf(id);
      setNote(note, '');
      submitBtn.disabled = false;
      const g = box.querySelector('g[data-item-id="' + cssEscape(id) + '"]');
      if (g && typeof g.focus === 'function') g.focus({ preventScroll: true });
    }
    box.addEventListener('click', (e) => {
      const g = e.target.closest && e.target.closest('g[data-item-type="region"]');
      if (g) pick(g.getAttribute('data-item-id'));
    });
    box.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest && e.target.closest('g[data-item-type="region"]');
      if (!g) return;
      e.preventDefault();
      pick(g.getAttribute('data-item-id'));
    });

    const sub = makeSubmitter(onAnswer, {
      invalid: () => setNote(note, INVALID_TEXT, 'warn'),
      done: (res) => {
        submitBtn.disabled = true;
        draw();
        box.classList.remove('is-tappable');
        box.classList.add(resultClass(res));
      },
    });
    submitBtn.disabled = true;
    draw();
    rootEl.append(box, chosen, note, submitBtn);
    return { disable: () => { sub.finish(); submitBtn.disabled = true; draw(); box.classList.remove('is-tappable'); } };
  }

  function cssEscape(s) {
    return root.CSS && typeof root.CSS.escape === 'function' ? root.CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  // ---- 光線を引く ----

  // 当たった点で面に垂直な向き（単位ベクトル）。レンズは null（法線を描かない）
  function surfaceNormal(surface) {
    if (!surface) return null;
    if (surface.kind === 'mirror') return geometry().normalOf(surface);
    if (surface.kind === 'boundary') return { x: 0, y: -1 };
    return null;
  }

  // 図にすでに、当たった点を通る法線があるか
  function hasNormalAt(scene, hit) {
    return ((scene && scene.items) || []).some((it) => {
      if (!it || it.type !== 'normal') return false;
      const a = (Number(it.angle) || 0) * Math.PI / 180;
      const d = { x: Math.sin(a), y: -Math.cos(a) };
      const v = { x: hit.x - Number(it.x), y: hit.y - Number(it.y) };
      return Math.abs(d.x * v.y - d.y * v.x) < 3;
    });
  }

  // ドラッグ中に出す文字（鏡: 法線との角、境界: 向きだけ、レンズ: 軸との角）
  function rayLiveText(problem, vec) {
    const g = geometry();
    const surface = problem.surface || {};
    if (surface.kind === 'mirror') {
      return '法線との角 ' + Math.round(g.angleToNormalDeg(vec, g.normalOf(surface))) + '°';
    }
    if (surface.kind === 'boundary') {
      const n = { x: 0, y: 1 };
      const inc = g.sub(problem.hit, problem.source);
      const diff = g.angleToNormalDeg(vec, n) - g.angleToNormalDeg(inc, n);
      if (Math.abs(diff) < 1) return 'まっすぐ（折れていない）';
      return diff < 0 ? '法線に近づく' : '法線から離れる';
    }
    if (surface.kind === 'lens') {
      return '軸との角 ' + Math.round(g.angleBetweenDeg(vec, { x: 1, y: 0 })) + '°';
    }
    return '';
  }

  function surfaceName(surface) {
    const kind = surface && surface.kind;
    if (kind === 'mirror') return '鏡';
    if (kind === 'boundary') return '境界';
    if (kind === 'lens') return 'レンズ';
    return '当たる点';
  }

  function renderRayDraw(rootEl, problem, onAnswer, opts) {
    const config = (opts && opts.config) || RQ.config;
    const snap = (config && config.tolerance && config.tolerance.snapPx) || 24;
    // 光源・当たる点に指が届いたとみなす半径（図の px）。図が縮んで表示されても、
    // 画面上で直径 MIN_TOUCH_PX 以上になるようにする
    function snapR() {
      const ctm = svg.getScreenCTM();
      const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
      return scale > 0 ? Math.max(snap, MIN_TOUCH_PX / 2 / scale) : snap;
    }
    const source = problem.source;
    const hit = problem.hit;
    const name = surfaceName(problem.surface);

    const box = figureBox(problem.figure, {}, 'is-drawable');
    const svg = box.querySelector('svg');
    svg.style.touchAction = 'none';
    const live = el('p', { class: 'live-value', 'aria-live': 'polite' });
    const note = noteLine();

    // 図の上に重ねる層（図と同じ座標）
    const layer = svgEl('g', { class: 'ray-overlay' });
    const n = surfaceNormal(problem.surface);
    if (n && !hasNormalAt(problem.figure, hit)) {
      layer.append(svgEl('line', {
        x1: hit.x - n.x * GUIDE_HALF, y1: hit.y - n.y * GUIDE_HALF, x2: hit.x + n.x * GUIDE_HALF, y2: hit.y + n.y * GUIDE_HALF,
        class: 'normal-guide',
      }));
    }
    const seg1 = svgEl('line', { class: 'drawn-ray', visibility: 'hidden' });
    const seg2 = svgEl('line', { class: 'drawn-ray drawn-out', visibility: 'hidden' });
    const sourceHandle = svgEl('circle', { cx: source.x, cy: source.y, r: HANDLE_R, class: 'ray-handle' });
    const hitHandle = svgEl('circle', { cx: hit.x, cy: hit.y, r: HANDLE_R, class: 'ray-handle', visibility: 'hidden' });
    layer.append(seg1, seg2, sourceHandle, hitHandle);
    svg.append(layer);

    let phase = 1;          // 1: 光源→当たる点を引く / 2: 折れた先を引く
    let dragging = null;    // null | 'seg1' | 'seg2'
    let pointerId = null;
    let out = null;         // 決めた折れた先の点

    const submitBtn = button('答える', () => {
      if (!out) return;
      setNote(note, '');
      sub.submit({ out: { x: round2(out.x), y: round2(out.y) } });
    }, 'btn-primary');
    const resetBtn = button('引き直す', () => {
      if (sub.isDone()) return;
      phase = 1; out = null; dragging = null;
      seg1.setAttribute('visibility', 'hidden');
      seg2.setAttribute('visibility', 'hidden');
      setNote(note, '');
      refresh();
    });

    function instruction() {
      if (phase === 1) return '① 光源から' + name + 'まで、指でなぞって光を引こう';
      if (!out) return '② ' + name + 'に当たった点から、光が進む先へ指を動かそう';
      return rayLiveText(problem, geometry().sub(out, hit)) + '（よければ「答える」）';
    }
    function refresh() {
      sourceHandle.setAttribute('visibility', phase === 1 && !sub.isDone() ? 'visible' : 'hidden');
      hitHandle.setAttribute('visibility', phase === 2 && !sub.isDone() ? 'visible' : 'hidden');
      submitBtn.disabled = sub.isDone() || !out;
      resetBtn.disabled = sub.isDone() || (phase === 1 && !dragging);
      if (!dragging) live.textContent = sub.isDone() ? '' : instruction();
    }

    // 第 1 段階を終えた状態にする（入射光は当たった点まで）
    function snapFirst() {
      setLine(seg1, source, hit);
      seg1.setAttribute('visibility', 'visible');
      phase = 2;
    }

    function onDown(e) {
      if (sub.isDone() || dragging) return;
      const p = toLocal(svg, e);
      if (phase === 1) {
        if (dist(p, source) <= snapR()) {
          dragging = 'seg1';
          setLine(seg1, source, p);
          seg1.setAttribute('visibility', 'visible');
          live.textContent = name + 'に当たる点まで引こう';
        } else if (dist(p, hit) <= snapR()) {
          // 入射光は図に描いてあるので、当たった点から引き始めてもよい
          snapFirst();
          startOut(p);
        } else {
          setNote(note, '光源から' + name + 'まで引こう', 'warn');
          return;
        }
      } else if (dist(p, hit) <= snapR()) {
        startOut(p);
      } else {
        setNote(note, name + 'に当たった点から引こう', 'warn');
        return;
      }
      e.preventDefault();
      pointerId = e.pointerId;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 捕まえられなくても続ける */ }
      setNote(note, '');
      refresh();
    }

    function startOut(p) {
      dragging = 'seg2';
      setLine(seg2, hit, p);
      seg2.setAttribute('visibility', dist(p, hit) >= MIN_DRAG ? 'visible' : 'hidden');
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      e.preventDefault();
      const p = toLocal(svg, e);
      if (dragging === 'seg1') {
        setLine(seg1, source, p);
        live.textContent = dist(p, hit) <= snapR() ? 'ここで指をはなそう' : name + 'に当たる点まで引こう';
      } else {
        setLine(seg2, hit, p);
        const long = dist(p, hit) >= MIN_DRAG;
        seg2.setAttribute('visibility', long ? 'visible' : 'hidden');
        if (long) live.textContent = rayLiveText(problem, geometry().sub(p, hit));
      }
    }

    function onUp(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      const p = toLocal(svg, e);
      const kind = dragging;
      dragging = null;
      pointerId = null;
      if (kind === 'seg1') {
        if (dist(p, hit) <= snapR() && dist(p, source) >= MIN_DRAG) {
          snapFirst();
        } else {
          seg1.setAttribute('visibility', 'hidden');
          if (dist(p, source) >= MIN_DRAG) setNote(note, '光源から' + name + 'まで引こう', 'warn');
        }
      } else if (dist(p, hit) >= MIN_DRAG) {
        out = p;
        setLine(seg2, hit, p);
        seg2.setAttribute('visibility', 'visible');
        refresh();
        return;
      } else if (out) {
        // 短すぎるドラッグは無視して、前に引いた線に戻す
        setLine(seg2, hit, out);
        seg2.setAttribute('visibility', 'visible');
      } else {
        seg2.setAttribute('visibility', 'hidden');
      }
      refresh();
    }

    function onCancel(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      const kind = dragging;
      dragging = null;
      pointerId = null;
      if (kind === 'seg1') seg1.setAttribute('visibility', 'hidden');
      else if (out) setLine(seg2, hit, out);
      else seg2.setAttribute('visibility', 'hidden');
      refresh();
    }

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onCancel);

    const sub = makeSubmitter(onAnswer, {
      invalid: () => { setNote(note, INVALID_TEXT, 'warn'); refresh(); },
      done: (res) => {
        box.classList.remove('is-drawable');
        box.classList.add(resultClass(res));
        refresh();
        if (out) live.textContent = rayLiveText(problem, geometry().sub(out, hit));
      },
    });
    rootEl.append(box, live, note, el('div', { class: 'btn-row' }, [resetBtn, submitBtn]));
    refresh();
    return { disable: () => { sub.finish(); box.classList.remove('is-drawable'); refresh(); } };
  }

  // ---- 光学要素を動かす ----

  // ドラッグの基準点（解答の { x, y }）: 場面の x・y（なければ cx・cy、線分の中点、points の平均）
  function anchorOf(it) {
    const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
    // 折れ線・多角形（line / polygon）は points の平均（figures.js の centerOf と同じ）
    if (Array.isArray(it.points) && it.points.length > 0) {
      const pts = it.points.filter((p) => Array.isArray(p) && p.length >= 2).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]);
      if (pts.length > 0) {
        return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
      }
    }
    const pick = (...vals) => vals.find((v) => v !== null && Number.isFinite(v));
    const x = pick(num(it.x), num(it.cx), num(it.x1) !== null && num(it.x2) !== null ? (num(it.x1) + num(it.x2)) / 2 : null, num(it.x1));
    const y = pick(num(it.y), num(it.cy), num(it.y1) !== null && num(it.y2) !== null ? (num(it.y1) + num(it.y2)) / 2 : null, num(it.y1));
    return { x: x === undefined ? 0 : x, y: y === undefined ? 0 : y };
  }

  function renderDrag(rootEl, problem, onAnswer) {
    const scene = problem.figure || {};
    const drag = problem.draggable || {};
    const axis = drag.axis || 'xy';
    const item = (scene.items || []).find((it) => it && it.id === drag.itemId) || {};
    const base = anchorOf(item);
    const width = Number(scene.width) || 320;
    const height = Number(scene.height) || 240;

    const box = figureBox(scene, { draggableId: drag.itemId }, 'is-draggable-figure');
    const svg = box.querySelector('svg');
    svg.style.touchAction = 'none';
    const g = svg.querySelector('g[data-item-id="' + cssEscape(drag.itemId) + '"]');
    const live = el('p', { class: 'live-value', 'aria-live': 'polite' });
    const note = noteLine();
    const what = item.label || ITEM_NAMES[item.type] || 'もの';
    const way = axis === 'x' ? '左右に' : axis === 'y' ? '上下に' : '';

    const offset = { x: 0, y: 0 };
    let moved = false;
    let dragging = null;   // { pointerId, start, from }

    function position() { return { x: base.x + offset.x, y: base.y + offset.y }; }
    function liveText() {
      const p = position();
      if (axis === 'x') return '位置: ' + Math.round(p.x);
      if (axis === 'y') return '位置: ' + Math.round(p.y);
      return '位置: (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')';
    }
    function apply() {
      if (g) g.setAttribute('transform', 'translate(' + round2(offset.x) + ' ' + round2(offset.y) + ')');
      live.textContent = liveText();
      submitBtn.disabled = sub.isDone() || !moved;
    }
    // 基準点が図の中におさまるように動かす
    function moveTo(dx, dy) {
      if (axis === 'y') dx = 0;
      if (axis === 'x') dy = 0;
      offset.x = Math.max(-base.x, Math.min(width - base.x, dx));
      offset.y = Math.max(-base.y, Math.min(height - base.y, dy));
      moved = true;
      setNote(note, '');
      apply();
    }

    const submitBtn = button('答える', () => {
      if (!moved) return;
      setNote(note, '');
      const p = position();
      sub.submit({ x: round2(p.x), y: round2(p.y) });
    }, 'btn-primary btn-block');

    if (g) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'slider');
      g.setAttribute('aria-label', what + 'を' + way + '動かす（矢印キーでも動かせる）');
      g.addEventListener('pointerdown', (e) => {
        if (sub.isDone() || dragging) return;
        e.preventDefault();
        dragging = { pointerId: e.pointerId, start: toLocal(svg, e), from: { x: offset.x, y: offset.y } };
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 捕まえられなくても続ける */ }
        g.classList.add('is-dragging');
      });
      g.addEventListener('keydown', (e) => {
        if (sub.isDone()) return;
        const step = KEY_STEP * (e.shiftKey ? 5 : 1);
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        moveTo(offset.x + d[0], offset.y + d[1]);
      });
    }
    svg.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== dragging.pointerId) return;
      e.preventDefault();
      const p = toLocal(svg, e);
      moveTo(dragging.from.x + p.x - dragging.start.x, dragging.from.y + p.y - dragging.start.y);
    });
    const end = (e) => {
      if (!dragging || e.pointerId !== dragging.pointerId) return;
      dragging = null;
      if (g) g.classList.remove('is-dragging');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    const sub = makeSubmitter(onAnswer, {
      invalid: () => { setNote(note, INVALID_TEXT, 'warn'); apply(); },
      done: (res) => {
        box.classList.add(resultClass(res));
        if (g) { g.setAttribute('tabindex', '-1'); g.style.cursor = 'default'; }
        apply();
      },
    });
    rootEl.append(box, el('p', { class: 'muted', text: '「' + what + '」を指で' + way + '動かそう' }), live, note, submitBtn);
    apply();
    live.textContent = liveText();
    return { disable: () => { sub.finish(); apply(); } };
  }

  // ---- 入口 ----

  const RENDERERS = {
    'choice': renderChoice,
    'fill': renderFill,
    'figure-choice': renderFigureChoice,
    'ray-draw': renderRayDraw,
    'drag': renderDrag,
  };

  function render(rootEl, problem, onAnswer, opts) {
    const fn = problem && Object.prototype.hasOwnProperty.call(RENDERERS, problem.type) ? RENDERERS[problem.type] : null;
    const box = el('div', { class: 'problem-widget widget-' + (problem && problem.type) });
    rootEl.append(box);
    if (!fn) {
      box.append(el('p', { text: 'この形式の問題はまだ表示できません。' }));
      return { disable() {} };
    }
    return fn(box, problem, onAnswer, opts || {});
  }

  // 解答の前後で問題の図だけを見せる（フィードバックから再開したときなど）
  function staticFigure(problem) {
    return problem && problem.figure ? figureBox(problem.figure) : null;
  }

  const api = { render, staticFigure };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.RikaQuest = root.RikaQuest || {};
    root.RikaQuest.ui = Object.assign(root.RikaQuest.ui || {}, { problems: api });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
