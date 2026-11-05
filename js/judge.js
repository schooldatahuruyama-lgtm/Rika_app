// 5 形式の問題の正誤判定
// 戻り値は { correct: bool, invalid?: true, reason?: string }。
// invalid は「判定できない解答」（未記入・長さ 0 の線など）。正解・不正解として数えない。
(function (root) {
  'use strict';

  const geometry = typeof require === 'function' ? require('./geometry.js') : root.RikaQuest.geometry;

  // 浮動小数点の誤差分の余裕（ちょうど許容の値を正解にするため）
  const EPS = 1e-9;

  function invalid(reason) { return { correct: false, invalid: true, reason }; }
  function result(correct) { return { correct: !!correct }; }

  function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
  function isPoint(p) { return !!p && isNum(p.x) && isNum(p.y); }

  // 数値または数値の文字列を数にする。数にできなければ null
  function toNumber(v) {
    if (isNum(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.trim());
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  // 選択肢: 選んだ id が答えと同じなら正解
  function judgeChoice(problem, answer) {
    return result(answer === problem.answer);
  }

  // 穴埋め: 空欄がすべて正しければ正解。1 つでも未記入なら invalid
  function judgeFill(problem, answer) {
    if (typeof answer !== 'object') return invalid('no-answer');
    const blanks = problem.blanks || [];
    // 先に未記入を調べる（未記入があれば正誤を付けない）
    for (const b of blanks) {
      const v = answer[b.id];
      if (v === undefined || v === null || String(v).trim() === '') return invalid('missing-blank');
    }
    let allCorrect = true;
    for (const b of blanks) {
      const v = answer[b.id];
      if (b.kind === 'number') {
        const n = toNumber(v);
        const tol = isNum(b.tolerance) ? b.tolerance : 0;
        if (n === null || Math.abs(n - b.answer) > tol + EPS) allCorrect = false;
      } else {
        // 語は前後の空白を除いて完全一致
        if (String(v).trim() !== String(b.answer).trim()) allCorrect = false;
      }
    }
    return result(allCorrect);
  }

  // 図の中を選ぶ: 選んだ領域の id が答えと同じなら正解
  function judgeFigureChoice(problem, answer) {
    return result(answer === problem.answer);
  }

  function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

  // 反射: 鏡で反射させた向きとのなす角が許容以内で、鏡の裏へ行かなければ正解
  function judgeMirror(problem, inc, o, out, tol) {
    const s = problem.surface;
    const a = { x: s.x1, y: s.y1 }, b = { x: s.x2, y: s.y2 };
    const sourceSide = geometry.sideOfLine(problem.source, a, b);
    // 鏡の法線のうち、光源の側を向くものを選ぶ
    let n = geometry.normalOf(s);
    const normalSide = geometry.sideOfLine({ x: a.x + n.x, y: a.y + n.y }, a, b);
    if (sourceSide !== 0 && normalSide !== sourceSide) n = { x: -n.x, y: -n.y };
    const r = geometry.reflect(inc, n);
    const angleOk = geometry.angleBetweenDeg(o, r) <= tol.reflectDeg + EPS;
    // 光源と同じ側に返っていること（鏡の裏へ行かない）
    const sideOk = geometry.sideOfLine(out, a, b) === sourceSide;
    return result(angleOk && sideOk);
  }

  // 屈折: 境界の反対側・法線の反対側へ進み、法線に近づく（空気→水・ガラス）か離れる（水・ガラス→空気）なら正解
  function judgeBoundary(problem, inc, o) {
    const s = problem.surface;
    const dense = s.to === 'water' || s.to === 'glass';
    const fromDense = s.from === 'water' || s.from === 'glass';
    let towardNormal;
    if (s.from === 'air' && dense) towardNormal = true;
    else if (fromDense && s.to === 'air') towardNormal = false;
    else return invalid('unsupported-media');   // 水⇄ガラスなどは出題しない
    const src = problem.source, hit = problem.hit;
    // 入射側の上下は座標で決める
    const dy = sign(hit.y - src.y);
    const dx = sign(hit.x - src.x);
    if (dy === 0) return invalid('bad-problem');   // 光源が境界の上にあると上下が決まらない
    const n = { x: 0, y: dy };   // 進む側を向く法線
    const crossesBoundary = sign(o.y) === dy;   // (a) 境界の反対側
    const crossesNormal = sign(o.x) === dx;     // (b) 法線をはさんで反対側
    const outAngle = geometry.angleToNormalDeg(o, n);
    const inAngle = geometry.angleToNormalDeg(inc, n);
    const bendOk = towardNormal ? outAngle < inAngle : outAngle > inAngle;   // (c)
    return result(crossesBoundary && crossesNormal && bendOk);
  }

  // 凸レンズ: 光は左から右へ進む。parallel は向こう側の焦点を通る、center は直進、focus は軸に平行
  function judgeLens(problem, inc, o, out, tol) {
    const s = problem.surface;
    const hit = problem.hit;
    const ray = problem.expected && problem.expected.ray;
    if (ray !== 'parallel' && ray !== 'center' && ray !== 'focus') return invalid('unknown-ray');
    if (out.x <= hit.x) return result(false);   // レンズの左へ戻る向きは不正解
    if (ray === 'parallel') {
      const focus = { x: s.cx + s.f, y: s.cy };
      return result(geometry.distancePointToLine(focus, hit, out) <= tol.lensPx + EPS);
    }
    if (ray === 'center') {
      return result(geometry.isParallelDeg(inc, o, tol.parallelDeg) && o.x > 0);
    }
    return result(geometry.isParallelDeg(o, { x: 1, y: 0 }, tol.parallelDeg) && o.x > 0);
  }

  // 光線をかく: 当たった点から先の 1 点 out で、折れた先の向きを判定する
  function judgeRayDraw(problem, answer, config) {
    if (!answer || !isPoint(answer.out)) return invalid('no-answer');
    const tol = config.tolerance;
    const out = answer.out;
    const inc = geometry.sub(problem.hit, problem.source);
    const o = geometry.sub(out, problem.hit);
    if (geometry.len(o) < 1) return invalid('zero-length');   // 長さ 0 の線は向きが決まらない
    const kind = problem.surface && problem.surface.kind;
    if (kind === 'mirror') return judgeMirror(problem, inc, o, out, tol);
    if (kind === 'boundary') return judgeBoundary(problem, inc, o);
    if (kind === 'lens') return judgeLens(problem, inc, o, out, tol);
    return invalid('unknown-surface');
  }

  // ドラッグ: 置いた位置と目標の距離が許容以内なら正解（axis が x / y なら、その向きの差だけで比べる）
  function judgeDrag(problem, answer, config) {
    if (!isPoint(answer)) return invalid('no-answer');
    const tol = config.tolerance.dragPx;
    const dx = answer.x - problem.target.x;
    const dy = answer.y - problem.target.y;
    const axis = problem.draggable && problem.draggable.axis;
    let d;
    if (axis === 'x') d = Math.abs(dx);
    else if (axis === 'y') d = Math.abs(dy);
    else d = Math.hypot(dx, dy);
    return result(d <= tol + EPS);
  }

  const judges = {
    'choice': judgeChoice,
    'fill': judgeFill,
    'figure-choice': judgeFigureChoice,
    'ray-draw': judgeRayDraw,
    'drag': judgeDrag,
  };

  // 問題の形式に合わせて判定する
  function judge(problem, answer, config) {
    const fn = problem && Object.prototype.hasOwnProperty.call(judges, problem.type) ? judges[problem.type] : null;
    if (!fn) return invalid('unknown-type');
    if (answer === null || answer === undefined) return invalid('no-answer');
    return fn(problem, answer, config);
  }

  const api = { judge, judgeChoice, judgeFill, judgeFigureChoice, judgeRayDraw, judgeDrag };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { judge: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
