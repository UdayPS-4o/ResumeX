import { renderJake } from './jake.js';
import { renderModern } from './modern.js';
import { renderClassic } from './classic.js';
import { renderCompact } from './compact.js';

const resume = {
  name: 'Jane Doe',
  headline: 'Engineer',
  contact: { email: 'a@b.com' },
  summary: 'A **bold** summary with *italic* text.',
  experience: [{
    title: 'Dev', company: 'Acme', start: '2020', end: '2022',
    description: 'Did **bold** work and *italic* things.',
    bullets: ['Shipped **bold** feature', 'Fixed *italic* bug'],
  }],
  projects: [{
    name: 'Proj', description: 'A **bold** project *italic*.',
    bullets: ['Built **bold** part'],
  }],
  education: [{ school: 'MIT', degree: 'BS', details: ['Took **bold** course *italic*'] }],
  awards: [{ name: 'Prize', issuer: 'Org', date: '2021', description: 'For **bold** work *italic*.' }],
};

const cases = [
  ['jake', renderJake],
  ['modern', renderModern],
  ['classic', renderClassic],
  ['compact', renderCompact],
];

let allPass = true;
for (const [name, fn] of cases) {
  try {
    const out = fn(resume);
    const checks = {
      bold: out.includes('\\textbf{bold}'),
      italic: out.includes('\\textit{italic}'),
      endDoc: out.includes('\\end{document}'),
      noRawStars: !out.includes('**'),
    };
    const pass = Object.values(checks).every(Boolean);
    if (!pass) allPass = false;
    console.log(`${name}: ${pass ? 'PASS' : 'FAIL'} ${JSON.stringify(checks)}`);
  } catch (e) {
    allPass = false;
    console.log(`${name}: FAIL (error) ${e.message}`);
  }
}
console.log(allPass ? 'ALL PASS' : 'SOME FAIL');
