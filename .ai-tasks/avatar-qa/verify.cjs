// 実ブラウザの代わりではない。最小 DOM でプロフィール選択・保存の互換性を確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const record = require(path.join(root, 'js/record.js'));
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = {}; this.value = ''; }
  append(...children) { this.children.push(...children); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'disabled') this.disabled = true; }
  addEventListener(k, fn) { this.listeners[k] = fn; }
}
const context = vm.createContext({ RikaQuest: { record }, document: {
  createElement: (tag) => new Element(tag), createTextNode: (text) => ({ textContent: text }),
} });
vm.runInContext(fs.readFileSync(path.join(root, 'js/ui-screens.js'), 'utf8'), context);
const { helpers, screens } = context.RikaQuest.ui;
const all = (node) => [node, ...(node.children || []).flatMap(all)];
const ids = ['fox', 'cat', 'dog', 'panda', 'frog', 'penguin'];
const labels = ['ポヨン', 'モジャリ', 'ニョッキ', 'プルモ', 'ムクリ', 'ネムネ'];
assert.deepEqual(Array.from(helpers.AVATARS, (a) => a.id), ids);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sizes = [];
ids.forEach((id, i) => {
  const avatar = helpers.avatarOf(id);
  assert.equal(avatar.label, labels[i]);
  const small = helpers.avatarBadge(id, true);
  assert.match(small.className, /avatar-small/);
  assert.equal(small.children[0].tag, 'img');
  assert.equal(small.children[0].attrs.src, avatar.image);
  assert.equal(small.children[0].attrs.alt, '');
  const bytes = fs.readFileSync(path.join(root, avatar.image));
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 256);
  assert.equal(bytes.readUInt32BE(20), 256);
  assert.ok(sw.includes("'" + avatar.image + "'"), 'オフライン用の画像がない');
  sizes.push(bytes.length);

  const store = record.createStore();
  const previous = record.createProfile(store, { nickname: '以前の確認用', avatar: id }, '2026-11-03T00:00:00Z');
  store.records[previous.id].xp = 321;
  const previousRecord = JSON.stringify(store.records[previous.id]);
  const savedProfile = JSON.stringify(previous);
  const section = new Element('section');
  let saves = 0;
  let destination;
  screens.profile(section, { store, now: () => new Date('2026-11-04T00:00:00Z'),
    save: () => { saves++; return true; }, go: (to) => { destination = to; }, message: () => {} });
  const nodes = all(section);
  const buttons = nodes.filter((n) => n.className === 'avatar-choice');
  assert.equal(buttons.length, 6);
  buttons[i].listeners.click();
  assert.equal(buttons.filter((b) => b.attrs['aria-pressed'] === 'true').length, 1);
  assert.equal(buttons[i].attrs['aria-pressed'], 'true');
  const input = nodes.find((n) => n.attrs?.id === 'nickname-input');
  input.value = '画像の確認用';
  input.listeners.input();
  const create = nodes.find((n) => n.children?.some((c) => c.textContent === 'プロフィールを作る'));
  assert.equal(create.disabled, false);
  create.listeners.click();
  assert.equal(store.profiles.at(-1).avatar, id);
  assert.equal(saves, 1);
  assert.equal(destination, 'home');
  assert.equal(JSON.stringify(previous), savedProfile);
  assert.equal(JSON.stringify(store.records[previous.id]), previousRecord);
});
assert.equal(helpers.avatarOf('unknown-id').id, ids[0]);
console.log('PASS: 6 種類の選択と保存、旧プロフィールと学習記録の保持、小さいバッジ、画像 256px、オフライン画像登録');
console.log('アプリ用画像 6 枚の合計: ' + sizes.reduce((a, b) => a + b, 0) + ' bytes');
