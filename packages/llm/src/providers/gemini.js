import { GoogleGenerativeAI } from '@google/generative-ai';

export async function geminiComplete({ apiKey, model, system, messages, jsonMode, temperature }) {
  const client = new GoogleGenerativeAI(apiKey);
  const generationConfig = { temperature: temperature ?? 0.4 };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const gen = client.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig,
  });

  const contents = messages.map(m => {
    const parts = [];
    if (m.content) parts.push({ text: m.content });
    for (const img of m.images || []) {
      parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
    }
    if (parts.length === 0) parts.push({ text: '' });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const result = await gen.generateContent({ contents });
  const text = result.response.text();
  return { text };
}

// Streaming variant — async-yields text deltas.
export async function* geminiStream({ apiKey, model, system, messages }) {
  const client = new GoogleGenerativeAI(apiKey);
  const gen = client.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: { temperature: 0.4 },
  });

  const contents = messages.map(m => {
    const parts = [];
    if (m.content) parts.push({ text: m.content });
    for (const img of m.images || []) {
      parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
    }
    if (parts.length === 0) parts.push({ text: '' });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const result = await gen.generateContentStream({ contents });
  for await (const chunk of result.stream) {
    const t = chunk.text();
    if (t) yield t;
  }
}
