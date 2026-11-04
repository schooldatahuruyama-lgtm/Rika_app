// 解説カードの動く図（生物: 動物・からだ・遺伝・自然と人間）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 7 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（nerveItems・chromRow・chromCell・chrom・carbonCycle）は content の中に
// あって anim から呼べないので、同じ式をここに写す（出どころは各関数のコメント）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, ease, growLine, along } = anim.helpers;

  // 小数部分（0 以上 1 未満）
  function frac(x) { return x - Math.floor(x); }

  // 文字（静止図の text と同じ形）
  function text(x, y, s, extra) { return Object.assign({ type: 'text', x, y, text: s, size: 12 }, extra || {}); }
  // 信号・炭素などの点（半径 3〜5）
  function dot(p, r, fill) { return { type: 'circle', x: p.x, y: p.y, r, fill, stroke: 'ink' }; }

  // ================================================================
  // 生物のからだのつくりとはたらき（body）
  // ================================================================

  // content/body.js の nerveItems と同じ部品（脳・脊髄・筋肉・皮ふ）。神経の線と筋肉の形は動く図の側で描く
  const SENSORY = [[264, 156], [160, 176], [70, 176]];   // 感覚神経（皮ふ → 脊髄）
  const MOTOR = [[68, 130], [148, 100]];                 // 運動神経（脊髄 → 筋肉）
  const IN_CORD = [[70, 176], [60, 176], [60, 130], [68, 130]];   // 脊髄の中（感覚神経の先 → 運動神経の根もと）
  const TO_BRAIN = [[60, 130], [60, 66]];                // 脊髄 → 脳（点線）
  const BRAIN_FROM = 0.4, BRAIN_AT = 0.68;               // 脳へ向かう信号が脊髄を出る時刻・脳に着く時刻

  // 熱いものにふれた信号が 皮ふ → 感覚神経 → 脊髄 → 運動神経 → 筋肉 と伝わり、筋肉が縮む。
  // 脳へ向かう信号は脊髄から同時に出るが、着くのは筋肉が縮み始めたあと（反射は脳を通らない）（body-4-c4）
  // 脳に着いた後（0.68〜1）は「あとで「熱い」と感じる」を出して止まって見せる（1 周の 0.3 以上）
  function boReflex(t) {
    const p1 = stage(t, 0, 0.3);       // 皮ふ → 脊髄
    const p2 = stage(t, 0.3, 0.4);     // 脊髄の中
    const p3 = stage(t, 0.4, 0.6);     // 脊髄 → 筋肉
    const m = ease(stage(t, 0.6, 0.7));    // 筋肉が縮む
    const p4 = stage(t, BRAIN_FROM, BRAIN_AT);   // 脊髄 → 脳（ゆっくり）
    const items = [
      { type: 'ellipse', x: 60, y: 44, rx: 40, ry: 26, fill: 'pink', stroke: 'line' },
      { type: 'rect', x: 52, y: 66, width: 16, height: 150, fill: 'pink', stroke: 'line' },
      { type: 'ellipse', x: 180, y: 96, rx: 32 - 6 * m, ry: 12 + 3 * m, fill: '#E6A57E', stroke: 'line' },
      { type: 'rect', x: 264, y: 140, width: 40, height: 24, fill: 'sand', stroke: 'line' },
      ...growLine(SENSORY, p1, { color: 'blue', width: 3 }),
      ...growLine(MOTOR, p3, { color: 'orange', width: 3 }),
      ...growLine(TO_BRAIN, p4, { color: 'blue', width: 2, dashed: true }),
    ];
    // 信号の丸（黄色）: 線の先を進む。筋肉に着いたら消える
    if (t < 0.3) items.push(dot(along(SENSORY, p1), 5, 'yellow'));
    else if (t < 0.4) items.push(dot(along(IN_CORD, p2), 5, 'yellow'));
    else if (t < 0.6) items.push(dot(along(MOTOR, p3), 5, 'yellow'));
    // 脳へ向かう信号の丸（脳に着いたら消える）
    if (t >= BRAIN_FROM && t < BRAIN_AT) items.push(dot(along(TO_BRAIN, p4), 4, 'yellow'));
    items.push(
      text(108, 40, '脳', { size: 13 }),
      text(76, 214, '脊髄', { size: 13 }),
      text(92, 94, '運動神経', { size: 13 }),
      text(216, 82, '筋肉', { size: 13 }),
      text(128, 200, '感覚神経', { size: 13 }),
      text(284, 132, '皮ふ', { size: 13, anchor: 'middle' }),
      text(316, 236, '皮ふ → 感覚神経 → 脊髄 → 運動神経 → 筋肉', { anchor: 'end' }),
    );
    if (t < 0.15) items.push(text(262, 126, '熱い！', { size: 13, anchor: 'end', color: 'red', bold: true }));
    if (t >= BRAIN_AT) items.push(text(110, 62, 'あとで「熱い」と感じる'));
    return items;
  }

  // ================================================================
  // 生命の連続性（heredity）
  // ================================================================

  // 染色体 1 本（紫の太い線）。content/heredity.js の chrom と同じ式（色を変えられるようにした）
  function chrom(x1, y1, x2, y2, width, color) {
    return { type: 'line', points: [[x1, y1], [x2, y2]], color: color || 'purple', width: width || 4 };
  }

  // 細胞の中の 4 本の染色体（長い 2 本・短い 2 本）の [dx, 半分の長さ]。content/heredity.js の chromRow と同じ値
  const ROW = [[-15, 11], [-5, 6], [5, 11], [15, 6]];
  // content/heredity.js の chromRow と同じ式（色を変えられるようにした）
  function chromRow(cx, cy, doubled, color) {
    const out = [];
    ROW.forEach(([dx, h]) => {
      if (doubled) {
        out.push(chrom(cx + dx - 2, cy - h, cx + dx - 2, cy + h, 3, color));
        out.push(chrom(cx + dx + 2, cy - h, cx + dx + 2, cy + h, 3, color));
      } else {
        out.push(chrom(cx + dx, cy - h, cx + dx, cy + h, undefined, color));
      }
    });
    return out;
  }
  function cell(x, y, r, stroke) { return { type: 'circle', x, y, r, fill: 'white', stroke: stroke || 'line' }; }

  // 中央の細胞で染色体が複製されて 2 本ずつになり、それぞれ 1 本ずつが右の 2 つの細胞に分かれて入る（life-1-c2）
  function heChromosomeCopy(t) {
    const p1 = stage(t, 0.05, 0.3);          // 複製（2 本に分かれる）
    const p2 = ease(stage(t, 0.4, 0.8));     // 右の細胞へ動く
    const items = [
      cell(54, 100, 34),
      ...chromRow(54, 100, false),
      { type: 'arrow', x1: 92, y1: 100, x2: 118, y2: 100, width: 2 },
      cell(156, 100, 34),
    ];
    if (p2 <= 0) {
      // 1 本が 2 本に分かれていく（p1 = 1 で静止図の 139/143 などの位置）
      ROW.forEach(([dx, h]) => {
        const w = lerp(4, 3, p1);
        items.push(chrom(156 + dx - 2 * p1, 100 - h, 156 + dx - 2 * p1, 100 + h, w));
        items.push(chrom(156 + dx + 2 * p1, 100 - h, 156 + dx + 2 * p1, 100 + h, w));
      });
    } else if (p2 < 1) {
      items.push(...chromRow(156, 100, true, 'gray'));   // 動いているあいだ、もとの場所は灰色で残す
    } else {
      items.push(...chromRow(156, 100, true));           // 動き終わったら静止図と同じ絵
    }
    if (p2 > 0) {
      items.push(
        { type: 'arrow', x1: 194, y1: 90, x2: 228, y2: 70, width: 2 },
        { type: 'arrow', x1: 194, y1: 110, x2: 228, y2: 138, width: 2 },
        cell(266, 60, 28 * p2),
        cell(266, 150, 28 * p2),
      );
      if (p2 < 1) {
        // 組の左の 1 本は上の細胞へ、右の 1 本は下の細胞へ
        ROW.forEach(([dx, h]) => {
          const w = lerp(3, 4, p2);
          const xu = lerp(156 + dx - 2, 266 + dx, p2), yu = lerp(100, 60, p2);
          const xd = lerp(156 + dx + 2, 266 + dx, p2), yd = lerp(100, 150, p2);
          items.push(chrom(xu, yu - h, xu, yu + h, w));
          items.push(chrom(xd, yd - h, xd, yd + h, w));
        });
      } else {
        items.push(...chromRow(266, 60, false), ...chromRow(266, 150, false));
      }
    }
    items.push(
      text(54, 156, 'もとの細胞', { anchor: 'middle' }),
      text(54, 174, '4 本', { anchor: 'middle' }),
      text(156, 156, '複製されて', { anchor: 'middle' }),
      text(156, 174, '2 本ずつに', { anchor: 'middle' }),
    );
    if (p2 >= 1) {
      items.push(
        text(266, 200, '4 本ずつ', { anchor: 'middle' }),
        text(266, 218, '（もとと同じ）', { anchor: 'middle' }),
      );
    }
    return items;
  }

  // 染色体を n 本（2・4）もつ細胞の染色体の位置 [{ x, half }]（長い・短いが交互）。
  // content/heredity.js の chromCell と同じ式（n が 4 以下の 1 列のときだけ）
  function chromPos(cx, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: cx + (i - (n - 1) / 2) * 9, half: i % 2 === 0 ? 9 : 5 });
    return out;
  }
  // content/heredity.js の chromCell と同じ絵（色を変えられるようにした）
  function chromCell(cx, cy, r, n, color, stroke) {
    return [cell(cx, cy, r, stroke)].concat(chromPos(cx, n).map(c => chrom(c.x, cy - c.half, c.x, cy + c.half, undefined, color)));
  }

  // 細胞の位置（静止図）: 親（上・下）、精子・卵、受精卵
  const PARENT_UP = { x: 40, y: 60 }, PARENT_DOWN = { x: 40, y: 172 };
  const SPERM = { x: 120, y: 60, r: 18 }, EGG = { x: 124, y: 172, r: 24 }, ZYGOTE = { x: 240, y: 116, r: 32 };

  // 親の細胞（4 本）から減数分裂で長い 1 本・短い 1 本が精子と卵へ（2 本）。精子と卵が受精して受精卵（4 本）になる（life-2-c2）
  function heMeiosisFertilize(t) {
    const p1 = ease(stage(t, 0, 0.35));     // 減数分裂（親 → 精子・卵）
    const p2 = ease(stage(t, 0.45, 0.8));   // 受精（精子・卵 → 受精卵）
    const zPos = chromPos(ZYGOTE.x, 4);     // 受精卵の 4 本: 0・1 は精子から、2・3 は卵から
    const items = [text(40, 22, '親の細胞', { anchor: 'middle' })];

    // 親の細胞。p1 > 0 で、分かれて出ていかない 2 本を灰色にする（出ていく 2 本は動く染色体として描く）。
    // 受精卵ができたら（p2 = 1）、親・精子・卵は静止図と同じ紫の絵にもどす（止まった絵で 4 本 → 2 本 → 4 本が読めるように）
    [[PARENT_UP, SPERM], [PARENT_DOWN, EGG]].forEach(([par, gam]) => {
      items.push(cell(par.x, par.y, 26));
      const pPos = chromPos(par.x, 4), gPos = chromPos(gam.x, 2);
      pPos.forEach((c, i) => {
        if (p1 <= 0 || p2 >= 1) items.push(chrom(c.x, par.y - c.half, c.x, par.y + c.half));
        else if (i >= 2) items.push(chrom(c.x, par.y - c.half, c.x, par.y + c.half, undefined, 'gray'));
      });
      // 精子・卵（p1 > 0 で出す）。受精が始まったら、もとの場所は灰色で残す
      if (p1 > 0 && p2 <= 0) {
        items.push(cell(gam.x, gam.y, gam.r));
        gPos.forEach((g, i) => {
          const x = lerp(pPos[i].x, g.x, p1), y = lerp(par.y, gam.y, p1);
          items.push(chrom(x, y - g.half, x, y + g.half));
        });
      }
      if (p2 > 0 && p2 < 1) items.push(...chromCell(gam.x, gam.y, gam.r, 2, 'gray', 'gray'));
      if (p2 >= 1) items.push(...chromCell(gam.x, gam.y, gam.r, 2));
    });

    items.push(
      { type: 'arrow', x1: 70, y1: 60, x2: 98, y2: 60, width: 2 },
      { type: 'arrow', x1: 70, y1: 172, x2: 96, y2: 172, width: 2 },
      text(84, 120, '減数分裂', { anchor: 'middle' }),
      text(120, 98, '精子（2 本）', { anchor: 'middle' }),
      text(124, 214, '卵（2 本）', { anchor: 'middle' }),
      { type: 'arrow', x1: 142, y1: 70, x2: 196, y2: 104, width: 2 },
      { type: 'arrow', x1: 152, y1: 160, x2: 196, y2: 130, width: 2 },
      text(168, 122, '受精', { anchor: 'middle' }),
    );

    if (p2 > 0 && p2 < 1) {
      // 卵は受精卵の大きさへ、精子は小さくなりながら卵に入る。染色体は受精卵の中の位置へ
      const ex = lerp(EGG.x, ZYGOTE.x, p2), ey = lerp(EGG.y, ZYGOTE.y, p2);
      const sx = lerp(SPERM.x, ZYGOTE.x, p2), sy = lerp(SPERM.y, ZYGOTE.y, p2);
      items.push(cell(ex, ey, lerp(EGG.r, ZYGOTE.r, p2)), cell(sx, sy, SPERM.r * (1 - p2)));
      [[SPERM, 0], [EGG, 2]].forEach(([gam, off]) => {
        chromPos(gam.x, 2).forEach((g, i) => {
          const z = zPos[off + i];
          const x = lerp(g.x, z.x, p2), y = lerp(gam.y, ZYGOTE.y, p2);
          items.push(chrom(x, y - g.half, x, y + g.half));
        });
      });
    }
    if (p2 >= 1) items.push(...chromCell(ZYGOTE.x, ZYGOTE.y, ZYGOTE.r, 4));
    items.push(text(240, 170, '受精卵（4 本）', { anchor: 'middle' }));

    // 「4 本 → 2 本 → 4 本」。今の段階の数を青にする
    const now = p2 >= 1 ? 2 : (p1 >= 1 ? 1 : 0);
    [[192, '4 本'], [240, '2 本'], [288, '4 本']].forEach(([x, s], i) => {
      items.push(text(x, 214, s, Object.assign({ size: 13, anchor: 'middle' }, i === now ? { color: 'blue', bold: true } : {})));
    });
    items.push(text(216, 214, '→', { size: 13, anchor: 'middle' }), text(264, 214, '→', { size: 13, anchor: 'middle' }));
    return items;
  }

  // 子（Aa）の細胞の 2 本の染色体が、減数分裂で別々の生殖細胞に分かれて入る（分離の法則。life-3-c3）
  function heSegregation(t) {
    const p = ease(stage(t, 0.1, 0.7));
    const moving = p > 0;
    const items = [
      cell(70, 110, 40),
      // もとの細胞: 動き始めたら灰色で残す（文字の位置は静止図と同じ）
      chrom(60, 90, 60, 130, 5, moving ? 'gray' : undefined),
      chrom(80, 90, 80, 130, 5, moving ? 'gray' : undefined),
      text(46, 116, 'A', Object.assign({ size: 16, anchor: 'middle', bold: true }, moving ? { color: 'gray' } : {})),
      text(96, 116, 'a', Object.assign({ size: 16, anchor: 'middle', bold: true }, moving ? { color: 'gray' } : {})),
      text(70, 172, '子（Aa）の細胞', { size: 13, anchor: 'middle' }),
      { type: 'arrow', x1: 114, y1: 96, x2: 196, y2: 62, width: 2 },
      { type: 'arrow', x1: 114, y1: 124, x2: 196, y2: 158, width: 2 },
      text(150, 116, '減数分裂', { size: 13, anchor: 'middle' }),
    ];
    if (moving) {
      items.push(cell(232, 56, 26 * p), cell(232, 164, 26 * p));
      // A → 上の生殖細胞 (226, 42〜70)、a → 下の生殖細胞 (226, 150〜178)。長さは 40 → 28
      items.push(chrom(lerp(60, 226, p), lerp(90, 42, p), lerp(60, 226, p), lerp(130, 70, p), 5));
      items.push(chrom(lerp(80, 226, p), lerp(90, 150, p), lerp(80, 226, p), lerp(130, 178, p), 5));
      items.push(text(lerp(46, 244, p), lerp(116, 62, p), 'A', { size: 16, anchor: 'middle', bold: true }));
      items.push(text(lerp(96, 244, p), lerp(116, 170, p), 'a', { size: 16, anchor: 'middle', bold: true }));
    }
    items.push(text(232, 216, '生殖細胞', { size: 13, anchor: 'middle' }));
    return items;
  }

  // ================================================================
  // 自然と人間（nature）
  // ================================================================

  const BALANCE_BOXES = [
    [14, '① 草食動物が増える'],
    [70, '② 植物が減り、肉食動物が増える'],
    [126, '③ 草食動物が減る'],
    [182, '④ 植物が増え、肉食動物が減る'],
  ];
  // 生物の数量 P（植物）・H（草食動物）・C（肉食動物）。1 がつり合いの量で、t = 0 はつり合い（① の前）。
  // 各段階では文に書いた生物だけが変わる: ① H 1 → 1.3、② P 1 → 0.7・C 1 → 1.3、③ H 1.3 → 1、④ P 0.7 → 1・C 1.3 → 1（t = 1 でつり合いにもどる）
  function balanceAmounts(t) {
    const s = (k) => ease(stage(t, k / 4, (k + 1) / 4));   // k 番目の段階の進み（0→1）
    return {
      P: 1 - 0.3 * s(1) + 0.3 * s(3),
      H: 1 + 0.3 * s(0) - 0.3 * s(2),
      C: 1 + 0.3 * s(1) - 0.3 * s(3),
    };
  }

  // ①〜④の箱を順に強調し、強調した箱の右に生物の数量の小さなピラミッドを描く（nature-1-c4）
  function naBalance(t) {
    const k = Math.min(3, Math.floor(4 * t));
    const back = k === 3 && 4 * t - 3 >= 0.5;   // ④ の後半: もとのつり合いへ
    const { P, H, C } = balanceAmounts(t);
    const items = BALANCE_BOXES.flatMap(([y, s], i) => [
      { type: 'rect', x: 16, y, width: 272, height: 34, rx: 6, fill: i === k ? '#FFF3C4' : 'white', stroke: 'line' },
      text(28, y + 22, s, { size: 13 }),
    ]);
    // ピラミッド（色は content/nature.js の pyramid と同じ: 植物 green・草食 yellow・肉食 orange）。中心 x 262
    const y0 = BALANCE_BOXES[k][0];
    [[C, 12, 'orange', 5], [H, 24, 'yellow', 14], [P, 36, 'green', 23]].forEach(([q, base, fill, dy]) => {
      const w = base * q;
      items.push({ type: 'rect', x: 262 - w / 2, y: y0 + dy, width: w, height: 8, fill, stroke: 'none' });
    });
    items.push(
      { type: 'arrow', x1: 152, y1: 49, x2: 152, y2: 67, width: 2 },
      { type: 'arrow', x1: 152, y1: 105, x2: 152, y2: 123, width: 2 },
      { type: 'arrow', x1: 152, y1: 161, x2: 152, y2: 179, width: 2 },
      Object.assign({ type: 'line', points: [[290, 199], [308, 199], [308, 31], [292, 31]], width: 2, arrow: true }, back ? { color: 'blue' } : {}),
      text(316, 236, 'もとのつり合いへ', Object.assign({ anchor: 'end' }, back ? { color: 'blue' } : {})),
    );
    return items;
  }

  // content/nature.js の carbonCycle と同じ部品
  function carbonCycle() {
    return [
      { type: 'rect', x: 10, y: 12, width: 300, height: 40, rx: 12, fill: 'sky', stroke: 'line' },
      { type: 'text', x: 160, y: 38, text: '大気中の二酸化炭素', anchor: 'middle', size: 14 },
      { type: 'rect', x: 12, y: 170, width: 88, height: 36, fill: 'lightgreen' },
      { type: 'text', x: 56, y: 193, text: '植物', anchor: 'middle', size: 14 },
      { type: 'rect', x: 128, y: 170, width: 64, height: 36, fill: 'pink' },
      { type: 'text', x: 160, y: 193, text: '動物', anchor: 'middle', size: 14 },
      { type: 'rect', x: 222, y: 170, width: 86, height: 36, fill: 'sand' },
      { type: 'text', x: 265, y: 193, text: '分解者', anchor: 'middle', size: 14 },
      { type: 'arrow', x1: 30, y1: 54, x2: 30, y2: 166, color: 'gray' },
      { type: 'arrow', x1: 84, y1: 168, x2: 84, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 160, y1: 168, x2: 160, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 264, y1: 168, x2: 264, y2: 56, color: 'gray' },
      { type: 'arrow', x1: 100, y1: 188, x2: 124, y2: 188, width: 2 },
      { type: 'arrow', x1: 192, y1: 188, x2: 218, y2: 188, width: 2 },
      { type: 'line', points: [[56, 206], [56, 228], [250, 228], [250, 210]], width: 2, arrow: true },
    ];
  }
  // 炭素が動く道すじ（静止図の矢印と同じ点）: 大気 → 植物、植物 → 動物、動物 → 分解者、植物 → 分解者、植物・動物・分解者 → 大気
  const CARBON_PATHS = [
    [[30, 54], [30, 166]],
    [[100, 188], [124, 188]],
    [[192, 188], [218, 188]],
    [[56, 206], [56, 228], [250, 228], [250, 210]],
    [[84, 168], [84, 56]],
    [[160, 168], [160, 56]],
    [[264, 168], [264, 56]],
  ];

  // 炭素の流れを点で表す。7 本の道すじに点を 2 つずつ流す（nature-2-c4）
  // 位置は frac(t + k/2 + 0.25)。0.25 ずらして、点が道すじのはしで消えて始めにもどる時刻を t = 0 からはずす（1 周がつながる）
  function naCarbonCycle(t) {
    const items = carbonCycle().concat([
      text(36, 118, '光合成'),
      text(90, 118, '呼吸'),
      text(166, 118, '呼吸'),
      text(270, 118, '呼吸'),
      text(160, 222, '死がい・ふん', { anchor: 'middle' }),
    ]);
    CARBON_PATHS.forEach(path => {
      for (let k = 0; k < 2; k++) items.push(dot(along(path, frac(t + k / 2 + 0.25)), 4, 'ink'));
    });
    items.push(text(186, 146, '● 炭素の動き'));   // 凡例
    return items;
  }

  const DEFS = [
    ['bo-reflex', boReflex, { restT: 0.99 }],
    ['he-chromosome-copy', heChromosomeCopy, { restT: 0.99 }],
    ['he-meiosis-fertilize', heMeiosisFertilize, { restT: 0.99 }],
    ['he-segregation', heSegregation, { restT: 0.99 }],
    ['na-balance', naBalance, { restT: 0, period: 8000 }],
    ['na-carbon-cycle', naCarbonCycle, { restT: 0 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind（テスト用）と、テストで使う値
  const api = { KINDS: DEFS.map(d => d[0]), balanceAmounts, CARBON_PATHS };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
