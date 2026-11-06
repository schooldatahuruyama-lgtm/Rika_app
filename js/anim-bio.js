// 解説カードの動く図（生物: 動物・からだ・遺伝・自然と人間）。js/anim.js の register で足す。
// 各 kind の動き・数値は docs/anim-plan.md の 7 章。静止図（content/*.js の figure）と同じ部品は同じ座標・文字・色を使い、
// 動く部品だけを式で動かす。静止図を作る関数（nerveItems・chromRow・chromCell・chrom・carbonCycle）は content の中に
// あって anim から呼べないので、同じ式をここに写す（出どころは各関数のコメント）。
(function (root) {
  'use strict';
  const anim = typeof require === 'function' ? require('./anim.js') : root.RikaQuest.anim;
  const { stage, lerp, ease, growLine, along, partial, pathLen, u, mix, TOKEN_HEX } = anim.helpers;

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

  // ================================================================
  // 優先度 B（計画 7 章の B の 3 本）
  // ================================================================

  // ---- 動物のなかま（animals）----

  // content/animals.js の gx・gy・tempGraph と同じ式（気温と体温のグラフ。横 1 ℃ ＝ 5px、縦 1 ℃ ＝ 4px）
  function gx(T) { return 60 + 5 * T; }
  function gy(T) { return 200 - 4 * T; }
  function tempGraph() {
    const items = [{ type: 'line', points: [[60, 30], [60, 200], [290, 200]], width: 2 }];
    [0, 10, 20, 30, 40].forEach(v => {
      items.push(
        { type: 'line', points: [[gx(v), 200], [gx(v), 206]], width: 2 },
        { type: 'text', x: gx(v), y: 220, text: String(v), anchor: 'middle', size: 12 },
        { type: 'line', points: [[54, gy(v)], [60, gy(v)]], width: 2 },
        { type: 'text', x: 50, y: gy(v) + 4, text: String(v), anchor: 'end', size: 12 },
      );
    });
    items.push(
      { type: 'text', x: 4, y: 20, text: '体温〔℃〕', size: 12 },
      { type: 'text', x: 316, y: 236, text: '気温〔℃〕', anchor: 'end', size: 12 },
    );
    return items;
  }
  const DOG_TEMP = 38;   // 恒温動物（イヌ）の体温
  // 「変温動物（トカゲ）」(160,168) の文字の範囲（縦の点線はこの範囲を通らない）
  const LIZARD_LABEL = { left: 158, right: 279, top: 154, bottom: 172 };
  // 気温（℃）: 4 → 36 → 4（変温動物の線の範囲）
  const airTemp = (t) => 4 + 32 * u(t);
  // 気温が変わると、変温動物（トカゲ）の体温は気温といっしょに変わり、恒温動物（イヌ）の体温は 38 ℃ のまま（animals-2-c2）
  function anBodyTemp(t) {
    const T = airTemp(t);
    const x = gx(T);
    const items = tempGraph().concat([
      { type: 'line', points: [[gx(0), gy(DOG_TEMP)], [gx(40), gy(DOG_TEMP)]], color: 'orange', width: 3 },
      { type: 'text', x: gx(2), y: gy(DOG_TEMP) - 8, text: '恒温動物（イヌ）', size: 13 },
      { type: 'line', points: [[gx(4), gy(4)], [gx(36), gy(36)]], color: 'blue', width: 3 },
      { type: 'text', x: gx(20), y: gy(8), text: '変温動物（トカゲ）', size: 13 },
      // いまの気温の縦の点線（「変温動物（トカゲ）」の文字の横を通るときは、文字の上と下に分ける）と、2 つの点
      ...(x >= LIZARD_LABEL.left && x <= LIZARD_LABEL.right
        ? [[[x, 200], [x, LIZARD_LABEL.bottom]], [[x, LIZARD_LABEL.top], [x, gy(DOG_TEMP)]]]
        : [[[x, 200], [x, gy(DOG_TEMP)]]]).map(points => ({ type: 'line', points, color: 'gray', width: 1.5, dashed: true })),
      { type: 'circle', x, y: 200, r: 3, fill: 'gray', stroke: 'gray' },
      // 点は半径 4（気温 36 ℃ のとき 2 つの点の中心は 8 離れ、重ならない）
      { type: 'circle', x, y: gy(DOG_TEMP), r: 4, fill: 'orange', stroke: 'ink' },
      { type: 'circle', x, y: gy(T), r: 4, fill: 'blue', stroke: 'ink' },
      // 読み（線から離れた右の空いた所）
      text(316, 84, '気温 ' + Math.round(T) + '℃', { anchor: 'end', size: 13, bold: true }),
      text(316, 104, 'イヌ ' + DOG_TEMP + '℃', { anchor: 'end', size: 13, color: 'orange', bold: true }),
      text(316, 124, 'トカゲ ' + Math.round(T) + '℃', { anchor: 'end', size: 13, color: 'blue', bold: true }),
    ]);
    return items;
  }

  // ---- 生物のからだのつくりとはたらき（body）----

  const BRONCHUS = [[24, 30], [60, 70], [88, 96]];   // 気管支（静止図と同じ点）
  const AIR_PATH = [[24, 30], [60, 70], [88, 96], [104, 112]];   // 空気の粒の道すじ（気管支 → 肺胞の 1 つ目の中心）
  const CAPILLARY = [[70, 160], [100, 168], [140, 162], [168, 138], [166, 104], [146, 84], [118, 84]];   // 毛細血管（静止図と同じ点）
  const ALVEOLI = [[104, 112], [132, 104], [146, 132], [120, 144], [94, 140]];
  const CAP_LEN = pathLen(CAPILLARY);
  // 気体の交換の場所: [肺胞の中の点, 毛細血管の上の点]（どちらも静止図の丸・線の上）
  const O2_MOVE = [[150, 134], [lerp(140, 168, 24 / 28), lerp(162, 138, 24 / 28)]];   // 酸素: 肺胞 (146,132) → 毛細血管（(140,162)–(168,138) の辺の上）
  const CO2_MOVE = [[120, 165], [120, 148]];      // 二酸化炭素: 毛細血管（(100,168)–(140,162) の辺の中点）→ 肺胞 (120,144)
  // 毛細血管の始点からの長さ（酸素が血管に入る所・二酸化炭素が血管を出る所）
  const O2_ARC = pathLen(CAPILLARY.slice(0, 3)) + pathLen([[140, 162], O2_MOVE[1]]);
  const CO2_ARC = pathLen(CAPILLARY.slice(0, 2)) + pathLen([[100, 168], CO2_MOVE[0]]);
  // 血液の粒の数と位相（1 周に毛細血管 1 本分進む。BLOOD_PHASE ずらして、はしで始めにもどる時刻を t = 0 からはずす）
  const BLOOD_N = 4, BLOOD_PHASE = 0.075;
  const bloodArc = (t, k) => CAP_LEN * frac(t + k / BLOOD_N + BLOOD_PHASE);
  // 気体の粒は、血液の粒から RIDE_GAP（px）はなれて、いっしょに流れる（重ならない）
  const RIDE_GAP = 8;
  const O2_IN = 0.15;      // 酸素が肺胞から血管へ移る時間（1 周の割合）
  const CO2_OUT = 0.12;    // 二酸化炭素が血管から肺胞へ移る時間
  const CAP_EDGE = 2;      // 毛細血管のはし 2px は描かない（はしで出入りする）
  // 酸素が血管に着く時刻: 血液の粒がちょうど RIDE_GAP うしろにいる時刻（1 周に 2 回: これと 0.5 後）
  const O2_ARRIVE = frac((O2_ARC - RIDE_GAP) / CAP_LEN - BLOOD_PHASE);
  // 二酸化炭素が血管の始点に出る時刻: 血液の粒がちょうど RIDE_GAP 前にいる時刻（1 周に 2 回）
  const CO2_START = frac(RIDE_GAP / CAP_LEN - BLOOD_PHASE);
  // 酸素の粒の位置: 肺胞の中 → 血管へ移り、着いたら血液の粒の RIDE_GAP 前を、血管の終わりまでいっしょに流れる
  function o2Dots(t) {
    const out = [];
    for (let e = 0; e < 2; e++) {
      const r = frac(t - O2_ARRIVE + O2_IN - 0.5 * e);   // r = O2_IN で血管に着く
      if (r < O2_IN) {
        const k = r / O2_IN;
        out.push({ x: lerp(O2_MOVE[0][0], O2_MOVE[1][0], k), y: lerp(O2_MOVE[0][1], O2_MOVE[1][1], k) });
        continue;
      }
      const arc = O2_ARC + CAP_LEN * (r - O2_IN);
      if (arc <= CAP_LEN - CAP_EDGE) out.push(along(CAPILLARY, arc / CAP_LEN));
    }
    return out;
  }
  // 二酸化炭素の粒の位置: 血液の粒の RIDE_GAP うしろを血管の始点から流れ、交換の場所で分かれて肺胞へ移る
  function co2Dots(t) {
    const out = [];
    for (let e = 0; e < 2; e++) {
      const r = frac(t - CO2_START - 0.5 * e);
      const arc = CAP_LEN * r;
      if (arc < CAP_EDGE) continue;
      if (arc < CO2_ARC) { out.push(along(CAPILLARY, arc / CAP_LEN)); continue; }
      const k = (r - CO2_ARC / CAP_LEN) / CO2_OUT;
      if (k <= 1) out.push({ x: lerp(CO2_MOVE[0][0], CO2_MOVE[1][0], k), y: lerp(CO2_MOVE[0][1], CO2_MOVE[1][1], k) });
    }
    return out;
  }
  // 肺胞で、空気が出入りし、毛細血管を血液が流れ、酸素は肺胞から血液へ、二酸化炭素は血液から肺胞へ移る（body-4-c1）。
  // じん臓の側は静止図のまま動かさない
  function boAlveoli(t) {
    const items = [
      { type: 'line', points: BRONCHUS, color: 'pink', width: 8 },
      ...ALVEOLI.map(([x, y]) => ({ type: 'circle', x, y, r: 16, fill: 'white', stroke: 'line' })),
      { type: 'line', points: CAPILLARY, color: 'red', width: 2 },
    ];
    // 空気の粒 3 つ（吸うと奥へ、はくと外へ。u(t) で行き来する）
    for (let k = 0; k < 3; k++) {
      const p = along(AIR_PATH, Math.min(1, 0.15 * k + 0.6 * u(t)));
      items.push(dot(p, 3, 'white'));
    }
    // 血液の粒 4 つ（毛細血管の上を流れる）
    for (let k = 0; k < BLOOD_N; k++) items.push(dot(along(CAPILLARY, bloodArc(t, k) / CAP_LEN), 3, 'red'));
    o2Dots(t).forEach(p => items.push(dot(p, 3, 'blue')));
    co2Dots(t).forEach(p => items.push(dot(p, 3, 'gray')));
    items.push(
      text(70, 50, '気管支', { size: 13 }),
      { type: 'line', points: [[40, 128], [78, 138]], color: 'gray', width: 1, dashed: true },
      text(6, 126, '肺胞', { size: 13 }),
      { type: 'line', points: [[150, 182], [142, 164]], color: 'gray', width: 1, dashed: true },
      text(120, 196, '毛細血管', { size: 13 }),
      text(98, 222, '酸素と二酸化炭素を交換', { size: 12, anchor: 'middle' }),
      // 凡例（肺の側の上の空いた所）
      text(88, 18, '白: 空気　青: 酸素'),
      text(88, 34, '灰: 二酸化炭素'),
      { type: 'line', points: [[200, 16], [200, 224]], color: 'gray', width: 1 },
      text(262, 46, 'じん臓', { size: 13, anchor: 'middle' }),
      { type: 'ellipse', x: 232, y: 84, rx: 16, ry: 26, fill: 'brown' },
      { type: 'ellipse', x: 292, y: 84, rx: 16, ry: 26, fill: 'brown' },
      { type: 'line', points: [[236, 108], [254, 160]], color: 'line', width: 2 },
      { type: 'line', points: [[288, 108], [270, 160]], color: 'line', width: 2 },
      { type: 'ellipse', x: 262, y: 172, rx: 22, ry: 15, fill: 'yellow', stroke: 'line' },
      text(262, 206, 'ぼうこう', { size: 13, anchor: 'middle' }),
      text(262, 228, '尿をためる', { size: 12, anchor: 'middle' }),
    );
    return items;
  }

  // ---- 自然と人間（nature）----

  const SUN_RAY = [[44, 54], [60, 190]];
  const HEAT_OUT = [[[120, 192], [96, 22]], [[150, 192], [170, 112]]];
  const HEAT_BACK = [[182, 112], [202, 190]];
  // 時刻: 太陽の光 0〜0.2 → 地表から出る熱 0.2〜0.45 → 地表へもどる熱 0.45〜0.65 → 止まって見せる
  const GH_SUN_TO = 0.2, GH_OUT_TO = 0.45, GH_BACK_TO = 0.65;
  // 太陽の光が地表をあたため、地表から出る熱の一部は宇宙へ逃げ、一部は温室効果ガスで地表へもどる（nature-3-c3）。
  // 矢印は静止図と同じ点・色・太さの line（矢じりつき）で伸ばす
  function naGreenhouse(t) {
    const sun = stage(t, 0, GH_SUN_TO), out = stage(t, GH_SUN_TO, GH_OUT_TO), back = stage(t, GH_OUT_TO, GH_BACK_TO);
    const items = [
      { type: 'rect', x: 0, y: 196, width: 320, height: 44, fill: 'brown', stroke: 'none' },
      { type: 'text', x: 12, y: 224, text: '地表', size: 13, color: 'white', bold: true },
      { type: 'text', x: 312, y: 224, text: '赤い矢印: 地表から出る熱', anchor: 'end', size: 12, color: 'white' },
      { type: 'rect', x: 0, y: 84, width: 320, height: 24, fill: 'glass', stroke: 'none' },
      { type: 'text', x: 314, y: 101, text: '温室効果ガス', anchor: 'end', size: 12 },
      { type: 'circle', x: 30, y: 32, r: 18, fill: 'yellow', stroke: 'orange' },
      { type: 'text', x: 54, y: 24, text: '太陽の光', size: 12 },
      ...growLine(SUN_RAY, sun, { color: 'orange' }),
      ...HEAT_OUT.flatMap(p => growLine(p, out, { color: 'red', width: 2 })),
      ...growLine(HEAT_BACK, back, { color: 'red', width: 2 }),
    ];
    // 矢印の文字は、その矢印が伸び始めてから出す
    if (out > 0) items.push({ type: 'text', x: 106, y: 40, text: '宇宙へ逃げる熱', size: 12 });
    if (back > 0) items.push({ type: 'text', x: 210, y: 160, text: '地表へもどる熱', size: 12 });
    if (back >= 1) items.push(text(216, 186, '地表があたたまる', { color: 'red', bold: true }));
    return items;
  }

  // ================================================================
  // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md の「動く図（新規）」の基礎（basics）3 本と植物 1 本。
  // basics は顕微鏡・観察の器具なので生物のファイルに置く（ろうそくの燃焼 ba-candle-air も単元でまとめてここ）
  // ================================================================

  // ---- 観察・実験の基礎（basics）----

  // 顕微鏡の使い方の ①〜④ を順に太字にし、右の小さな顕微鏡（横から見た図）で、① 反射鏡で明るくする ② プレパラートをのせる
  // ③ 横から見て対物レンズを近づける ④ のぞきながら遠ざけてピントを合わせる、を見せる（bas-2-c3）。
  // 止まった絵（0.99）は ④ の終わり（ピントが合った像）。左の手順の文字の位置は静止図のまま
  const FOCUS_STEPS = [
    [20, 40, '① 反射鏡で明るくする', 0], [20, 80, '② プレパラートをのせる', 1], [20, 120, '③ 横から見て近づける', 2],
    [20, 160, '④ のぞきながら遠ざけて', 3], [44, 180, 'ピントを合わせる', 3],
  ];
  function focusStep(t) { return t < 0.2 ? 0 : t < 0.4 ? 1 : t < 0.6 ? 2 : 3; }
  function focusDz(t) { return 12 * ease(stage(t, 0.42, 0.58)) - 8 * ease(stage(t, 0.62, 0.85)); }   // 対物レンズが下がった量
  function baFocusSteps(t) {
    const step = focusStep(t);
    const dz = focusDz(t);
    const light = stage(t, 0.02, 0.15);                  // 反射鏡で視野が明るくなる
    const slideIn = 24 * (1 - ease(stage(t, 0.22, 0.36)));   // プレパラートが右から入る
    const items = FOCUS_STEPS.map(([x, y, s, k]) => Object.assign({ type: 'text', x, y, text: s, size: 14 },
      k === step ? { bold: true, color: 'blue' } : {}));
    items.push(
      { type: 'line', points: [[240, 40], [240, 168]], color: 'gray', width: 2, arrow: true },
      { type: 'text', x: 160, y: 224, text: 'はじめは低倍率で', size: 14, anchor: 'middle', bold: true },
      // 視野（右上の丸）。暗い → 明るい
      { type: 'circle', x: 264, y: 26, r: 16, fill: mix(TOKEN_HEX.gray, TOKEN_HEX.white, light) },
    );
    // ④ で像が見えはじめ、ぼやけた像（大きくうすい）→ はっきりした像（小さく濃い）
    if (t >= 0.6) {
      const blur = 1 - ease(stage(t, 0.62, 0.85));
      items.push({ type: 'circle', x: 264, y: 26, r: 6 + 5 * blur, fill: mix(TOKEN_HEX.green, TOKEN_HEX.white, 0.65 * blur), stroke: 'none' });
    }
    // 小さな顕微鏡（横から見た図）: 接眼レンズ・鏡筒・対物レンズ（dz だけ上下する）、ステージ、反射鏡
    items.push(
      { type: 'rect', x: 281, y: 50 + dz, width: 8, height: 12, fill: 'glass' },
      { type: 'rect', x: 279, y: 62 + dz, width: 12, height: 48, fill: 'glass' },
      { type: 'rect', x: 281, y: 110 + dz, width: 8, height: 18, fill: 'gray' },
      { type: 'rect', x: 256, y: 150, width: 60, height: 6, fill: 'gray' },
      { type: 'ellipse', x: 286, y: 180, rx: 12, ry: 5, fill: mix(TOKEN_HEX.glass, TOKEN_HEX.yellow, light) },
    );
    if (t >= 0.2) items.push({ type: 'rect', x: 266 + slideIn, y: 145, width: 40, height: 5, fill: 'sky' });
    // ③ 横から見る目の印
    if (step === 2) {
      items.push(
        { type: 'ellipse', x: 252, y: 140, rx: 7, ry: 4, fill: 'white' },
        { type: 'circle', x: 254, y: 140, r: 2, fill: 'ink', stroke: 'none' },
      );
    }
    return items;
  }

  // プレパラートを右上へ動かすと、視野の中の像は反対の左下へ動く（bas-3-c2）。像はプレパラートの印を
  // 上下左右逆（180° 回した形）に 2 倍にしたもの。止まった絵（0.99）は静止図と同じ矢印の長さと位置
  const MARK = [[-6, 6], [6, 6], [6, -6]];   // プレパラートの印（右上が直角の三角形）
  function baImageReverse(t) {
    const k = ease(stage(t, 0.1, 0.7));
    const sx = -18 * (1 - k), sy = 14 * (1 - k);   // プレパラートの、静止図の位置からのずれ（右上へ動いて 0 になる）
    const items = [
      { type: 'rect', x: 20 + sx, y: 80 + sy, width: 120, height: 40, fill: 'glass' },
      { type: 'polygon', points: MARK.map(([dx, dy]) => [80 + sx + dx, 100 + sy + dy]), fill: 'red', stroke: 'none' },
      { type: 'text', x: 80, y: 60, text: 'プレパラートを右上へ', size: 13, anchor: 'middle' },
      { type: 'circle', x: 240, y: 110, r: 60, fill: 'white' },
      // 像: 逆向き・2 倍の大きさで、プレパラートと同じ量だけ反対の向きに動く（視野の中心より右下、矢印にかからない所）
      { type: 'polygon', points: MARK.map(([dx, dy]) => [256 - sx - 2 * dx, 140 - sy - 2 * dy]), fill: 'red', stroke: 'none' },
      { type: 'text', x: 240, y: 196, text: '像は左下へ動く', size: 13, anchor: 'middle' },
    ];
    if (50 * k >= 14) {
      items.push(
        { type: 'arrow', x1: 80, y1: 140, x2: 80 + 40 * k, y2: 140 - 30 * k, color: 'blue' },
        { type: 'arrow', x1: 260, y1: 92, x2: 260 - 40 * k, y2: 92 + 36 * k, color: 'orange' },
      );
    }
    return items;
  }

  // ふたをした集気びんのろうそくは、炎が少しずつ小さくなって消える（酸素が減る）。ふたなし・下にすき間のあるびんは、
  // 空気の粒が下から入って炎の上を通り口から出ていき、燃え続ける（bas-4-c3）。
  // 最後にふたを少し開けて火をつけ直し、t = 1 で t = 0（両方燃えている＝静止図）とつながる
  function candleScale(t) {
    if (t < 0.1) return 1;
    if (t < 0.55) return 1 - ease(stage(t, 0.1, 0.55));
    if (t < 0.86) return 0;
    if (t < 0.95) return ease(stage(t, 0.86, 0.95));
    return 1;
  }
  const CANDLE_AIR = [[172, 184], [214, 184], [220, 156], [236, 116], [236, 36]];   // 空気の粒の道すじ（下のすき間 → 炎の上 → 口）
  function baCandleAir(t) {
    const s = candleScale(t);
    const lid = 48 - 18 * (ease(stage(t, 0.8, 0.86)) - ease(stage(t, 0.92, 0.98)));   // ふた（火をつけ直す間だけ上げる）
    const items = [
      { type: 'rect', x: 54, y: 188, width: 72, height: 12, fill: 'brown' },
      { type: 'line', points: [[62, 56], [62, 188]], color: 'ink', width: 3 },
      { type: 'line', points: [[118, 56], [118, 188]], color: 'ink', width: 3 },
      { type: 'rect', x: 84, y: 148, width: 12, height: 40, fill: 'white' },
    ];
    // 炎: 燃えているときは静止図と同じ flame。小さくなるときは同じ色の楕円 2 つで描く
    if (s >= 1) items.push({ type: 'flame', x: 90, y: 148 });
    else if (s > 0.03) {
      items.push(
        { type: 'ellipse', x: 90, y: 148 - 16 * s, rx: 12 * s, ry: 16 * s, fill: 'orange', stroke: 'none' },
        { type: 'ellipse', x: 90, y: 148 - 9 * s, rx: 5 * s, ry: 9 * s, fill: 'yellow', stroke: 'none' },
      );
    }
    items.push(
      { type: 'rect', x: 56, y: lid, width: 68, height: 8, fill: 'gray' },
      { type: 'rect', x: 194, y: 188, width: 72, height: 12, fill: 'brown' },
      { type: 'line', points: [[202, 56], [202, 176]], color: 'ink', width: 3 },
      { type: 'line', points: [[258, 56], [258, 176]], color: 'ink', width: 3 },
      { type: 'rect', x: 224, y: 148, width: 12, height: 40, fill: 'white' },
      { type: 'flame', x: 230, y: 148 },
      { type: 'arrow', x1: 180, y1: 182, x2: 200, y2: 182, color: 'blue', width: 2 },
      { type: 'arrow', x1: 230, y1: 70, x2: 230, y2: 40, color: 'blue', width: 2 },
    );
    for (let k = 0; k < 4; k++) {
      const q = along(CANDLE_AIR, frac(2 * t + k / 4 + 0.125));   // t = 0 で道すじのはしに粒がない（1 周の切れ目でつながる）
      items.push({ type: 'circle', x: q.x, y: q.y, r: 3, fill: 'sky', stroke: 'blue' });
    }
    items.push(
      { type: 'text', x: 90, y: 228, text: 'ふたをする', size: 13, anchor: 'middle' },
      { type: 'text', x: 230, y: 228, text: '空気が入れかわる', size: 13, anchor: 'middle' },
    );
    if (t >= 0.55 && t < 0.8) items.push(text(90, 30, '火が消える', { size: 13, anchor: 'middle', color: 'red', bold: true }));
    return items;
  }

  // ---- 植物のなかま（plants）----

  // 花粉が柱頭に着くと（受粉）、子房が大きくなりながら赤い果実に、胚珠が種子に変わる。育つ絵は左の絵から右の絵の位置へ
  // 移っていく（plants-mp1-c2）。止まった絵（0.99）は静止図と同じ（左右 2 つの絵が並んだ形）
  const POLLEN = [[40, 20, 66, 58], [52, 14, 70, 56], [64, 22, 74, 58]];   // [はじめの x, y, 柱頭に着いた x, y]
  function plOvaryToFruit(t) {
    const fall = ease(stage(t, 0.02, 0.25));
    const g = ease(stage(t, 0.3, 0.85));
    const items = [
      { type: 'ellipse', x: 70, y: 130, rx: 30, ry: 26, fill: 'lightgreen' },
      { type: 'circle', x: 70, y: 132, r: 9, fill: 'white' },
      { type: 'line', points: [[70, 104], [70, 60]], color: 'green', width: 4 },
      { type: 'text', x: 70, y: 186, text: '子房と胚珠', size: 13, anchor: 'middle' },
      { type: 'arrow', x1: 118, y1: 130, x2: 190, y2: 130, color: 'gray' },
      { type: 'text', x: 154, y: 118, text: '受粉後', size: 13, anchor: 'middle' },
    ];
    if (t > 0.02) {
      POLLEN.forEach(([x0, y0, x1, y1]) => items.push({ type: 'circle', x: lerp(x0, x1, fall), y: lerp(y0, y1, fall), r: 3, fill: 'yellow', stroke: 'orange' }));
    }
    if (fall >= 1) items.push(text(84, 64, '受粉', { color: 'orange', bold: true }));
    // 育つ絵（左の子房と同じ所から、右の果実の所へ）
    if (t >= 0.3) {
      const cx = lerp(70, 250, g);
      if (g >= 1) {
        items.push(
          { type: 'circle', x: 250, y: 130, r: 38, fill: 'red' },
          { type: 'circle', x: 250, y: 132, r: 13, fill: 'white' },
          { type: 'line', points: [[250, 92], [256, 52]], color: 'green', width: 4 },
        );
      } else {
        const ry = lerp(26, 38, g);
        items.push(
          { type: 'ellipse', x: cx, y: 130, rx: lerp(30, 38, g), ry, fill: mix(TOKEN_HEX.lightgreen, TOKEN_HEX.red, g) },
          { type: 'circle', x: cx, y: 132, r: lerp(9, 13, g), fill: 'white' },
          { type: 'line', points: [[cx, 130 - ry], [cx + 6 * g, 130 - ry - lerp(44, 40, g)]], color: 'green', width: 4 },
        );
      }
    }
    items.push({ type: 'text', x: 250, y: 196, text: '果実と種子', size: 13, anchor: 'middle' });
    return items;
  }

  // ================================================================
  // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md の「動く図（新規）」の生命（body）の 5 本
  // 静止図は content/body.js の body-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の bo-voluntary-path は、既存の bo-reflex を使い回す）
  // ================================================================

  // 点 a → b の割合 k の位置
  function between(a, b, k) { return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k) }; }

  // ---- 光合成（body-mp3-c1）----
  // 粒: 左の箱の二酸化炭素（gray）・水（sky）が矢印 (140,120)→(180,120) を通って右の箱へ移り、
  // デンプン（white）・酸素（sky）に変わる（矢印のまん中 x 160 をこえた所で変わる）
  const PHOTO_GRAINS = [
    { from: [30, 104], to: [196, 100], before: 'gray', after: 'white' },
    { from: [112, 104], to: [302, 100], before: 'gray', after: 'white' },
    { from: [30, 140], to: [196, 142], before: 'sky', after: 'sky' },
    { from: [112, 140], to: [302, 142], before: 'sky', after: 'sky' },
  ];
  // 太陽から葉緑体へ光の点が下り、粒が左の箱から右の箱へ移って変わる。t = 0 は粒が左の箱の中
  function boPhotosynthesisFlow(t) {
    const items = [
      { type: 'circle', x: 160, y: 36, r: 14, fill: 'yellow', stroke: 'orange' },
      text(160, 72, '光エネルギー', { size: 13, anchor: 'middle' }),
      { type: 'rect', x: 6, y: 92, width: 130, height: 56, fill: 'white' },
      text(71, 126, '二酸化炭素 ＋ 水', { size: 14, anchor: 'middle' }),
      { type: 'arrow', x1: 140, y1: 120, x2: 180, y2: 120, width: 3 },
      { type: 'rect', x: 184, y: 92, width: 130, height: 56, fill: 'white' },
      text(249, 116, 'デンプンなど', { size: 14, anchor: 'middle' }),
      text(249, 138, '＋ 酸素', { size: 14, anchor: 'middle' }),
      text(160, 176, '葉緑体で', { size: 13, anchor: 'middle' }),
      { type: 'ellipse', x: 160, y: 196, rx: 16, ry: 9, fill: 'green', stroke: 'none' },
    ];
    for (let k = 0; k < 3; k++) {
      const y = lerp(52, 186, frac(t + (k + 0.5) / 3));
      items.push({ type: 'circle', x: 160, y, r: 3, fill: 'yellow', stroke: 'orange' });
    }
    PHOTO_GRAINS.forEach((g, k) => {
      const p = ease(stage(t, 0.15 + 0.05 * k, 0.6 + 0.05 * k));
      const q = along([g.from, [140, 120], [180, 120], g.to], p);
      items.push(dot(q, 5, q.x > 160 ? g.after : g.before));
    });
    items.push(text(160, 232, '材料は気孔と根から入り、酸素は気孔から出る', { size: 12, anchor: 'middle' }));
    return items;
  }

  // ---- 昼と夜の気体の出入り（body-mp3-c2）----
  // 矢印 [x1, y1, x2, y2, 粒の色, 粒の数, 速さ]。X（光合成）は Y（呼吸）の 2 倍の数で 2 倍の速さ。酸素 sky・二酸化炭素 gray
  const GAS_FLOWS = [
    [12, 62, 56, 110, 'gray', 4, 2], [104, 110, 148, 62, 'sky', 4, 2],        // 昼の X: 二酸化炭素が入り、酸素が出る
    [12, 196, 58, 160, 'sky', 2, 1], [102, 160, 148, 196, 'gray', 2, 1],      // 昼の Y: 酸素が入り、二酸化炭素が出る
    [172, 196, 218, 160, 'sky', 2, 1], [262, 160, 308, 196, 'gray', 2, 1],    // 夜の Y
  ];
  // 昼は X と Y の矢印の上を、夜は Y の矢印の上だけを粒が流れる（t = 1 と t = 0 がつながる）
  function boDayNightGas(t) {
    const items = [
      { type: 'line', points: [[160, 10], [160, 230]], color: 'gray', width: 1, dashed: true },
      text(80, 24, '昼', { size: 16, anchor: 'middle', bold: true }),
      text(240, 24, '夜', { size: 16, anchor: 'middle', bold: true }),
      { type: 'line', points: [[80, 210], [80, 128]], color: 'green', width: 4 },
      { type: 'ellipse', x: 62, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
      { type: 'ellipse', x: 98, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
      { type: 'line', points: [[240, 210], [240, 128]], color: 'green', width: 4 },
      { type: 'ellipse', x: 222, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
      { type: 'ellipse', x: 258, y: 132, rx: 18, ry: 8, fill: 'green', stroke: 'none' },
      { type: 'arrow', x1: 12, y1: 62, x2: 56, y2: 110, color: 'blue', width: 2 },
      { type: 'arrow', x1: 104, y1: 110, x2: 148, y2: 62, color: 'blue', width: 2 },
      { type: 'arrow', x1: 12, y1: 196, x2: 58, y2: 160, color: 'orange', width: 2 },
      { type: 'arrow', x1: 102, y1: 160, x2: 148, y2: 196, color: 'orange', width: 2 },
      { type: 'arrow', x1: 172, y1: 196, x2: 218, y2: 160, color: 'orange', width: 2 },
      { type: 'arrow', x1: 262, y1: 160, x2: 308, y2: 196, color: 'orange', width: 2 },
    ];
    GAS_FLOWS.forEach(([x1, y1, x2, y2, fill, n, speed]) => {
      for (let k = 0; k < n; k++) items.push(dot(between([x1, y1], [x2, y2], frac(speed * t + (k + 0.5) / n)), 4, fill));
    });
    items.push(
      text(80, 40, 'X（昼だけ）', { size: 12, anchor: 'middle' }),
      text(80, 232, 'Y（昼も夜も）', { size: 12, anchor: 'middle' }),
      text(240, 232, 'Y', { size: 12, anchor: 'middle' }),
      text(4, 56, '二酸化炭素', { size: 12 }),
      text(156, 56, '酸素', { size: 12, anchor: 'end' }),
      text(4, 214, '酸素', { size: 12 }),
      text(156, 214, '二酸化炭素', { size: 12, anchor: 'end' }),
      text(166, 214, '酸素', { size: 12 }),
      text(316, 214, '二酸化炭素', { size: 12, anchor: 'end' }),
      text(240, 60, 'X: 光合成（昼だけ）', { size: 12, anchor: 'middle' }),
      text(240, 80, 'Y: 呼吸（昼も夜も）', { size: 12, anchor: 'middle' }),
    );
    return items;
  }

  // ---- 心臓と血液の流れ（body-mp7-c2）----
  // 4 つの部屋（静止図と同じ rect）
  const HEART_ROOMS = [[100, 70, 50, '右心房'], [100, 120, 64, '右心室'], [160, 70, 50, '左心房'], [160, 120, 64, '左心室']];
  // 血液の道すじ: 大静脈 → 右心房 → 右心室 → 肺動脈（左を上へ）→ 肺（上）→ 肺静脈（右を下へ）→ 左心房 → 左心室 → 大動脈。
  // 部屋の外の道すじ（灰色の細い線）は題の文字（x 52〜268、y 34〜46）にかからないよう、x 46・274 と y 20 を通す
  const HEART_PATH = [[8, 96], [130, 96], [130, 152], [100, 152], [46, 152], [46, 20], [146, 20], [174, 20],
    [274, 20], [274, 96], [190, 96], [190, 152], [220, 152], [312, 152]];
  const HEART_LEN = pathLen(HEART_PATH);
  const HEART_LUNG_IN = pathLen(HEART_PATH.slice(0, 7)) / HEART_LEN, HEART_LUNG_OUT = pathLen(HEART_PATH.slice(0, 8)) / HEART_LEN;
  const HEART_DARK = mix(TOKEN_HEX.pink, TOKEN_HEX.red, 0.45);
  // 血液の粒が道すじを順に進み（stage(t, 0, 0.9)）、肺を通ると青 → 赤に変わる。いま粒がいる部屋の色を濃くする。
  // t = 0 は粒が大静脈の入口で、部屋の色は静止図のまま
  function boHeartFlow(t) {
    const f = stage(t, 0, 0.9);
    const q = along(HEART_PATH, f);
    const items = [
      { type: 'line', points: [[8, 96], [100, 96]], color: 'gray', width: 2 },
      { type: 'line', points: [[100, 152], [46, 152], [46, 20], [146, 20]], color: 'gray', width: 2 },
      { type: 'line', points: [[174, 20], [274, 20], [274, 96], [220, 96]], color: 'gray', width: 2 },
      { type: 'line', points: [[220, 152], [312, 152]], color: 'gray', width: 2 },
      { type: 'ellipse', x: 160, y: 20, rx: 14, ry: 10, fill: 'pink', stroke: 'line' },
    ];
    HEART_ROOMS.forEach(([x, y, h, label]) => {
      const inside = f > 0 && q.x > x && q.x < x + 60 && q.y > y && q.y < y + h;
      items.push({ type: 'rect', x, y, width: 60, height: h, fill: inside ? HEART_DARK : 'pink', label });
    });
    const blood = f <= HEART_LUNG_IN ? TOKEN_HEX.blue : f >= HEART_LUNG_OUT ? TOKEN_HEX.red
      : mix(TOKEN_HEX.blue, TOKEN_HEX.red, (f - HEART_LUNG_IN) / (HEART_LUNG_OUT - HEART_LUNG_IN));
    items.push(
      { type: 'circle', x: q.x, y: q.y, r: 6, fill: blood, stroke: 'ink' },
      text(160, 24, '肺', { size: 12, anchor: 'middle' }),
      text(8, 90, '大静脈', { size: 12 }),
      text(50, 60, '肺動脈', { size: 12 }),
      text(270, 60, '肺静脈', { size: 12, anchor: 'end' }),
      text(312, 146, '大動脈', { size: 12, anchor: 'end' }),
      text(160, 44, '正面から見た図（図の左がからだの右）', { size: 12, anchor: 'middle' }),
      text(160, 210, '全身 → 右心房 → 右心室 → 肺', { size: 12, anchor: 'middle' }),
      text(160, 230, '肺 → 左心房 → 左心室 → 全身', { size: 12, anchor: 'middle' }),
    );
    return items;
  }

  // ---- 呼吸の道すじ（body-mp8-c1）----
  const BREATH_AIR = [[[160, 10], [160, 80], [104, 128], [100, 146]], [[160, 10], [160, 80], [216, 128], [220, 146]]];
  // 肺胞と毛細血管のあいだの気体の移り方 [はじめ, 終わり, 色]（酸素 blue は肺胞 → 毛細血管、二酸化炭素 gray は毛細血管 → 肺胞）
  const BREATH_GAS = [
    [[100, 150], [86, 184], 'blue'], [[73, 150], [96, 150], 'gray'],
    [[220, 150], [234, 184], 'blue'], [[247, 150], [224, 150], 'gray'],
  ];
  const CAP_LEFT = [[132, 176], [116, 186], [88, 186], [72, 166], [74, 136], [88, 124]];
  const CAP_RIGHT = [[188, 176], [204, 186], [232, 186], [248, 166], [246, 136], [232, 124]];
  // 空気の粒（white）が気管 → 気管支 → 肺胞へ入って出る（u(t) で行き来する）。肺胞から毛細血管へ酸素（blue）、
  // 毛細血管から肺胞へ二酸化炭素（gray）が移る。色の決まりは bo-alveoli と同じ。t = 1 と t = 0 がつながる
  function boBreathPath(t) {
    const items = [
      { type: 'line', points: [[160, 14], [160, 80]], color: 'pink', width: 12 },
      { type: 'line', points: [[160, 80], [104, 128]], color: 'pink', width: 8 },
      { type: 'line', points: [[160, 80], [216, 128]], color: 'pink', width: 8 },
    ];
    [[100, 150], [80, 142], [120, 142], [88, 166], [112, 166], [220, 150], [200, 142], [240, 142], [208, 166], [232, 166]]
      .forEach(([x, y]) => items.push({ type: 'circle', x, y, r: 12, fill: 'white', stroke: 'line' }));
    items.push(
      { type: 'line', points: CAP_RIGHT, color: 'red', width: 2 },
      { type: 'line', points: CAP_LEFT, color: 'red', width: 2 },
    );
    for (let k = 0; k < 4; k++) items.push(dot(along(BREATH_AIR[k % 2], Math.min(1, 0.15 * (k >> 1) + 0.7 * u(t))), 3.5, 'white'));
    [CAP_LEFT, CAP_RIGHT].forEach(cap => {
      for (let k = 0; k < 2; k++) items.push(dot(along(cap, frac(t + (k + 0.5) / 2)), 3, 'red'));
    });
    BREATH_GAS.forEach(([a, b, fill]) => {
      for (let k = 0; k < 2; k++) items.push(dot(between(a, b, frac(t + (k + 0.5) / 2)), 3, fill));
    });
    items.push(
      text(174, 40, '気管', { size: 13 }),
      text(198, 100, '気管支', { size: 13 }),
      { type: 'line', points: [[256, 146], [238, 146]], color: 'gray', width: 1, dashed: true },
      text(260, 151, '肺胞', { size: 13 }),
      { type: 'line', points: [[40, 204], [76, 176]], color: 'gray', width: 1, dashed: true },
      text(6, 222, '毛細血管', { size: 13 }),
      text(6, 20, '白: 空気　青: 酸素'),
      text(6, 36, '灰: 二酸化炭素'),
    );
    return items;
  }

  // ---- うでの曲げのばし（body-mp11-c1）----
  // 関節 (170,130) を中心に、前腕・手・前腕につくけんを回す。静止図（曲げた位置）からの回り ＝ 30.3° × (1 − u)（画面で時計回り）
  const ARM_JOINT = [170, 130];
  const ARM_BEND = Math.atan2(126 - 64, 280 - 174);   // 静止図の前腕の上向きの角（約 30.3°）
  function armRot(p, a) {
    const dx = p[0] - ARM_JOINT[0], dy = p[1] - ARM_JOINT[1];
    return [ARM_JOINT[0] + dx * Math.cos(a) - dy * Math.sin(a), ARM_JOINT[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  // 前腕と手が、まっすぐ（t = 0）から曲げた位置（t = 0.5、静止図）まで回ってもどる（曲がり ＝ u(t)）。
  // 内側の筋肉は短く太く（rx 56・ry 9.5 → 50・13）、外側の筋肉は長く細く（rx 44・ry 16 → 50・13）なる。
  // 「手」の文字は手といっしょに動く。止まった絵（0.5）が静止図と同じ。t = 1 と t = 0 がつながる
  function boArmBend(t) {
    const b = u(t);
    const a = ARM_BEND * (1 - b);
    const inRx = lerp(56, 50, b), inRy = lerp(9.5, 13, b), outRx = lerp(44, 50, b), outRy = lerp(16, 13, b);
    const hand = armRot([286, 58], a);
    return [
      { type: 'line', points: [[30, 130], [166, 130]], color: 'rock', width: 10 },
      { type: 'line', points: [armRot([174, 126], a), armRot([280, 64], a)], color: 'rock', width: 10 },
      { type: 'circle', x: hand[0], y: hand[1], r: 12, fill: 'pink', stroke: 'line' },
      { type: 'line', points: [[100 - inRx + 2, 106], [28, 120]], color: 'ink', width: 2 },
      { type: 'line', points: [[100 + inRx - 2, 106], armRot([196, 112], a)], color: 'ink', width: 2 },
      { type: 'line', points: [[100 - outRx + 2, 154], [28, 140]], color: 'ink', width: 2 },
      { type: 'line', points: [[100 + outRx - 2, 154], armRot([172, 140], a)], color: 'ink', width: 2 },
      { type: 'ellipse', x: 100, y: 106, rx: inRx, ry: inRy, fill: 'pink', stroke: 'line' },
      { type: 'ellipse', x: 100, y: 154, rx: outRx, ry: outRy, fill: '#E6A57E', stroke: 'line' },
      { type: 'circle', x: 170, y: 130, r: 9, fill: 'white', stroke: 'ink' },
      text(8, 76, 'かた'),
      // 手の文字: 曲げた位置で静止図の (304,40)（手の右上）、まっすぐでは手の上
      text(hand[0] + lerp(-4, 18, b), hand[1] - 18, '手'),
      text(22, 100, 'けん', { size: 13 }),
      text(170, 160, '関節', { size: 13, anchor: 'middle' }),
      text(100, 86, '縮む（内側の筋肉）', { size: 12, anchor: 'middle' }),
      text(100, 186, 'ゆるむ（外側の筋肉）', { size: 12, anchor: 'middle' }),
      text(316, 236, 'うでを曲げたとき', { size: 12, anchor: 'end' }),
    ];
  }

  // ================================================================
  // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md の「動く図（新規）」の生命の連続性の 3 本
  // 静止図は content/heredity.js の heredity-mp○-c○。静止図と同じ部品は同じ座標・文字・色で描く
  // （計画の「動く図（使い回し）」の heredity-mp2-c2（he-meiosis-fertilize）と、nature-mp1-c2（na-balance）・
  // nature-mp2-c1（na-carbon-cycle）は、既存の kind をそのまま使う）
  // ================================================================

  // ---- 体細胞分裂の順番（heredity-mp1-c1）----
  // content/heredity.js の divCell と同じ部品（中心 (cx, cy)、1 辺 52 の細胞。step 0 分裂前 〜 4 しきりができる）を、
  // 1 つ前の形から形 step へ割合 s（0〜1）で動かす（s = 1 で静止図の形）。fill は細胞の色
  const MITOSIS_F1 = [[-12, -10, -5, -2], [3, -12, 10, -5], [-11, 4, -4, 11], [4, 3, 11, 10]];   // 現れた染色体（左上・右上・左下・右下）
  const MITOSIS_DY = [-15, -5, 5, 15];                                                        // 中央に並んだ染色体の y のずれ
  const PURPLE_PALE = mix(TOKEN_HEX.white, TOKEN_HEX.purple, 0.25);
  function mitosisCell(cx, cy, step, s, fill) {
    const items = [{ type: 'rect', x: cx - 26, y: cy - 26, width: 52, height: 52, rx: 4, fill, stroke: 'green' }];
    if (step === 0) items.push({ type: 'circle', x: cx, y: cy, r: 11, fill: 'purple', stroke: 'line' });
    if (step === 1) {
      // 核が大きくなって白くなり、ひものような染色体が太く・濃くなって見えてくる
      items.push({ type: 'circle', x: cx, y: cy, r: lerp(11, 18, s), fill: s >= 1 ? 'white' : mix(TOKEN_HEX.purple, TOKEN_HEX.white, s), stroke: 'line' });
      MITOSIS_F1.forEach(([a, b, c, d]) => items.push(chrom(cx + a, cy + b, cx + c, cy + d, lerp(1, 4, s), s >= 1 ? 'purple' : mix(TOKEN_HEX.white, TOKEN_HEX.purple, s))));
    }
    if (step === 2) {
      // 核の膜が消え、染色体が中央に集まって並ぶ
      if (s < 1) items.push({ type: 'circle', x: cx, y: cy, r: 18, fill: mix(TOKEN_HEX.white, TOKEN_HEX.lightgreen, s), stroke: s < 0.8 ? 'line' : 'none' });
      MITOSIS_F1.forEach(([a, b, c, d], i) => {
        const dy = MITOSIS_DY[i];
        items.push(chrom(cx + lerp(a, -6, s), cy + lerp(b, dy, s), cx + lerp(c, 6, s), cy + lerp(d, dy, s)));
      });
    }
    if (step === 3) {
      // 中央の染色体が 2 つに分かれて両端へ動く
      MITOSIS_DY.forEach(dy => {
        items.push(chrom(cx + lerp(-6, -20, s), cy + dy, cx + lerp(0, -13, s), cy + dy));
        items.push(chrom(cx + lerp(0, 13, s), cy + dy, cx + lerp(6, 20, s), cy + dy));
      });
    }
    if (step === 4) {
      // 中央にしきりが伸び、両端の染色体がまとまって 2 つの核になる
      const k = Math.min(1, s / 0.6), n = stage(s, 0.4, 1);
      if (k > 0) items.push({ type: 'line', points: [[cx, cy - 26 * k], [cx, cy + 26 * k]], color: 'green', width: 2 });
      if (n < 1) {
        MITOSIS_DY.forEach(dy => {
          const y = cy + dy * (1 - n);
          items.push(chrom(cx + lerp(-20, -13, n), y, cx - 13 - 7 * (1 - n), y, lerp(4, 2, n)));
          items.push(chrom(cx + 13 + 7 * (1 - n), y, cx + lerp(20, 13, n), y, lerp(4, 2, n)));
        });
      }
      if (n > 0) {
        items.push({ type: 'circle', x: cx - 13, y: cy, r: 7 * n, fill: 'purple', stroke: 'line' });
        items.push({ type: 'circle', x: cx + 13, y: cy, r: 7 * n, fill: 'purple', stroke: 'line' });
      }
    }
    return items;
  }
  // 細胞 i（左から 0〜4）を強調する時間 [0.02 + 0.18i, 0.2 + 0.18i)。強調中の前 0.14 で 1 つ前の形から次の形へ動く。
  // 強調が始まる前の細胞は、細胞の枠だけ。止まった絵（0.99）が静止図と同じ
  const MITOSIS_FROM = (i) => 0.02 + 0.18 * i;
  function heMitosisSteps(t) {
    const items = [{ type: 'text', x: 160, y: 30, text: '体細胞分裂の順番（植物の細胞）', size: 13, anchor: 'middle' }];
    for (let i = 0; i < 5; i++) {
      const cx = 34 + 62 * i, from = MITOSIS_FROM(i);
      const active = t >= from && t < from + 0.18;
      const fill = active ? '#FFF3C4' : 'lightgreen';
      if (t < from) items.push({ type: 'rect', x: cx - 26, y: 70, width: 52, height: 52, rx: 4, fill, stroke: 'green' });
      else items.push(...mitosisCell(cx, 96, i, i === 0 ? 1 : stage(t, from, from + 0.14), fill));
    }
    ['分裂前', '染色体が', '中央に', '両端に', 'しきりが'].forEach((s, i) => items.push(text(34 + 62 * i, 150, s, { anchor: 'middle' })));
    ['', '現れる', '並ぶ', '分かれる', 'できる'].forEach((s, i) => items.push(text(34 + 62 * i, 166, s, { anchor: 'middle' })));
    items.push(
      { type: 'arrow', x1: 30, y1: 196, x2: 290, y2: 196, color: 'gray', width: 2 },
      Object.assign(text(160, 222, '1 つの細胞が 2 つになる'), { size: 13, anchor: 'middle' }),
    );
    return items;
  }

  // ---- 花粉管がのびて受精する（heredity-mp3-c1）----
  // 柱頭の花粉から花粉管（orange）が花柱の中を胚珠へ伸び（0.05〜0.45）、精細胞（点）が管の先の少し後ろを進む。止まって見せる
  // （0.45〜0.55。止まった絵 0.5 が静止図と同じ: 花粉管が胚珠まで伸び、精細胞が (157,150)）。そのあと精細胞が卵細胞へ進み（0.55〜0.75）、
  // 2 つの核が重なって卵細胞の色が変わる（受精、0.75〜0.8）。0.8〜1 は「受精」を見せ、t = 0 で花粉管のない絵にもどる。
  // （計画は restT 0.99 だが、受精のあとの絵は静止図とちがうので、静止図と同じ形の 0.5 にした）
  const POLLEN_TUBE = [[150, 32], [154, 80], [157, 140], [158, 176]];
  const SPERM_TO_EGG = [[157, 150], [158, 176], [160, 198]];
  const SPERM_K = pathLen([[150, 32], [154, 80], [157, 140], [157, 150]]) / pathLen(POLLEN_TUBE);   // 静止図の精細胞の位置（管の割合）
  const PT_REST = 0.5;
  const FERTILIZED = mix(TOKEN_HEX.pink, TOKEN_HEX.purple, 0.55);
  function pollenTubeState(t) {
    const k = stage(t, 0.05, 0.45);
    const sperm = t < 0.55 ? along(POLLEN_TUBE, SPERM_K * k) : along(SPERM_TO_EGG, stage(t, 0.55, 0.75));
    return { k, sperm, merge: stage(t, 0.75, 0.8) };
  }
  function hePollenTube(t) {
    const { k, sperm, merge } = pollenTubeState(t);
    const tube = partial(POLLEN_TUBE, k);
    const items = [
      { type: 'ellipse', x: 160, y: 182, rx: 70, ry: 46, fill: 'lightgreen', stroke: 'green' },
      { type: 'rect', x: 150, y: 40, width: 20, height: 104, fill: 'lightgreen', stroke: 'green' },
      { type: 'ellipse', x: 160, y: 38, rx: 24, ry: 8, fill: 'green', stroke: 'green' },
      { type: 'ellipse', x: 160, y: 192, rx: 28, ry: 22, fill: 'white', stroke: 'green' },
      { type: 'circle', x: 160, y: 198, r: 8, fill: merge >= 1 ? FERTILIZED : merge > 0 ? mix(TOKEN_HEX.pink, FERTILIZED, merge) : 'pink', stroke: 'ink' },
    ];
    if (tube.length >= 2) items.push({ type: 'line', points: tube, color: 'orange', width: 3 });
    items.push({ type: 'circle', x: 150, y: 28, r: 7, fill: 'yellow', stroke: 'ink' });
    if (merge < 1) items.push({ type: 'circle', x: sperm.x, y: sperm.y, r: 5 * (1 - merge), fill: 'purple', stroke: 'ink' });
    items.push(
      { type: 'line', points: [[144, 26], [96, 26]], color: 'ink', width: 2 },
      text(92, 30, '花粉', { size: 13, anchor: 'end' }),
      { type: 'line', points: [[155, 100], [96, 100]], color: 'ink', width: 2 },
      text(92, 104, '花粉管', { size: 13, anchor: 'end' }),
      { type: 'line', points: [[162, 150], [232, 120]], color: 'ink', width: 2 },
      text(236, 120, '精細胞', { size: 13 }),
      { type: 'line', points: [[186, 186], [238, 160]], color: 'ink', width: 2 },
      text(242, 160, '胚珠', { size: 13 }),
      { type: 'line', points: [[168, 200], [238, 214]], color: 'ink', width: 2 },
      text(242, 220, '卵細胞', { size: 13 }),
    );
    if (merge >= 1) items.push(text(242, 190, '受精', { size: 13, color: 'blue', bold: true }));
    return items;
  }

  // ---- DNA の二重らせん（heredity-mp4-c3）----
  // content/heredity.js の helixItems と同じ形（x = 30 + 11i、i = 0〜24。y = 110 ∓ 36·sin(iπ/6)）の 2 本の鎖の位相を 2πt だけ進め、
  // 二重らせんが回っているように見せる。横木（奇数の i、2 本の鎖のあいだが 8 より大きい所）も長さが合わせて変わる。
  // t = 0 が静止図。t = 1 と t = 0 がつながる（位相 1 周）
  function helixDy(i, t) { return 36 * Math.sin(i * Math.PI / 6 + 2 * Math.PI * t); }
  function heDnaHelix(t) {
    const a = [], b = [], items = [];
    for (let i = 0; i <= 24; i++) {
      const x = 30 + 11 * i, dy = helixDy(i, t);
      a.push([x, 110 - dy]);
      b.push([x, 110 + dy]);
      if (i % 2 === 1 && Math.abs(dy) > 8) items.push({ type: 'line', points: [[x, 110 - dy], [x, 110 + dy]], color: 'gray', width: 2 });
    }
    items.push(
      { type: 'line', points: a, color: 'blue', width: 4 },
      { type: 'line', points: b, color: 'orange', width: 4 },
      text(160, 34, 'DNA の二重らせん（モデル）', { size: 14, anchor: 'middle', bold: true }),
      text(160, 206, '2 本の鎖がねじれている', { size: 13, anchor: 'middle' }),
    );
    return items;
  }

  const DEFS = [
    ['bo-reflex', boReflex, { restT: 0.99 }],
    ['he-chromosome-copy', heChromosomeCopy, { restT: 0.99 }],
    ['he-meiosis-fertilize', heMeiosisFertilize, { restT: 0.99 }],
    ['he-segregation', heSegregation, { restT: 0.99 }],
    ['na-balance', naBalance, { restT: 0, period: 8000 }],
    ['na-carbon-cycle', naCarbonCycle, { restT: 0 }],
    // 優先度 B
    ['an-body-temp', anBodyTemp, { restT: 0 }],
    ['bo-alveoli', boAlveoli, { restT: 0 }],
    ['na-greenhouse', naGreenhouse, { restT: 0.99 }],
    // ミニプリント（1nen）。docs/plans/mp-figures-1nen.md
    ['ba-focus-steps', baFocusSteps, { restT: 0.99 }],
    ['ba-image-reverse', baImageReverse, { restT: 0.99 }],
    ['ba-candle-air', baCandleAir, { restT: 0 }],
    ['pl-ovary-to-fruit', plOvaryToFruit, { restT: 0.99 }],
    // ミニプリント（2nen）。docs/plans/mp-figures-2nen.md
    ['bo-photosynthesis-flow', boPhotosynthesisFlow, { restT: 0 }],
    ['bo-day-night-gas', boDayNightGas, { restT: 0 }],
    ['bo-heart-flow', boHeartFlow, { restT: 0 }],
    ['bo-breath-path', boBreathPath, { restT: 0 }],
    ['bo-arm-bend', boArmBend, { restT: 0.5 }],
    // ミニプリント（3nen）。docs/plans/mp-figures-3nen.md
    ['he-mitosis-steps', heMitosisSteps, { restT: 0.99 }],
    ['he-pollen-tube', hePollenTube, { restT: PT_REST }],
    ['he-dna-helix', heDnaHelix, { restT: 0 }],
  ];
  DEFS.forEach(([kind, fn, opts]) => anim.register(kind, fn, opts));
  // このファイルで足した kind（テスト用）と、テストで使う値
  const api = { KINDS: DEFS.map(d => d[0]), balanceAmounts, CARBON_PATHS, airTemp, gy, CAPILLARY, AIR_PATH, O2_MOVE, CO2_MOVE, RIDE_GAP,
    // ミニプリント（3nen）
    pollenTubeState, helixDy };
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
