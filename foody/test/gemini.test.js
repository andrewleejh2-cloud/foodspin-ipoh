const { test } = require('node:test');
const assert = require('node:assert');
const { createGeminiClient } = require('../lib/gemini');

function fakeFetch(handler) { return async (url, opts) => handler(url, opts); }
function okResp(json) { return { ok: true, json: async () => json, text: async () => JSON.stringify(json) }; }

test('generate 拼对 URL/header/body 并抽出文本', async () => {
  let seen;
  const client = createGeminiClient({ apiKey: 'k1', model: 'gemini-2.5-flash', fetchImpl: fakeFetch((url, opts) => {
    seen = { url, opts };
    return okResp({ candidates: [{ content: { parts: [{ text: '你好' }, { text: '世界' }] } }] });
  }) });
  const out = await client.generate('写个标语');
  assert.strictEqual(out, '你好世界');
  assert.ok(seen.url.includes('/models/gemini-2.5-flash:generateContent'));
  assert.strictEqual(seen.opts.headers['x-goog-api-key'], 'k1');
  const body = JSON.parse(seen.opts.body);
  assert.strictEqual(body.contents[0].parts[0].text, '写个标语');
  assert.strictEqual(body.generationConfig.thinkingConfig.thinkingBudget, 0);   // flash 必须关思考，否则可能吐空
});

test('HTTP 非 2xx 抛错', async () => {
  const client = createGeminiClient({ apiKey: 'k', fetchImpl: fakeFetch(() => ({ ok: false, status: 429, text: async () => 'quota' })) });
  await assert.rejects(() => client.generate('x'), /gemini_http_429/);
});

test('无 candidates / 空文本抛错', async () => {
  const client = createGeminiClient({ apiKey: 'k', fetchImpl: fakeFetch(() => okResp({ candidates: [] })) });
  await assert.rejects(() => client.generate('x'), /gemini_empty/);
});

test('缺 apiKey 构造即抛', () => {
  assert.throws(() => createGeminiClient({}), /apiKey/);
});
