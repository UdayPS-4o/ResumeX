// Quick smoke test for templates + compiler. Run with `node smoke.mjs`.
import { listTemplates, renderTemplate } from './src/templates/index.js';
import { compileLatex } from './src/services/compiler.js';

const sampleResume = {
  name: 'Ada Lovelace',
  headline: 'Mathematician & Computing Pioneer',
  contact: {
    email: 'ada@analyticalengine.com',
    phone: '+44 20 7946 0000',
    location: 'London, UK',
    website: 'https://ada.example.com',
    linkedin: 'https://linkedin.com/in/ada',
    github: 'https://github.com/ada',
  },
  summary:
    'Mathematician and writer focused on analytical computing & symbolic logic. ' +
    'First to recognize that machines could go beyond pure calculation.',
  experience: [
    {
      company: 'Analytical Engine Co.',
      title: 'Lead Algorithm Designer',
      location: 'London, UK',
      start: 'Jan 1843',
      end: 'Present',
      bullets: [
        'Designed the first published algorithm intended for machine execution.',
        'Wrote 40+ pages of notes that anticipate looping & branching constructs.',
        'Reduced compute time on Bernoulli sequences by 35% via tabular methods.',
      ],
    },
  ],
  education: [
    {
      school: 'University College London',
      degree: 'B.Sc. Mathematics',
      location: 'London, UK',
      start: '1840',
      end: '1843',
      gpa: 'First Class',
      details: ['Coursework: number theory, symbolic logic, mechanical computation.'],
    },
  ],
  projects: [
    {
      name: 'Bernoulli Sequence Algorithm',
      description: 'Hand-computed program for the Analytical Engine.',
      tech: ['Punched cards', 'Bernoulli numbers'],
      link: 'https://example.com/bernoulli',
      bullets: ['Demonstrated machine-executable abstraction over pure arithmetic.'],
    },
  ],
  skills: [
    { category: 'Math', items: ['Calculus', 'Number theory', 'Symbolic logic'] },
    { category: 'Tools', items: ['Quill', 'Punched cards', 'Difference engine'] },
  ],
  certifications: [
    { name: 'Royal Society Member', issuer: 'Royal Society', date: '1843' },
  ],
  awards: [],
};

const id = process.argv[2] || 'jake';
const compile = process.argv.includes('--compile');

console.log('Templates:');
for (const t of listTemplates()) console.log('  -', t);

const latex = renderTemplate(id, sampleResume);
console.log(`\n--- Rendered ${id} (${latex.length} chars) ---`);
console.log(latex.split('\n').slice(0, 12).join('\n'));
console.log('  ...');
console.log(latex.split('\n').slice(-10).join('\n'));

if (compile) {
  console.log('\n→ Compiling via latexonline.cc ...');
  const pdf = await compileLatex(latex);
  const fs = await import('node:fs/promises');
  const out = `smoke-${id}.pdf`;
  await fs.writeFile(out, pdf);
  console.log(`✓ Wrote ${out} (${pdf.length} bytes)`);
}
