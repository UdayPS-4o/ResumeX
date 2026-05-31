import Anthropic from '@anthropic-ai/sdk';

export async function anthropicComplete({ apiKey, model, system, messages, jsonMode, temperature }) {
  const client = new Anthropic({ apiKey });

  // Anthropic doesn't have a flat "JSON mode" flag — we hint it in the system prompt
  // (the builder/job-match prompts already do this) and parse the text.
  const sys = jsonMode
    ? `${system}\n\nRespond with valid JSON only. No prose, no markdown fences.`
    : system;

  const resp = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: temperature ?? 0.4,
    system: sys,
    messages: messages.map(m => {
      if (!m.images?.length) return { role: m.role, content: m.content };
      const blocks = m.images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mime, data: img.data },
      }));
      if (m.content) blocks.push({ type: 'text', text: m.content });
      return { role: m.role, content: blocks };
    }),
  });

  const text = resp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  return { text };
}

function toAnthropicMessages(messages) {
  return messages.map(m => {
    if (!m.images?.length) return { role: m.role, content: m.content };
    const blocks = m.images.map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mime, data: img.data },
    }));
    if (m.content) blocks.push({ type: 'text', text: m.content });
    return { role: m.role, content: blocks };
  });
}

// Streaming variant — async-yields text deltas.
export async function* anthropicStream({ apiKey, model, system, messages }) {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.4,
    system,
    messages: toAnthropicMessages(messages),
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
