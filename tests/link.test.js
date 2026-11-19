// tests/link.test.js — 授業ログのログイン確認。通信・保存場所・タイマーはすべて偽物
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const link = require('../js/link.js');

const CONFIG = {
  authKey: 'jugyolog:auth', apiKey: 'test key+&',
  tokenUrl: 'https://example.invalid/token', jugyoUrl: 'https://example.invalid/jugyo-log/',
  timeoutMs: 10000, recheckMs: 60000,
};
const AUTH = { uid: 'test-user-a', refreshToken: 'test-refresh-a' };
const OTHER = { uid: 'test-user-b', refreshToken: 'test-refresh-b' };

function response(status, body) { return { status, json: async () => body }; }
function success(saved) { return response(200, { user_id: saved.uid, id_token: 'test-id-token', expires_in: '3600', refresh_token: 'test-rotated-token' }); }
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function fakeStorage(t, raw) {
  const writes = [];
  t.after(() => assert.deepEqual(writes, [], 'ログインの保存場所に書きこんではいけない'));
  return {
    raw,
    getItem(key) { assert.equal(key, CONFIG.authKey); return this.raw; },
    setItem() { writes.push('setItem'); },
    removeItem() { writes.push('removeItem'); },
  };
}

function fakeTimers() {
  const pending = new Map();
  let next = 0;
  return {
    pending,
    setTimeout(fn, ms) { const id = ++next; pending.set(id, { fn, ms }); return id; },
    clearTimeout(id) { pending.delete(id); },
    run() { const list = [...pending.values()]; pending.clear(); list.forEach((timer) => timer.fn()); },
  };
}

function fixture(t, options) {
  const opts = options || {};
  const storage = fakeStorage(t, Object.prototype.hasOwnProperty.call(opts, 'raw') ? opts.raw : JSON.stringify(AUTH));
  const timers = fakeTimers();
  const clock = { at: 1000 };
  const calls = [];
  const client = (opts.link || link).createLink({
    storage, config: opts.config || CONFIG, now: () => clock.at,
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    fetch: (url, init) => {
      calls.push({ url, init });
      return opts.fetch ? opts.fetch(url, init, calls.length) : Promise.resolve(success(AUTH));
    },
  });
  t.after(() => assert.equal(timers.pending.size, 0, '確認後にタイマーを残さない'));
  return { client, storage, timers, clock, calls };
}

test('readSaved: 不正な入力・保存場所の例外は null、書きこみ・削除なし', (t) => {
  const invalid = [
    null, '', ' ', 'not json', 'x'.repeat(100000), 'null', '[]', '42', 'true', '"text"', '{}',
    JSON.stringify({ uid: 12, refreshToken: 'test' }),
    JSON.stringify({ uid: '', refreshToken: 'test' }),
    JSON.stringify({ uid: '  ', refreshToken: 'test' }),
    JSON.stringify({ uid: 'test' }),
    JSON.stringify({ uid: 'test', refreshToken: '' }),
    JSON.stringify({ uid: 'test', refreshToken: '  ' }),
    JSON.stringify({ uid: 'test', refreshToken: 12 }),
    JSON.stringify({ uid: 'test', refreshToken: {} }),
  ];
  invalid.forEach((raw) => assert.equal(link.readSaved(fakeStorage(t, raw), CONFIG.authKey), null));
  const broken = fakeStorage(t, null);
  broken.getItem = () => { throw new Error('storage unavailable'); };
  assert.equal(link.readSaved(broken, CONFIG.authKey), null);
  assert.equal(link.readSaved(null, CONFIG.authKey), null);
});

test('readSaved: uid と refreshToken だけ返す。形が正しければ長い文字列も読める', (t) => {
  const saved = Object.assign({}, AUTH, { email: 'test@example.invalid' });
  assert.deepEqual(link.readSaved(fakeStorage(t, JSON.stringify(saved)), CONFIG.authKey), AUTH);
  const long = { uid: 'x'.repeat(100000), refreshToken: 'y'.repeat(100000) };
  assert.deepEqual(link.readSaved(fakeStorage(t, JSON.stringify(long)), CONFIG.authKey), long);
});

test('check: 保存がなければ none、fetch を呼ばない', async (t) => {
  const f = fixture(t, { raw: null });
  assert.equal(f.client.status(), 'none');
  assert.equal(await f.client.check(), 'none');
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls.length, 0);
});

test('check: 200 で uid が一致すれば ok。新しい refresh_token があっても保存を変えない', async (t) => {
  const f = fixture(t);
  const seen = [];
  f.client.onChange((status) => seen.push([status, f.client.uid()]));
  assert.equal(await f.client.check(), 'ok');
  assert.equal(f.client.status(), 'ok');
  assert.equal(f.client.uid(), AUTH.uid);
  assert.deepEqual(seen, [['checking', null], ['ok', AUTH.uid]]);
  assert.equal(f.storage.raw, JSON.stringify(AUTH));
  assert.deepEqual(Object.keys(f.client).sort(), ['check', 'onChange', 'status', 'uid']);
});

const BAD_BODIES = [
  { user_id: OTHER.uid, id_token: 'test-id-token' },
  { user_id: AUTH.uid }, { id_token: 'test-id-token' },
  { user_id: AUTH.uid, id_token: '' }, { user_id: AUTH.uid, id_token: ' ' },
  { user_id: AUTH.uid, id_token: 12 }, null, [], 'text',
];
BAD_BODIES.forEach((body, i) => {
  test('check: 200 の不正な本文 ' + (i + 1) + ' は unknown', async (t) => {
    const f = fixture(t, { fetch: () => response(200, body) });
    assert.equal(await f.client.check(), 'unknown');
    assert.equal(f.client.uid(), null);
  });
});

['TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'MISSING_REFRESH_TOKEN'].forEach((message) => {
  test('check: 400 ' + message + ' は expired', async (t) => {
    const f = fixture(t, { fetch: () => response(400, { error: { message } }) });
    assert.equal(await f.client.check(), 'expired');
    assert.equal(f.client.uid(), null);
  });
});

test('check: そのほかの HTTP・JSON 不正・通信の例外は unknown、Promise は解決する', async (t) => {
  const fetches = [
    () => response(400, { error: { message: 'OTHER_ERROR' } }),
    () => response(400, {}),
    () => response(500, { error: { message: 'TOKEN_EXPIRED' } }),
    () => response(401, { error: { message: 'TOKEN_EXPIRED' } }),
    () => response(201, { user_id: AUTH.uid, id_token: 'test-id-token' }),
    () => response(302, null),
    () => ({ status: 200, json: async () => { throw new SyntaxError('not json'); } }),
    () => ({ status: 400, json: async () => { throw new SyntaxError('not json'); } }),
    () => { throw new Error('test fetch failed'); },
    () => Promise.reject(new Error('test fetch failed')),
  ];
  for (const fetch of fetches) {
    const f = fixture(t, { fetch });
    assert.equal(await f.client.check(), 'unknown');
    assert.equal(f.client.uid(), null);
  }
});

test('check: API の設定が空なら通信せず unknown', async (t) => {
  for (const key of ['apiKey', 'tokenUrl']) {
    const f = fixture(t, { config: Object.assign({}, CONFIG, { [key]: ' ' }) });
    assert.equal(await f.client.check(), 'unknown');
    assert.equal(f.calls.length, 0);
  }
});

test('送信: 指定 URL のみ、POST の本文をエンコード。URL にトークンを含めない', async (t) => {
  const saved = { uid: AUTH.uid, refreshToken: 'test +&=/?#%日本語' };
  const f = fixture(t, { raw: JSON.stringify(saved) });
  assert.equal(await f.client.check(), 'ok');
  const call = f.calls[0];
  assert.equal(call.url, CONFIG.tokenUrl + '?key=' + encodeURIComponent(CONFIG.apiKey));
  assert.equal(call.url.includes(saved.refreshToken), false);
  assert.equal(call.url.includes(encodeURIComponent(saved.refreshToken)), false);
  assert.equal(call.init.method, 'POST');
  assert.deepEqual(call.init.headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.equal(call.init.body, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(saved.refreshToken));
  assert.equal(call.init.redirect, 'error');
});

test('時間切れ: 中断に応じない fetch でも unknown、遅い成功の返事は使わない', async (t) => {
  const reply = deferred();
  const f = fixture(t, { fetch: () => reply.promise });
  const checking = f.client.check();
  await Promise.resolve();
  assert.equal(f.client.status(), 'checking');
  assert.equal([...f.timers.pending.values()][0].ms, CONFIG.timeoutMs);
  f.timers.run();
  assert.equal(await checking, 'unknown');
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls[0].init.signal.aborted, true);
  reply.resolve(success(AUTH));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.client.status(), 'unknown');
});

test('時間切れ: JSON 本文の読み取りが終わらない場合も unknown', async (t) => {
  const body = deferred();
  const f = fixture(t, { fetch: () => ({ status: 200, json: () => body.promise }) });
  const checking = f.client.check();
  await Promise.resolve();
  await Promise.resolve();
  f.timers.run();
  assert.equal(await checking, 'unknown');
});

test('ブラウザ用の公開と、AbortController がない環境での時間切れ', async (t) => {
  const context = { console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/link.js'), 'utf8'), context);
  const f = fixture(t, { link: context.RikaQuest.link, fetch: () => new Promise(() => {}) });
  const checking = f.client.check();
  await Promise.resolve();
  assert.equal(f.calls[0].init.signal, undefined);
  f.timers.run();
  assert.equal(await checking, 'unknown');
});

test('同時に 3 回呼ぶと同じ Promise、通知の中から呼んでも通信は 1 本', async (t) => {
  const reply = deferred();
  const f = fixture(t, { fetch: () => reply.promise });
  let reentrant;
  f.client.onChange((status) => { if (status === 'checking') reentrant = f.client.check(); });
  const first = f.client.check();
  const second = f.client.check();
  const third = f.client.check({ force: true });
  assert.equal(first, second);
  assert.equal(first, third);
  await Promise.resolve();
  assert.equal(first, reentrant);
  assert.equal(f.calls.length, 1);
  reply.resolve(success(AUTH));
  assert.deepEqual(await Promise.all([first, second, third]), ['ok', 'ok', 'ok']);
});

test('ok の後は recheckMs 未満なら通信しない。ちょうど・以上・force は通信する', async (t) => {
  const f = fixture(t);
  await f.client.check();
  f.clock.at += CONFIG.recheckMs - 1;
  assert.equal(await f.client.check(), 'ok');
  assert.equal(f.calls.length, 1);
  f.clock.at++;
  assert.equal(await f.client.check(), 'ok');
  assert.equal(f.calls.length, 2);
  f.clock.at += CONFIG.recheckMs + 1;
  await f.client.check();
  assert.equal(f.calls.length, 3);
  await f.client.check({ force: true });
  assert.equal(f.calls.length, 4);
});

test('unknown・expired は間隔内でも確かめ直す。失敗したら uid を返さない', async (t) => {
  const replies = [success(AUTH), response(500, {}), response(400, { error: { message: 'TOKEN_EXPIRED' } }), success(AUTH)];
  const f = fixture(t, { fetch: () => replies.shift() });
  assert.equal(await f.client.check(), 'ok');
  assert.equal(await f.client.check({ force: true }), 'unknown');
  assert.equal(f.client.uid(), null);
  assert.equal(await f.client.check(), 'expired');
  assert.equal(f.client.uid(), null);
  assert.equal(await f.client.check(), 'ok');
  assert.equal(f.calls.length, 4);
});

test('同じ人でも refreshToken が変われば、間隔内に確かめ直す', async (t) => {
  const f = fixture(t);
  await f.client.check();
  f.storage.raw = JSON.stringify({ uid: AUTH.uid, refreshToken: 'test-replaced-token' });
  assert.equal(await f.client.check(), 'ok');
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls[1].init.body.endsWith('test-replaced-token'));
});

test('途中で別の人に変わったら、新しい人で 1 回やり直す', async (t) => {
  const first = deferred(); const second = deferred();
  const started = deferred();
  const f = fixture(t, { fetch: (url, init, count) => {
    if (count === 1) return first.promise;
    started.resolve();
    return second.promise;
  } });
  const seen = [];
  f.client.onChange((status) => seen.push([status, f.client.uid()]));
  const checking = f.client.check();
  await Promise.resolve();
  f.storage.raw = JSON.stringify(OTHER);
  assert.equal(f.client.check({ force: true }), checking);
  first.resolve(success(AUTH));
  await started.promise;
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls[1].init.body, 'grant_type=refresh_token&refresh_token=' + OTHER.refreshToken);
  second.resolve(success(OTHER));
  assert.equal(await checking, 'ok');
  assert.equal(f.client.uid(), OTHER.uid);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(seen, [['checking', null], ['ok', OTHER.uid]]);
});

test('途中で保存が消えたら、古い成功を捨てて none', async (t) => {
  const reply = deferred();
  const f = fixture(t, { fetch: () => reply.promise });
  const checking = f.client.check();
  await Promise.resolve();
  f.storage.raw = null;
  reply.resolve(success(AUTH));
  assert.equal(await checking, 'none');
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls.length, 1);
});

test('やり直し中も保存が変わったら unknown、3 本目は送らない', async (t) => {
  const f = fixture(t, { fetch: (url, init, count) => {
    f.storage.raw = JSON.stringify(count === 1 ? OTHER : AUTH);
    return success(count === 1 ? AUTH : OTHER);
  } });
  assert.equal(await f.client.check(), 'unknown');
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls.length, 2);
});

test('やり直し中にログアウトした場合も none', async (t) => {
  const f = fixture(t, { fetch: (url, init, count) => {
    f.storage.raw = count === 1 ? JSON.stringify(OTHER) : null;
    return success(count === 1 ? AUTH : OTHER);
  } });
  assert.equal(await f.client.check(), 'none');
  assert.equal(f.client.uid(), null);
  assert.equal(f.calls.length, 2);
});

test('onChange は変化したときだけ。再確認中は前の結果を保ち、解除すると通知しない', async (t) => {
  const f = fixture(t);
  const seen = [];
  const stop = f.client.onChange((status) => seen.push(status));
  await f.client.check();
  await f.client.check({ force: true });
  assert.deepEqual(seen, ['checking', 'ok']);
  f.storage.raw = null;
  assert.equal(await f.client.check(), 'none');
  assert.equal(f.client.uid(), null);
  await f.client.check();
  assert.deepEqual(seen, ['checking', 'ok', 'none']);
  stop();
  f.storage.raw = JSON.stringify(AUTH);
  await f.client.check();
  assert.deepEqual(seen, ['checking', 'ok', 'none']);
});

test('通知の例外は握りつぶす。console にトークンや例外の内容を出さない', async (t) => {
  const errors = [];
  const context = { console: { error: (...args) => errors.push(args) } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/link.js'), 'utf8'), context);
  const f = fixture(t, { link: context.RikaQuest.link });
  const seen = [];
  f.client.onChange(() => { throw new Error(AUTH.refreshToken + ' test-id-token'); });
  f.client.onChange((status) => seen.push(status));
  assert.equal(await f.client.check(), 'ok');
  assert.deepEqual(seen, ['checking', 'ok']);
  assert.equal(errors.length, 2);
  assert.equal(JSON.stringify(errors).includes(AUTH.refreshToken), false);
  assert.equal(JSON.stringify(errors).includes('test-id-token'), false);
});

// 起動とイベント配線だけを小さな DOM の代わりで確かめる（通信は上と同じ偽物）
function startApp(t, options) {
  const opts = options || {};
  const storage = fakeStorage(t, opts.raw === undefined ? null : opts.raw);
  const timers = fakeTimers();
  const events = { root: {}, document: {} };
  const checks = [];
  const calls = [];
  const errors = [];
  function element(tag) {
    return {
      tag, hidden: true, children: [], attrs: {},
      replaceChildren(...children) { this.children = children; },
      append(...children) { this.children.push(...children); },
      setAttribute(name, value) { this.attrs[name] = value; },
    };
  }
  const band = element('div');
  const sections = { 'screen-profile': element('section'), 'screen-settings': element('section') };
  const config = Object.assign({}, require('../js/config.js'), { link: opts.config === undefined ? CONFIG : opts.config });
  const context = {
    console: { error: (...args) => errors.push(args) },
    localStorage: storage, location: { protocol: 'https:' },
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    scrollTo() {}, CustomEvent: class { constructor(type) { this.type = type; } },
    addEventListener(type, fn) { events.root[type] = fn; },
    document: {
      readyState: 'loading', visibilityState: 'visible', documentElement: { dataset: {} },
      createElement: element,
      getElementById(id) { return id === 'link-band' ? band : sections[id] || null; },
      querySelector(selector) { return selector === 'link[rel="manifest"]' ? {} : null; },
      querySelectorAll() { return Object.values(sections); },
      addEventListener(type, fn) { events.document[type] = fn; },
      dispatchEvent() {},
    },
    RikaQuest: {
      config, content: { units: () => [] }, record: require('../js/record.js'),
      storage: { load: () => ({ store: { profiles: [], records: {}, currentProfileId: null } }) },
      ui: { screens: { profile() {}, settings() {} } },
      link: opts.noLink ? null : { createLink(params) {
        const client = link.createLink(params);
        const check = client.check;
        client.check = (args) => { const promise = check(args); checks.push({ args, promise }); return promise; };
        return client;
      } },
    },
  };
  if (!opts.noFetch) {
    context.fetch = function (url, init) {
      assert.equal(this.RikaQuest, context.RikaQuest, 'fetch を root に bind する');
      calls.push({ url, init });
      return opts.fetch ? opts.fetch(url, init) : success(AUTH);
    };
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8'), context);
  events.document.DOMContentLoaded();
  t.after(() => {
    assert.deepEqual(errors, []);
    assert.equal(timers.pending.size, 0);
  });
  return { context, band, events, checks, calls, storage, app: context.RikaQuest.app };
}

test('app: 初回の確認、5 種類の帯、同じタブのリンク、画面移動後の帯', async (t) => {
  const reply = deferred();
  let result = reply.promise;
  const f = startApp(t, { fetch: () => result });
  assert.equal(f.checks.length, 1);
  await f.checks[0].promise;
  assert.equal(f.band.hidden, false);
  assert.equal(f.band.className, 'link-band is-off');
  assert.equal(f.band.children[0].textContent, 'ログインしていません。記録は、この端末の中だけに残ります。');
  assert.equal(f.band.children[1].textContent, '授業ログにログインする');
  assert.equal(f.band.children[1].href, CONFIG.jugyoUrl);
  assert.equal(f.band.children[1].target, undefined);
  assert.equal(f.band.attrs['data-no-ruby'], undefined);
  f.storage.raw = JSON.stringify(AUTH);
  f.events.root.storage({ key: CONFIG.authKey });
  await Promise.resolve();
  assert.equal(f.band.children.length, 1);
  assert.equal(f.band.children[0].textContent, '授業ログとのつながりを確かめています…');
  reply.resolve(success(AUTH));
  await f.checks.at(-1).promise;
  assert.equal(f.band.className, 'link-band is-ok');
  assert.equal(f.band.children[0].textContent, '授業ログのアカウントで つながっています。記録は、まだこの端末の中だけに残ります。');
  assert.equal(f.band.children[0].className, 'link-band-text');
  assert.equal(f.band.children[1].className, 'link-band-link');
  assert.equal(f.band.children[1].textContent, '授業ログへもどる');
  f.app.go('settings');
  assert.equal(f.app.state.screen, 'settings');
  assert.equal(f.band.hidden, false);
  result = response(500, {});
  f.events.root.storage({ key: null });
  await f.checks.at(-1).promise;
  assert.equal(f.band.className, 'link-band is-wait');
  assert.equal(f.band.children[0].textContent, '通信できないので、授業ログとのつながりを確かめられません。学習は、このまま続けられます。');
  result = response(400, { error: { message: 'TOKEN_EXPIRED' } });
  f.events.root.online();
  await f.checks.at(-1).promise;
  assert.equal(f.band.className, 'link-band is-off');
  assert.equal(f.band.children[0].textContent, '授業ログのログインが切れています。記録は、この端末の中だけに残ります。');
  assert.equal(f.band.children[1].textContent, '授業ログでログインし直す');
});

test('app: online・visible・保存キーの変更で確認し、無関係なイベントでは確認しない', async (t) => {
  const f = startApp(t, { raw: JSON.stringify(AUTH) });
  await f.checks[0].promise;
  f.events.root.online();
  await f.checks.at(-1).promise;
  assert.equal(f.checks.length, 2);
  assert.equal(f.calls.length, 1);
  f.context.document.visibilityState = 'hidden';
  f.events.document.visibilitychange();
  f.events.root.storage({ key: 'rika-quest:v1' });
  assert.equal(f.checks.length, 2);
  f.context.document.visibilityState = 'visible';
  f.events.document.visibilitychange();
  await f.checks.at(-1).promise;
  assert.equal(f.checks.length, 3);
  for (const key of [CONFIG.authKey, null]) {
    f.events.root.storage({ key });
    await f.checks.at(-1).promise;
    assert.equal(f.checks.at(-1).args.force, true);
  }
  assert.equal(f.calls.length, 3);
});

test('app: モジュールや設定・apiKey・tokenUrl がなければ帯を出さず起動する', (t) => {
  const options = [
    { noLink: true }, { config: null },
    { config: Object.assign({}, CONFIG, { apiKey: '' }) },
    { config: Object.assign({}, CONFIG, { tokenUrl: '  ' }) },
  ];
  for (const opts of options) {
    const f = startApp(t, opts);
    assert.equal(f.band.hidden, true);
    assert.equal(f.app.state.link, null);
    assert.equal(f.app.state.screen, 'profile');
    assert.equal(f.checks.length, 0);
    assert.equal(f.events.root.online, undefined);
  }
});

test('app: fetch がなくても学習画面の起動を止めず、黄色の帯にする', async (t) => {
  const f = startApp(t, { noFetch: true, raw: JSON.stringify(AUTH) });
  assert.equal(await f.checks[0].promise, 'unknown');
  assert.equal(f.band.className, 'link-band is-wait');
  assert.equal(f.app.state.screen, 'profile');
});
