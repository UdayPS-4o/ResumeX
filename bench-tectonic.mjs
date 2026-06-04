// One-off benchmark: how long does Tectonic take per template? (deleted after run)
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTemplates, renderTemplate } from '@resumex/renderer';

// A representative, reasonably full one-page resume (drives realistic compile times).
const SAMPLE = {
  name: 'Alex Carter',
  headline: 'Senior Software Engineer',
  contact: {
    email: 'alex.carter@example.com', phone: '(555) 234-9810', location: 'San Francisco, CA',
    website: 'alexcarter.dev', linkedin: 'linkedin.com/in/alexcarter', github: 'github.com/alexcarter',
  },
  summary:
    'Full-stack engineer with 7+ years building scalable web platforms and developer tooling. ' +
    'Led teams shipping high-traffic products end to end — from API design to polished UI.',
  experience: [
    {
      company: 'Stripe', title: 'Senior Software Engineer', location: 'Remote',
      start: 'Mar 2021', end: 'Present',
      bullets: [
        'Led a 5-engineer team rebuilding the billing pipeline, cutting invoice latency **42%**.',
        'Designed an idempotent event system processing 2B+ events/day.',
        'Mentored 4 engineers; introduced trunk-based development and CI gates.',
      ],
    },
    {
      company: 'Airbnb', title: 'Software Engineer', location: 'San Francisco, CA',
      start: 'Jul 2018', end: 'Feb 2021',
      bullets: [
        'Built the host onboarding funnel, lifting conversion **18%**.',
        'Migrated a 400k-LOC monolith module to TypeScript with zero downtime.',
      ],
    },
  ],
  education: [{
    school: 'UC Berkeley', degree: 'B.S. Electrical Engineering & Computer Science',
    location: 'Berkeley, CA', start: '2014', end: '2018', gpa: '3.8/4.0',
    details: ['Coursework: Distributed Systems, Databases, Machine Learning.'],
  }],
  projects: [{
    name: 'OpenResume', description: 'Open-source resume builder',
    tech: ['React', 'Node', 'LaTeX'], link: 'github.com/alexcarter/openresume',
    bullets: ['1.2k GitHub stars; used by 30k+ job seekers.'],
  }],
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Go', 'Python', 'SQL'] },
    { category: 'Infrastructure', items: ['AWS', 'Kubernetes', 'Terraform', 'PostgreSQL'] },
  ],
  certifications: [{ name: 'AWS Solutions Architect — Professional', issuer: 'Amazon Web Services', date: '2022' }],
  awards: [{ name: 'Hackathon Winner', issuer: 'Stripe', date: '2022', description: 'Internal AI tooling track.' }],
};

const HERE = dirname(fileURLToPath(import.meta.url));
const IS_WIN = process.platform === 'win32';
const VENDORED = join(HERE, 'backend', 'vendor', 'tectonic', `tectonic${IS_WIN ? '.exe' : ''}`);

const runsOk = (cmd) => {
  const r = spawnSync(cmd, ['--version'], { stdio: 'pipe', timeout: 8000 });
  return !r.error && r.status === 0;
};
let BIN = null;
if (existsSync(VENDORED) && runsOk(VENDORED)) BIN = VENDORED;
else if (process.env.TECTONIC_PATH && runsOk(process.env.TECTONIC_PATH)) BIN = process.env.TECTONIC_PATH;
else if (runsOk('tectonic')) BIN = 'tectonic';
if (!BIN) { console.error('No Tectonic engine found (vendored or PATH).'); process.exit(1); }

const ver = spawnSync(BIN, ['--version'], { encoding: 'utf8' });
console.log('Engine :', (ver.stdout || ver.stderr || '').trim());
console.log('Binary :', BIN, '\n');

const dir = await mkdtemp(join(tmpdir(), 'bench-tec-'));
const RUNS = 3;

function compile(texFile, outName) {
  const t0 = performance.now();
  spawnSync(BIN, ['--chatter', 'minimal', '--outdir', dir, texFile], { cwd: dir, stdio: 'pipe', timeout: 120000 });
  const ms = performance.now() - t0;
  const pdf = join(dir, `${outName}.pdf`);
  return { ms, ok: existsSync(pdf), kb: existsSync(pdf) ? Math.round(statSync(pdf).size / 1024) : 0 };
}
function bench(texFile, outName) {
  const times = [];
  let kb = 0;
  for (let i = 0; i < RUNS; i++) { const r = compile(texFile, outName); if (r.ok) { times.push(r.ms); kb = r.kb; } }
  times.sort((a, b) => a - b);
  return { min: Math.round(times[0] || 0), median: Math.round(times[Math.floor(times.length / 2)] || 0), kb, ok: times.length };
}

// Baseline: trivial doc = pure engine startup cost (no real typesetting).
const baseTex = join(dir, 'baseline.tex');
await writeFile(baseTex, '\\documentclass{article}\\begin{document}x\\end{document}\n', 'utf8');
const base = bench(baseTex, 'baseline');

const rows = [];
for (const t of listTemplates()) {
  const r0 = performance.now();
  const tex = renderTemplate(t.id, SAMPLE);
  const renderMs = performance.now() - r0;
  const texFile = join(dir, `${t.id}.tex`);
  await writeFile(texFile, tex, 'utf8');
  const b = bench(texFile, t.id);
  rows.push({ id: t.id, renderMs: renderMs.toFixed(2), ...b, texKB: (tex.length / 1024).toFixed(1) });
}
await rm(dir, { recursive: true, force: true }).catch(() => {});

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log('=== Tectonic PDF compile benchmark (warm cache, best of ' + RUNS + ') ===\n');
console.log(pad('template', 12) + padL('render ms', 10) + padL('compile min', 13) + padL('median', 9) + padL('pdf KB', 8) + padL('tex KB', 8));
console.log('-'.repeat(60));
console.log(pad('(baseline)', 12) + padL('-', 10) + padL(base.min, 13) + padL(base.median, 9) + padL(base.kb, 8) + padL('-', 8));
for (const r of rows) {
  const tag = r.ok ? '' : '  <FAILED>';
  console.log(pad(r.id, 12) + padL(r.renderMs, 10) + padL(r.min, 13) + padL(r.median, 9) + padL(r.kb, 8) + padL(r.texKB, 8) + tag);
}
const avg = Math.round(rows.reduce((s, r) => s + r.min, 0) / rows.length);
console.log('\nEngine startup floor (baseline min): ' + base.min + ' ms');
console.log('Avg template compile (min):          ' + avg + ' ms');
console.log('=> typesetting-only cost ≈ ' + (avg - base.min) + ' ms; the rest (~' + base.min + ' ms) is pure engine startup per spawn.');
