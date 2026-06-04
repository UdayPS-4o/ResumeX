// Pre-render a static preview thumbnail for every template.
//
// For each template we render its LaTeX with one shared sample resume, compile
// it to a PDF (via the same compiler the app uses), and rasterize page 1 to a
// PNG using mupdf. The PNGs land in frontend/public/previews/<id>.png and are
// shown in the "Choose a template" gallery.
//
// Run from the backend dir:  node scripts/prerender-previews.mjs
// These are build-time artifacts — regenerate and commit whenever a template's
// layout changes.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import * as mupdf from 'mupdf';

import { TEMPLATES } from '@resumex/renderer';
import { compileLatex } from '../src/services/compiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'frontend', 'public', 'previews');
const DPI = 150; // crisp on retina at thumbnail size; PNG compresses flat resume art well

// One neutral, well-rounded sample resume rendered into every template so the
// gallery is directly comparable (the TopCV approach). Fills each section so
// every layout looks "full" without spilling past one page.
const SAMPLE_RESUME = {
  name: 'Alex Carter',
  headline: 'Senior Software Engineer',
  contact: {
    email: 'alex.carter@email.com',
    phone: '(555) 234-9810',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexcarter',
    github: 'github.com/alexcarter',
    website: '',
  },
  summary:
    'Full-stack engineer with 7+ years building scalable web platforms and developer tooling. ' +
    'Led teams shipping high-traffic products end to end — from API design to polished UI.',
  experience: [
    {
      company: 'Linfield Technologies',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      start: 'Mar 2021',
      end: 'Present',
      bullets: [
        'Architected a microservices platform serving 4M+ daily requests, cutting p95 latency by 38%.',
        'Led a team of 5 engineers delivering a customer dashboard adopted by 200+ enterprise clients.',
        'Drove the migration to TypeScript and CI/CD, reducing production incidents by 45%.',
      ],
    },
    {
      company: 'Brightwave Labs',
      title: 'Software Engineer',
      location: 'Austin, TX',
      start: 'Jul 2018',
      end: 'Feb 2021',
      bullets: [
        'Built real-time analytics pipelines processing 10GB+ of event data per day.',
        'Shipped a React component library adopted across 12 internal products.',
      ],
    },
  ],
  projects: [
    {
      name: 'DevPulse',
      description: 'Open-source CI dashboard aggregating build health across repositories.',
      tech: ['React', 'Node.js', 'PostgreSQL'],
      link: 'github.com/alexcarter/devpulse',
      bullets: [],
    },
    {
      name: 'QueryForge',
      description: 'Type-safe SQL query builder with 2k+ GitHub stars.',
      tech: ['TypeScript'],
      link: '',
      bullets: [],
    },
  ],
  skills: [
    { category: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL'] },
    { category: 'Frameworks', items: ['React', 'Next.js', 'Node.js', 'Express'] },
    { category: 'Infrastructure', items: ['AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis'] },
  ],
  education: [
    {
      school: 'University of California, Berkeley',
      degree: 'B.S. in Computer Science',
      location: 'Berkeley, CA',
      start: '2014',
      end: '2018',
      gpa: '3.8',
      details: [],
    },
  ],
  certifications: [],
  awards: [],
};

function pngFromPdf(pdf) {
  const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
  const page = doc.loadPage(0); // only page 1 shows in the card
  const scale = DPI / 72;
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  return { png: pix.asPNG(), w: pix.getWidth(), h: pix.getHeight() };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const ids = Object.keys(TEMPLATES);
  console.log(`Pre-rendering ${ids.length} template previews → ${OUT_DIR}\n`);

  for (const id of ids) {
    process.stdout.write(`  ${id.padEnd(9)} `);
    try {
      // Force letterpaper so every card shares one aspect ratio (uday defaults to legal).
      const latex = TEMPLATES[id].render(SAMPLE_RESUME, { pageSize: 'letter' });
      const t0 = Date.now();
      const pdf = await compileLatex(latex); // no trim — full page, card crops the top
      const { png, w, h } = pngFromPdf(pdf);
      await writeFile(join(OUT_DIR, `${id}.png`), png);
      console.log(`ok  ${w}x${h}  ${(png.length / 1024).toFixed(0)}KB  ${Date.now() - t0}ms`);
    } catch (e) {
      console.log(`FAILED  ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log('\nDone.');
}

// Run only when invoked directly (so the sample + helpers can be imported safely).
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { SAMPLE_RESUME, pngFromPdf };
