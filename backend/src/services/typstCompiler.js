// Compile a Typst document string to a PDF Buffer using the `typst` engine.
//
// Prefers the repo-vendored binary (installed by scripts/install-engine.mjs into
// vendor/typst/), then an explicit TYPST_PATH, then a `typst` on PATH. Typst
// compiles a resume in ~150-300ms — roughly 25x faster than the LaTeX/Tectonic
// path — and the binary is self-contained (no package bundle to warm).
//
// PERFORMANCE: We use `spawn` (async) instead of `spawnSync` so compilation
// never blocks the Node.js event loop. On first use we also fire a warmup
// compile so the OS caches the binary and Typst loads its font index — this
// eliminates the cold-start delay the user would otherwise see on their very
// first preview render.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedEngine; // undefined = not checked, null = none, else the command/path

// Resolved relative to this file so it works wherever the repo is cloned.
const VENDOR_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor');
const VENDORED_TYPST = join(
  VENDOR_ROOT,
  'typst',
  `typst${process.platform === 'win32' ? '.exe' : ''}`,
);
// Fallback fonts (Arimo/Tinos/Cousine, vendored by scripts/install-engine.mjs)
// so a resume's font stack always resolves regardless of what's installed on
// the host OS — Typst ships with no bundled fonts of its own.
const VENDORED_FONTS = join(VENDOR_ROOT, 'fonts');

function runsOk(cmd) {
  try {
    const r = spawnSync(cmd, ['--version'], { stdio: 'ignore', timeout: 5000 });
    return !r.error && r.status === 0;
  } catch {
    return false;
  }
}

// Detect a usable Typst engine once and cache it. TYPST_PATH wins (robust on
// Windows, where a freshly-installed binary may not be on the shell PATH yet).
export function detectTypst() {
  if (cachedEngine !== undefined) return cachedEngine;
  if (process.env.TYPST_PATH && runsOk(process.env.TYPST_PATH)) {
    cachedEngine = process.env.TYPST_PATH;
  } else if (existsSync(VENDORED_TYPST) && runsOk(VENDORED_TYPST)) {
    cachedEngine = VENDORED_TYPST;
  } else if (runsOk('typst')) {
    cachedEngine = 'typst';
  } else {
    cachedEngine = null;
  }
  return cachedEngine;
}

export function hasTypst() {
  return Boolean(detectTypst());
}

export async function compileTypst(source) {
  if (!source || !source.trim()) {
    const err = new Error('Empty Typst source');
    err.status = 400;
    throw err;
  }
  const bin = detectTypst();
  if (!bin) {
    const err = new Error('No Typst engine found. Run `npm run setup` to vendor it.');
    err.status = 500;
    throw err;
  }

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const tempDirRoot = join(repoRoot, '.typst-temp');
  await mkdir(tempDirRoot, { recursive: true }).catch(() => {});
  const dir = await mkdtemp(join(tempDirRoot, 'resumex-typst-'));
  const inFile = join(dir, 'doc.typ');
  const outFile = join(dir, 'doc.pdf');
  try {
    await writeFile(inFile, source, 'utf8');

    try {
      return await runTypstCompile(bin, repoRoot, inFile, outFile, { ignoreSystemFonts: false });
    } catch (e) {
      // A font resolution issue is machine-specific (missing/corrupt system
      // font) and shouldn't be a hard failure — retry using ONLY the vendored
      // Arimo/Tinos/Cousine fonts, which are guaranteed present, so the user
      // still gets a PDF (system font, if any, just wasn't usable this time).
      if (!existsSync(VENDORED_FONTS)) throw e;
      return await runTypstCompile(bin, repoRoot, inFile, outFile, { ignoreSystemFonts: true });
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function runTypstCompile(bin, repoRoot, inFile, outFile, { ignoreSystemFonts }) {
  // Use async spawn so we never block the Node.js event loop while Typst runs.
  return new Promise((resolve, reject) => {
    const fontArgs = existsSync(VENDORED_FONTS) ? ['--font-path', VENDORED_FONTS] : [];
    if (ignoreSystemFonts) fontArgs.push('--ignore-system-fonts');
    const child = spawn(
      bin,
      ['compile', '--root', repoRoot, ...fontArgs, '--format', 'pdf', inFile, outFile],
      { stdio: 'pipe' },
    );

    let stderr = '';
    let stdout = '';
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.stdout?.on('data', (d) => { stdout += d.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Typst compile timed out after 60s'));
    }, 60_000);

    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', async (code) => {
      clearTimeout(timer);
      if (!existsSync(outFile)) {
        const raw = (stderr || stdout || 'unknown error').trim();
        const lines = raw.split('\n').map((l) => l.trimEnd()).filter(Boolean);
        const errorIdx = lines.findIndex((l) => /^error(\[.*\])?:/.test(l));
        let msg;
        if (errorIdx !== -1) {
          const errorLines = [];
          for (let i = errorIdx; i < lines.length && errorLines.length < 12; i++) {
            if (i > errorIdx && /^warning(\[.*\])?:/.test(lines[i])) break;
            errorLines.push(lines[i]);
          }
          msg = errorLines.join('\n');
        } else {
          msg = lines.slice(-6).join('\n');
        }
        const err = new Error(`Typst compile failed: ${msg}`);
        err.status = 502;
        return reject(err);
      }
      try {
        resolve(await readFile(outFile));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ── Warmup ──────────────────────────────────────────────────────────────────
// Fire a minimal Typst compile on server startup so the OS page-cache has the
// binary and Typst has pre-scanned its system fonts. Without this the first
// real user compile pays a cold-start penalty of 500-1500ms on top of the
// normal compile time. The warmup runs entirely in the background and never
// blocks server readiness.
const WARMUP_SOURCE = `#set page(width: 10pt, height: 10pt, margin: 0pt)\n`;

export async function warmupTypst() {
  const bin = detectTypst();
  if (!bin) return; // no engine — skip silently
  try {
    await compileTypst(WARMUP_SOURCE);
    console.log('[typst] warmup compile complete — engine is hot');
  } catch (e) {
    // Warmup failure is non-fatal; the first real compile will just be slower.
    console.warn('[typst] warmup failed (non-fatal):', e.message);
  }
}
