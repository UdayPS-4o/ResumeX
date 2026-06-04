#!/usr/bin/env node
// Portable, offline LaTeX setup for Resumex.
//
// Downloads a self-contained Tectonic binary matching this machine's OS/arch
// into backend/vendor/tectonic/, then warms its package cache by compiling
// every template once. After this, the backend compiles fully offline — it
// auto-detects the vendored binary (see backend/src/services/localCompiler.js),
// so there are no machine-specific paths to configure.
//
// Usage:  node scripts/install-engine.mjs [--force] [--skip-warm] [--auto]
//   --force      re-download even if a working binary is already vendored
//   --skip-warm  install only; skip the (online, one-time) cache warm-up
//   --auto       no-op-fast if already vendored; on a fresh install download +
//                warm, but NEVER exit non-zero (so it can run as `predev`
//                without blocking `npm run dev` when offline / rate-limited)

import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const VENDOR_DIR = join(REPO, 'backend', 'vendor', 'tectonic');
const IS_WIN = process.platform === 'win32';
const BIN = join(VENDOR_DIR, `tectonic${IS_WIN ? '.exe' : ''}`);
const RELEASES_API =
  'https://api.github.com/repos/tectonic-typesetting/tectonic/releases/latest';

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const SKIP_WARM = args.has('--skip-warm');
const AUTO = args.has('--auto');

const log = (m) => console.log(m);
// In --auto mode a failure must not abort `npm run dev`; degrade gracefully.
class SetupError extends Error {}
const die = (m) => {
  if (AUTO) throw new SetupError(m);
  console.error(`\n✗ ${m}`);
  process.exit(1);
};

// ---- engine check ---------------------------------------------------------
function runsOk(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'pipe', timeout: 10_000 });
  return !r.error && r.status === 0 ? (r.stdout?.toString().trim() || 'ok') : null;
}

// ---- pick the right release asset for this platform/arch ------------------
function pickAsset(assets) {
  const platTok = IS_WIN ? 'windows' : process.platform === 'darwin' ? 'apple-darwin' : 'linux';
  const archTok = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const archives = assets.filter(
    (a) => /^tectonic-.*\.(zip|tar\.gz)$/.test(a.name) && a.name.includes(platTok),
  );
  const score = (a) => {
    let s = 0;
    if (a.name.includes(archTok)) s += 10;
    else if (a.name.includes('x86_64')) s += 3; // e.g. Windows-on-ARM via emulation
    if (IS_WIN && a.name.includes('msvc')) s += 2; // prefer msvc over gnu
    if (process.platform === 'linux' && a.name.includes('gnu')) s += 2; // prefer gnu over musl
    return s;
  };
  return archives.sort((a, b) => score(b) - score(a))[0] || null;
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
    // Non-TTY (e.g. piped logs): just one final line, no carriage-return spam.
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

  // Stream to disk so we can report progress instead of buffering the whole file.
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

async function extract(archive, name, outDir) {
  await mkdir(outDir, { recursive: true });
  let r;
  if (name.endsWith('.zip')) {
    r = IS_WIN
      ? spawnSync('powershell', ['-NoProfile', '-Command',
          `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${outDir}' -Force`],
          { stdio: 'pipe' })
      : spawnSync('unzip', ['-o', archive, '-d', outDir], { stdio: 'pipe' });
  } else {
    r = spawnSync('tar', ['-xzf', archive, '-C', outDir], { stdio: 'pipe' });
  }
  if (r.error || r.status !== 0) {
    throw new Error(`extraction failed: ${r.error?.message || r.stderr?.toString() || 'unknown'}`);
  }
}

// Returns true if it freshly downloaded the binary, false if one was already present.
async function install() {
  if (!FORCE) {
    const v = existsSync(BIN) && runsOk(BIN);
    if (v) {
      if (!AUTO) log(`✓ Engine already vendored: ${v}  (${BIN})`);
      return false;
    }
  }
  if (AUTO) log('No local LaTeX engine vendored yet — installing Tectonic (one-time)…');
  log(`Platform: ${process.platform}/${process.arch} — fetching latest Tectonic release…`);
  const res = await fetch(RELEASES_API, {
    headers: { 'user-agent': 'resumex-setup', accept: 'application/vnd.github+json' },
  });
  if (!res.ok) die(`GitHub API error: HTTP ${res.status} (rate-limited? try again later)`);
  const release = await res.json();
  const asset = pickAsset(release.assets || []);
  if (!asset) die(`No Tectonic build found for ${process.platform}/${process.arch}.`);

  log(`Downloading ${asset.name} (${release.tag_name})…`);
  const work = await mkdtemp(join(tmpdir(), 'resumex-engine-'));
  try {
    const archivePath = join(work, asset.name);
    await download(asset.browser_download_url, archivePath);
    await mkdir(VENDOR_DIR, { recursive: true });
    await extract(archivePath, asset.name, VENDOR_DIR);
    if (!IS_WIN) await chmod(BIN, 0o755);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }

  const v = existsSync(BIN) && runsOk(BIN);
  if (!v) die(`Binary did not run after install. Expected at ${BIN}`);
  log(`✓ Installed ${v} → ${BIN}`);
  return true;
}

// ---- warm the package cache by compiling every template ------------------
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
  log('\nWarming the package cache (one-time online step)…');
  const { listTemplates, renderTemplate } = await import('@resumex/renderer');
  const dir = await mkdtemp(join(tmpdir(), 'resumex-warm-'));
  let ok = 0, fail = 0;
  try {
    for (const t of listTemplates()) {
      const texFile = join(dir, `${t.id}.tex`);
      await writeFile(texFile, renderTemplate(t.id, SAMPLE), 'utf8');
      const r = spawnSync(BIN, ['--chatter', 'minimal', '--outdir', dir, texFile],
        { cwd: dir, stdio: 'pipe', timeout: 300_000 });
      if (existsSync(join(dir, `${t.id}.pdf`))) { log(`  ✓ ${t.id}`); ok++; }
      else { log(`  ✗ ${t.id}: ${(r.stderr?.toString() || '').split('\n').filter(Boolean).slice(-2).join(' ')}`); fail++; }
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  log(`Cache warm: ${ok} ok, ${fail} failed.`);
  if (fail) log('  (Failed templates will retry on first real compile — needs internet that once.)');
}

// ---- run ------------------------------------------------------------------
try {
  const fresh = await install();

  // In --auto (predev) mode, never warm on a no-op startup — only right after a
  // fresh download, so day-to-day `npm run dev` stays instant.
  const shouldWarm = !SKIP_WARM && (!AUTO || fresh);
  if (shouldWarm) {
    try { await warm(); }
    catch (e) { log(`\n! Cache warm-up skipped: ${e.message}\n  First compile per template will fetch packages online once.`); }
  } else if (!AUTO) {
    log('\nSkipped cache warm-up (--skip-warm). First compile of each template needs internet once.');
  }

  if (fresh || !AUTO) {
    log('\n✓ Done. The backend auto-detects the vendored engine — start it with `npm run dev`.');
    log('  Verify: GET http://localhost:8000/api/health → "compile":{"mode":"local","engine":"tectonic"}');
  }
} catch (e) {
  // AUTO mode: degrade gracefully so the dev server still starts.
  log(`\n! LaTeX engine auto-install skipped: ${e.message}`);
  log('  Resumex will start anyway. Run `npm run setup` (or `npm run install-engine`) once you have internet');
  log('  to compile resumes offline; until then compiles need internet or will fail in local-only mode.');
}
