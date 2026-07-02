/* Foody — Gemini 客户端（纯逻辑、可注入 fetch 便于测试；调用方式参考同仓库 stitch-studio） */
'use strict';

function createGeminiClient({ apiKey, model, fetchImpl } = {}) {
  if (!apiKey) throw new Error('apiKey required');
  const mdl = model || 'gemini-2.5-flash';
  const doFetch = fetchImpl || globalThis.fetch;

  async function generate(prompt) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(mdl) + ':generateContent';
    const generationConfig = { temperature: 0.8, maxOutputTokens: 2048 };
    // flash 默认“思考”可能把输出额度耗光导致空返回 → 关掉
    if (/flash/i.test(mdl)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const resp = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: String(prompt) }] }], generationConfig })
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error('gemini_http_' + resp.status + ': ' + t.slice(0, 200));
    }
    const data = await resp.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const text = Array.isArray(parts) ? parts.map(p => p.text || '').join('') : '';
    if (!text.trim()) throw new Error('gemini_empty');
    return text;
  }

  return { generate };
}

module.exports = { createGeminiClient };
