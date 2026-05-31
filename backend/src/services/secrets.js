// Bootstraps the server's long-lived secrets. On first run (or whenever a secret
// is missing) we generate a strong random value and persist it to backend/.env
// so it survives restarts. This means the app is zero-config: clone, `npm run
// dev`, and auth + key encryption Just Work — no manual secret wrangling.
//
// AUTH_SECRET    — signs session JWTs.
// ENCRYPTION_KEY — 32-byte (64 hex) key for AES-256-GCM API-key encryption.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '../../.env'); // backend/.env

function appendEnv(line) {
  let prefix = '';
  try {
    if (fs.existsSync(ENV_PATH)) {
      const cur = fs.readFileSync(ENV_PATH, 'utf8');
      if (cur.length && !cur.endsWith('\n')) prefix = '\n';
    }
  } catch { /* fall through — best effort */ }
  fs.appendFileSync(ENV_PATH, prefix + line + '\n', 'utf8');
}

// Return process.env[name], generating + persisting it if absent.
function ensure(name, generate) {
  const existing = (process.env[name] || '').trim();
  if (existing) return existing;
  const value = generate();
  process.env[name] = value;
  try {
    appendEnv(`${name}=${value}`);
    console.log(`[secrets] generated ${name} → backend/.env`);
  } catch (e) {
    console.warn(`[secrets] could not persist ${name} to backend/.env (using in-memory value): ${e.message}`);
  }
  return value;
}

let cached = null;

export function ensureSecrets() {
  if (cached) return cached;
  const authSecret = ensure('AUTH_SECRET', () => crypto.randomBytes(48).toString('base64url'));
  const encryptionKeyHex = ensure('ENCRYPTION_KEY', () => crypto.randomBytes(32).toString('hex'));
  cached = {
    authSecret,
    encryptionKey: Buffer.from(encryptionKeyHex, 'hex'),
  };
  return cached;
}
