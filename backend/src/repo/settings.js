// Settings + encrypted API keys data-access. The client never receives raw keys —
// only a `keyPresent` map of booleans. Decryption happens server-side, in the
// injectUserKeys middleware, immediately before a provider call.

import { eq, and } from 'drizzle-orm';
import { PROVIDERS } from '@resumex/llm';
import { db } from '../db/index.js';
import { settings, apiKeys } from '../db/schema.js';
import { encryptSecret, decryptSecret } from '../services/crypto.js';
import { now } from './util.js';

const PROVIDER_IDS = Object.keys(PROVIDERS);

function defaults(userId) {
  return {
    userId,
    provider: 'gemini',
    model: PROVIDERS.gemini?.defaultModel || '',
    baseUrls: {},
    reasoningEffort: 'auto',
    features: { coverLetter: true, outreach: true },
    tailorStrategy: 'keywords',
    language: 'en',
    updatedAt: now(),
  };
}

// Create the settings row for a user if it doesn't exist yet; returns the row.
export function ensureForUser(userId) {
  const existing = db.select().from(settings).where(eq(settings.userId, userId)).get();
  if (existing) return existing;
  const row = defaults(userId);
  db.insert(settings).values(row).run();
  return row;
}

export function getRaw(userId) {
  return ensureForUser(userId);
}

// Which providers have a stored key.
export function keyPresence(userId) {
  const rows = db.select({ provider: apiKeys.provider }).from(apiKeys).where(eq(apiKeys.userId, userId)).all();
  const have = new Set(rows.map((r) => r.provider));
  return Object.fromEntries(PROVIDER_IDS.map((p) => [p, have.has(p)]));
}

// Client-safe settings object (no raw keys).
export function getForClient(userId) {
  const s = ensureForUser(userId);
  return {
    provider: s.provider,
    model: s.model,
    baseUrls: s.baseUrls || {},
    reasoningEffort: s.reasoningEffort,
    features: s.features || { coverLetter: true, outreach: true },
    tailorStrategy: s.tailorStrategy,
    language: s.language,
    keyPresent: keyPresence(userId),
  };
}

const SETTABLE = ['provider', 'model', 'baseUrls', 'reasoningEffort', 'features', 'tailorStrategy', 'language'];

// Patch settings fields (ignores unknown keys; never touches API keys here).
export function update(userId, patch = {}) {
  ensureForUser(userId);
  const set = { updatedAt: now() };
  for (const k of SETTABLE) {
    if (patch[k] !== undefined) set[k] = patch[k];
  }
  db.update(settings).set(set).where(eq(settings.userId, userId)).run();
  return getForClient(userId);
}

// Store (encrypt) or remove a single provider key. Empty/blank value → delete.
export function setKey(userId, provider, plain) {
  if (!PROVIDERS[provider]) return;
  const value = String(plain ?? '').trim();
  if (!value) {
    db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider))).run();
    return;
  }
  db.insert(apiKeys)
    .values({ userId, provider, ciphertext: encryptSecret(value), updatedAt: now() })
    .onConflictDoUpdate({
      target: [apiKeys.userId, apiKeys.provider],
      set: { ciphertext: encryptSecret(value), updatedAt: now() },
    })
    .run();
}

// Bulk apply a map of { provider: rawKey }. Non-empty values are stored; empty
// strings are ignored (use clearKeys / setKey to remove).
export function setKeys(userId, map = {}) {
  for (const [provider, value] of Object.entries(map)) {
    if (String(value ?? '').trim()) setKey(userId, provider, value);
  }
}

export function clearKeys(userId) {
  db.delete(apiKeys).where(eq(apiKeys.userId, userId)).run();
}

// Server-only: decrypt a stored key for a provider call. Returns '' if none.
export function getDecryptedKey(userId, provider) {
  const row = db
    .select({ ciphertext: apiKeys.ciphertext })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .get();
  return row ? decryptSecret(row.ciphertext) : '';
}

export function getBaseUrl(userId, provider) {
  const s = ensureForUser(userId);
  return (s.baseUrls && s.baseUrls[provider]) || '';
}
