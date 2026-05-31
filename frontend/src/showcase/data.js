// ─────────────────────────────────────────────────────────────────────────────
// Showcase mock data + shared helpers.
//
// Every home-page redesign in showcase/designs/ imports from here so all five
// concepts render the SAME realistic content (masters → tailored variants, live
// thumbnails, match scores). Nothing here touches the real resumeStore — the
// gallery is a pure visual sandbox for picking a direction.
// ─────────────────────────────────────────────────────────────────────────────

// Fixed "today" so the gallery is deterministic regardless of the clock.
const JUN5 = new Date('2026-06-05T10:00:00').getTime();
const day = 86_400_000;

// One rich resume, reused across masters with different templateIds so the
// thumbnails actually differ in style while the data stays believable.
export const RESUME_FULL = {
  name: 'Uday Pratap Singh Parihar',
  headline: 'Full-Stack Engineer · Automation · Reverse Engineering',
  contact: {
    location: 'Bengaluru, IN',
    phone: '+91 98765 43210',
    email: 'uday.ps@email.com',
    linkedin: 'linkedin.com/in/udayps',
    github: 'github.com/udayps-dev',
  },
  summary:
    'Full-stack engineer who ships end-to-end — from **resilient APIs** to polished React UIs — with a deep streak in browser automation and binary reverse engineering. I like turning gnarly, undocumented systems into clean, well-typed tools.',
  experience: [
    {
      title: 'Senior Full-Stack Engineer', company: 'Lanfield Technologies', location: 'Bengaluru, IN',
      start: 'Mar 2023', end: 'Present',
      bullets: [
        'Built a Node + React platform serving 480M+ daily requests, cutting p95 latency by 38%.',
        'Reverse-engineered three undocumented vendor protocols into a typed SDK adopted by 6 teams.',
        'Led migration to TypeScript and CI/CD, dropping production incidents by 45%.',
      ],
    },
    {
      title: 'Automation Engineer', company: 'Brightwave Labs', location: 'Pune, IN',
      start: 'Jul 2020', end: 'Feb 2023',
      bullets: [
        'Shipped a headless-browser automation grid running 12k jobs/day at 99.6% reliability.',
        'Wrote a packet-capture pipeline that flagged anomalies across 10TB of daily event data.',
      ],
    },
  ],
  education: [
    { school: 'BITS Pilani', degree: 'B.E. in Computer Science', location: 'Pilani, IN', start: '2016', end: '2020' },
  ],
  projects: [
    { name: 'DevPulse', tech: 'React · Node · PostgreSQL', description: 'Open-source CI dashboard aggregating build health across repos.' },
    { name: 'BinSift', tech: 'Rust · WASM', description: 'Static-analysis toolkit for triaging stripped binaries — 2k+ GitHub stars.' },
  ],
  skills: [
    { category: 'Languages', items: 'TypeScript, Python, Rust, Go, SQL' },
    { category: 'Frontend', items: 'React, Vite, Tailwind, Redux' },
    { category: 'Automation / RE', items: 'Playwright, Frida, Ghidra, mitmproxy' },
    { category: 'Infra', items: 'AWS, Docker, Kubernetes, Redis' },
  ],
  certifications: [
    { name: 'Offensive Security Certified Professional', issuer: 'OffSec', date: '2024' },
  ],
};

// A slimmer resume for a couple of variants, so thumbnails aren't all identical.
const RESUME_TAILORED = {
  ...RESUME_FULL,
  headline: 'MERN + Python Developer',
  summary:
    'Product-minded MERN engineer who pairs a strong React/Node core with Python data tooling. Comfortable owning a feature from schema to ship.',
};

// ── Masters, each with its tailored variants ─────────────────────────────────
// Mirrors the live dashboard: a stack of masters, each owning job-tailored copies.
export const MASTERS = [
  {
    id: 'm1',
    title: 'Full-Stack / Backend',
    name: 'Uday Pratap Singh Parihar',
    headline: 'FULL STACK | AUTOMATION | REVERSE ENGINEERING',
    templateId: 'executive',
    tone: 'Executive',
    updatedAt: JUN5,
    resume: RESUME_FULL,
    variants: [
      { id: 'm1v1', role: 'Senior Backend Engineer', company: 'Stripe',  templateId: 'executive', updatedAt: JUN5,           matchScore: 63, resume: RESUME_FULL },
      { id: 'm1v2', role: 'Platform Engineer',        company: 'Datadog', templateId: 'executive', updatedAt: JUN5 - day,     matchScore: 60, resume: RESUME_FULL },
      { id: 'm1v3', role: 'Staff Software Engineer',  company: 'Figma',   templateId: 'executive', updatedAt: JUN5 - 2 * day, matchScore: 74, resume: RESUME_FULL },
      { id: 'm1v4', role: 'Backend Engineer',         company: 'Notion',  templateId: 'executive', updatedAt: JUN5 - 3 * day, matchScore: 71, resume: RESUME_FULL },
      { id: 'm1v5', role: 'Full-Stack Engineer',      company: 'Vercel',  templateId: 'executive', updatedAt: JUN5 - 4 * day, matchScore: 66, resume: RESUME_FULL },
      { id: 'm1v6', role: 'Automation Lead',          company: 'Ramp',    templateId: 'executive', updatedAt: JUN5 - 6 * day, matchScore: 58, resume: RESUME_FULL },
    ],
  },
  {
    id: 'm2',
    title: 'Product Engineer',
    name: 'Uday Pratap Singh Parihar',
    headline: 'MERN | PYTHON | DATA TOOLING',
    templateId: 'deedy',
    tone: 'Deedy',
    updatedAt: JUN5 - day,
    resume: RESUME_FULL,
    variants: [
      { id: 'm2v1', role: 'MERN + Python Developer', company: 'Discover Wealth', templateId: 'deedy', updatedAt: JUN5,           matchScore: 57, resume: RESUME_TAILORED },
      { id: 'm2v2', role: 'Frontend Engineer',       company: 'Razorpay',        templateId: 'deedy', updatedAt: JUN5 - 2 * day, matchScore: 64, resume: RESUME_TAILORED },
      { id: 'm2v3', role: 'Full-Stack Developer',    company: 'Swiggy',          templateId: 'deedy', updatedAt: JUN5 - 5 * day, matchScore: 69, resume: RESUME_TAILORED },
    ],
  },
  {
    id: 'm3',
    title: 'One-Page Classic',
    name: 'Uday Pratap Singh Parihar',
    headline: 'SOFTWARE ENGINEER | GENERALIST',
    templateId: 'classic',
    tone: 'Classic',
    updatedAt: JUN5 - 2 * day,
    resume: RESUME_FULL,
    variants: [],
  },
  {
    id: 'm4',
    title: 'Frontend Specialist',
    name: 'Uday Pratap Singh Parihar',
    headline: 'REACT | DESIGN SYSTEMS | PERFORMANCE',
    templateId: 'modern',
    tone: 'Modern',
    updatedAt: JUN5 - 5 * day,
    resume: RESUME_FULL,
    variants: [
      { id: 'm4v1', role: 'Frontend Engineer',        company: 'Linear', templateId: 'modern', updatedAt: JUN5 - 4 * day, matchScore: 71, resume: RESUME_FULL },
      { id: 'm4v2', role: 'Senior Frontend Engineer', company: 'Airbnb', templateId: 'modern', updatedAt: JUN5 - 7 * day, matchScore: 68, resume: RESUME_FULL },
    ],
  },
];

// Flat list (newest-first-ish), in case a design prefers an ungrouped view.
export const ALL_ENTRIES = MASTERS.flatMap(m => [
  { ...m, parentId: null },
  ...m.variants.map(v => ({ ...v, parentId: m.id, title: `${v.role} · ${v.company}` })),
]);

// ── Aggregate stats some designs surface in a header ─────────────────────────
export const STATS = {
  masters: MASTERS.length,
  variants: MASTERS.reduce((n, m) => n + m.variants.length, 0),
  avgMatch: Math.round(
    MASTERS.flatMap(m => m.variants.map(v => v.matchScore)).reduce((a, b, _, arr) => a + b / arr.length, 0),
  ),
  applications: 7,
};

// ── Shared helpers (mirrors the live Dashboard's small utilities) ────────────
export const MONO_PALETTE = ['#2557eb', '#0d9488', '#7c3aed', '#b45309', '#0e7490', '#be123c', '#4338ca', '#15803d'];

export const TEMPLATE_ACCENTS = {
  jake: '#1f2937', modern: '#2062c9', classic: '#111827', compact: '#7c3aed',
  executive: '#1a56db', deedy: '#2b6cb0', alta: '#0d9488',
  minimalist: '#1a202c',
};

export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) { h = (h << 5) - h + String(s).charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export function monogram(title) {
  const words = String(title || '').split(/\s+/).filter(w => /^[a-zA-Z0-9]/.test(w));
  const letters = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return letters || '·';
}

export function monoColor(seed) {
  return MONO_PALETTE[hashStr(seed) % MONO_PALETTE.length];
}

export function accentFor(templateId) {
  return TEMPLATE_ACCENTS[templateId] || '#2557eb';
}

export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SECTION_KEYS = ['experience', 'education', 'projects', 'skills', 'certifications', 'awards'];
export function countSections(resume) {
  return SECTION_KEYS.reduce((n, k) => n + (resume?.[k]?.length || 0), 0);
}

export function variantLabel(v) {
  if (v.role && v.company) return `${v.role} · ${v.company}`;
  return v.role || v.company || v.title || 'Tailored resume';
}
