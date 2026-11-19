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
  assert.deepEqual(Object.keys(f.client).sort(), ['check', 'getToken', 'onChange', 'savedUid', 'status', 'uid']);
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

test('savedUid: 確認前も uid を返し、保存が変わった・消えた場合も反映する', (t) => {
  const f = fixture(t); assert.equal(f.client.savedUid(), AUTH.uid); assert.equal(f.client.uid(), null);
  f.storage.raw = JSON.stringify(OTHER); assert.equal(f.client.savedUid(), OTHER.uid);
  f.storage.raw = null; assert.equal(f.client.savedUid(), null);
});
test('getToken: 期限まで5分以上なら再利用し、足りなければ同じ通信で更新する', async (t) => {
  const f = fixture(t);
  assert.deepEqual(await Promise.all([f.client.getToken(), f.client.getToken()]), ['test-id-token', 'test-id-token']);
  assert.equal(f.calls.length, 1);
  f.clock.at += 3300000; assert.equal(await f.client.getToken(), 'test-id-token'); assert.equal(f.calls.length, 1);
  f.clock.at++; await Promise.all([f.client.getToken(), f.client.getToken()]); assert.equal(f.calls.length, 2);
});
test('getToken: 失敗・短い期限・不明な期限・ログアウトは null', async (t) => {
  for (const reply of [response(500, null), response(400, { error: { message: 'TOKEN_EXPIRED' } }),
    response(200, { user_id: AUTH.uid, id_token: 'short', expires_in: '299' }),
    response(200, { user_id: AUTH.uid, id_token: 'missing' })]) {
    assert.equal(await fixture(t, { fetch: () => reply }).client.getToken(), null);
  }
  const f = fixture(t); await f.client.check(); f.storage.raw = null; assert.equal(await f.client.getToken(), null);
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

test('app: 未ログイン・読みこみ中・端末での継続・期限切れの帯、同じタブのリンク', async (t) => {
  const off = startApp(t);
  await off.checks[0].promise;
  assert.equal(off.band.children[0].textContent, 'ログインしていません。記録は、この端末の中だけに残ります。');
  assert.equal(off.band.children[1].textContent, '授業ログにログインする');
  const reply = deferred();
  let result = reply.promise;
  const f = startApp(t, { raw: JSON.stringify(AUTH), fetch: () => result });
  assert.equal(f.checks.length, 1);
  await Promise.resolve();
  assert.equal(f.band.children.length, 1);
  assert.equal(f.band.children[0].textContent, '授業ログの記録を読みこんでいます…');
  reply.resolve(success(AUTH));
  await f.checks.at(-1).promise;
  assert.equal(f.band.className, 'link-band is-wait');
  assert.equal(f.band.children[0].textContent, '通信できないので、授業ログの記録を読みこめません。今は、この端末の記録を使います。');
  assert.equal(f.band.children[0].className, 'link-band-text');
  assert.equal(f.band.children[1].className, 'link-band-link');
  assert.equal(f.band.children[1].textContent, '授業ログへもどる');
  assert.equal(f.band.children[1].href, CONFIG.jugyoUrl);
  assert.equal(f.band.children[1].target, undefined);
  assert.equal(f.band.attrs['data-no-ruby'], undefined);
  f.app.go('settings');
  assert.equal(f.app.state.screen, 'settings');
  assert.equal(f.band.hidden, false);
  result = response(500, {});
  f.events.root.storage({ key: null });
  await f.checks.at(-1).promise;
  assert.equal(f.band.className, 'link-band is-wait');
  assert.equal(f.band.children[0].textContent, '通信できないので、授業ログの記録を読みこめません。今は、この端末の記録を使います。');
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

// 同期も含めた起動。実際の app・link・sync・プロフィール/設定画面を小さな DOM で動かす。
function accountApp(t, opts = {}) {
  const R = require('../js/record.js');
  const config = Object.assign({}, require('../js/config.js'), { link: Object.assign({}, require('../js/config.js').link, CONFIG, { dbUrl: 'https://account.example.invalid' }) });
  const data = new Map(Object.entries(opts.data || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  if (opts.auth !== null) data.set(CONFIG.authKey, JSON.stringify(opts.auth || AUTH));
  const writes = []; const events = { root: {}, document: {} }; const timers = fakeTimers();
  let reloads = 0; let clock = 100000; const errors = []; const renders = []; const contexts = {}; const downloads = [];
  const storage = {
    get length() { return data.size; }, key: (i) => [...data.keys()][i], getItem: (k) => data.has(k) ? data.get(k) : null,
    setItem(k, v) { if (opts.failWrite && opts.failWrite(k)) throw new Error('full'); writes.push(['set', k]); data.set(k, v); },
    removeItem(k) { writes.push(['remove', k]); data.delete(k); },
  };
  function element(tag) {
    let text = '';
    const e = {
      tag, children: [], attrs: {}, dataset: {}, events: {}, hidden: true, value: '', isConnected: true,
      classList: { toggle() {} },
      get textContent() { return text + this.children.map((c) => typeof c === 'string' ? c : c.textContent || '').join(''); },
      set textContent(v) { text = String(v); this.children = []; },
      replaceChildren(...children) { text = ''; this.children = children; }, append(...children) { this.children.push(...children); },
      setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(type, fn) { this.events[type] = fn; }, removeEventListener() {},
      remove() { this.isConnected = false; },
      click() { if (!this.disabled && this.attrs.disabled === undefined && this.events.click) return this.events.click(); },
    }; return e;
  }
  const ids = {};
  for (const id of ['link-band', 'save-status', 'message', 'load-notice', 'header-profile', 'content-error']) ids[id] = element('div');
  for (const name of ['profile', 'claim', 'home', 'map', 'units', 'record', 'settings', 'problem', 'lesson', 'offer', 'result', 'live', 'teacher']) ids['screen-' + name] = element('section');
  const document = {
    readyState: 'loading', visibilityState: 'visible', documentElement: { dataset: {} }, body: element('body'),
    createElement: element, createTextNode: (text) => text, getElementById: (id) => ids[id] || null,
    querySelector: (s) => s === 'link[rel="manifest"]' ? {} : null,
    querySelectorAll: () => Object.keys(ids).filter((k) => k.startsWith('screen-')).map((k) => ids[k]),
    addEventListener(type, fn) { events.document[type] = fn; }, removeEventListener() {}, dispatchEvent() {},
  };
  const remote = { value: opts.remote === undefined ? null : opts.remote, logs: {}, http: 200 }; const calls = [];
  const context = {
    document, console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args) },
    Blob, URL: { createObjectURL(blob) { downloads.push(blob); return 'blob:test-download'; }, revokeObjectURL() {} },
    localStorage: storage, location: { protocol: 'https:', search: '', reload() { reloads++; } },
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout, scrollTo() {}, CustomEvent: class {},
    Date: class extends Date { static now() { return clock; } },
    addEventListener(type, fn) { events.root[type] = fn; },
    async fetch(url, init) {
      if (url.startsWith(CONFIG.tokenUrl)) return opts.authFetch ? opts.authFetch() : success(opts.auth || AUTH);
      calls.push({ url, init });
      if (opts.dbFetch) return opts.dbFetch(url, init);
      if (remote.http !== 200) return response(remote.http, null);
      const state = url.includes('/state/'); const id = url.split('.json')[0].split('/').at(-1);
      if (init.method === 'PUT') {
        if (state) {
          const next = JSON.parse(init.body);
          if (remote.value && (next.base !== remote.value.updatedAt || next.updatedAt <= remote.value.updatedAt)) return response(403, null);
          remote.value = next;
        }
        else { if (remote.logs[id]) return response(403, null); remote.logs[id] = JSON.parse(init.body); }
        return response(200, null);
      }
      return response(200, state ? remote.value : url.includes('shallow=true') ? Object.fromEntries(Object.keys(remote.logs).map((k) => [k, true])) : remote.logs[id] || null);
    },
    RikaQuest: {
      config, content: { units: () => [], unit: () => null }, contentRegistry: { validateUnit: () => [] },
      record: R, xp: require('../js/xp.js'), units: { currentId: () => null },
      storage: require('../js/storage.js'), link, sync: require('../js/sync.js'),
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/ui-screens.js'), 'utf8'), context);
  const ui = context.RikaQuest.ui;
  for (const name of Object.keys(ids).filter((k) => k.startsWith('screen-')).map((k) => k.slice(7))) {
    const actual = ui.screens[name];
    ui.screens[name] = (section, ctx, params) => {
      renders.push(name); contexts[name] = ctx;
      if (['profile', 'claim', 'settings'].includes(name)) return actual(section, ctx, params);
    };
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8'), context);
  const ready = events.document.DOMContentLoaded();
  t.after(() => { assert.deepEqual(errors, []); assert.equal(writes.some(([, key]) => key === CONFIG.authKey), false); });
  function nodes(node) { return [node].concat((node.children || []).filter((c) => typeof c === 'object').flatMap(nodes)); }
  const find = (screen, label) => nodes(ids['screen-' + screen]).find((e) => e.tag === 'button' && e.textContent === label);
  const settle = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
  return { ready, app: context.RikaQuest.app, context, data, writes, ids, events, timers, remote, calls, renders, contexts, find, nodes, settle, downloads,
    tick: (ms) => { clock += ms; }, reloads: () => reloads };
}
function accountStore(name = 'テスト', id = 'p-test') {
  return { version: 1, currentProfileId: id, profiles: [{ id, nickname: name, avatar: 'fox' }], records: { [id]: require('../js/record.js').createRecord() } };
}
const ACCT = 'rika-quest:acct:'; const SYNC = 'rika-quest:sync:';

test('account app: 今のアカウントの storage イベントは保存せず再読込し、端末・別 uid のキーは無視する', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready; await f.settle();
  const before = f.writes.length; const calls = f.calls.length;
  for (const key of ['rika-quest:v1', ACCT + OTHER.uid]) f.events.root.storage({ key });
  await f.settle(); assert.equal(f.reloads(), 0); assert.equal(f.writes.length, before); assert.equal(f.calls.length, calls);
  f.data.set(ACCT + AUTH.uid, JSON.stringify(accountStore('別タブ')));
  f.events.root.storage({ key: ACCT + AUTH.uid }); f.events.root.storage({ key: ACCT + AUTH.uid });
  assert.equal(f.reloads(), 1); assert.equal(f.writes.length, before);
  assert.equal(JSON.parse(f.data.get(ACCT + AUTH.uid)).profiles[0].nickname, '別タブ');
  f.events.root.pagehide(); await f.settle(); assert.equal(f.calls.length, calls);
  const device = accountApp(t, { auth: null, data: { 'rika-quest:v1': accountStore() } }); await device.ready;
  for (const key of ['rika-quest:v1', ACCT + AUTH.uid]) device.events.root.storage({ key });
  assert.equal(device.reloads(), 0);
});

test('account app: 学習中・ライブ・先生・教材作成中の storage 更新はホームに戻って1回だけ再読込する', async (t) => {
  for (const screen of ['lesson', 'problem', 'offer', 'live', 'live-host', 'teacher', 'author']) {
    const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready; await f.settle();
    f.app.state.screen = screen; f.app.state.session = { kind: 'review' };
    const before = f.writes.length;
    f.events.root.storage({ key: ACCT + AUTH.uid }); f.events.root.storage({ key: ACCT + AUTH.uid });
    assert.equal(f.reloads(), 0, screen); assert.equal(f.writes.length, before);
    f.app.go('settings'); assert.equal(f.reloads(), 0);
    f.app.state.session = null; f.app.go('home'); f.app.go('home');
    assert.equal(f.reloads(), 1, screen); assert.equal(f.writes.length, before);
  }
  const idle = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await idle.ready;
  idle.app.state.screen = 'problem'; idle.events.root.storage({ key: ACCT + AUTH.uid }); assert.equal(idle.reloads(), 1);
});

const BLOCKED_TEXT = '記録をこの端末に保存できませんでした。設定の『記録を書き出す』でファイルに残してから、ページを読みこみ直してください。';

test('account app: 通信復帰時の端末→アカウントも保存失敗なら保持し、保存成功後に切り替える', async (t) => {
  for (const cached of [false, true]) {
    let online = false; let fail = false; const remote = accountStore('アカウント');
    const f = accountApp(t, { data: { 'rika-quest:v1': accountStore('端末') },
      authFetch: () => online ? success(AUTH) : response(500, null), failWrite: (key) => fail && key === 'rika-quest:v1',
      remote: { v: 1, updatedAt: 1, json: require('../js/sync.js').packState(remote.profiles[0], remote.records['p-test']) } });
    await f.ready; assert.equal(f.app.state.account, null);
    f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [], index: 2 }) };
    f.app.startSession({ stageId: 'stage-test' }); f.app.go('problem', { session: true });
    const store = f.app.state.store; const session = f.app.state.session;
    f.app.state.lastResult = { session }; f.app.record.history.push({ at: 'a', problemId: 'unsaved' });
    f.app.record.xpLog.push({ at: 'a', kind: 'answer', amount: 5 }); f.app.record.xp = 5;
    fail = true; assert.equal(f.app.save(), false);
    if (cached) f.data.set(ACCT + AUTH.uid, JSON.stringify(remote));
    online = true; await f.events.root.online(); await f.settle();
    assert.equal(f.app.state.account, null); assert.equal(f.app.state.sync, null); assert.equal(f.app.state.switchBlocked, true);
    assert.equal(f.app.state.store, store); assert.equal(f.app.record.history[0].problemId, 'unsaved'); assert.equal(f.app.record.xp, 5);
    assert.equal(f.app.state.session, session); assert.equal(f.app.state.lastResult.session, session); assert.equal(f.app.state.screen, 'problem');
    assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT); assert.equal(f.ids['link-band'].className, 'link-band is-wait');
    assert.equal(f.nodes(f.ids['link-band']).some((e) => e.tag === 'a'), false);
    assert.equal(f.app.record.history[0].eid, undefined); assert.equal(f.app.record.xpLog[0].eid, undefined);
    const calls = f.calls.length;
    f.events.root.online(); f.events.document.visibilitychange(); f.events.root.pagehide(); f.timers.run(); await f.settle();
    assert.equal(f.calls.length, calls); assert.equal(f.app.state.store, store); assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT);
    f.app.go('settings'); f.find('settings', '記録を書き出す').click();
    assert.equal(JSON.parse(await f.downloads[0].text()).records['p-test'].history[0].problemId, 'unsaved');
    fail = false; assert.equal(f.app.save(), true); await f.settle();
    assert.equal(f.app.state.switchBlocked, false); assert.equal(f.app.state.account.uid, AUTH.uid);
    assert.equal(f.app.state.store.profiles[0].nickname, 'アカウント'); assert.equal(f.app.state.screen, 'home');
    assert.equal(f.app.state.session, null); assert.equal(f.app.state.lastResult, null); assert.equal(f.app.state.sessionOwner, null);
    const saved = JSON.parse(f.data.get('rika-quest:v1')).records['p-test'];
    assert.equal(saved.history[0].problemId, 'unsaved'); assert.equal(saved.xp, 5); assert.equal(saved.stages['stage-test'].resume.index, 2);
    assert.equal(saved.history[0].eid, undefined); assert.equal(saved.xpLog[0].eid, undefined);
    assert.equal(f.app.record.history.length, 0); assert.equal(f.reloads(), 0);
  }
});

test('account app: 通信復帰時に保存できれば端末の再開位置を残し、学習状態を空にしてアカウントへ入る', async (t) => {
  let online = false; const remote = accountStore('アカウント');
  const f = accountApp(t, { data: { 'rika-quest:v1': accountStore('端末') },
    authFetch: () => online ? success(AUTH) : response(500, null),
    remote: { v: 1, updatedAt: 1, json: require('../js/sync.js').packState(remote.profiles[0], remote.records['p-test']) } });
  await f.ready;
  f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [], index: 3 }) };
  f.app.startSession({ stageId: 'stage-test' }); f.app.go('problem', { session: true });
  f.app.state.lastResult = { session: f.app.state.session }; f.app.record.history.push({ at: 'a', problemId: 'device' });
  online = true; await f.events.root.online(); await f.settle();
  assert.equal(f.app.state.account.uid, AUTH.uid); assert.equal(f.app.state.switchBlocked, false); assert.equal(f.app.state.screen, 'home');
  assert.equal(f.app.state.session, null); assert.equal(f.app.state.lastResult, null); assert.equal(f.app.state.sessionOwner, null);
  const saved = JSON.parse(f.data.get('rika-quest:v1')).records['p-test'];
  assert.equal(saved.history[0].problemId, 'device'); assert.equal(saved.history[0].eid, undefined); assert.equal(saved.stages['stage-test'].resume.index, 3);
  assert.equal(f.app.record.history.length, 0); assert.equal(f.app.record.stages['stage-test'], undefined);
});

test('account app: 通信復帰後の初回確認も端末の保存成功を待ち、引き継ぐ全項目に eid を付ける', async (t) => {
  let online = false; let fail = false;
  const f = accountApp(t, { data: { 'rika-quest:v1': accountStore('端末') },
    authFetch: () => online ? success(AUTH) : response(500, null), failWrite: (key) => fail && key === 'rika-quest:v1' });
  await f.ready; f.app.record.history.push({ at: 'a', problemId: 'device' }); f.app.record.xpLog.push({ at: 'a', amount: 5 });
  fail = true; f.app.save(); online = true; await f.events.root.online(); await f.settle();
  assert.equal(f.app.state.account, null); assert.equal(f.app.state.switchBlocked, true); assert.equal(f.app.state.claimStore, null);
  f.app.record.history.push({ at: 'a', problemId: 'later' });
  fail = false; assert.equal(f.app.save(), true);
  assert.equal(f.app.state.account.uid, AUTH.uid); assert.equal(f.app.state.screen, 'claim');
  assert.equal(f.app.state.claimStore.records['p-test'].history.length, 2);
  assert.ok(f.app.state.claimStore.records['p-test'].history.every((entry) => entry.eid === undefined));
  f.find('claim', 'わたしの記録です').click();
  const saved = JSON.parse(f.data.get(ACCT + AUTH.uid)); const record = saved.records['p-test'];
  assert.equal(new Set(record.history.map((entry) => entry.eid)).size, 2);
  assert.ok(record.history.concat(record.xpLog).every((entry) => typeof entry.eid === 'string' && entry.eid));
  assert.deepEqual(record.history.map((entry) => entry.eid), saved.sync.pending.h.map((entry) => entry.eid));
  assert.deepEqual(record.xpLog.map((entry) => entry.eid), saved.sync.pending.x.map((entry) => entry.eid));
  await f.settle();
  const chunks = Object.values(f.remote.logs).map(require('../js/sync.js').unpackChunk);
  assert.deepEqual(chunks.flatMap((c) => c.h).map((entry) => entry.eid), record.history.map((entry) => entry.eid));
});

test('account app: 別タブ更新の再読込も未保存の変更があれば保存を確かめ、失敗なら止める', async (t) => {
  let fail = false;
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() }, failWrite: (key) => fail && key === ACCT + AUTH.uid });
  await f.ready; await f.settle();
  f.app.record.history.push({ at: 'a', problemId: 'unsaved' }); fail = true; f.app.save();
  const store = f.app.state.store;
  f.events.root.storage({ key: ACCT + AUTH.uid });
  assert.equal(f.reloads(), 0); assert.equal(f.app.state.switchBlocked, true); assert.equal(f.app.state.store, store);
  assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT);
  fail = false; assert.equal(f.app.save(), true); assert.equal(f.reloads(), 1);
  assert.equal(JSON.parse(f.data.get(ACCT + AUTH.uid)).records['p-test'].history[0].problemId, 'unsaved');
});

test('account app: ログイン変更・削除・追加で保存失敗したら保持し、書き出しと保存成功後の再読込ができる', async (t) => {
  for (const mode of ['changed', 'removed', 'added']) {
    let fail = false;
    const key = mode === 'added' ? 'rika-quest:v1' : ACCT + AUTH.uid;
    const f = accountApp(t, { auth: mode === 'added' ? null : AUTH,
      data: { [ACCT + AUTH.uid]: accountStore(), 'rika-quest:v1': accountStore('端末') }, failWrite: (k) => fail && k === key });
    await f.ready; await f.settle();
    const sync = f.app.state.sync;
    const pull = sync && t.mock.method(sync, 'pull'); const push = sync && t.mock.method(sync, 'push');
    f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [], index: 2 }) };
    f.app.startSession({ stageId: 'stage-test' }); f.app.go('problem', { session: true });
    const session = f.app.state.session; const store = f.app.state.store;
    f.app.state.lastResult = { session }; f.app.record.history.push({ at: 'a', problemId: 'unsaved' });
    fail = true; assert.equal(f.app.save(), false);
    if (mode === 'removed') f.data.delete(CONFIG.authKey); else f.data.set(CONFIG.authKey, JSON.stringify(mode === 'changed' ? OTHER : AUTH));
    f.events.root.storage({ key: CONFIG.authKey }); await f.settle();
    assert.equal(f.reloads(), 0); assert.equal(f.app.state.switchBlocked, true);
    assert.equal(f.app.state.store, store); assert.equal(f.app.state.session, session); assert.equal(f.app.state.lastResult.session, session);
    assert.equal(f.app.state.screen, 'problem'); assert.equal(f.app.state.account && f.app.state.account.uid, mode === 'added' ? null : AUTH.uid);
    assert.equal(f.ids['link-band'].className, 'link-band is-wait'); assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT);
    assert.equal(f.nodes(f.ids['link-band']).some((e) => e.tag === 'a'), false);
    // ほかの帯・再接続・予約済み送信があっても、切替待ちを優先する。
    f.app.state.syncStatus = 'denied'; f.app.save();
    f.events.root.online(); f.events.document.visibilitychange(); f.events.root.pagehide(); f.timers.run(); await f.settle();
    assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT);
    if (sync) { assert.equal(pull.mock.callCount(), 0); assert.equal(push.mock.callCount(), 0); }
    f.app.go('settings'); f.find('settings', '記録を書き出す').click();
    const exported = JSON.parse(await f.downloads[0].text());
    assert.equal(exported.records['p-test'].history[0].problemId, 'unsaved'); assert.equal(Object.hasOwn(exported, 'sync'), false);
    assert.equal(f.reloads(), 0); assert.equal(f.app.state.switchBlocked, true);
    if (sync) {
      f.events.root.storage({ key }); f.app.go('home'); assert.equal(f.reloads(), 0);
    }
    fail = false; assert.equal(f.app.save(), true);
    assert.equal(f.app.state.switchBlocked, false); assert.equal(f.reloads(), 1);
    assert.equal(f.app.state.session, null); assert.equal(f.app.state.lastResult, null); assert.equal(f.app.state.sessionOwner, null);
    const saved = JSON.parse(f.data.get(key)); assert.equal(saved.records['p-test'].history[0].problemId, 'unsaved');
    assert.equal(saved.records['p-test'].stages['stage-test'].resume.index, 2);
    f.events.root.storage({ key: CONFIG.authKey }); await f.settle(); assert.equal(f.reloads(), 1);
  }
});

test('account app: 起動時・使用中のログイン切れで保存失敗したら端末へ切り替えず、保存成功後に進む', async (t) => {
  for (const duringStart of [true, false]) {
    let fail = false; let expired = false; const gate = deferred(); const device = accountStore('端末');
    const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore(), 'rika-quest:v1': device },
      failWrite: (k) => fail && k === ACCT + AUTH.uid,
      authFetch: () => duringStart ? gate.promise : expired ? response(400, { error: { message: 'TOKEN_EXPIRED' } }) : success(AUTH) });
    if (!duringStart) { await f.ready; await f.settle(); }
    const sync = f.app.state.sync; const pull = t.mock.method(sync, 'pull'); const push = t.mock.method(sync, 'push');
    f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [], index: 3 }) };
    f.app.startSession({ stageId: 'stage-test' }); f.app.go('problem', { session: true });
    const session = f.app.state.session; const store = f.app.state.store;
    f.app.record.history.push({ at: 'a', problemId: 'unsaved' }); fail = true; f.app.save();
    if (duringStart) { gate.resolve(response(400, { error: { message: 'TOKEN_EXPIRED' } })); await f.ready; }
    else { expired = true; f.events.root.storage({ key: CONFIG.authKey }); await f.settle(); }
    assert.equal(f.app.state.switchBlocked, true); assert.equal(f.app.state.account.uid, AUTH.uid);
    assert.equal(f.app.state.session, session); assert.equal(f.app.state.store, store); assert.equal(f.app.state.screen, 'problem');
    assert.equal(f.reloads(), 0); assert.equal(f.ids['link-band'].textContent, BLOCKED_TEXT);
    assert.equal(f.ids['link-band'].className, 'link-band is-wait'); assert.equal(f.nodes(f.ids['link-band']).some((e) => e.tag === 'a'), false);
    f.events.root.online(); f.events.document.visibilitychange(); f.events.root.pagehide(); f.timers.run(); await f.settle();
    assert.equal(pull.mock.callCount(), 0); assert.equal(push.mock.callCount(), 0);
    f.app.go('settings'); f.find('settings', '記録を書き出す').click();
    assert.equal(JSON.parse(await f.downloads[0].text()).records['p-test'].history.length, 1);
    fail = false; assert.equal(f.app.save(), true);
    assert.equal(f.app.state.switchBlocked, false); assert.equal(f.app.state.account, null); assert.equal(f.app.state.sync, null);
    assert.equal(f.app.state.session, null); assert.equal(f.app.state.sessionOwner, null); assert.equal(f.app.state.screen, 'home'); assert.equal(f.reloads(), 0);
    assert.equal(f.app.state.store.profiles[0].nickname, '端末'); assert.deepEqual(JSON.parse(f.data.get('rika-quest:v1')), device);
    const saved = JSON.parse(f.data.get(ACCT + AUTH.uid));
    assert.equal(saved.records['p-test'].history.length, 1); assert.equal(saved.records['p-test'].stages['stage-test'].resume.index, 3);
    assert.match(f.ids['link-band'].textContent, /ログインが切れています/);
  }
});

test('account app: キャッシュがあれば確認前から本人の記録だけを表示し、offline は黄色', async (t) => {
  const gate = deferred(); const device = accountStore('端末の人'); const mine = accountStore('アカウントの人');
  const f = accountApp(t, { data: { 'rika-quest:v1': device, [ACCT + AUTH.uid]: mine }, authFetch: () => gate.promise });
  assert.equal(f.app.state.account.uid, AUTH.uid); assert.equal(f.app.state.store.profiles[0].nickname, 'アカウントの人');
  assert.equal(f.app.state.screen, 'home'); gate.resolve(response(500, null)); await f.ready;
  assert.equal(f.ids['link-band'].className, 'link-band is-wait');
  assert.match(f.ids['link-band'].textContent, /通信できません。送っていない記録はありません。学習は、このまま続けられます。/);
  assert.deepEqual(JSON.parse(f.data.get('rika-quest:v1')), device);
});
test('account app: 初めての端末では読みこみ中を出し、リモートの記録から始める', async (t) => {
  const gate = deferred(); const remote = accountStore('リモート');
  const f = accountApp(t, { authFetch: () => gate.promise, remote: { v: 1, updatedAt: 1, json: require('../js/sync.js').packState(remote.profiles[0], remote.records['p-test']) } });
  assert.equal(f.app.state.screen, 'claim'); assert.match(f.ids['screen-claim'].textContent, /読みこんでいます/);
  gate.resolve(success(AUTH)); await f.ready; await f.settle();
  assert.equal(f.app.state.screen, 'home'); assert.equal(f.app.state.store.profiles[0].nickname, 'リモート');
  assert.ok(f.data.has(ACCT + AUTH.uid)); assert.match(f.ids['link-band'].textContent, /記録は保存しました/);
});
test('account app: 未接続・拒否・壊れたリモートでは端末の記録で始め、claim は出さない', async (t) => {
  for (const status of [500, 403, 200]) {
    const f = accountApp(t, { data: { 'rika-quest:v1': accountStore('端末の人') }, dbFetch: () => response(status, {}) });
    await f.ready;
    assert.equal(f.app.state.account, null); assert.equal(f.app.state.screen, 'home'); assert.equal(f.app.state.claimStore, null);
    assert.equal(f.ids['link-band'].className, 'link-band is-wait'); assert.equal(f.data.has(ACCT + AUTH.uid), false);
    assert.equal(f.calls.some((c) => c.init.method === 'PUT'), false);
  }
});
test('account app: 初回の記録確認→移行。アカウントを保存してから端末から取り除く', async (t) => {
  const device = accountStore('持ち主'); device.records['p-test'].history.push({ at: '2026-11-19', problemId: 'test' });
  device.records['p-test'].xpLog.push({ at: '2026-11-19', amount: 10 }); device.records['p-test'].xp = 10;
  const other = { id: 'p-other', nickname: '別の記録', avatar: 'cat' }; device.profiles.push(other); device.records[other.id] = require('../js/record.js').createRecord();
  const f = accountApp(t, { data: { 'rika-quest:v1': device } }); await f.ready;
  assert.equal(f.app.state.screen, 'claim'); assert.match(f.ids['screen-claim'].textContent, /持ち主.*レベル 1/);
  const nick = f.nodes(f.ids['screen-claim']).find((e) => e.tag === 'h2' && e.textContent === '持ち主'); assert.ok(Object.hasOwn(nick.attrs, 'data-no-ruby'));
  f.find('claim', 'わたしの記録です').click(); await f.settle();
  assert.equal(f.app.state.screen, 'home'); assert.equal(f.app.state.store.profiles.length, 1);
  const remaining = JSON.parse(f.data.get('rika-quest:v1')); assert.equal(remaining.profiles.length, 1); assert.equal(remaining.profiles[0].id, 'p-other');
  assert.ok(f.writes.findIndex(([, k]) => k === ACCT + AUTH.uid) < f.writes.findIndex(([, k]) => k === 'rika-quest:v1'));
  const chunks = Object.values(f.remote.logs).map(require('../js/sync.js').unpackChunk);
  assert.equal(chunks.reduce((n, c) => n + c.h.length, 0), 1); assert.equal(chunks.reduce((n, c) => n + c.x.length, 0), 1);
});
test('account app: アカウント保存失敗なら元の記録を取り除かない', async (t) => {
  const device = accountStore(); const f = accountApp(t, { data: { 'rika-quest:v1': device }, failWrite: (k) => k.startsWith(ACCT) });
  await f.ready; f.find('claim', 'わたしの記録です').click();
  assert.deepEqual(JSON.parse(f.data.get('rika-quest:v1')), device); assert.equal(f.app.state.screen, 'claim');
  assert.equal(f.data.has(ACCT + AUTH.uid), false); assert.match(f.ids.message.textContent, /保存できませんでした/);
});

test('account app: 移行の保存失敗後に別のプロフィールを選んでも、先の人の履歴を送らない', async (t) => {
  const device = accountStore(); device.records['p-test'].history = [{ problemId: 'first' }];
  device.profiles.push({ id: 'p-other', nickname: '別の記録', avatar: 'cat' });
  device.records['p-other'] = require('../js/record.js').createRecord(); device.records['p-other'].history = [{ problemId: 'second' }];
  let fail = true;
  const f = accountApp(t, { data: { 'rika-quest:v1': device }, failWrite: (key) => fail && key.startsWith(ACCT) }); await f.ready;
  assert.equal(f.contexts.claim.claimRecord('p-test'), false); fail = false;
  assert.equal(f.contexts.claim.claimRecord('p-other'), true); await f.settle();
  const history = Object.values(f.remote.logs).flatMap((chunk) => require('../js/sync.js').unpackChunk(chunk).h);
  assert.deepEqual(history.map((entry) => entry.problemId), ['second']);
  assert.equal(JSON.parse(f.data.get('rika-quest:v1')).profiles[0].id, 'p-test');
});
test('account app: ちがいます→新規作成は1人だけ。端末の前の記録は残る', async (t) => {
  const device = accountStore('前の記録'); const f = accountApp(t, { data: { 'rika-quest:v1': device } }); await f.ready;
  f.find('claim', 'ちがいます（新しく始める）').click();
  assert.equal(f.app.state.screen, 'profile');
  const input = f.nodes(f.ids['screen-profile']).find((e) => e.attrs.id === 'nickname-input'); input.value = '新しい人'; input.events.input();
  const create = f.find('profile', 'プロフィールを作る'); delete create.attrs.disabled; create.click();
  assert.equal(f.app.state.screen, 'home'); assert.equal(f.app.state.store.profiles.length, 1); assert.equal(f.app.state.store.profiles[0].nickname, '新しい人');
  assert.deepEqual(JSON.parse(f.data.get('rika-quest:v1')), device); assert.ok(f.data.has(ACCT + AUTH.uid));
  f.app.go('profile'); assert.equal(f.app.state.screen, 'home');
});
test('account app: 設定で切替・削除・読込を隠す。書出と見た目は残し clearAll も消さない', async (t) => {
  const mine = accountStore(); const device = accountStore('端末');
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: mine, 'rika-quest:v1': device } }); await f.ready; f.app.go('settings');
  for (const label of ['切り替え', '削除', '新しいプロフィールを作る', '記録を読み込む', 'すべて削除']) assert.equal(f.find('settings', label), undefined, label);
  assert.ok(f.find('settings', '記録を書き出す')); assert.match(f.ids['screen-settings'].textContent, /プロフィールは 1 人だけ/);
  const input = f.nodes(f.ids['screen-settings']).find((e) => e.attrs.id === 'account-nickname');
  input.value = 'ニックネーム'; input.events.change();
  assert.equal(f.app.state.store.profiles[0].nickname, 'ニックネーム');
  f.find('settings', 'モジャリ').click(); assert.equal(f.app.state.store.profiles[0].avatar, 'cat');
  assert.equal(f.contexts.settings.setPrefs({ theme: 'teal', ruby: 'on', sound: false }), true);
  assert.equal(f.app.state.store.profiles[0].theme, 'teal'); assert.equal(f.app.state.sync.isDirty(), true);
  const before = [...f.data]; f.app.clearAll(); assert.deepEqual([...f.data], before); assert.equal(f.reloads(), 0);
});
test('account app: 未ログインの設定には従来の操作が残る', async (t) => {
  const f = accountApp(t, { auth: null, data: { 'rika-quest:v1': accountStore() } }); await f.ready; f.app.go('settings');
  for (const label of ['削除', '新しいプロフィールを作る', '記録を読み込む', 'すべて削除']) assert.ok(f.find('settings', label), label);
  assert.equal(f.app.state.account, null);
});
test('account app: uid が変わった・消えた・新しく入ったら保存して再読みこみ。同じ uid は維持', async (t) => {
  for (const mode of ['changed', 'removed', 'added']) {
    const f = accountApp(t, { auth: mode === 'added' ? null : AUTH, data: { [ACCT + AUTH.uid]: accountStore(), 'rika-quest:v1': accountStore('端末') } }); await f.ready;
    if (mode === 'removed') f.data.delete(CONFIG.authKey); else f.data.set(CONFIG.authKey, JSON.stringify(mode === 'changed' ? OTHER : AUTH));
    await f.events.root.storage({ key: CONFIG.authKey });
    assert.equal(f.reloads(), 1); assert.ok(f.writes.some(([op, k]) => op === 'set' && k === (mode === 'added' ? 'rika-quest:v1' : ACCT + AUTH.uid)));
  }
  const same = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await same.ready;
  same.data.set(CONFIG.authKey, JSON.stringify({ ...AUTH, refreshToken: 'test-new-refresh' })); await same.events.root.storage({ key: CONFIG.authKey });
  assert.equal(same.reloads(), 0);
});
test('account app: 同期済みの別アカウントだけ片付け、未送信・不明なものは残す', async (t) => {
  const clean = { v: 1, seenRev: 1, chunks: [], len: { h: 0, x: 0 }, pending: { h: [], x: [] }, sending: null, dirty: false };
  const f = accountApp(t, { data: {
    [ACCT + AUTH.uid]: accountStore(), [ACCT + 'clean']: { ...accountStore(), sync: clean }, [SYNC + 'clean']: clean,
    [ACCT + 'dirty']: { ...accountStore(), sync: { ...clean, dirty: true } },
    [ACCT + 'sending']: { ...accountStore(), sync: { ...clean, sending: { id: 'chunk_test', h: [], x: [{}] } } },
    [ACCT + 'pending']: { ...accountStore(), sync: { ...clean, pending: { h: [{}], x: [] } } },
    [ACCT + 'unknown']: accountStore(), [SYNC + 'unknown']: clean,
    [ACCT + 'broken']: { ...accountStore(), sync: { ...clean, chunks: 0 } },
    [ACCT + 'unreadable']: 'broken', [SYNC + 'orphan']: clean,
  } }); await f.ready;
  assert.equal(f.data.has(ACCT + 'clean'), false); assert.equal(f.data.has(SYNC + 'clean'), false);
  for (const id of ['dirty', 'sending', 'pending', 'unknown', 'broken', 'unreadable']) assert.ok(f.data.has(ACCT + id));
  assert.equal([...f.data.keys()].some((key) => key.startsWith(SYNC)), false);
});
test('account app: 保存の待ち時間を取り直す。pagehide はすぐ送信し、visible の pull は間隔を守る', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready;
  f.app.save(); const first = [...f.timers.pending.keys()]; f.app.save();
  assert.equal(f.timers.pending.size, 1); assert.notDeepEqual([...f.timers.pending.keys()], first);
  assert.match(f.ids['link-band'].textContent, /送っています/);
  f.events.root.pagehide(); await f.settle(); assert.equal(f.app.state.sync.isDirty(), false); assert.match(f.ids['link-band'].textContent, /保存しました/);
  const pulls = () => f.calls.filter((c) => c.init.method === 'GET' && c.url.includes('/state/')).length;
  const before = pulls(); f.events.document.visibilitychange(); await f.settle(); assert.equal(pulls(), before);
  f.tick(60000); f.events.document.visibilitychange(); await f.settle(); assert.equal(pulls(), before + 1);
});
test('account app: pull の変更はホームを描き直すが、問題中は描き直さない', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready;
  const changed = accountStore('変更後');
  f.remote.value = { v: 1, updatedAt: 2, json: require('../js/sync.js').packState(changed.profiles[0], changed.records['p-test']) };
  f.tick(60000); const before = f.renders.length; await f.events.root.online(); await f.settle();
  assert.ok(f.renders.length > before); assert.equal(f.app.state.store.profiles[0].nickname, '変更後');
  f.app.state.screen = 'problem'; const count = f.renders.length;
  f.remote.value.updatedAt += 10; f.tick(60000); await f.events.root.online(); await f.settle(); assert.equal(f.renders.length, count);
});
test('account app: 初回 offline のあと、つながれば初回確認へ進む。禁止文字の uid は端末モード', async (t) => {
  let online = false;
  const f = accountApp(t, { data: { 'rika-quest:v1': accountStore() }, authFetch: () => online ? success(AUTH) : response(500, null) });
  await f.ready; assert.equal(f.app.state.account, null); online = true; await f.events.root.online(); await f.settle();
  assert.equal(f.app.state.screen, 'claim'); assert.ok(f.find('claim', 'わたしの記録です'));
  const invalid = accountApp(t, { auth: { uid: 'bad/user', refreshToken: 'test' } }); await invalid.ready; await invalid.settle();
  assert.equal(invalid.app.state.account, null); assert.equal(invalid.calls.length, 0);
});
test('account app: キャッシュがあってもログイン切れなら端末モード、アカウントは削除しない', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore('アカウント'), 'rika-quest:v1': accountStore('端末') },
    authFetch: () => response(400, { error: { message: 'TOKEN_EXPIRED' } }) });
  await f.ready; assert.equal(f.app.state.account, null); assert.equal(f.app.state.store.profiles[0].nickname, '端末');
  assert.ok(f.data.has(ACCT + AUTH.uid)); assert.match(f.ids['link-band'].textContent, /ログインが切れています/);
});
test('account app: キャッシュで学習中でも、初回 pull が broken なら上書きしない', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() }, remote: {} }); await f.ready;
  f.app.save(); f.events.root.pagehide(); await f.settle();
  assert.equal(f.app.state.account.uid, AUTH.uid); assert.equal(f.calls.some((c) => c.init.method === 'PUT'), false);
  assert.match(f.ids['link-band'].textContent, /記録を読みこめませんでした/);
});
test('account app: 同期情報はアカウントと一緒に保存し、旧キーへ書かずに移行する', async (t) => {
  const s = accountStore(); s.records['p-test'].history.push({ at: '2026-11-19', problemId: 'test' });
  const f = accountApp(t, { data: { 'rika-quest:v1': s }, failWrite: (k) => k.startsWith(SYNC) });
  await f.ready; f.find('claim', 'わたしの記録です').click(); await f.settle();
  assert.equal(f.app.state.screen, 'home'); assert.equal(JSON.parse(f.data.get('rika-quest:v1')).profiles.length, 0);
  assert.equal(Object.keys(f.remote.logs).length, 1); assert.equal(f.writes.some(([op, key]) => op === 'set' && key.startsWith(SYNC)), false);
  assert.ok(JSON.parse(f.data.get(ACCT + AUTH.uid)).sync);
});

test('account app: 保存失敗でも未送信件数を表示し、設定だけなら件数を付けない', async (t) => {
  let fail = false;
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() }, failWrite: (key) => fail && key.startsWith(ACCT) });
  await f.ready; fail = true;
  f.app.state.store.profiles[0].nickname = '変更'; assert.equal(f.app.save(), false);
  assert.equal(f.ids['save-status'].textContent, '保存できません'); assert.equal(f.ids['link-band'].className, 'link-band is-wait');
  assert.match(f.ids['link-band'].textContent, /まだ送れていない記録があります。電波のよい所で開くと、自動で送ります。/);
  f.app.record.history.push({ at: 'a', problemId: 'test' }); f.app.save();
  assert.match(f.ids['link-band'].textContent, /まだ送れていない記録が 1 件あります/);
  const before = f.calls.length; f.events.root.pagehide(); await f.settle(); assert.equal(f.calls.length, before);
  fail = false; const writes = f.writes.length; assert.equal(f.app.save(), true);
  assert.equal(f.writes.length, writes + 1);
  const saved = JSON.parse(f.data.get(ACCT + AUTH.uid)); assert.equal(saved.sync.pending.h.length, 1); assert.equal(saved.records['p-test'].history.length, 1);
});

test('account app: 記録を書き出す中身には sync を入れず、端末の sync は保持する', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready;
  f.app.save(); f.app.go('settings');
  const exported = JSON.parse(f.context.RikaQuest.storage.exportJson(f.contexts.settings.store));
  assert.equal(Object.hasOwn(exported, 'sync'), false); assert.ok(f.app.state.store.sync);
  assert.deepEqual(exported.records, JSON.parse(JSON.stringify(f.app.state.store.records)));
  assert.ok(JSON.parse(f.data.get(ACCT + AUTH.uid)).sync);
});

test('account app: 学習中のログイン切れは元のアカウントに再開位置を保存し、端末へ混ぜない', async (t) => {
  const gate = deferred(); const device = accountStore('端末');
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore(), 'rika-quest:v1': device }, authFetch: () => gate.promise });
  f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [], index: 2 }) };
  assert.equal(f.app.startSession({ stageId: 'stage-test' }), true);
  f.app.state.lastResult = { session: f.app.state.session };
  gate.resolve(response(400, { error: { message: 'TOKEN_EXPIRED' } })); await f.ready;
  assert.equal(f.app.state.account, null); assert.equal(f.app.state.session, null); assert.equal(f.app.state.lastResult, null); assert.equal(f.app.state.sessionOwner, null);
  const saved = JSON.parse(f.data.get(ACCT + AUTH.uid)); assert.equal(saved.records['p-test'].stages['stage-test'].resume.index, 2);
  assert.equal(saved.sync.dirty, true);
  f.data.delete(CONFIG.authKey); await f.events.root.storage({ key: CONFIG.authKey });
  assert.equal(f.reloads(), 1); assert.deepEqual(JSON.parse(f.data.get('rika-quest:v1')), device);
});

test('account app: 学習の持ち主の uid・プロフィールが違えば再開位置を書かない', async (t) => {
  for (const field of ['uid', 'profileId']) {
    const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready;
    f.context.RikaQuest.session = { startStage: () => ({ kind: 'stage', stageId: 'stage-test', queue: [] }) };
    f.app.startSession({ stageId: 'stage-test' }); f.app.state.sessionOwner[field] = 'different';
    f.data.delete(CONFIG.authKey); await f.events.root.storage({ key: CONFIG.authKey });
    assert.equal(JSON.parse(f.data.get(ACCT + AUTH.uid)).records['p-test'].stages['stage-test'], undefined);
    assert.equal(f.app.state.session, null);
  }
});

test('account app: push の競合で統合したら保存・画面更新し、問題中は描き直さない', async (t) => {
  const f = accountApp(t, { data: { [ACCT + AUTH.uid]: accountStore() } }); await f.ready;
  f.app.save(); f.events.root.pagehide(); await f.settle();
  for (const screen of ['home', 'problem']) {
    f.app.state.screen = screen;
    const remote = require('../js/sync.js').unpackState(f.remote.value.json);
    remote.record.lessonsRead[screen] = true; f.remote.value.json = JSON.stringify(remote); f.remote.value.updatedAt++;
    f.app.record.lessonsRead.local = true; f.app.save(); const count = f.renders.length;
    f.events.root.pagehide(); await f.settle();
    assert.equal(f.app.record.lessonsRead[screen], true);
    assert.equal(JSON.parse(f.data.get(ACCT + AUTH.uid)).records['p-test'].lessonsRead[screen], true);
    assert.equal(f.renders.length > count, screen === 'home');
    assert.equal(f.app.state.sync.isDirty(), false);
  }
});
