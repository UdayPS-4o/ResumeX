// Compile a LaTeX string to a PDF Buffer.
//
// Strategy:
//   1. If a local engine (tectonic/pdflatex) is installed, use it — fast,
//      reliable, offline.
//   2. Otherwise fall back to online services. ytotech is tried first because
//      it accepts the source as a JSON POST body; latexonline.cc puts the whole
//      document in a URL query string, which fails for longer resumes.
//
// Set COMPILE_MODE=online to force online, or COMPILE_MODE=local to require
// a local engine (errors if none). Default is "auto".

import { hasLocalEngine, compileLocal, detectEngine } from './localCompiler.js';

const PER_SERVICE_TIMEOUT = 45_000;
const MODE = (process.env.COMPILE_MODE || 'auto').toLowerCase();

// Report which compiler the server will use (for /api/health).
export function compileInfo() {
  const engine = detectEngine();
  if (MODE === 'online') return { mode: 'online' };
  if (engine) return { mode: 'local', engine: engine.name };
  return { mode: 'online', note: 'no local LaTeX engine detected' };
}

export async function compileLatex(source) {
  if (!source || !source.trim()) {
    const err = new Error('Empty LaTeX source');
    err.status = 400;
    throw err;
  }

  // Local path.
  if (MODE !== 'online' && hasLocalEngine()) {
    try {
      return await compileLocal(source);
    } catch (e) {
      if (MODE === 'local') {
        const err = new Error(`Local compile failed: ${e.message}`);
        err.status = 502;
        throw err;
      }
      // auto mode: fall through to online on local failure
      console.warn('[compile] local failed, falling back to online:', e.message);
    }
  } else if (MODE === 'local') {
    const err = new Error('COMPILE_MODE=local but no local LaTeX engine found. Install tectonic or pdflatex.');
    err.status = 500;
    throw err;
  }

  const errors = [];

  // 1. ytotech.com — JSON POST (preferred).
  try {
    const buf = await fetchBuffer('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [{ main: true, content: source }],
      }),
    });
    if (buf.isPdf) return buf.body;
    errors.push(`ytotech: status=${buf.status} ${truncate(buf.body.toString('utf8'))}`);
  } catch (e) {
    errors.push(`ytotech: ${e.message}`);
  }

  // 2. latexonline.cc — GET with source in query string (fallback).
  try {
    const url = new URL('https://latexonline.cc/compile');
    url.searchParams.set('text', source);
    url.searchParams.set('command', 'pdflatex');
    url.searchParams.set('force', 'true');

    const buf = await fetchBuffer(url.toString(), { method: 'GET' });
    if (buf.isPdf) return buf.body;
    errors.push(`latexonline.cc: status=${buf.status} ${truncate(buf.body.toString('utf8'))}`);
  } catch (e) {
    errors.push(`latexonline.cc: ${e.message}`);
  }

  const err = new Error(`LaTeX compile failed. ${errors.join(' | ')}`);
  err.status = 502;
  throw err;
}

async function fetchBuffer(url, init) {
  const resp = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(PER_SERVICE_TIMEOUT),
    redirect: 'follow',
  });
  const body = Buffer.from(await resp.arrayBuffer());
  const ct = resp.headers.get('content-type') || '';
  const isPdf = (resp.ok || resp.status === 200) && looksLikePdf(body, ct);
  return { status: resp.status, body, isPdf };
}

function looksLikePdf(buf, contentType) {
  if (typeof contentType === 'string' && contentType.toLowerCase().startsWith('application/pdf')) return true;
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
}

function truncate(s, n = 400) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
