// Compile a Typst document string to a PDF Buffer using the `typst` engine.
//
// Prefers the repo-vendored binary (installed by scripts/install-engine.mjs into
// vendor/typst/), then an explicit TYPST_PATH, then a `typst` on PATH. Typst
// compiles a resume in ~150-300ms — roughly 25x faster than the LaTeX/Tectonic
// path — and the binary is self-contained (no package bundle to warm).

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedEngine; // undefined = not checked, null = none, else the command/path

// Resolved relative to this file so it works wherever the repo is cloned.
const VENDORED_TYPST = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'vendor',
  'typst',
  `typst${process.platform === 'win32' ? '.exe' : ''}`,
);

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
    const r = spawnSync(bin, ['compile', '--root', repoRoot, '--format', 'pdf', inFile, outFile], {
      stdio: 'pipe',
      timeout: 60_000,
    });
    if (r.error) throw r.error;
    if (!existsSync(outFile)) {
      const msg = (r.stderr?.toString() || r.stdout?.toString() || 'unknown error')
        .split('\n')
        .filter(Boolean)
        .slice(-6)
        .join('\n');
      const err = new Error(`Typst compile failed: ${msg}`);
      err.status = 502;
      throw err;
    }
    return await readFile(outFile);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
