// tests/author-api.test.js — Claude API の呼び出し（js/author-api.js）。偽の fetch で試す
const test = require('node:test'); const assert = require('node:assert/strict');
const authorApi = require('../js/author-api.js');

// SSE のイベントを ReadableStream で返す（chunks は途中で切れた文字列でもよい）
function sseStream(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) { chunks.forEach(c => controller.enqueue(enc.encode(c))); controller.close(); },
  });
}
function ev(type, data) { return 'event: ' + type + '\ndata: ' + JSON.stringify(Object.assign({ type }, data)) + '\n\n'; }
function okEvents(texts, stopReason) {
  return [
    ev('message_start', { message: { model: 'claude-opus-5-5', usage: { input_tokens: 100, output_tokens: 1 } } }),
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    ...texts.map(t => ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: t } })),
    ev('content_block_stop', { index: 0 }),
    ev('message_delta', { delta: { stop_reason: stopReason || 'end_turn' }, usage: { output_tokens: 42 } }),
    ev('message_stop', {}),
  ];
}
function response(status, bodyOrChunks) {
  if (Array.isArray(bodyOrChunks)) {
    return { ok: status >= 200 && status < 300, status, body: sseStream(bodyOrChunks), text: async () => bodyOrChunks.join('') };
  }
  return { ok: status >= 200 && status < 300, status, body: null, text: async () => bodyOrChunks };
}
// 呼ばれた順に responses を返し、呼び出しを calls に記録する
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return responses[calls.length - 1]; };
  fn.calls = calls;
  return fn;
}

const SCHEMA = { type: 'object', additionalProperties: false, properties: { a: { type: 'string' } }, required: ['a'] };

test('generate: SSE の text_delta をつなぎ、onProgress は累計文字数で増える', async () => {
  // 1 つのイベントが 2 つのかたまりに分かれて届いても読める
  const events = okEvents(['{"a":', '"磁石', '"}']);
  const joined = events.join('');
  const cut = joined.indexOf('磁石');
  const f = fakeFetch([response(200, [joined.slice(0, cut), joined.slice(cut)])]);
  const progress = [];
  const r = await authorApi.generate({ apiKey: 'test-key', system: 'sys', user: 'usr', schema: SCHEMA, onProgress: n => progress.push(n), fetchImpl: f,
    attachments: [{ kind: 'pdf', data: 'UERG' }, { kind: 'image', mediaType: 'image/png', data: 'iVBO' }, { kind: 'text', name: 'a.txt', text: 'x' }] });
  assert.equal(r.text, '{"a":"磁石"}');
  assert.equal(r.stopReason, 'end_turn');
  assert.equal(r.model, 'claude-opus-5-5');
  assert.equal(r.usage.input_tokens, 100);
  assert.equal(r.usage.output_tokens, 42);
  assert.deepEqual(progress, [5, 8, 10]);

  const call = f.calls[0];
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.init.method, 'POST');
  const h = call.init.headers;
  assert.equal(h['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(h['x-api-key'], 'test-key');
  assert.equal(h['anthropic-version'], '2026-10-21');
  assert.equal(h['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(h['content-type'], 'application/json');
  const b = call.body;
  assert.equal(b.model, 'claude-opus-5-5');
  assert.equal(b.max_tokens, 32000);
  assert.equal(b.stream, true);
  assert.equal(b.system, 'sys');
  assert.equal(b.fallbacks, 'default');
  assert.equal(b.thinking, undefined);
  assert.deepEqual(b.output_config.format, { type: 'json_schema', schema: SCHEMA });
  const content = b.messages[0].content;
  assert.equal(b.messages[0].role, 'user');
  assert.deepEqual(content[0], { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'UERG' } });
  assert.deepEqual(content[1], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBO' } });
  assert.deepEqual(content[2], { type: 'text', text: 'usr' });
  assert.equal(content.length, 3);   // テキストのプリントは本文に入っているので送らない
});

test('generate: schema なしなら output_config を送らない。model・maxTokens を変えられる', async () => {
  const f = fakeFetch([response(200, okEvents(['ok']))]);
  await authorApi.generate({ apiKey: 'k', system: 's', user: 'u', schema: null, model: 'claude-sonnet-5', maxTokens: 1000, fetchImpl: f });
  assert.equal('output_config' in f.calls[0].body, false);
  assert.equal(f.calls[0].body.model, 'claude-sonnet-5');
  assert.equal(f.calls[0].body.max_tokens, 1000);
});

test('generate: 401 は API キーの案内、429 は混雑の案内、ほかは status と error.message', async () => {
  const err = '{"type":"error","error":{"type":"x","message":"だめです"}}';
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: fakeFetch([response(401, err)]) }), { message: 'API キーが正しくありません' });
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: fakeFetch([response(429, err)]) }), /混み合っています/);
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: fakeFetch([response(500, err)]) }), { message: 'API エラー 500: だめです' });
});

test('generate: 400 で本文に output_config を含むと、2 回目は schema なしでやり直す（1 回だけ）', async () => {
  const bad = '{"type":"error","error":{"type":"invalid_request_error","message":"output_config.format.schema: unsupported"}}';
  const f = fakeFetch([response(400, bad), response(200, okEvents(['{"a":"b"}']))]);
  const r = await authorApi.generate({ apiKey: 'k', user: 'u', schema: SCHEMA, fetchImpl: f });
  assert.equal(r.text, '{"a":"b"}');
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls[0].body.output_config);
  assert.equal('output_config' in f.calls[1].body, false);
  // schema なしでも 400 なら、やり直さずにエラー
  const f2 = fakeFetch([response(400, bad), response(400, bad)]);
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', schema: null, fetchImpl: f2 }), /API エラー 400/);
  assert.equal(f2.calls.length, 1);
});

test('generate: max_tokens・refusal で止まったらエラー、通信の失敗は案内の文', async () => {
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: fakeFetch([response(200, okEvents(['{"a":'], 'max_tokens'))]) }), /出力が長すぎて途中で切れました/);
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: fakeFetch([response(200, okEvents([''], 'refusal'))]) }), { message: 'モデルが生成を断りました' });
  const down = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', fetchImpl: down }), { message: '通信できません（オフラインか、接続がありません）' });
});

test('generate: signal を fetch に渡し、中断はそのまま AbortError', async () => {
  const ac = new AbortController();
  const f = async (url, init) => {
    assert.equal(init.signal, ac.signal);
    ac.abort();
    const e = new Error('aborted'); e.name = 'AbortError'; throw e;
  };
  await assert.rejects(authorApi.generate({ apiKey: 'k', user: 'u', signal: ac.signal, fetchImpl: f }), { name: 'AbortError' });
});

test('readFileAsAttachment: FileReader のない Node では reject', async () => {
  await assert.rejects(authorApi.readFileAsAttachment({ name: 'a.pdf', type: 'application/pdf' }));
});
