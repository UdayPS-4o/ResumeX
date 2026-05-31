// AES-256-GCM encryption for API keys at rest. The key comes from ENCRYPTION_KEY
// (bootstrapped in services/secrets.js). Ciphertext format is `iv:tag:data`, all
// base64 — self-describing so we never need to track field lengths.
//
// The raw key is only ever decrypted server-side, immediately before a provider
// call. It is never returned to the browser (the client sees presence booleans).

import crypto from 'node:crypto';
import { ensureSecrets } from './secrets.js';

const ALGO = 'aes-256-gcm';

export function encryptSecret(plaintext) {
  const { encryptionKey } = ensureSecrets();
  const iv = crypto.randomBytes(12); // 96-bit nonce, GCM standard
  const cipher = crypto.createCipheriv(ALGO, encryptionKey, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(ciphertext) {
  if (!ciphertext) return '';
  try {
    const { encryptionKey } = ensureSecrets();
    const [ivB64, tagB64, dataB64] = String(ciphertext).split(':');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const decipher = crypto.createDecipheriv(ALGO, encryptionKey, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch (e) {
    // Wrong key (e.g. ENCRYPTION_KEY rotated) or tampering → treat as no key.
    console.warn('[crypto] failed to decrypt a stored secret:', e.message);
    return '';
  }
}
