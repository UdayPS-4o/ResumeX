// Local LaTeX compilation using whatever engine is installed on the machine.
// Prefers `tectonic` (single self-contained binary, auto-fetches packages),
// then falls back to `pdflatex`. If neither exists, callers should use the
// online compiler instead.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedEngine; // undefined = not checked yet, null = none, else {name, cmd}

// Engine vendored into the repo by `npm run setup` (scripts/install-engine.mjs).
// Resolved relative to this file so it works wherever the repo is cloned —
// no machine-specific paths.
const VENDORED_TECTONIC = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'vendor', 'tectonic',
  `tectonic${process.platform === 'win32' ? '.exe' : ''}`,
);

// Verify a command/path is a runnable engine (responds to --version).
function runsOk(cmd) {
  try {
    const res = spawnSync(cmd, ['--version'], { stdio: 'ignore', timeout: 5000 });
    return !res.error && res.status === 0;
  } catch {
    return false;
  }
}

// Detect an installed engine once and cache the result.
//
// Explicit absolute paths via TECTONIC_PATH / PDFLATEX_PATH win — this is the
// robust way on Windows, where a freshly-installed engine may not be on the
// shell's PATH yet (terminals cache their environment at launch). If neither
// is set, fall back to a plain PATH lookup.
export function detectEngine() {
  if (cachedEngine !== undefined) return cachedEngine;

  const explicit = [
    { name: 'tectonic', cmd: process.env.TECTONIC_PATH },
    { name: 'pdflatex', cmd: process.env.PDFLATEX_PATH },
  ];
  for (const e of explicit) {
    if (e.cmd && runsOk(e.cmd)) {
      cachedEngine = { name: e.name, cmd: e.cmd };
      return cachedEngine;
    }
  }

  // Repo-vendored binary installed by `npm run setup` — portable across machines.
  if (existsSync(VENDORED_TECTONIC) && runsOk(VENDORED_TECTONIC)) {
    cachedEngine = { name: 'tectonic', cmd: VENDORED_TECTONIC };
    return cachedEngine;
  }

  for (const cmd of ['tectonic', 'pdflatex']) {
    if (runsOk(cmd)) {
      cachedEngine = { name: cmd, cmd };
      return cachedEngine;
    }
  }
  cachedEngine = null;
  return cachedEngine;
}

export function hasLocalEngine() {
  return detectEngine() !== null;
}

// Compile LaTeX → PDF Buffer locally. Throws if no engine or compile fails.
export async function compileLocal(source) {
  const engine = detectEngine();
  if (!engine) {
    const err = new Error('No local LaTeX engine found');
    err.status = 500;
    throw err;
  }

  const dir = await mkdtemp(join(tmpdir(), 'resumex-'));
  const texPath = join(dir, 'resume.tex');
  const pdfPath = join(dir, 'resume.pdf');

  try {
    await writeFile(texPath, source, 'utf8');
    await runEngine(engine, texPath, dir);
    const pdf = await readFile(pdfPath);
    if (!pdf || pdf.length < 4 || pdf[0] !== 0x25) {
      throw new Error('Engine ran but produced no valid PDF');
    }
    return pdf;
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function runEngine(engine, texPath, dir) {
  const args =
    engine.name === 'tectonic'
      ? ['--outdir', dir, '--keep-logs', texPath]
      : ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${dir}`, texPath];

  return new Promise((resolve, reject) => {
    const proc = spawn(engine.cmd, args, { cwd: dir });
    let log = '';
    proc.stdout.on('data', d => { log += d.toString(); });
    proc.stderr.on('data', d => { log += d.toString(); });

    const killer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${engine.name} timed out`));
    }, 60_000);

    proc.on('error', err => {
      clearTimeout(killer);
      reject(new Error(`${engine.name} failed to start: ${err.message}`));
    });
    proc.on('close', code => {
      clearTimeout(killer);
      // pdflatex can exit non-zero but still emit a usable PDF; let the
      // caller's PDF check decide. Only reject if there's clearly no output.
      if (code === 0) return resolve();
      const tail = log.split('\n').filter(Boolean).slice(-12).join('\n');
      reject(new Error(`${engine.name} exited ${code}:\n${tail}`));
    });
  });
}
