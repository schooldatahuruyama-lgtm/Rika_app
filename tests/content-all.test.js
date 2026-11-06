// tests/content-all.test.js
// content/ の単元ファイルすべてに同じ検査をかける（curriculum.js は単元一覧、readings.js はふりがなの辞書なので除く）。
// 単元ファイルを足すと、ここで自動的に検査される。単元ごとの細かい検査は tests/content-<id>.test.js に書く。
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const cr = require('../js/content-registry.js');
const { judge } = require('../js/judge.js');
const config = require('../js/config.js');
const figures = require('../js/figures.js');
const mascot = require('../js/mascot.js');
const richtext = require('../js/richtext.js');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const FIGURE_TYPES = ['figure-choice', 'ray-draw', 'drag'];
// 図の image の src に使ってよい形（js/figures.js と同じ決まり）
const IMAGE_SRC_RE = /^assets\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|svg)$/;
const BOOK_NAMES = /東京書籍|啓林館|大日本図書|教育出版|学校図書|学図|東書|啓林/;

// 単元でないファイル: curriculum.js（単元一覧）、readings.js（ふりがなの辞書）
const NOT_UNITS = ['curriculum.js', 'readings.js'];
const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.js') && !NOT_UNITS.includes(f)).sort();
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('content/ に単元ファイルが 1 つ以上ある', () => assert.ok(files.length >= 1));

files.forEach(file => {
  const id = file.replace(/\.js$/, '');
  const unit = require(path.join(CONTENT_DIR, file)).unit;
  const name = 'content/' + file;

  const stages = (unit && Array.isArray(unit.areas) ? unit.areas : []).flatMap(a => a.stages || []);
  const concepts = unit && Array.isArray(unit.concepts) ? unit.concepts : [];
  const stageProblems = () => stages.flatMap(s => [s.warmup, ...(s.problems || []), ...(s.retryPool || [])]);
  const allProblems = () => stageProblems().concat(concepts.flatMap(c => c.checkPool || []));

  test(name + ': validateUnit は空', () => {
    assert.ok(unit, name + ' に module.exports.unit がない');
    assert.deepEqual(cr.validateUnit(unit), []);
  });

  test(name + ': id はファイル名と同じ、title は文字列、mascot は MASCOTS のキー', () => {
    assert.equal(unit.id, id);
    assert.equal(typeof unit.title, 'string');
    assert.ok(unit.title.trim() !== '', 'title が空');
    assert.ok(Object.prototype.hasOwnProperty.call(mascot.MASCOTS, unit.mascot), 'mascot = ' + unit.mascot);
  });

  test(name + ': 各ステージに図・操作型が 1 問以上、各概念の retryPool 2 以上・checkPool 3 以上', () => {
    assert.ok(stages.length >= 1, 'ステージがない');
    stages.forEach(s => assert.ok(s.problems.some(p => FIGURE_TYPES.includes(p.type)), s.id + ' に図・操作型がない'));
    concepts.forEach(c => {
      const retry = stages.flatMap(s => s.retryPool).filter(p => p.concept === c.id).length;
      assert.ok(retry >= 2, c.id + ' の retryPool が ' + retry + ' 問');
      assert.ok(c.checkPool.length >= 3, c.id + ' の checkPool が ' + c.checkPool.length + ' 問');
    });
  });

  test(name + ': ray-draw と drag は samples.correct で正解、samples.wrong で不正解（invalid でない）', () => {
    allProblems().filter(p => p.type === 'ray-draw' || p.type === 'drag').forEach(p => {
      assert.ok(p.samples && p.samples.correct !== undefined && p.samples.wrong !== undefined, p.id + ' に samples がない');
      const ok = judge(p, p.samples.correct, config);
      const ng = judge(p, p.samples.wrong, config);
      assert.equal(ok.correct, true, p.id + ' の samples.correct が正解にならない');
      assert.equal(ng.correct, false, p.id + ' の samples.wrong が不正解にならない');
      assert.ok(!ng.invalid, p.id + ' の samples.wrong が判定できない解答になっている');
    });
  });

  test(name + ': figure-choice の答えは図の region、drag の対象は図にあり target は図の中', () => {
    allProblems().forEach(p => {
      if (p.type === 'figure-choice') {
        const region = p.figure && p.figure.items.find(it => it.type === 'region' && it.id === p.answer);
        assert.ok(region, p.id + ' の答えの region がない');
      }
      if (p.type === 'drag') {
        const item = p.figure && p.figure.items.find(it => it.id === p.draggable.itemId);
        assert.ok(item, p.id + ' の図に ' + p.draggable.itemId + ' がない');
        const w = Number(p.figure.width) || 320, h = Number(p.figure.height) || 240;
        assert.ok(p.target && p.target.x >= 0 && p.target.x <= w && p.target.y >= 0 && p.target.y <= h,
          p.id + ' の target が図の外');
      }
    });
  });

  test(name + ': 図の item の type はすべて figures.js が描ける種類', () => {
    const scenes = stages.flatMap(s => s.lessons.map(c => ({ id: c.id, figure: c.figure })))
      .concat(allProblems().map(p => ({ id: p.id, figure: p.figure })));
    scenes.forEach(({ id: sid, figure }) => {
      if (figure === null || figure === undefined) return;
      assert.ok(Array.isArray(figure.items), sid + ' の図に items がない');
      figure.items.forEach(it => assert.ok(figures.ITEM_TYPES.includes(it.type), sid + ' の item の type ' + it.type + ' は描けない'));
    });
  });

  test(name + ': 図の image の src は assets/ の画像で、ファイルが実在し、sw.js の PRECACHE に入っている', () => {
    const m = swJs.match(/const PRECACHE = \[([\s\S]*?)\];/);
    assert.ok(m, 'sw.js に PRECACHE がない');
    const scenes = stages.flatMap(s => s.lessons.map(c => ({ id: c.id, figure: c.figure })))
      .concat(allProblems().map(p => ({ id: p.id, figure: p.figure })));
    scenes.forEach(({ id: sid, figure }) => {
      if (!figure || !Array.isArray(figure.items)) return;
      figure.items.filter(it => it && it.type === 'image').forEach(it => {
        const src = it.src;
        assert.ok(typeof src === 'string' && IMAGE_SRC_RE.test(src) && !src.includes('..') && !src.includes('//'),
          sid + ' の image の src ' + src + ' は assets/ の画像でない');
        // Windows は大文字・小文字を区別しないので、フォルダの一覧に同じつづりで入っているかで実在を確かめる（公開先は区別する）
        const dir = path.join(ROOT, path.posix.dirname(src));
        const listed = fs.existsSync(dir) && fs.readdirSync(dir).includes(path.posix.basename(src));
        assert.ok(listed, sid + ' の画像 ' + src + ' がない（大文字・小文字もそろえる）');
        assert.ok(m[1].includes("'" + src + "'"), 'sw.js の PRECACHE に ' + src + ' がない');
      });
    });
  });

  test(name + ': 教科書名・出版社名を含まない', () => {
    assert.doesNotMatch(JSON.stringify(unit), BOOK_NAMES);
  });

  // AI 教材作成で作った単元（unit.source === 'author'）はカードに図が無いので、図の有無だけは見ない（ほかは同じ）
  const fromAuthor = unit && unit.source === 'author';

  test(name + ': 全問題に prompt・explanation・hint、レッスンカードは 2〜4 枚で文は 40〜160 字、図がある' + (fromAuthor ? '（AI 教材作成の単元なので図は見ない）' : ''), () => {
    allProblems().forEach(p => {
      ['prompt', 'explanation', 'hint'].forEach(f => assert.ok(typeof p[f] === 'string' && p[f].trim() !== '', p.id + ' の ' + f + ' が空'));
    });
    stages.forEach(s => {
      assert.ok(s.lessons.length >= 2 && s.lessons.length <= 4, s.id + ' のレッスンが ' + s.lessons.length + ' 枚');
      s.lessons.forEach(c => {
        // 字数は用語の記法 ** を除いた文で数える
        assert.equal(typeof c.text, 'string', c.id + ' の文がない');
        const len = richtext.plain(c.text).length;
        assert.ok(len >= 40 && len <= 160, c.id + ' の文が ' + len + ' 字');
        if (!fromAuthor) assert.ok(c.figure && Array.isArray(c.figure.items), c.id + ' に図がない');
      });
    });
  });

  test(name + ': index.html の script と sw.js の PRECACHE に入っている', () => {
    assert.ok(indexHtml.includes('<script src="content/' + file + '"></script>'), 'index.html に content/' + file + ' がない');
    const m = swJs.match(/const PRECACHE = \[([\s\S]*?)\];/);
    assert.ok(m, 'sw.js に PRECACHE がない');
    assert.ok(m[1].includes("'content/" + file + "'"), 'sw.js の PRECACHE に content/' + file + ' がない');
  });
});

// ---- 解説カードの動く図（anim）。docs/anim-plan.md 3-5 の 3 ----
// anim.js と、分野ごとのファイル（あるものだけ）を読む。分野ごとのファイルは読むと anim.register で kind を足す
const anim = require('../js/anim.js');
const ANIM_FIELD_FILES = ['anim-physics.js', 'anim-chem.js', 'anim-bio.js', 'anim-earth.js'];
ANIM_FIELD_FILES.forEach(f => {
  const p = path.join(ROOT, 'js', f);
  if (fs.existsSync(p)) require(p);
});
// 単元 → kind の接頭辞（docs/anim-plan.md 3-5 の表）。光（light）は登録口より前に作ったので接頭辞なし
const ANIM_PREFIX = {
  sound: 'so-', force: 'fo-', electricity: 'el-', motion: 'mo-',
  substance: 'su-', 'state-change': 'st-', solution: 'sl-', 'chemical-change': 'ch-', ion: 'io-',
  plants: 'pl-', animals: 'an-', body: 'bo-', heredity: 'he-', nature: 'na-',
  volcano: 'vo-', strata: 'sr-', weather: 'we-', space: 'sp-',
  basics: 'ba-',   // 観察・実験の基礎（ファイルは anim-bio.js）
};
// 静止図との整合を見ない単元: 光は静止図と動く図の文字がちがう所がある（この決まりより前に作った。tests/anim.test.js で見ている）
const ANIM_LEGACY_UNITS = ['light'];
// kind ごとの「文字の例外」: 静止図の text・label のうち、動く図では位置や文字が変わるもの（計画の各 kind の欄）。
// 形: { 'kind': ['静止図の文字', ...] }
const ANIM_TEXT_EXCEPTIONS = {};

// 光の 23 種（anim.js の BUILD。登録口より前に作ったもの）
const LIGHT_COUNT = 23;
const LIGHT_KINDS = anim.KINDS.slice(0, LIGHT_COUNT);

// 全単元の anim を持つカード [{ unitId, card, mp }]。mp: ミニプリントのステージ（id に -mp を含む）のカード
const animCards = files.flatMap(file => {
  const unit = require(path.join(CONTENT_DIR, file)).unit;
  return (unit.areas || []).flatMap(a => (a.stages || []).flatMap(s => (s.lessons || []).map(card => ({ card, mp: s.id.includes('-mp') }))))
    .filter(({ card }) => card.anim !== undefined)
    .map(({ card, mp }) => ({ unitId: unit.id, card, mp }));
});
// ミニプリントのカードは、ほかのカードの kind を使い回してよい（docs/plans/mp-figures-1nen.md）。
// 使い回し: ミニプリント以外のカードも使っている kind をミニプリントのカードが使うこと
const usedOutsideMp = new Set(animCards.filter(c => !c.mp).map(c => c.card.anim));
const isShared = ({ card, mp }) => mp && usedOutsideMp.has(card.anim);

test('anim: カードの kind は文字列で KINDS にあり、ミニプリント以外のカードでは全単元で重ならない（1 kind ＝ 1 カード）', () => {
  const seen = new Map();   // kind → カード id
  animCards.forEach(({ card, mp }) => {
    assert.equal(typeof card.anim, 'string', card.id + ' の anim が文字列でない');
    assert.ok(anim.KINDS.includes(card.anim), card.id + ' の anim ' + card.anim + ' は KINDS にない');
    if (mp) return;   // ミニプリントのカードは、どの kind を使ってもよい
    assert.ok(!seen.has(card.anim), card.anim + ' が ' + seen.get(card.anim) + ' と ' + card.id + ' で重なる');
    seen.set(card.anim, card.id);
  });
});

test('anim: kind の接頭辞が単元に合う（光を除く）', () => {
  animCards.forEach(({ unitId, card }) => {
    if (ANIM_LEGACY_UNITS.includes(unitId)) return;
    const prefix = ANIM_PREFIX[unitId];
    assert.ok(prefix, unitId + ' の接頭辞が ANIM_PREFIX にない（' + card.id + '）');
    assert.ok(card.anim.startsWith(prefix), card.id + ' の anim ' + card.anim + ' は ' + prefix + ' で始まらない');
  });
});

test('anim: カードは静止図（figure）を持ち、静止図に image の部品がない', () => {
  animCards.forEach(({ card }) => {
    assert.ok(card.figure && Array.isArray(card.figure.items), card.id + ' に静止図がない');
    assert.ok(!card.figure.items.some(it => it && it.type === 'image'), card.id + ' の静止図に image がある（写真のカードには anim を付けない）');
  });
});

test('anim: 静止図の text・label が、例外を除き frame(kind, restT(kind)) に同じ text・x・y で入っている（光の 23 種と、ミニプリントの使い回しを除く）', () => {
  Object.keys(ANIM_TEXT_EXCEPTIONS).forEach(kind => assert.ok(anim.KINDS.includes(kind), 'ANIM_TEXT_EXCEPTIONS の ' + kind + ' は KINDS にない'));
  animCards.forEach((c) => {
    const { unitId, card } = c;
    // 光の 23 種は見ない。光の単元でも、あとから登録口で足した kind（li-lens-cover など）は見る
    if (ANIM_LEGACY_UNITS.includes(unitId) && LIGHT_KINDS.includes(card.anim)) return;
    // ミニプリントの使い回しは、静止図の要点を変えて描いてあるので見ない（新しい kind はミニプリントのカードでも見る）
    if (isShared(c)) return;
    const kind = card.anim;
    const except = ANIM_TEXT_EXCEPTIONS[kind] || [];
    const items = anim.frame(kind, anim.restT(kind)).items;
    card.figure.items.filter(it => it && (it.type === 'text' || it.type === 'label')).forEach(st => {
      if (except.includes(st.text)) return;
      const found = items.some(it => it && (it.type === 'text' || it.type === 'label') && it.text === st.text && it.x === st.x && it.y === st.y);
      assert.ok(found, card.id + '（' + kind + '）の静止図の文字「' + st.text + '」(' + st.x + ',' + st.y + ') が止まった絵にない');
    });
  });
});

test('anim: 登録した kind（光の 23 種以外）はどれかのカードが 1 枚以上使い（ミニプリント以外のカードは 1 枚まで）、分野ごとのファイルは index.html と sw.js に入っている', () => {
  const used = new Map(), usedNonMp = new Map();
  animCards.forEach(({ card, mp }) => {
    used.set(card.anim, (used.get(card.anim) || 0) + 1);
    if (!mp) usedNonMp.set(card.anim, (usedNonMp.get(card.anim) || 0) + 1);
  });
  anim.KINDS.slice(LIGHT_COUNT).forEach(kind => {
    assert.ok((used.get(kind) || 0) >= 1, '動く図 ' + kind + ' を使うカードがない');
    assert.ok((usedNonMp.get(kind) || 0) <= 1, '動く図 ' + kind + ' をミニプリント以外のカード ' + usedNonMp.get(kind) + ' 枚が使っている（1 枚まで）');
  });
  ANIM_FIELD_FILES.forEach(f => {
    if (!fs.existsSync(path.join(ROOT, 'js', f))) return;
    assert.ok(indexHtml.includes('src="js/' + f + '"'), 'index.html に js/' + f + ' がない');
    assert.ok(swJs.includes("'js/" + f + "'"), 'sw.js の PRECACHE に js/' + f + ' がない');
  });
});

// 単元をまたいだ id の重複（概念 id は理解度の記録のキー、ステージ id は進捗のキーなので、全単元で一意でなければならない）
test('全単元を通して、ステージ・概念・カード・問題・領域の id が重複しない', () => {
  const seen = new Map();   // 'kind:id' → 単元 id
  const dup = [];
  files.forEach(file => {
    const unit = require(path.join(CONTENT_DIR, file)).unit;
    const add = (kind, id) => {
      const key = kind + ':' + id;
      if (seen.has(key) && seen.get(key) !== unit.id) dup.push(key + '（' + seen.get(key) + ' と ' + unit.id + '）');
      seen.set(key, unit.id);
    };
    (unit.concepts || []).forEach(c => { add('概念', c.id); (c.checkPool || []).forEach(p => add('問題', p.id)); });
    (unit.areas || []).forEach(a => {
      add('領域', a.id);
      (a.stages || []).forEach(s => {
        add('ステージ', s.id);
        (s.lessons || []).forEach(c => add('カード', c.id));
        [s.warmup, ...(s.problems || []), ...(s.retryPool || [])].forEach(p => { if (p) add('問題', p.id); });
      });
    });
  });
  assert.deepEqual(dup, []);
});
