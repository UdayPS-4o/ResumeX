import { geminiComplete, geminiStream } from './gemini.js';
import { anthropicComplete, anthropicStream } from './anthropic.js';
import { openaiComplete, openaiStream } from './openai.js';
import { openaiCompatibleComplete, openaiCompatibleStream } from './openaiCompatible.js';

const STREAMERS = {
  gemini: geminiStream,
  anthropic: anthropicStream,
  openai: openaiStream,
  ollama: openaiCompatibleStream,
  openrouter: openaiCompatibleStream,
  deepseek: openaiCompatibleStream,
  groq: openaiCompatibleStream,
  openai_compatible: openaiCompatibleStream,
};

// Registry of supported providers with their default models. The first three are
// "native" (dedicated SDK); the rest all speak the OpenAI Chat Completions wire
// format and are served by openaiCompatibleComplete (parametrized by baseUrl +
// key). Keep ids / defaultModel / baseUrl in sync with frontend storage.js.
export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-flash-latest',
    models: ['gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'],
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
  ollama: {
    label: 'Ollama (local)',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'mistral', 'phi3'],
    keyHint: 'No key needed — runs on your machine',
    baseUrl: 'http://localhost:11434/v1',
    keyless: true,
    fn: openaiCompatibleComplete,
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openrouter/free',
    models: [
      'openrouter/free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'minimax/minimax-m3:free',
      'z-ai/glm-5.2:free',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-70b-instruct',
    ],
    keyHint: 'Get a key at https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    fn: openaiCompatibleComplete,
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyHint: 'Get a key at https://platform.deepseek.com',
    baseUrl: 'https://api.deepseek.com/v1',
    fn: openaiCompatibleComplete,
  },
  groq: {
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyHint: 'Get a key at https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    fn: openaiCompatibleComplete,
  },
  openai_compatible: {
    label: 'OpenAI-compatible',
    defaultModel: '',
    models: [],
    keyHint: 'Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp…)',
    baseUrl: 'http://localhost:1234/v1',
    keyless: true,
    fn: openaiCompatibleComplete,
  },
};

// Env var name to fall back to when the client didn't send a key.
const ENV_KEYS = {
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
};

// Resolve an API key — preferring the one the client sent, falling back to env.
// Keyless providers (ollama, openai_compatible) return a non-empty placeholder so
// complete() doesn't bail on a "missing key" before reaching the (auth-less) call.
export function resolveKey(provider, clientKey) {
  if (clientKey && clientKey.trim()) return clientKey.trim();
  const envName = ENV_KEYS[provider];
  const envKey = (envName && process.env[envName]) || '';
  if (envKey) return envKey;
  if (PROVIDERS[provider]?.keyless) return 'sk-noauth';
  return '';
}

// Unified entrypoint. Returns { text } where text is plain string from the model.
// The caller is responsible for JSON-parsing if it asked for JSON. `baseUrl` is
// forwarded to the provider fn — native providers ignore the extra arg; the
// OpenAI-compatible fn uses it (falling back to the registry default).
export async function complete({ provider, model, apiKey, system, messages, jsonMode, temperature, baseUrl }) {
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
  const url = (baseUrl && baseUrl.trim()) || cfg.baseUrl;
  return cfg.fn({ apiKey: key, model: chosenModel, system, messages, jsonMode, temperature, baseUrl: url });
}

// Streaming entrypoint — returns an async iterable of text deltas.
export function streamComplete({ provider, model, apiKey, system, messages, baseUrl }) {
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
  const url = (baseUrl && baseUrl.trim()) || cfg.baseUrl;
  return streamer({ apiKey: key, model: model || cfg.defaultModel, system, messages, baseUrl: url });
}
