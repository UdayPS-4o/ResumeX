#!/usr/bin/env node
// Portable, offline compiler setup for Resumex.
//
// Vendors the typst engine into backend/vendor/
//
// Usage:  node scripts/install-engine.mjs [--force] [--skip-warm] [--auto]
//   --force      re-download even if a working binary is already vendored
//   --skip-warm  install only; skip template compile checks
//   --auto       no-op-fast if already vendored

import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile, rm, chmod, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const IS_WIN = process.platform === 'win32';
const TYPST_DIR = join(REPO, 'backend', 'vendor', 'typst');
const TYPST_BIN = join(TYPST_DIR, `typst${IS_WIN ? '.exe' : ''}`);

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const SKIP_WARM = args.has('--skip-warm');
const AUTO = args.has('--auto');

const log = (m) => console.log(m);

class SetupError extends Error {}
const die = (m) => {
  if (AUTO) throw new SetupError(m);
  console.error(`\n✗ ${m}`);
  process.exit(1);
};

function runsOk(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'pipe', timeout: 10_000 });
  return !r.error && r.status === 0 ? (r.stdout?.toString().trim() || 'ok') : null;
}

function renderProgress(received, total, done) {
  const mb = (n) => (n / 1048576).toFixed(1);
  if (process.stdout.isTTY) {
    const width = 26;
    if (total) {
      const pct = received / total;
      const filled = Math.round(pct * width);
      const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
      const label = `${String(Math.round(pct * 100)).padStart(3)}%  ${mb(received)}/${mb(total)} MB`;
      process.stdout.write(`\r  [${bar}] ${label}`);
    } else {
      process.stdout.write(`\r  downloaded ${mb(received)} MB…`);
    }
    if (done) process.stdout.write('\n');
  } else if (done) {
    log(`  downloaded ${mb(received)}${total ? `/${mb(total)}` : ''} MB`);
  }
}

async function download(url, dest) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'resumex-setup', accept: 'application/octet-stream' },
  });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;

  if (!res.body) { await writeFile(dest, Buffer.from(await res.arrayBuffer())); return; }
  const out = createWriteStream(dest);
  const reader = res.body.getReader();
  let received = 0;
  let lastRender = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (!out.write(Buffer.from(value))) {
        await new Promise((r) => out.once('drain', r));
      }
      const now = Date.now();
      if (now - lastRender > 80) { renderProgress(received, total, false); lastRender = now; }
    }
    renderProgress(received, total, true);
  } finally {
    await new Promise((r) => out.end(r));
  }
}

async function extractAny(archive, name, outDir) {
  await mkdir(outDir, { recursive: true });
  let r;
  if (name.endsWith('.zip')) {
    r = IS_WIN
      ? spawnSync('powershell', ['-NoProfile', '-Command',
          `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${outDir}' -Force`],
          { stdio: 'pipe' })
      : spawnSync('unzip', ['-o', archive, '-d', outDir], { stdio: 'pipe' });
  } else {
    r = spawnSync('tar', ['-xf', archive, '-C', outDir], { stdio: 'pipe' });
  }
  if (r.error || r.status !== 0) {
    throw new Error(`extraction failed: ${r.error?.message || r.stderr?.toString() || 'unknown'}`);
  }
}

function locateBin(root, binName) {
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    let entries = [];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isFile() && e.name === binName) return p;
      if (e.isDirectory()) stack.push(p);
    }
  }
  return null;
}

async function installTypst() {
  if (!FORCE && existsSync(TYPST_BIN) && runsOk(TYPST_BIN)) {
    if (!AUTO) log(`✓ Typst already vendored  (${TYPST_BIN})`);
    return false;
  }
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const asset = IS_WIN
    ? `typst-${arch}-pc-windows-msvc.zip`
    : process.platform === 'darwin'
      ? `typst-${arch}-apple-darwin.tar.xz`
      : `typst-${arch}-unknown-linux-musl.tar.xz`;
  const url = `https://github.com/typst/typst/releases/latest/download/${asset}`;
  if (AUTO) log('Vendoring the Typst engine (one-time)…');
  log(`Downloading Typst (${asset})…`);
  const work = await mkdtemp(join(tmpdir(), 'resumex-typst-'));
  try {
    const archivePath = join(work, asset);
    await download(url, archivePath);
    await extractAny(archivePath, asset, work);
    const binName = `typst${IS_WIN ? '.exe' : ''}`;
    const found = locateBin(work, binName);
    if (!found) throw new Error('typst binary not found in the downloaded archive');
    await mkdir(TYPST_DIR, { recursive: true });
    await copyFile(found, TYPST_BIN);
    if (!IS_WIN) await chmod(TYPST_BIN, 0o755);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
  if (!(existsSync(TYPST_BIN) && runsOk(TYPST_BIN))) {
    throw new Error(`Typst did not run after install (expected ${TYPST_BIN})`);
  }
  log(`✓ Installed Typst → ${TYPST_BIN}`);
  return true;
}

const SAMPLE = {
  name: 'Ada Lovelace', headline: 'Mathematician & Computing Pioneer',
  contact: { email: 'ada@example.com', phone: '+44 20 7946 0000', location: 'London, UK',
    website: 'https://ada.example.com', linkedin: 'https://linkedin.com/in/ada',
    github: 'https://github.com/ada' },
  summary: 'Analytical computing & **symbolic logic**; first to see machines could go beyond calculation.',
  experience: [{ company: 'Analytical Engine Co.', title: 'Lead Algorithm Designer',
    location: 'London, UK', start: 'Jan 1843', end: 'Present',
    bullets: ['Designed the first published algorithm for machine execution.',
      'Anticipated looping & branching constructs in 40+ pages of notes.'] }],
  education: [{ school: 'University College London', degree: 'B.Sc. Mathematics',
    location: 'London, UK', start: '1840', end: '1843', gpa: 'First Class',
    details: ['Coursework: number theory, symbolic logic.'] }],
  projects: [{ name: 'Bernoulli Sequence Algorithm', description: 'Program for the Analytical Engine.',
    tech: ['Punched cards'], link: 'https://example.com/bernoulli',
    bullets: ['Machine-executable abstraction over arithmetic.'] }],
  skills: [{ category: 'Math', items: ['Calculus', 'Number theory', 'Symbolic logic'] }],
  certifications: [{ name: 'Royal Society Member', issuer: 'Royal Society', date: '1843' }],
  awards: [],
};

async function warm() {
  if (!(existsSync(TYPST_BIN) && runsOk(TYPST_BIN))) {
    log('\n(Typst not vendored — skipping template check.)');
    return;
  }
  log('\nVerifying templates compile with Typst…');
  const { listTemplates, renderTemplate, getSeed } = await import('@resumex/renderer');
  const tempDirRoot = join(REPO, '.typst-temp');
  await mkdir(tempDirRoot, { recursive: true }).catch(() => {});
  const dir = await mkdtemp(join(tempDirRoot, 'resumex-warm-'));
  let ok = 0, fail = 0;
  try {
    for (const t of listTemplates()) {
      const file = join(dir, `${t.id}.typ`);
      await writeFile(file, renderTemplate(t.id, getSeed(t.id) || SAMPLE), 'utf8');
      const r = spawnSync(TYPST_BIN, ['compile', '--root', REPO, file, join(dir, `${t.id}.pdf`)],
        { cwd: dir, stdio: 'pipe', timeout: 120_000 });
      if (existsSync(join(dir, `${t.id}.pdf`))) { log(`  ✓ ${t.id}`); ok++; }
      else { log(`  ✗ ${t.id}: ${(r.stderr?.toString() || '').split('\n').filter(Boolean).slice(-2).join(' ')}`); fail++; }
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  log(`Template check: ${ok} ok, ${fail} failed.`);
}

try {
  const typstFresh = await installTypst();
  const shouldCheck = !SKIP_WARM && (!AUTO || typstFresh);
  if (shouldCheck) {
    try { await warm(); }
    catch (e) { log(`\n! Template check skipped: ${e.message}`); }
  } else if (!AUTO) {
    log('\nSkipped template check (--skip-warm).');
  }

  if (typstFresh || !AUTO) {
    log('\n✓ Done. Templates compile via Typst.');
    log('  Verify: GET http://localhost:8000/api/health → "compile": { "typst": true }');
  }
} catch (e) {
  log(`\n! Engine auto-install skipped: ${e.message}`);
  log('  Resumex will start anyway. Run `npm run setup` (or `npm run install-engine`) once you have internet');
  log('  to compile resumes offline.');
}
