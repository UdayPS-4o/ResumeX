import OpenAI from 'openai';

// One parametrized client for every OpenAI-Chat-Completions-compatible endpoint:
// ollama, openrouter, deepseek, groq, and any user-supplied openai_compatible
// base URL. They differ ONLY by baseUrl + key, so they all share this code path.
// Keyless endpoints (local Ollama, LM Studio, vLLM…) still need a non-empty
// token to satisfy the SDK, hence the 'sk-noauth' placeholder.

// Normalize a base URL: trim and strip trailing slashes so the SDK never builds
// "…/v1//chat/completions" (the SDK appends the request path itself).
function normalizeBase(baseUrl) {
  const b = (baseUrl || '').trim().replace(/\/+$/, '');
  return b || undefined;
}

function toMessages(system, messages) {
  return [
    { role: 'system', content: system },
    ...messages.map(m => {
      if (!m.images?.length) return { role: m.role, content: m.content };
      const parts = [];
      if (m.content) parts.push({ type: 'text', text: m.content });
      for (const img of m.images) {
        parts.push({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } });
      }
      return { role: m.role, content: parts };
    }),
  ];
}

export async function openaiCompatibleComplete({ apiKey, model, system, messages, jsonMode, temperature, baseUrl }) {
  const client = new OpenAI({ baseURL: normalizeBase(baseUrl), apiKey: apiKey || 'sk-noauth' });
  const resp = await client.chat.completions.create({
    model,
    temperature: temperature ?? 0.4,
    messages: toMessages(system, messages),
    response_format: jsonMode ? { type: 'json_object' } : undefined,
  });
  const text = resp.choices?.[0]?.message?.content || '';
  return { text };
}

// Streaming variant — async-yields text deltas. Same wire format as openaiStream.
export async function* openaiCompatibleStream({ apiKey, model, system, messages, temperature, baseUrl }) {
  const client = new OpenAI({ baseURL: normalizeBase(baseUrl), apiKey: apiKey || 'sk-noauth' });
  const stream = await client.chat.completions.create({
    model,
    temperature: temperature ?? 0.4,
    messages: toMessages(system, messages),
    stream: true,
  });
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}
