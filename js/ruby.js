// ふりがな（ルビ）: 辞書（content/readings.js の WORDS）で文の漢字の語に読みを付ける
// RikaQuest.ruby = { annotate, apply, strip, setEnabled, prepare, parts }
//   prepare(words)          … 辞書のキーを長い順に並べた配列（漢字をふくまないキーは入れない）
//   annotate(text, words)   … 左から最長一致で辞書の語をさがす → [{ text, reading }]（reading は null か読み）
//                             数字（＋空白）のあとの 月・日 は がつ・にち（辞書の 1 字の語より優先）
//   parts(text, reading)    … 辞書の語 1 つを、漢字の部分（読みつき）と送りがな（reading: null）に分ける
//   apply(rootNode, words)  … rootNode 以下の文字を <ruby class="rq-ruby">語<rt>よみ</rt></ruby> に置きかえる（ブラウザ）。
//                             1 つのテキストノードからできた ruby と文字の並びは <span class="rq-ruby-run"> 1 つに包む
//                             （flex のボタンの中でも 1 つの項目のままにして、gap が入ったり折り返せなくなったりしないように）
//   strip(rootNode)         … apply で入れた span.rq-ruby-run・ruby.rq-ruby を元の文字に戻す（ブラウザ）
//   setEnabled(flag)        … true で document.body に apply し、以後の画面の変化にも付ける。false で止めて元に戻す
// 辞書のキーは送りがなの語幹まで（例: 動か → うごか、伝わ → つた）。読みが送りがなをふくむかどうかは
// どちらでもよい（parts が送りがなを ruby の外に出す）。annotate と prepare・parts は DOM を使わない（Node でも動く）。
(function (root) {
  'use strict';

  // 漢字（々 〆 もふくめる）
  const HAN = /[\p{Script=Han}々〆]/u;

  function hasHan(s) { return HAN.test(s); }

  // ---- 辞書の整形（キャッシュつき） ----

  const indexCache = new WeakMap();   // words → Map(先頭の文字 → 長い順のキー)

  // 辞書のキーを長い順に（同じ長さは辞書順）。漢字をふくまないキー・読みが文字列でないキーは除く
  function prepare(words) {
    if (!words || typeof words !== 'object') return [];
    return Object.keys(words)
      .filter((k) => k !== '' && hasHan(k) && typeof words[k] === 'string' && words[k] !== '')
      .sort((a, b) => (b.length - a.length) || (a < b ? -1 : a > b ? 1 : 0));
  }

  function indexOf(words) {
    if (!words || typeof words !== 'object') return new Map();
    let index = indexCache.get(words);
    if (index) return index;
    index = new Map();
    prepare(words).forEach((key) => {
      const first = key[0];
      if (!index.has(first)) index.set(first, []);
      index.get(first).push(key);   // prepare が長い順なので、ここも長い順
    });
    indexCache.set(words, index);
    return index;
  }

  // ---- 文に読みを付ける ----

  // 数字（半角・全角）＋任意の空白のあとの 月・日 は、がつ・にち と読む（「4 月 1 日」）。
  // 辞書の 1 字の語（月 → つき、日 → ひ）より優先。辞書のもっと長い語（月ごろ、日目 など）はそちらを使う
  const DATE_READING = { 月: 'がつ', 日: 'にち' };
  const DIGIT = /[0-9０-９]/;
  const SPACE = /[ \u3000]/;

  function afterDigit(s, i) {
    let j = i - 1;
    while (j >= 0 && SPACE.test(s[j])) j -= 1;
    return j >= 0 && DIGIT.test(s[j]);
  }

  function annotate(text, words) {
    const s = typeof text === 'string' ? text : '';
    if (s === '') return [];
    const index = indexOf(words);
    const out = [];
    let plain = '';
    let i = 0;
    while (i < s.length) {
      const keys = index.get(s[i]);
      let hit = null;
      if (keys) {
        for (let k = 0; k < keys.length; k++) {
          if (s.startsWith(keys[k], i)) { hit = keys[k]; break; }
        }
      }
      const date = (!hit || hit.length === 1) && Object.prototype.hasOwnProperty.call(DATE_READING, s[i]) && afterDigit(s, i);
      if (date) {
        if (plain !== '') { out.push({ text: plain, reading: null }); plain = ''; }
        out.push({ text: s[i], reading: DATE_READING[s[i]] });
        i += 1;
      } else if (hit) {
        if (plain !== '') { out.push({ text: plain, reading: null }); plain = ''; }
        out.push({ text: hit, reading: words[hit] });
        i += hit.length;
      } else {
        plain += s[i];
        i += 1;
      }
    }
    if (plain !== '') out.push({ text: plain, reading: null });
    return out;
  }

  // ---- 語を漢字の部分と送りがなに分ける ----

  // カタカナ → ひらがな（読みとの照らし合わせ用。1 字ずつ同じ長さで置きかえる）
  function toHira(s) {
    return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // 漢字の並びと、それ以外の並びに分ける → [{ text, han }]
  function tokens(text) {
    const out = [];
    for (const ch of text) {
      const han = HAN.test(ch);
      const last = out[out.length - 1];
      if (last && last.han === han) last.text += ch;
      else out.push({ text: ch, han });
    }
    return out;
  }

  // tokens の漢字の部分を (.+?)、ほかを文字そのままにして読みと照らし合わせる。合えば [{ text, reading }]、合わなければ null
  function align(toks, reading) {
    const re = new RegExp('^' + toks.map((t) => (t.han ? '(.+?)' : escapeRe(toHira(t.text)))).join('') + '$', 'u');
    const m = toHira(reading).match(re);
    if (!m) return null;
    const out = [];
    let pos = 0;
    let g = 1;
    toks.forEach((t) => {
      if (t.han) {
        const len = m[g].length;
        out.push({ text: t.text, reading: reading.slice(pos, pos + len) });
        pos += len;
        g += 1;
      } else {
        out.push({ text: t.text, reading: null });
        pos += t.text.length;
      }
    });
    return out;
  }

  // 辞書の語 1 つ → [{ text, reading }]。漢字の部分だけに読み、送りがな・カタカナは reading: null。
  // 読みが送りがなをふくまない書き方（伝わ → つた）でも、前後の仮名を外して合わせる。合わなければ語全体に読み
  function parts(text, reading) {
    const s = typeof text === 'string' ? text : '';
    const r = typeof reading === 'string' ? reading : '';
    if (s === '') return [];
    if (r === '' || !hasHan(s)) return [{ text: s, reading: null }];
    const toks = tokens(s);
    const full = align(toks, r);
    if (full) return full;
    // 前後の仮名（漢字でない並び）を外して合わせ直す
    let head = 0;
    let tail = toks.length;
    if (!toks[tail - 1].han) tail -= 1;
    const tries = [[0, tail]];
    if (!toks[0].han) { head = 1; tries.push([head, toks.length], [head, tail]); }
    for (let t = 0; t < tries.length; t++) {
      const [a, b] = tries[t];
      if (b - a < 1) continue;
      const mid = align(toks.slice(a, b), r);
      if (mid) {
        return toks.slice(0, a).map((x) => ({ text: x.text, reading: null }))
          .concat(mid, toks.slice(b).map((x) => ({ text: x.text, reading: null })));
      }
    }
    return [{ text: s, reading: r }];
  }

  const api = { annotate, prepare, parts };

  // ---- DOM（ブラウザだけ） ----

  if (typeof document !== 'undefined') {
    // この中の文字には付けない
    const SKIP_TAGS = { RUBY: 1, RT: 1, RP: 1, SCRIPT: 1, STYLE: 1, SVG: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, NOSCRIPT: 1 };

    const RUN_CLASS = 'rq-ruby-run';

    function defaultWords() {
      const RQ = root.RikaQuest || {};
      return RQ.readings && RQ.readings.WORDS ? RQ.readings.WORDS : {};
    }

    // node（要素かテキスト）の祖先に付けない場所があるか
    function isRun(n) { return n.nodeType === 1 && n.classList && n.classList.contains(RUN_CLASS); }

    function isSkipped(node) {
      for (let n = node.nodeType === 1 ? node : node.parentNode; n && n.nodeType === 1; n = n.parentNode) {
        if (SKIP_TAGS[n.tagName.toUpperCase()]) return true;
        if (isRun(n)) return true;   // 付け終わった並びの中（送りがなの文字など）は調べ直さない
        if (n.namespaceURI === 'http://www.w3.org/2000/svg') return true;
        if (n.hasAttribute('data-no-ruby')) return true;
      }
      return false;
    }

    function rubyNode(text, reading) {
      const r = document.createElement('ruby');
      r.className = 'rq-ruby';
      const rt = document.createElement('rt');
      rt.textContent = reading;
      r.append(document.createTextNode(text), rt);
      return r;
    }

    function applyText(node, words) {
      const segs = annotate(node.nodeValue, words);
      if (!segs.some((x) => x.reading)) return;
      // 1 つのテキストノードの置きかえ結果は 1 つの span に包む（flex の親の中でも 1 つの inline の項目になる）
      const frag = document.createElement('span');
      frag.className = RUN_CLASS;
      segs.forEach((seg) => {
        if (!seg.reading) { frag.append(document.createTextNode(seg.text)); return; }
        parts(seg.text, seg.reading).forEach((p) => {
          frag.append(p.reading ? rubyNode(p.text, p.reading) : document.createTextNode(p.text));
        });
      });
      node.parentNode.replaceChild(frag, node);
    }

    function apply(rootNode, words) {
      if (!rootNode) return;
      const dict = words || defaultWords();
      if (isSkipped(rootNode)) return;
      if (rootNode.nodeType === 3) {
        if (rootNode.parentNode && hasHan(rootNode.nodeValue)) applyText(rootNode, dict);
        return;
      }
      if (rootNode.nodeType !== 1 && rootNode.nodeType !== 11) return;
      const list = [];
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (n.nodeType === 1) {
            const tag = n.tagName.toUpperCase();
            if (SKIP_TAGS[tag] || isRun(n) || n.namespaceURI === 'http://www.w3.org/2000/svg' || n.hasAttribute('data-no-ruby')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_SKIP;
          }
          return hasHan(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });
      for (let n = walker.nextNode(); n; n = walker.nextNode()) list.push(n);
      list.forEach((n) => { if (n.parentNode) applyText(n, dict); });
    }

    function strip(rootNode) {
      if (!rootNode || typeof rootNode.querySelectorAll !== 'function') return;
      const parents = new Set();
      const plainText = (el) => {
        let text = '';
        el.childNodes.forEach((c) => {
          if (c.nodeType === 3) text += c.nodeValue;
          else if (c.nodeType === 1 && c.tagName.toUpperCase() !== 'RT') text += plainText(c);
        });
        return text;
      };
      // 包んだ並びを元の 1 つのテキストノードに戻す
      rootNode.querySelectorAll('span.' + RUN_CLASS).forEach((run) => {
        const parent = run.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(plainText(run)), run);
        parents.add(parent);
      });
      // 並びの外にある ruby.rq-ruby も念のため戻す
      rootNode.querySelectorAll('ruby.rq-ruby').forEach((r) => {
        const parent = r.parentNode;
        if (!parent) return;
        let text = '';
        r.childNodes.forEach((c) => { if (!(c.nodeType === 1 && c.tagName.toUpperCase() === 'RT')) text += c.textContent; });
        parent.replaceChild(document.createTextNode(text), r);
        parents.add(parent);
      });
      // 分かれたテキストノードを 1 つにまとめる
      parents.forEach((p) => { if (typeof p.normalize === 'function') p.normalize(); });
    }

    let observer = null;

    function onMutations(records) {
      const words = defaultWords();
      records.forEach((rec) => {
        if (rec.type === 'characterData') {
          const t = rec.target;
          if (t.parentNode && !isSkipped(t)) apply(t, words);
          return;
        }
        rec.addedNodes.forEach((n) => {
          if (!n.parentNode || !n.isConnected) return;
          if (n.nodeType === 1 && n.classList && (n.classList.contains('rq-ruby') || n.classList.contains(RUN_CLASS))) return;
          apply(n, words);
        });
      });
      // 自分で入れた ruby による変化は捨てる（同じ文を何度も調べない）
      if (observer) observer.takeRecords();
    }

    function setEnabled(flag) {
      const body = document.body;
      if (!body) return;
      if (flag) {
        if (observer) return;
        apply(body, defaultWords());
        if (typeof MutationObserver === 'function') {
          observer = new MutationObserver(onMutations);
          observer.observe(body, { childList: true, subtree: true, characterData: true });
        }
      } else {
        if (observer) { observer.disconnect(); observer = null; }
        strip(body);
      }
    }

    Object.assign(api, { apply, strip, setEnabled });
  }

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { ruby: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
