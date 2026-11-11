// QR コードを作る（純粋関数。ブラウザと node の両方で動く）。RikaQuest.qr。設計書 14 章（ライブクイズの参加用の QR）。
// 外部ライブラリは使わない。JIS X 0510（ISO/IEC 18004）のとおり:
//   バイトモード（文字列は UTF-8 のバイト列）、誤り訂正レベル（既定 M）、型番 1〜10 を自動で選ぶ、
//   リード・ソロモン符号（GF(256)、原始多項式 0x11D）、ブロックのインターリーブ、位置合わせパターン、
//   形式情報（BCH(15,5)）、型番情報（BCH(18,6)。型番 7 以上）、8 種のマスクから罰則点のいちばん小さいものを選ぶ。
// encode(text, { ec }) → { version, size, mask, modules: boolean[][] }（modules[行 y][列 x]。true が黒）。入らなければ null。
// svg(matrix, { scale, margin }) → SVG の文字列（黒いモジュールを 1 本の <path> で描く。margin はモジュール数で既定 4）。
// parseJoin(text) → 部屋コード（6 文字。A-HJ-NP-Z2-9）| null。URL の live パラメータか、コードそのもの。
// isShareableUrl(loc) → boolean。loc（location の形 { protocol, hostname }）が生徒の端末でも開ける URL か（https: で、localhost でない）。
(function (root) {
  'use strict';

  const MAX_VERSION = 10;
  // 誤り訂正レベル → 形式情報の 2 ビット
  const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  // 型番 1〜10 の 1 ブロックあたりの誤り訂正符号語の数と、ブロックの数（添字 0 が型番 1）
  const EC_PER_BLOCK = {
    L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
  };
  const NUM_BLOCKS = {
    L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
  };
  // 部屋コードの文字（js/live.js の CODE_CHARS と同じ。I・O・0・1 は使わない）
  const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

  // ---- GF(256) とリード・ソロモン ----

  const EXP = new Array(512);
  const LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }

  // 生成多項式 (x - α^0)(x - α^1)…(x - α^(n-1)) の係数（最高次の 1 を除く。高次から）
  function generator(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= gfMul(g[j], EXP[i]);
      }
      g = next;
    }
    return g.slice(1);
  }

  // データ符号語 data（0〜255 の配列）の誤り訂正符号語 ecLen 個
  function rsEncode(data, ecLen) {
    const gen = generator(ecLen);
    const rem = new Array(ecLen).fill(0);
    data.forEach((b) => {
      const factor = b ^ rem[0];
      rem.shift();
      rem.push(0);
      for (let i = 0; i < ecLen; i++) rem[i] ^= gfMul(gen[i], factor);
    });
    return rem;
  }

  // ---- 型番ごとの大きさ ----

  function sizeOf(version) { return 17 + 4 * version; }

  // 型番の全符号語の数（機能パターン・形式情報・型番情報を除いたモジュールの数 ÷ 8。余りビットは捨てる）
  function totalCodewords(version) {
    let bits = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const n = Math.floor(version / 7) + 2;
      bits -= (25 * n - 10) * n - 55;
      if (version >= 7) bits -= 36;
    }
    return Math.floor(bits / 8);
  }

  function dataCodewords(version, ec) {
    return totalCodewords(version) - EC_PER_BLOCK[ec][version - 1] * NUM_BLOCKS[ec][version - 1];
  }

  // 位置合わせパターンの中心の座標（型番 1 はなし）
  function alignmentPositions(version) {
    if (version === 1) return [];
    const size = sizeOf(version);
    const n = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2;
    const out = [6];
    for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  // 形式情報の 15 ビット（誤り訂正レベルとマスク。BCH(15,5) とマスク 101010000010010）
  function formatBits(ec, mask) {
    const data = (EC_BITS[ec] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  // 型番情報の 18 ビット（BCH(18,6)。型番 7 以上）
  function versionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    return (version << 12) | rem;
  }

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  // ---- 文字列 → 符号語 ----

  function utf8Bytes(text) {
    if (typeof TextEncoder === 'function') return Array.from(new TextEncoder().encode(text));
    const s = unescape(encodeURIComponent(text));
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function countBits(version) { return version <= 9 ? 8 : 16; }

  // バイトモードのデータ符号語（モード指示子・文字数・データ・終端・埋め草）
  function dataBytes(bytes, version, ec) {
    const capacity = dataCodewords(version, ec) * 8;
    const bits = [];
    const push = (value, len) => { for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
    push(0x4, 4);
    push(bytes.length, countBits(version));
    bytes.forEach((b) => push(b, 8));
    push(0, Math.min(4, capacity - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      out.push(b);
    }
    for (let pad = 0xEC; out.length < capacity / 8; pad ^= 0xEC ^ 0x11) out.push(pad);
    return out;
  }

  // ブロックに分けて誤り訂正符号語を付け、インターリーブする（短いブロックが先、長いブロックはデータが 1 つ多い）
  function interleave(data, version, ec) {
    const numBlocks = NUM_BLOCKS[ec][version - 1];
    const ecLen = EC_PER_BLOCK[ec][version - 1];
    const total = totalCodewords(version);
    const numShort = numBlocks - (total % numBlocks);
    const shortLen = Math.floor(total / numBlocks) - ecLen;   // 短いブロックのデータ符号語の数
    const blocks = [];
    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = shortLen + (i < numShort ? 0 : 1);
      const d = data.slice(k, k + len);
      k += len;
      blocks.push({ data: d, ec: rsEncode(d, ecLen) });
    }
    const out = [];
    for (let i = 0; i <= shortLen; i++) {
      blocks.forEach((b) => { if (i < b.data.length) out.push(b.data[i]); });
    }
    for (let i = 0; i < ecLen; i++) blocks.forEach((b) => out.push(b.ec[i]));
    return out;
  }

  // ---- 行列 ----

  function grid(size, value) {
    const out = [];
    for (let y = 0; y < size; y++) out.push(new Array(size).fill(value));
    return out;
  }

  function buildBase(version) {
    const size = sizeOf(version);
    const modules = grid(size, false);
    const isFn = grid(size, false);
    const set = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      modules[y][x] = dark;
      isFn[y][x] = true;
    };
    // タイミングパターン
    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    // 位置検出パターン（分離パターンの白をふくむ 9×9）
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          set(cx + dx, cy + dy, d !== 2 && d !== 4);
        }
      }
    });
    // 位置合わせパターン（位置検出パターンと重なる 3 すみは置かない）
    const pos = alignmentPositions(version);
    const last = pos.length - 1;
    pos.forEach((cy, i) => {
      pos.forEach((cx, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      });
    });
    // 形式情報の場所を予約（あとで書く）と暗モジュール
    drawFormat(modules, isFn, 0);
    // 型番情報
    if (version >= 7) {
      const vb = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        set(a, b, bit(vb, i));
        set(b, a, bit(vb, i));
      }
    }
    return { size, modules, isFn };
  }

  // 形式情報 bits（15 ビット）を 2 か所に書く。暗モジュール（列 8・行 4×型番+9）も書く
  function drawFormat(modules, isFn, bits) {
    const size = modules.length;
    const set = (x, y, dark) => { modules[y][x] = dark; isFn[y][x] = true; };
    for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i));
    set(8, 7, bit(bits, 6));
    set(8, 8, bit(bits, 7));
    set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i));
    set(8, size - 8, true);
  }

  // 符号語を右下から 2 列ずつ、上下に往復しながら置く（6 列目のタイミングパターンは飛ばす）
  function placeCodewords(modules, isFn, codewords) {
    const size = modules.length;
    const total = codewords.length * 8;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let v = 0; v < size; v++) {
        const y = upward ? size - 1 - v : v;
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          if (isFn[y][x]) continue;
          if (i < total) {
            modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
            i++;
          }
          // 余りビットは白（false）のまま
        }
      }
    }
  }

  // マスクの条件（x は列、y は行）
  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function applyMask(modules, isFn, mask) {
    const f = MASKS[mask];
    const size = modules.length;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFn[y][x] && f(x, y)) modules[y][x] = !modules[y][x];
      }
    }
  }

  // 罰則点（規格の 4 つの規則）
  function penalty(modules) {
    const size = modules.length;
    let score = 0;
    const lineScore = (get) => {
      // 規則 1: 同じ色が 5 つ以上続く
      let s = 0;
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && get(i) === get(i - 1)) {
          run++;
        } else {
          if (run >= 5) s += 3 + (run - 5);
          run = 1;
        }
      }
      // 規則 3: 1:1:3:1:1 の並びの前に白が 4 つで 40 点、後ろに白が 4 つで 40 点（別々に数える。盤の外は白とみなす）
      const at = (i) => (i >= 0 && i < size ? get(i) : false);
      const P = [true, false, true, true, true, false, true];
      for (let i = -4; i < size; i++) {
        let ok = true;
        for (let k = 0; k < 7 && ok; k++) if (at(i + k) !== P[k]) ok = false;
        if (!ok) continue;
        const before = [1, 2, 3, 4].every((d) => !at(i - d));
        const after = [7, 8, 9, 10].every((d) => !at(i + d));
        if (before) s += 40;
        if (after) s += 40;
      }
      return s;
    };
    for (let y = 0; y < size; y++) score += lineScore((x) => modules[y][x]);
    for (let x = 0; x < size; x++) score += lineScore((y) => modules[y][x]);
    // 規則 2: 2×2 の同じ色
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
    // 規則 4: 黒の割合が 50% から離れている
    let dark = 0;
    modules.forEach((row) => row.forEach((c) => { if (c) dark++; }));
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  // ---- 公開する関数 ----

  function encode(text, options) {
    const ec = options && typeof options.ec === 'string' && EC_BITS[options.ec.toUpperCase()] !== undefined ? options.ec.toUpperCase() : 'M';
    const bytes = utf8Bytes(String(text === null || text === undefined ? '' : text));
    let version = 0;
    for (let v = 1; v <= MAX_VERSION; v++) {
      if (4 + countBits(v) + bytes.length * 8 <= dataCodewords(v, ec) * 8) { version = v; break; }
    }
    if (!version) return null;
    const codewords = interleave(dataBytes(bytes, version, ec), version, ec);
    const base = buildBase(version);
    placeCodewords(base.modules, base.isFn, codewords);
    let best = -1;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(base.modules, base.isFn, m);
      drawFormat(base.modules, base.isFn, formatBits(ec, m));
      const s = penalty(base.modules);
      if (s < bestScore) { bestScore = s; best = m; }
      applyMask(base.modules, base.isFn, m);   // もう一度かけると元に戻る
    }
    applyMask(base.modules, base.isFn, best);
    drawFormat(base.modules, base.isFn, formatBits(ec, best));
    return { version, size: base.size, mask: best, ec, modules: base.modules };
  }

  // 行列 → SVG の文字列（自前で作る文字列だけ。利用者の文字は入らない）
  function svg(matrix, options) {
    const o = options || {};
    const scale = Number.isFinite(o.scale) && o.scale > 0 ? o.scale : 8;
    const margin = Number.isInteger(o.margin) && o.margin >= 0 ? o.margin : 4;
    const size = matrix.size;
    const full = size + margin * 2;
    let d = '';
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix.modules[y][x]) d += 'M' + (x + margin) + ' ' + (y + margin) + 'h1v1h-1z';
      }
    }
    const px = full * scale;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + full + ' ' + full + '" width="' + px + '" height="' + px +
      '" shape-rendering="crispEdges" role="img" aria-label="QR コード">' +
      '<rect width="' + full + '" height="' + full + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#000"/></svg>';
  }

  function asCode(s) {
    if (typeof s !== 'string') return null;
    const c = s.trim().toUpperCase();
    return CODE_RE.test(c) ? c : null;
  }

  // QR から読んだ文字・location.search・コードそのもの → 部屋コード | null
  function parseJoin(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    if (t === '') return null;
    const direct = asCode(t);
    if (direct) return direct;
    let query = null;
    if (t.charAt(0) === '?') {
      query = t.slice(1);
    } else {
      try {
        const u = new URL(t);
        if (u.protocol !== 'https:' && u.protocol !== 'http:' && u.protocol !== 'file:') return null;
        query = u.search.slice(1);
      } catch (e) {
        return null;
      }
    }
    try {
      return asCode(new URLSearchParams(query).get('live'));
    } catch (e) {
      return null;
    }
  }

  // 生徒の端末でも開ける URL か: https: で、host が localhost・127.0.0.1・[::1] でないとき true
  // （file: や http:、先生の端末の中だけで動くサーバーの URL は、QR で読んでも生徒の端末では開けない）
  function isShareableUrl(loc) {
    if (!loc || typeof loc !== 'object') return false;
    if (String(loc.protocol || '').toLowerCase() !== 'https:') return false;
    const host = String(loc.hostname || '').toLowerCase();
    if (host === '') return false;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' && host !== '::1';
  }

  const api = {
    MAX_VERSION, encode, svg, parseJoin, isShareableUrl,
    // 確かめ用（テストが使う）
    rsEncode, formatBits, versionBits, alignmentPositions, totalCodewords, dataCodewords,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { qr: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
