import { geminiComplete, geminiStream } from './gemini.js';
import { anthropicComplete, anthropicStream } from './anthropic.js';
import { openaiComplete, openaiStream } from './openai.js';

const STREAMERS = { gemini: geminiStream, anthropic: anthropicStream, openai: openaiStream };

// Registry of supported providers with their default models.
export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-3.1-flash-lite',
    models: ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'],
    keyHint: 'Get a free key at https://aistudio.google.com/apikey',
    fn: geminiComplete,
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-haiku-4-5-20251001',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
    keyHint: 'Get a key at https://console.anthropic.com/',
    fn: anthropicComplete,
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    keyHint: 'Get a key at https://platform.openai.com/api-keys',
    fn: openaiComplete,
  },
};

// Resolve an API key — preferring the one the client sent, falling back to env.
export function resolveKey(provider, clientKey) {
  if (clientKey && clientKey.trim()) return clientKey.trim();
  const envName = {
    gemini: 'GEMINI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
  }[provider];
  return process.env[envName] || '';
}

// Unified entrypoint. Returns { text } where text is plain string from the model.
// The caller is responsible for JSON-parsing if it asked for JSON.
export async function complete({ provider, model, apiKey, system, messages, jsonMode, temperature }) {
  const cfg = PROVIDERS[provider];
  if (!cfg) {
    const err = new Error(`Unknown provider "${provider}". Try one of: ${Object.keys(PROVIDERS).join(', ')}`);
    err.status = 400;
    throw err;
  }
  const key = resolveKey(provider, apiKey);
  if (!key) {
    const err = new Error(`Missing API key for ${cfg.label}. Add one in Settings.`);
    err.status = 400;
    throw err;
  }
  const chosenModel = model || cfg.defaultModel;
  return cfg.fn({ apiKey: key, model: chosenModel, system, messages, jsonMode, temperature });
}

// Streaming entrypoint — returns an async iterable of text deltas.
export function streamComplete({ provider, model, apiKey, system, messages }) {
  const cfg = PROVIDERS[provider];
  const streamer = STREAMERS[provider];
  if (!cfg || !streamer) {
    const err = new Error(`Unknown provider "${provider}".`);
    err.status = 400;
    throw err;
  }
  const key = resolveKey(provider, apiKey);
  if (!key) {
    const err = new Error(`Missing API key for ${cfg.label}. Add one in Settings.`);
    err.status = 400;
    throw err;
  }
  return streamer({ apiKey: key, model: model || cfg.defaultModel, system, messages });
}
