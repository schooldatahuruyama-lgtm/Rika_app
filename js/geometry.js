// 角度・直線・点の計算（判定に使う）
// 座標は SVG と同じく、x は右向き、y は下向きに増える。点とベクトルは { x, y }。
(function (root) {
  'use strict';

  const DEG = 180 / Math.PI;

  // -0 を 0 にそろえる（deepStrictEqual で -0 と 0 が別物になるため）
  function clean(n) { return n === 0 ? 0 : n; }

  function sub(p, q) { return { x: p.x - q.x, y: p.y - q.y }; }
  function len(v) { return Math.hypot(v.x, v.y); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }

  // from から to へ向かう向きの角度（x 軸基準、-180〜180 度）
  function angleDeg(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x) * DEG;
  }

  // 角度を -180 < d <= 180 に直す
  function normalizeDeg(d) {
    let r = ((d % 360) + 360) % 360;   // 0 <= r < 360
    if (r > 180) r -= 360;
    return r;
  }

  // 2 つのベクトルの向きのなす角（0〜180 度）
  function angleBetweenDeg(a, b) {
    return Math.atan2(Math.abs(cross(a, b)), dot(a, b)) * DEG;
  }

  // 2 つの直線のなす角（向きを問わない、0〜90 度）
  function lineAngleDeg(a, b) {
    const t = angleBetweenDeg(a, b);
    return Math.min(t, 180 - t);
  }

  // 光線と法線のなす角（0〜90 度）。法線の向きはどちらでもよい
  function angleToNormalDeg(vec, normalVec) {
    return lineAngleDeg(vec, normalVec);
  }

  // 反射: v - 2 (v・n) n（n は単位ベクトルに直してから使う）
  function reflect(incident, normal) {
    const l = len(normal);
    const n = { x: normal.x / l, y: normal.y / l };
    const k = 2 * dot(incident, n);
    return { x: clean(incident.x - k * n.x), y: clean(incident.y - k * n.y) };
  }

  // 点 p と、a・b を通る直線との距離
  function distancePointToLine(p, a, b) {
    const ab = sub(b, a);
    const l = len(ab);
    if (l === 0) return len(sub(p, a));   // a と b が同じ点なら、その点との距離
    return Math.abs(cross(ab, sub(p, a))) / l;
  }

  // 2 つのベクトルの直線が平行か（なす角が tolDeg 以内。浮動小数点の誤差分だけ余裕を持つ）
  function isParallelDeg(vecA, vecB, tolDeg) {
    return lineAngleDeg(vecA, vecB) <= tolDeg + 1e-9;
  }

  // a から b へ向かう直線に対して、点 p がどちら側か（-1 か 1。線上は 0）
  function sideOfLine(p, a, b) {
    const c = cross(sub(b, a), sub(p, a));
    return c > 0 ? 1 : c < 0 ? -1 : 0;
  }

  // 面の法線（単位ベクトル）
  // mirror: 線分に垂直なもののうち y が負（上向き）のもの。鏡が縦（法線の y が 0）なら x が負のもの
  // boundary: (0, -1)
  // 光源の側を向く法線が必要なときは、呼ぶ側で符号を反転する
  function normalOf(surface) {
    if (surface.kind === 'boundary') return { x: 0, y: -1 };
    if (surface.kind === 'mirror') {
      const d = { x: surface.x2 - surface.x1, y: surface.y2 - surface.y1 };
      const l = len(d);
      let n = { x: -d.y / l, y: d.x / l };
      if (n.y > 0 || (n.y === 0 && n.x > 0)) n = { x: -n.x, y: -n.y };
      return { x: clean(n.x), y: clean(n.y) };
    }
    throw new Error('normalOf: 法線を求められない面です: ' + surface.kind);
  }

  // 点 p から向き dir へ進む半直線と、a・b を通る直線との交点。平行または p の後ろなら null
  function intersectLine(p, dir, a, b) {
    const e = sub(b, a);
    const denom = cross(dir, e);
    if (Math.abs(denom) <= 1e-9 * len(dir) * len(e)) return null;
    const t = cross(sub(a, p), e) / denom;
    if (t < 0) return null;
    return { x: p.x + t * dir.x, y: p.y + t * dir.y };
  }

  const api = {
    angleDeg, normalizeDeg, angleBetweenDeg, angleToNormalDeg, reflect,
    distancePointToLine, isParallelDeg, sideOfLine, sub, len, normalOf, intersectLine,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { geometry: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
