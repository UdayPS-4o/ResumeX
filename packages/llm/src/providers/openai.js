import OpenAI from 'openai';

function toOpenAiMessages(system, messages) {
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

export async function openaiComplete({ apiKey, model, system, messages, jsonMode, temperature }) {
  const client = new OpenAI({ apiKey });
  const resp = await client.chat.completions.create({
    model,
    temperature: temperature ?? 0.4,
    messages: toOpenAiMessages(system, messages),
    response_format: jsonMode ? { type: 'json_object' } : undefined,
  });
  const text = resp.choices?.[0]?.message?.content || '';
  return { text };
}

// Streaming variant — async-yields text deltas.
export async function* openaiStream({ apiKey, model, system, messages }) {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: toOpenAiMessages(system, messages),
    stream: true,
  });
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}
