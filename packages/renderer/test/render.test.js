import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  renderTemplate,
  listTemplates,
  TEMPLATES,
} from '../src/index.js';
import { sectionTitle, orderSections } from '../src/typst.js';

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

const ALL_IDS = ['jake', 'modern', 'classic', 'compact', 'executive', 'deedy', 'alta', 'minimalist'];

for (const id of ALL_IDS) {
  test(`renderTemplate("${id}") produces a valid Typst document`, () => {
    const out = renderTemplate(id, SAMPLE);
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0, 'output should be non-empty');
    assert.ok(
      out.includes('#set document(') || out.includes('cv.with(') || out.includes('project.with('),
      'output should set document configuration'
    );
    assert.ok(
      out.includes('#set page(') || out.includes('paper-size:') || out.includes('pageSize:'),
      'output should set page configuration'
    );
    const hasName = out.includes('Ada Lovelace') || (out.includes('Ada') && out.includes('Lovelace'));
    assert.ok(hasName, 'output should contain the sample name');
  });
}

test('unknown template id throws a 404 error', () => {
  assert.throws(
    () => renderTemplate('does-not-exist', SAMPLE),
    (err) => err instanceof Error && err.status === 404,
  );
});

test('listTemplates returns all registered templates', () => {
  const list = listTemplates();
  const ids = list.map((t) => t.id);
  for (const id of ALL_IDS) assert.ok(ids.includes(id), `missing ${id}`);
  for (const t of list) {
    assert.equal(typeof t.name, 'string');
  }
});

test('TEMPLATES registry exposes render functions', () => {
  for (const id of ALL_IDS) {
    assert.equal(typeof TEMPLATES[id].render, 'function');
  }
});

// ── helper sanity ────────────────────────────────────────────────────────────


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

// The customization model anchors level 3 == the template's native value, so an
// untouched resume and an explicit "all level 3" resume must render identically.
// This is what makes "reset a control to 3" reproduce the native look and keeps
// the round-trip idempotent (the bug this redesign fixed).
test('default render equals explicit level-3 for every template', () => {
  const lvl3 = {
    compactMode: false, showContactIcons: true, sidebarWidth: 'medium',
    spacing: { section: 3, item: 3, lineHeight: 3 },
    fontSize: { base: 3, headerScale: 3 },
  };
  for (const id of ALL_IDS) {
    const bare = renderTemplate(id, SAMPLE);
    const explicit = renderTemplate(id, SAMPLE, { formatting: lvl3 });
    assert.equal(bare, explicit, `${id}: explicit level-3 should equal the native default`);
  }
});

test('a customization override changes the output for every template', () => {
  for (const id of ALL_IDS) {
    const bare = renderTemplate(id, SAMPLE);
    const themed = renderTemplate(id, SAMPLE, { formatting: { accentColor: '#abcdef' } });
    assert.notEqual(bare, themed, `${id}: an accent override should change the output`);
    assert.ok(themed.toLowerCase().includes('abcdef'), `${id}: output should carry the chosen accent`);
  }
});

test('renderTemplate with formatting options applies them to Typst output', () => {
  const customFormatting = {
    margins: { top: 12, bottom: 12, left: 12, right: 12 },
    accentColor: 'red',
    spacing: { section: 4, item: 3, lineHeight: 4 },
    fontSize: { base: 4, headerScale: 4, headerFont: 'mono', bodyFont: 'serif' },
    compactMode: true,
    showContactIcons: false,
  };
  const out = renderTemplate('jake', SAMPLE, { formatting: customFormatting });
  assert.ok(out.includes('margin: (top: 12mm, bottom: 12mm, left: 12mm, right: 12mm)'));
  assert.ok(out.includes('rgb("#DC2626")'));
});
