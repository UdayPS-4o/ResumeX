// Environment bootstrap — MUST be the first import in server.js so it runs
// before any module reads process.env (e.g. db/index.js reads DATABASE_URL at
// import time).
//
// Two jobs, both first-run-friendly and independent of the current working
// directory (paths are resolved relative to this file, never to process.cwd()):
//
//   1. If backend/.env is missing, scaffold it from backend/.env.example so a
//      fresh clone gets the full annotated file — not just the two secret lines
//      that services/secrets.js would otherwise append to an empty file.
//   2. Load backend/.env via an explicit path. The default `dotenv/config` reads
//      `${cwd}/.env`, which only happens to be backend/.env because the dev
//      script runs from there; loading by absolute path means it can never miss
//      the file (a miss would silently rotate ENCRYPTION_KEY every boot and
//      orphan every stored API key — see services/crypto.js).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '../.env'); // backend/.env
const EXAMPLE_PATH = path.resolve(__dirname, '../.env.example'); // backend/.env.example

if (!fs.existsSync(ENV_PATH) && fs.existsSync(EXAMPLE_PATH)) {
  try {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log('[env] created backend/.env from .env.example');
  } catch (e) {
    // Non-fatal: secrets.js will still create + append to backend/.env, just
    // without the annotated scaffold.
    console.warn(`[env] could not scaffold backend/.env: ${e.message}`);
  }
}

dotenv.config({ path: ENV_PATH });
