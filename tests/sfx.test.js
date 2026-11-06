// tests/sfx.test.js — 効果音（js/sfx.js）の音の並びと、鳴らさない設定
const test = require('node:test'); const assert = require('node:assert/strict');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'js', 'sfx.js');
// play は AudioContext を 1 つ作って使い回すので、テストごとに読み込み直す
function load() {
  delete require.cache[require.resolve(FILE)];
  return require(FILE);
}

// AudioContext の偽物。作った数と鳴らした音の数を数える
function fakeAudio(options) {
  const counts = { created: 0, started: 0, resumed: 0 };
  const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class FakeContext {
    constructor() {
      counts.created += 1;
      if (options && options.throwOnCreate) throw new Error('no audio');
      this.state = (options && options.state) || 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      counts.resumed += 1;
      if (options && options.rejectResume) return Promise.reject(new Error('resume failed'));
      this.state = 'running'; return Promise.resolve();
    }
    createOscillator() {
      if (options && options.throwOnPlay) throw new Error('broken');
      return { type: '', frequency: param(), connect() {}, start() { counts.started += 1; }, stop() {} };
    }
    createGain() { return { gain: param(), connect() {} }; }
  }
  return { FakeContext, counts };
}

function withAudio(Ctor, fn) {
  const before = globalThis.AudioContext;
  globalThis.AudioContext = Ctor;
  try { return fn(); } finally {
    if (before === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = before;
  }
}

['correct', 'wrong', 'levelup', 'badge'].forEach((kind) => {
  test('plan(' + kind + '): 空でなく、freq・dur > 0、start は昇順、gain ≤ 0.5', () => {
    const sfx = load();
    const notes = sfx.plan(kind);
    assert.ok(Array.isArray(notes) && notes.length > 0);
    notes.forEach((n, i) => {
      assert.ok(n.freq > 0, 'freq');
      assert.ok(n.dur > 0, 'dur');
      assert.ok(n.start >= 0, 'start');
      assert.ok(n.gain > 0 && n.gain <= 0.5, 'gain');
      assert.ok(['sine', 'triangle', 'square', 'sawtooth'].includes(n.type), 'type');
      if (i > 0) assert.ok(n.start > notes[i - 1].start, 'start が昇順でない');
    });
  });
});

test('plan: correct は上がる 2 音、wrong は下がる 2 音で正解より小さい、levelup は 4 音で計 0.6 秒、badge は levelup と同じ', () => {
  const sfx = load();
  const c = sfx.plan('correct'); const w = sfx.plan('wrong'); const l = sfx.plan('levelup');
  assert.equal(c.length, 2); assert.ok(c[1].freq > c[0].freq);
  assert.equal(w.length, 2); assert.ok(w[1].freq < w[0].freq);
  assert.ok(Math.max(...w.map((n) => n.gain)) < Math.min(...c.map((n) => n.gain)));
  assert.equal(l.length, 4);
  const end = Math.max(...l.map((n) => n.start + n.dur));
  assert.ok(Math.abs(end - 0.6) < 1e-9);
  assert.deepEqual(sfx.plan('badge'), l);
});

test('plan: 知らない kind は []、返す配列を書きかえても次の plan は変わらない', () => {
  const sfx = load();
  assert.deepEqual(sfx.plan('nope'), []);
  assert.deepEqual(sfx.plan(), []);
  assert.deepEqual(sfx.plan('toString'), []);
  const a = sfx.plan('correct');
  a[0].freq = 1; a.push({});
  assert.notEqual(sfx.plan('correct')[0].freq, 1);
  assert.equal(sfx.plan('correct').length, 2);
});

test('setEnabled(false) のとき play は AudioContext を作らない', () => {
  const sfx = load();
  const { FakeContext, counts } = fakeAudio();
  withAudio(FakeContext, () => {
    assert.equal(sfx.isEnabled(), true);
    sfx.setEnabled(false);
    assert.equal(sfx.isEnabled(), false);
    sfx.play('correct');
    sfx.play('levelup');
  });
  assert.equal(counts.created, 0);
  assert.equal(counts.started, 0);
});

test('play: 有効なら AudioContext を 1 つだけ作り、suspended なら resume し、音の数だけ鳴らす', () => {
  const sfx = load();
  const { FakeContext, counts } = fakeAudio();
  withAudio(FakeContext, () => {
    sfx.play('correct');
    sfx.play('levelup');
    sfx.play('nope');
  });
  assert.equal(counts.created, 1);
  assert.equal(counts.resumed, 1);
  assert.equal(counts.started, 2 + 4);
});

test('play: AudioContext がない・作れない・鳴らせないときも例外を出さず、warn は 1 回だけ', () => {
  const warn = console.warn;
  let warned = 0;
  console.warn = () => { warned += 1; };
  try {
    withAudio(undefined, () => { assert.doesNotThrow(() => load().play('correct')); });
    assert.equal(warned, 0);

    const broken = fakeAudio({ throwOnCreate: true });
    const sfx = load();
    withAudio(broken.FakeContext, () => {
      assert.doesNotThrow(() => { sfx.play('correct'); sfx.play('wrong'); });
    });
    assert.equal(broken.counts.created, 1, '作れなかったら作り直さない');
    assert.equal(warned, 1);

    warned = 0;
    const failing = fakeAudio({ throwOnPlay: true });
    const sfx2 = load();
    withAudio(failing.FakeContext, () => {
      assert.doesNotThrow(() => { sfx2.play('correct'); sfx2.play('badge'); });
    });
    assert.equal(warned, 1);
  } finally {
    console.warn = warn;
  }
});

test('play: interrupted（iOS の中断）でも resume し、resume の失敗（reject）は warn 1 回で握りつぶす', async () => {
  const warn = console.warn;
  let warned = 0;
  console.warn = () => { warned += 1; };
  try {
    const sfx = load();
    const { FakeContext, counts } = fakeAudio({ state: 'interrupted', rejectResume: true });
    withAudio(FakeContext, () => {
      sfx.play('correct');
      sfx.play('correct');
    });
    assert.equal(counts.resumed, 2);
    assert.equal(counts.started, 4);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(warned, 1);
  } finally {
    console.warn = warn;
  }
});
