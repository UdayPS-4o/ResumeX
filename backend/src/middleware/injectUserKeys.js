// For LLM-calling routes: fill in the provider API key + base URL from the
// authenticated user's server-side settings, so the browser never has to send a
// key. We only fill when the request didn't already carry one — that preserves
// the "test a freshly-typed key before saving" flow on the settings screen.
//
// Must run AFTER requireAuth (needs req.user).

import { getDecryptedKey, getBaseUrl, getRaw } from '../repo/settings.js';

export function injectUserKeys(req, _res, next) {
  try {
    const userId = req.user?.id;
    if (userId) {
      req.body = req.body || {};
      const provider = req.body.provider || getRaw(userId).provider;

      // Server-stored key fills in only when the client didn't send one.
      if (!String(req.body.apiKey || '').trim()) {
        const key = getDecryptedKey(userId, provider);
        if (key) req.body.apiKey = key;
      }
      // Same for the per-provider base URL override.
      if (!String(req.body.baseUrl || '').trim()) {
        const baseUrl = getBaseUrl(userId, provider);
        if (baseUrl) req.body.baseUrl = baseUrl;
      }
    }
  } catch (e) {
    console.warn('[injectUserKeys]', e.message);
  }
  next();
}
