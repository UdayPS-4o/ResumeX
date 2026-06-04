import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  renderTemplate,
  listTemplates,
  getSeed,
  TEMPLATES,
} from '../src/index.js';
import { tex, mdTex, dateRange, joinTex, hrefTex, sectionTitle, orderSections } from '../src/latex.js';

const SAMPLE = {
  name: 'Ada Lovelace',
  headline: 'Software Engineer | Mathematician',
  contact: {
    email: 'ada@example.com',
    phone: '+1 555 0100',
    location: 'London, UK',
    linkedin: 'https://linkedin.com/in/ada',
    github: 'https://github.com/ada',
    website: 'https://ada.dev',
  },
  summary: 'Engineer with a focus on **reliable** systems and clear *abstractions*.',
  experience: [
    {
      company: 'Analytical Engines Ltd',
      title: 'Lead Engineer',
      location: 'London, UK',
      start: 'Jan 2022',
      end: 'Present',
      description: 'Led the core compute platform team.',
      bullets: ['Shipped a **new** pipeline.', 'Cut latency by 40%.'],
    },
  ],
  projects: [
    {
      name: 'Difference Engine',
      start: '',
      end: '2024',
      description: 'A mechanical computation project.',
      tech: ['Brass', 'Steam'],
      link: 'https://example.com/de',
      bullets: ['Computed polynomial tables.'],
    },
  ],
  skills: [
    { category: 'Languages', items: ['Assembly', 'Ada'] },
    { category: 'Tools', items: ['Punch cards'] },
  ],
  education: [
    {
      school: 'University of London',
      degree: 'B.S. in Mathematics',
      location: 'London, UK',
      start: '2016',
      end: '2020',
      gpa: '3.9',
      details: ['Thesis on algorithms.'],
    },
  ],
  certifications: [
    { name: 'Certified Engine Operator', issuer: 'Royal Society', date: '2021' },
  ],
  awards: [
    { name: 'Pioneer Award', issuer: 'Computing Guild', date: '2023', description: 'For early work.' },
  ],
};

const ALL_IDS = ['jake', 'modern', 'classic', 'compact', 'executive'];

for (const id of ALL_IDS) {
  test(`renderTemplate("${id}") produces a valid LaTeX document`, () => {
    const out = renderTemplate(id, SAMPLE);
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0, 'output should be non-empty');
    assert.ok(out.includes('\\documentclass'), 'output should contain \\documentclass');
    assert.ok(out.includes('\\begin{document}'), 'output should open a document');
    assert.ok(out.includes('\\end{document}'), 'output should close a document');
    assert.ok(out.includes('Ada Lovelace'), 'output should contain the sample name');
  });
}

test('"uday" is a legacy alias for "modern"', () => {
  const viaUday = renderTemplate('uday', SAMPLE);
  const viaModern = renderTemplate('modern', SAMPLE);
  assert.equal(viaUday, viaModern);
});

test('unknown template id throws a 404 error', () => {
  assert.throws(
    () => renderTemplate('does-not-exist', SAMPLE),
    (err) => err instanceof Error && err.status === 404,
  );
});

test('listTemplates returns all registered templates with hasSeed flags', () => {
  const list = listTemplates();
  const ids = list.map((t) => t.id);
  for (const id of ALL_IDS) assert.ok(ids.includes(id), `missing ${id}`);
  for (const t of list) {
    assert.equal(typeof t.name, 'string');
    assert.equal(typeof t.hasSeed, 'boolean');
  }
  // modern + executive ship seeds.
  assert.equal(list.find((t) => t.id === 'modern').hasSeed, true);
  assert.equal(list.find((t) => t.id === 'executive').hasSeed, true);
});

test('getSeed returns seed data for seeded templates (incl. uday alias)', () => {
  assert.ok(getSeed('modern'), 'modern should have a seed');
  assert.equal(getSeed('uday'), getSeed('modern'), 'uday alias resolves to modern seed');
  assert.ok(getSeed('executive'), 'executive should have a seed');
  assert.equal(getSeed('jake'), null, 'jake has no seed');
});

test('TEMPLATES registry exposes render functions', () => {
  for (const id of ALL_IDS) {
    assert.equal(typeof TEMPLATES[id].render, 'function');
  }
});

// ── helper sanity ────────────────────────────────────────────────────────────

test('tex() escapes LaTeX special characters', () => {
  assert.equal(tex('100% & $5'), '100\\% \\& \\$5');
  assert.equal(tex(undefined), '');
  assert.equal(tex(null), '');
});

test('mdTex() converts inline markdown to LaTeX', () => {
  assert.equal(mdTex('a **bold** word'), 'a \\textbf{bold} word');
  assert.equal(mdTex('an *italic* word'), 'an \\textit{italic} word');
});

test('dateRange() formats both, one, or neither side', () => {
  assert.equal(dateRange('2022', '2024'), '2022 -- 2024');
  assert.equal(dateRange('2022', ''), '2022');
  assert.equal(dateRange('', '2024'), '2024');
  assert.equal(dateRange('', ''), '');
});

test('joinTex() skips empties and escapes', () => {
  assert.equal(joinTex(['a', '', 'b&c']), 'a \\textbar{} b\\&c');
});

test('hrefTex() builds a clickable link', () => {
  assert.equal(hrefTex('https://x.com'), '\\href{https://x.com}{x.com}');
  assert.equal(hrefTex(''), '');
});

test('sectionTitle() honors overrides then fallback then default', () => {
  assert.equal(sectionTitle({ sectionTitles: { summary: 'Profile' } }, 'summary', 'Summary'), 'Profile');
  assert.equal(sectionTitle({}, 'summary', 'About'), 'About');
  assert.equal(sectionTitle({}, 'summary'), 'Summary');
});

test('orderSections() respects explicit order then appends extras', () => {
  const blocks = { a: 'A', b: 'B', c: 'C' };
  assert.deepEqual(orderSections(blocks, ['a', 'b', 'c'], ['c', 'a']), ['C', 'A', 'B']);
  assert.deepEqual(orderSections(blocks, ['b', 'a', 'c']), ['B', 'A', 'C']);
});
