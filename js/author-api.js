// AI 教材作成（設計書 13 章）: Claude API の呼び出し
// 先生の API キーで、ブラウザから直接 Messages API を呼ぶ（サーバーはない）。キーはこのファイルに書かない。
// fetch は引数 fetchImpl で差しかえられる（Node のテストでは偽の fetch を渡す）。
(function (root) {
  'use strict';

  const API_URL = 'https://api.anthropic.com/v1/messages';
  const API_VERSION = '2026-10-21';
  const BETA = 'server-side-fallback-2026-07-01';
  const DEFAULT_MODEL = 'claude-opus-5-5';
  const DEFAULT_MAX_TOKENS = 32000;
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const TEXT_TYPES = ['text/markdown', 'text/plain', 'text/x-markdown'];

  const MSG = {
    key: 'API キーが正しくありません',
    busy: '混み合っています。少し待ってやり直してください',
    network: '通信できません（オフラインか、接続がありません）',
    refusal: 'モデルが生成を断りました',
    maxTokens: '出力が長すぎて途中で切れました（ステージ数を減らすか、もう一度）',
  };

  function isAbort(e, signal) {
    return (signal && signal.aborted) || (e && e.name === 'AbortError');
  }

  // 添付（PDF・画像）を content block に。テキストのプリントは指示文の本文に入っているので送らない
  function attachmentBlocks(attachments) {
    const out = [];
    (Array.isArray(attachments) ? attachments : []).forEach(a => {
      if (!a || typeof a.data !== 'string') return;
      if (a.kind === 'pdf') out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } });
      else if (a.kind === 'image') out.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } });
    });
    return out;
  }

  function requestBody(o, schema) {
    return {
      model: o.model || DEFAULT_MODEL,
      max_tokens: o.maxTokens || DEFAULT_MAX_TOKENS,
      stream: true,
      system: o.system || '',
      fallbacks: 'default',
      output_config: schema ? { format: { type: 'json_schema', schema } } : undefined,
      messages: [{ role: 'user', content: attachmentBlocks(o.attachments).concat([{ type: 'text', text: o.user || '' }]) }],
    };
  }

  function headers(apiKey) {
    return {
      'content-type': 'application/json',
      'x-api-key': apiKey || '',
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': BETA,
    };
  }

  function errorMessage(text) {
    try { const v = JSON.parse(text); return (v && v.error && v.error.message) || text; } catch (e) { return text; }
  }

  // SSE の 1 つのイベント（"event: ...\ndata: {...}"）を読む
  function handleEvent(raw, st, onProgress) {
    const data = raw.split(/\r?\n/).filter(l => l.indexOf('data:') === 0).map(l => l.slice(5).trim()).join('\n');
    if (!data) return;
    let ev;
    try { ev = JSON.parse(data); } catch (e) { return; }
    if (!ev || typeof ev !== 'object') return;
    switch (ev.type) {
      case 'message_start':
        if (ev.message) {
          if (ev.message.model) st.model = ev.message.model;
          if (ev.message.usage) st.usage = Object.assign({}, st.usage, ev.message.usage);
        }
        break;
      case 'content_block_delta':
        if (ev.delta && ev.delta.type === 'text_delta' && typeof ev.delta.text === 'string') {
          st.text += ev.delta.text;
          if (typeof onProgress === 'function') { try { onProgress(st.text.length); } catch (e) { /* 画面の都合の失敗は無視 */ } }
        }
        break;
      case 'message_delta':
        if (ev.delta && ev.delta.stop_reason) st.stopReason = ev.delta.stop_reason;
        if (ev.usage) st.usage = Object.assign({}, st.usage, ev.usage);
        break;
      case 'error':
        st.error = (ev.error && ev.error.message) || 'ストリームのエラー';
        break;
    }
  }

  // 応答の本文（SSE）を最後まで読む
  async function readStream(res, onProgress) {
    const st = { text: '', stopReason: null, usage: {}, model: null, error: null };
    let buf = '';
    const feed = (chunk) => {
      buf += chunk;
      const parts = buf.split(/\r?\n\r?\n/);
      buf = parts.pop();
      parts.forEach(p => handleEvent(p, st, onProgress));
    };
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        feed(typeof value === 'string' ? value : decoder.decode(value, { stream: true }));
      }
      feed(decoder.decode());
    } else {
      feed(await res.text());
    }
    if (buf.trim()) handleEvent(buf, st, onProgress);
    return st;
  }

  async function generate(o) {
    const opts = o || {};
    const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error(MSG.network);
    let schema = opts.schema || null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let res;
      try {
        res = await fetchImpl(API_URL, {
          method: 'POST', headers: headers(opts.apiKey), body: JSON.stringify(requestBody(opts, schema)), signal: opts.signal,
        });
      } catch (e) {
        if (isAbort(e, opts.signal)) throw e;
        throw new Error(MSG.network);
      }
      if (!res.ok) {
        let text = '';
        try { text = await res.text(); } catch (e) { /* 本文なし */ }
        if (res.status === 401) throw new Error(MSG.key);
        if (res.status === 429) throw new Error(MSG.busy);
        // 構造化出力（output_config）が受けつけられないときは、スキーマなしで 1 回だけやり直す
        if (res.status === 400 && schema && text.indexOf('output_config') !== -1) { schema = null; continue; }
        throw new Error('API エラー ' + res.status + ': ' + errorMessage(text));
      }
      let st;
      try {
        st = await readStream(res, opts.onProgress);
      } catch (e) {
        if (isAbort(e, opts.signal)) throw e;
        throw new Error(MSG.network);
      }
      if (st.error) throw new Error('API エラー: ' + st.error);
      if (st.stopReason === 'refusal') throw new Error(MSG.refusal);
      if (st.stopReason === 'max_tokens') throw new Error(MSG.maxTokens);
      return { text: st.text, stopReason: st.stopReason, usage: st.usage, model: st.model || opts.model || DEFAULT_MODEL };
    }
    throw new Error('API エラー 400: 構造化出力を使わずにやり直しても失敗しました');
  }

  // ブラウザ用: 選んだファイルを添付の形に（PDF・画像は base64、テキストは本文）
  function readFileAsAttachment(file) {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') { reject(new Error('この環境ではファイルを読めません')); return; }
      if (!file) { reject(new Error('ファイルがありません')); return; }
      const name = String(file.name || '');
      const type = String(file.type || '').toLowerCase();
      const lower = name.toLowerCase();
      let kind = null;
      if (type === 'application/pdf' || (!type && lower.endsWith('.pdf'))) kind = 'pdf';
      else if (IMAGE_TYPES.includes(type)) kind = 'image';
      else if (TEXT_TYPES.includes(type) || (!type && /\.(md|txt)$/.test(lower))) kind = 'text';
      if (!kind) { reject(new Error('読みこめない形式です（PDF・PNG・JPEG・WebP・テキストだけ）: ' + name)); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('ファイルを読めませんでした: ' + name));
      reader.onload = () => {
        const r = String(reader.result || '');
        if (kind === 'text') { resolve({ kind: 'text', name, text: r }); return; }
        const data = r.slice(r.indexOf(',') + 1);   // data:...;base64, を除く
        if (kind === 'pdf') resolve({ kind: 'pdf', name, data });
        else resolve({ kind: 'image', name, mediaType: type, data });
      };
      if (kind === 'text') reader.readAsText(file); else reader.readAsDataURL(file);
    });
  }

  const api = { API_URL, API_VERSION, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, MESSAGES: MSG, generate, readFileAsAttachment };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RikaQuest = Object.assign(root.RikaQuest || {}, { authorApi: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
