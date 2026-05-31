import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderResume, listTemplates, getTemplate, getSeed,
  emptyResume, mergeResume, latex,
} from '../src/index.js';

const sample = {
  ...emptyResume(),
  name: 'Ada Lovelace',
  headline: 'Computing Pioneer',
  contact: { email: 'ada@example.com', phone: '+44 20 7946 0000', location: 'London, UK', github: 'https://github.com/ada' },
  summary: 'Mathematician focused on analytical computing & symbolic logic.',
  experience: [{
    company: 'Analytical Engine Co.', title: 'Lead Algorithm Designer',
    location: 'London, UK', start: 'Jan 1843', end: 'Present',
    bullets: ['Designed the first published algorithm for machine execution.', 'Cut compute time 35% via tabular methods.'],
  }],
  education: [{ school: 'University College London', degree: 'BSc Mathematics', start: '1840', end: '1843', gpa: 'First' }],
  skills: [{ category: 'Math', items: ['Calculus', 'Logic'] }],
};

const ALL_IDS = ['jake', 'modern', 'classic', 'compact', 'executive'];

test('listTemplates returns all built-in templates with metadata', () => {
  const list = listTemplates();
  const ids = list.map(t => t.id).sort();
  assert.deepEqual(ids, [...ALL_IDS].sort());
  for (const t of list) {
    assert.ok(t.name && t.description && t.accent, `${t.id} has metadata`);
    assert.equal(typeof t.hasSeed, 'boolean');
  }
});

test('every template renders a complete, compilable-looking document', () => {
  for (const id of ALL_IDS) {
    const out = renderResume(id, sample);
    assert.match(out, /\\documentclass/, `${id} has documentclass`);
    assert.match(out, /\\begin\{document\}/, `${id} opens document`);
    assert.match(out, /\\end\{document\}/, `${id} closes document`);
    assert.ok(out.includes('Ada Lovelace') || out.includes('Ada'), `${id} includes the name`);
    assert.ok(out.length > 500, `${id} produced substantial output`);
  }
});

test('LaTeX special characters are escaped', () => {
  const tricky = { ...emptyResume(), name: 'A & B', summary: '100% sure: cost $5 #1 a_b' };
  const out = renderResume('classic', tricky);
  assert.ok(out.includes('\\&'), 'ampersand escaped');
  assert.ok(out.includes('\\%'), 'percent escaped');
  assert.ok(out.includes('\\$'), 'dollar escaped');
  assert.ok(out.includes('\\#'), 'hash escaped');
  assert.ok(out.includes('\\_'), 'underscore escaped');
});

test('getTemplate returns render fn; unknown id is undefined', () => {
  const jake = getTemplate('jake');
  assert.equal(jake.id, 'jake');
  assert.equal(typeof jake.render, 'function');
  assert.equal(getTemplate('nope'), undefined);
});

test('executive template ships seed data; others do not', () => {
  const seed = getSeed('executive');
  assert.ok(seed && typeof seed.name === 'string', 'executive has a seed resume');
  assert.equal(getSeed('jake'), null);
});

test('pageSize option is honored by the executive template', () => {
  const a4 = renderResume('executive', sample, { pageSize: 'a4' });
  const legal = renderResume('executive', sample, { pageSize: 'legal' });
  assert.match(a4, /a4paper/i, 'a4 requested → a4paper');
  assert.notEqual(a4, legal, 'different page sizes produce different output');
});

test('mergeResume merges updates without dropping existing fields', () => {
  const base = { ...emptyResume(), name: 'X', summary: 'hi' };
  const merged = mergeResume(base, { summary: 'updated', contact: { email: 'x@y.z' } });
  assert.equal(merged.name, 'X');
  assert.equal(merged.summary, 'updated');
  assert.equal(merged.contact.email, 'x@y.z');
});

test('latex helpers behave', () => {
  assert.equal(latex.tex('a & b'), 'a \\& b');
  assert.equal(latex.dateRange('2020', '2024'), '2020 -- 2024');
  assert.equal(latex.dateRange('2020', ''), '2020');
  assert.match(latex.hrefTex('https://x.com'), /\\href\{https:\/\/x\.com\}/);
});
