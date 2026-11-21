// tests/content-light.test.js
// 「光の世界」教材データの検査（形・数・判定サンプル・教科書名を含まないこと）
const test = require('node:test'); const assert = require('node:assert/strict');
const cr = require('../js/content-registry.js');
const { judge } = require('../js/judge.js');
const config = require('../js/config.js');
const light = require('../content/light.js');
const richtext = require('../js/richtext.js');

// 4 領域 × 2 ステージ（Task 8 で直進・反射、Task 10 で屈折・凸レンズ）＋ ミニプリントの 4 ステージ（light-mp1〜mp4）＋ ドリルの 2 ステージ（light-dr1・dr2）
const STAGE_COUNT = 14;
const FIGURE_TYPES = ['figure-choice', 'ray-draw', 'drag'];

const stages = light.unit.areas.flatMap(a => a.stages);
const conceptIds = new Set(light.unit.concepts.map(c => c.id));

// ステージの warmup・problems・retryPool と、概念の checkPool をすべて並べる
function stageProblems() {
  return stages.flatMap(s => [s.warmup, ...s.problems, ...s.retryPool]);
}
function checkProblems() {
  return light.unit.concepts.flatMap(c => c.checkPool);
}
function allProblems() { return stageProblems().concat(checkProblems()); }

test('validateUnit(light) は空', () => assert.deepEqual(cr.validateUnit(light.unit), []));
test('単元の担当の先生（mascot）が MASCOTS にある', () => {
  const mascot = require('../js/mascot.js');
  assert.ok(Object.keys(mascot.MASCOTS).includes(light.unit.mascot), 'light.unit.mascot = ' + light.unit.mascot);
  assert.equal(mascot.forUnit(light.unit).name, 'キューブ先生');
});

test('ステージ数は STAGE_COUNT、概念はそのステージが使うものがすべて定義済み、各ステージに図か操作型が 1 問以上、各概念 retryPool 2 以上 checkPool 3 以上', () => {
  assert.equal(stages.length, STAGE_COUNT);
  stages.forEach(s => {
    s.concepts.forEach(cid => assert.ok(conceptIds.has(cid), s.id + ' の概念 ' + cid + ' が未定義'));
    assert.ok(s.problems.some(p => FIGURE_TYPES.includes(p.type)), s.id + ' に図・操作型がない');
  });
  light.unit.concepts.forEach(c => {
    const retry = stages.flatMap(s => s.retryPool).filter(p => p.concept === c.id).length;
    assert.ok(retry >= 2, c.id + ' の retryPool が ' + retry + ' 問');
    assert.ok(c.checkPool.length >= 3, c.id + ' の checkPool が ' + c.checkPool.length + ' 問');
  });
});

test('ray-draw と drag の問題は samples.correct で correct、samples.wrong で不正解になる', () => {
  const targets = allProblems().filter(p => p.type === 'ray-draw' || p.type === 'drag');
  assert.ok(targets.length > 0, 'ray-draw / drag の問題がない');
  targets.forEach(p => {
    const ok = judge(p, p.samples.correct, config);
    const ng = judge(p, p.samples.wrong, config);
    assert.equal(ok.correct, true, p.id + ' の samples.correct が正解にならない');
    assert.equal(ng.correct, false, p.id + ' の samples.wrong が不正解にならない');
    assert.ok(!ng.invalid, p.id + ' の samples.wrong が判定できない解答になっている');
  });
});

test('ray-draw は光が左から右へ進み、drag の対象は図の中にある', () => {
  allProblems().forEach(p => {
    if (p.type === 'ray-draw') assert.ok(p.source.x < p.hit.x, p.id + ' の光が左から右へ進んでいない');
    if (p.type === 'drag') {
      const item = p.figure && p.figure.items.find(it => it.id === p.draggable.itemId);
      assert.ok(item, p.id + ' の図に ' + p.draggable.itemId + ' がない');
    }
    if (p.type === 'figure-choice') {
      const region = p.figure.items.find(it => it.type === 'region' && it.id === p.answer);
      assert.ok(region, p.id + ' の答えの region がない');
    }
  });
});

test('figure-choice の選ぶ場所にはすべて呼び名（label か name）がある（画面に id を出さないため）', () => {
  allProblems().filter(p => p.type === 'figure-choice').forEach(p => {
    p.figure.items.filter(it => it.type === 'region').forEach(r => {
      assert.ok(r.label || r.name, p.id + ' の ' + r.id + ' に呼び名がない');
    });
  });
});

test('教科書名・出版社名を含まない', () => {
  assert.doesNotMatch(JSON.stringify(light.unit), /東京書籍|啓林館|大日本図書|教育出版|学校図書/);
});

test('すべての問題に prompt・explanation・hint があり、レッスンカードは 60〜120 字で図がある', () => {
  allProblems().forEach(p => {
    ['prompt', 'explanation', 'hint'].forEach(f => assert.ok(typeof p[f] === 'string' && p[f].trim() !== '', p.id + ' の ' + f + ' が空'));
  });
  stages.forEach(s => {
    assert.equal(s.lessons.length, 3, s.id + ' のレッスンが 3 枚でない');
    s.lessons.forEach(c => {
      // 字数は用語の記法 ** を除いた文で数える
      const len = richtext.plain(c.text).length;
      assert.ok(len >= 60 && len <= 120, c.id + ' の文が ' + len + ' 字');
      assert.ok(c.figure && Array.isArray(c.figure.items), c.id + ' に図がない');
    });
  });
});

test('概念は 8 つそろい、refract-2 は refract-view と total-reflect の両方を使う', () => {
  const expected = ['straight', 'reflect-law', 'mirror-image', 'refract-dir', 'refract-view', 'total-reflect', 'focus', 'lens-image'];
  expected.forEach(id => assert.ok(conceptIds.has(id), '概念 ' + id + ' がない'));
  assert.equal(conceptIds.size, expected.length);
  const r2 = stages.find(s => s.id === 'refract-2');
  assert.ok(r2, 'ステージ refract-2 がない');
  assert.deepEqual([...r2.concepts].sort(), ['refract-view', 'total-reflect']);
  // 問題にも両方の概念が付き、類題は概念ごとに 3 問
  const used = new Set(r2.problems.map(p => p.concept));
  assert.ok(used.has('refract-view') && used.has('total-reflect'), 'refract-2 の problems に両方の概念がない');
  ['refract-view', 'total-reflect'].forEach(cid => {
    // 用語問題（term: true）は数えない
    assert.equal(r2.retryPool.filter(p => p.concept === cid && !p.term).length, 3, 'refract-2 の ' + cid + ' の類題が 3 問でない');
  });
});

test('図の item の type はすべて figures.js が描ける種類', () => {
  const { ITEM_TYPES } = require('../js/figures.js');
  const scenes = stages.flatMap(s => s.lessons.map(c => ({ id: c.id, figure: c.figure })))
    .concat(allProblems().map(p => ({ id: p.id, figure: p.figure })));
  scenes.forEach(({ id, figure }) => {
    if (!figure) return;
    figure.items.forEach(it => assert.ok(ITEM_TYPES.includes(it.type), id + ' の item の type ' + it.type + ' は描けない'));
  });
});

test('動く図（anim）を持つカードは anim が anim.KINDS にあり、静止図（figure）も持つ。straight-2-c3 以外の 23 枚（ミニプリント・ドリルのカードは anim なしなので除く）', () => {
  const { KINDS } = require('../js/anim.js');
  const lessons = stages.filter(s => !s.id.startsWith('light-mp') && !s.id.startsWith('light-dr')).flatMap(s => s.lessons);
  const cards = lessons.filter(c => c.anim !== undefined);
  assert.equal(cards.length, 23);
  assert.deepEqual(cards.map(c => c.id).sort(), lessons.map(c => c.id).filter(id => id !== 'straight-2-c3').sort());
  assert.equal(lessons.find(c => c.id === 'straight-2-c3').anim, undefined);
  // 1 枚に 1 種類（同じ動く図を 2 枚に使わない）
  assert.equal(new Set(cards.map(c => c.anim)).size, cards.length);
  cards.forEach(c => {
    assert.ok(KINDS.includes(c.anim), c.id + ' の anim ' + c.anim + ' は動く図の種類にない');
    assert.ok(c.figure && Array.isArray(c.figure.items), c.id + ' に静止図がない');
  });
});

// ---- 解説の用語（**語句**）と用語問題 ----

// ステージごとに用語にしてよい語（実装指示書 20261104-120000 の表）
const TERM_ALLOW = {
  'straight-1': ['光源', '光の道すじ', '影'],
  'straight-2': ['光源'],
  'reflect-1': ['反射', '入射光', '反射光', '法線', '入射角', '反射角', '反射の法則'],
  'reflect-2': ['像'],
  'refract-1': ['屈折', '境界面', '法線'],
  'refract-2': ['全反射', '入射角', '反射角'],
  'lens-1': ['凸レンズ', '光軸', '焦点', '焦点距離'],
  'lens-2': ['実像', '虚像'],
  // ミニプリント（実装報告 20261106-130000_ミニプリント反映_1A_result）
  'light-mp1': ['光源', '反射', '入射光', '反射光', '入射角', '反射角'],
  'light-mp2': ['屈折', '境界面'],
  'light-mp3': ['凸レンズ', '光軸', '焦点', '焦点距離', '実像', '虚像'],
  'light-mp4': ['焦点', '実像', '虚像'],
  'light-dr1': ['像', '屈折', '全反射'],
  'light-dr2': ['焦点', '焦点距離', '実像', '虚像'],
};
// 許可された語が文に出てこないカード（文を変えない約束なので、用語なしのままにする）
const NO_TERM_CARDS = ['straight-2-c1', 'straight-2-c3', 'refract-2-c1', 'refract-2-c2'];

function stageTerms(s) {
  return new Set(s.lessons.flatMap(c => richtext.terms(c.text)));
}
// 用語問題の答えの語（fill は各空らんの答え、choice は正解の選択肢の文）
function answerWords(p) {
  if (p.type === 'fill') return p.blanks.map(b => b.answer);
  if (p.type === 'choice') return [p.options.find(o => o.id === p.answer).text];
  return [];
}

test('レッスンカードには用語が 1 つ以上ある（許可された語が文にないカードを除く）', () => {
  stages.forEach(s => s.lessons.forEach(c => {
    const n = richtext.terms(c.text).length;
    if (NO_TERM_CARDS.includes(c.id)) assert.equal(n, 0, c.id + ' は用語なしのはず');
    else assert.ok(n >= 1, c.id + ' に用語（**語句**）がない');
  }));
  stages.forEach(s => assert.ok(stageTerms(s).size >= 1, s.id + ' に用語が 1 つもない'));
});

test('用語はステージごとの許可リストの語だけ', () => {
  stages.forEach(s => {
    assert.ok(TERM_ALLOW[s.id], s.id + ' の許可リストがない');
    stageTerms(s).forEach(t => assert.ok(TERM_ALLOW[s.id].includes(t), s.id + ' の用語 ' + t + ' は許可リストにない'));
  });
});

test('各ステージの problems[1] がただ 1 つの用語問題で、retryPool にも用語問題がある', () => {
  stages.forEach(s => {
    const terms = s.problems.filter(p => p.term === true);
    assert.equal(terms.length, 1, s.id + ' の problems の用語問題が ' + terms.length + ' 問');
    assert.equal(s.problems[1].term, true, s.id + ' の problems[1] が用語問題でない');
    assert.equal(s.problems[1].type, 'fill', s.id + ' の main の用語問題が fill でない');
    assert.ok(s.retryPool.some(p => p.term === true), s.id + ' の retryPool に用語問題がない');
  });
});

test('用語問題の答えは、そのステージの解説で目立たせた語', () => {
  stages.forEach(s => {
    const terms = stageTerms(s);
    s.problems.concat(s.retryPool).filter(p => p.term === true).forEach(p => {
      assert.ok(p.type === 'fill' || p.type === 'choice', p.id + ' の形式が ' + p.type);
      const words = answerWords(p);
      assert.ok(words.length > 0, p.id + ' に答えの語がない');
      words.forEach(w => assert.ok(terms.has(w), p.id + ' の答え ' + w + ' が ' + s.id + ' の解説の用語にない'));
    });
  });
});
