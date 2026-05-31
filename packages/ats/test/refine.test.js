import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  debuzzText, debuzzResume, AI_PHRASE_BLACKLIST, AI_PHRASE_REPLACEMENTS,
  segmentByKeywords, extractKeywords,
  analyzeKeywordGaps,
} from '../src/index.js';

// ── debuzzText ──────────────────────────────────────────────────────────────

test('debuzzText swaps weak words for plain ones', () => {
  const { text, removed } = debuzzText('Leveraged Kubernetes and utilized Docker');
  assert.equal(text, 'Used Kubernetes and used Docker');
  assert.deepEqual(removed.sort(), ['leveraged', 'utilized']);
});

test('debuzzText preserves leading-capital casing of a replacement', () => {
  assert.equal(debuzzText('Utilized the API').text, 'Used the API');
  assert.equal(debuzzText('We utilized the API').text, 'We used the API');
  assert.equal(debuzzText('Spearheaded the rollout').text, 'Led the rollout');
});

test('debuzzText strips filler phrases and tidies punctuation', () => {
  const { text, removed } = debuzzText('In order to move the needle, we synergized going forward');
  assert.equal(text, 'To make progress, we collaborated');
  assert.ok(removed.includes('in order to'));
  assert.ok(removed.includes('move the needle'));
  assert.ok(removed.includes('going forward'));
});

test('debuzzText respects the keep list (protects real keywords)', () => {
  const input = 'Built a robust, scalable platform';
  const { text, removed } = debuzzText(input, { keep: ['robust', 'scalable'] });
  assert.equal(text, input, 'kept terms must not be rewritten');
  assert.deepEqual(removed, []);
});

test('debuzzText keep is case-insensitive', () => {
  const { removed } = debuzzText('Leveraged ML', { keep: ['LEVERAGED'] });
  assert.deepEqual(removed, []);
});

test('debuzzText only matches whole words', () => {
  // "user" must not trigger on the "use" replacement; "robustness" not on "robust".
  const { text, removed } = debuzzText('Improved user robustness');
  assert.equal(text, 'Improved user robustness');
  assert.deepEqual(removed, []);
});

test('debuzzText longest-phrase wins over a shorter overlapping phrase', () => {
  const { text } = debuzzText('Shipped it in a timely manner');
  assert.equal(text, 'Shipped it promptly');
});

test('debuzzText handles empty / null input without throwing', () => {
  assert.deepEqual(debuzzText(''), { text: '', removed: [] });
  assert.deepEqual(debuzzText(null), { text: '', removed: [] });
  assert.deepEqual(debuzzText(undefined), { text: '', removed: [] });
});

test('debuzzText reports each removed term once even if repeated', () => {
  const { removed } = debuzzText('Utilized this and utilized that');
  assert.deepEqual(removed, ['utilized']);
});

test('AI_PHRASE_REPLACEMENTS contains the documented seed swaps', () => {
  assert.equal(AI_PHRASE_REPLACEMENTS.leveraged, 'used');
  assert.equal(AI_PHRASE_REPLACEMENTS.utilize, 'use');
  assert.equal(AI_PHRASE_REPLACEMENTS.spearheaded, 'led');
  // Blacklist is the key set, phrases sorted longest-first.
  assert.ok(AI_PHRASE_BLACKLIST.includes('leveraged'));
  assert.ok(AI_PHRASE_BLACKLIST.includes('in order to'));
  const phrases = AI_PHRASE_BLACKLIST.filter(p => /\s/.test(p));
  for (let i = 1; i < phrases.length; i++) {
    assert.ok(phrases[i - 1].length >= phrases[i].length, 'phrases should be longest-first');
  }
});

// ── debuzzResume ────────────────────────────────────────────────────────────

test('debuzzResume rewrites prose fields and returns a NEW resume (no mutation)', () => {
  const resume = {
    name: 'Jane Doe',
    summary: 'Spearheaded initiatives and leveraged data',
    experience: [{ title: 'Engineer', bullets: ['Utilized AWS to build pipelines'] }],
    projects: [{ name: 'Tool', description: 'Orchestrated the release' }],
    skills: [{ items: ['robust'] }],
  };
  const snapshot = JSON.parse(JSON.stringify(resume));
  const { resume: out, removed } = debuzzResume(resume);

  assert.deepEqual(resume, snapshot, 'input resume must not be mutated');
  assert.equal(out.summary, 'Led initiatives and used data');
  assert.equal(out.experience[0].bullets[0], 'Used AWS to build pipelines');
  assert.equal(out.projects[0].description, 'Coordinated the release');
  // Non-prose fields are left alone (a skill literally named "robust" stays).
  assert.equal(out.name, 'Jane Doe');
  assert.equal(out.experience[0].title, 'Engineer');
  assert.deepEqual(out.skills[0].items, ['robust']);
  assert.ok(removed.includes('spearheaded'));
  assert.ok(removed.includes('leveraged'));
  assert.ok(removed.includes('utilized'));
  assert.ok(removed.includes('orchestrated'));
});

test('debuzzResume protects terms that appear in the target job description', () => {
  const resume = { summary: 'Built robust, scalable services' };
  // JD legitimately asks for "robust" + "scalable" → must not be stripped.
  const jd = 'We need robust, scalable systems built on AWS.';
  const { resume: out, removed } = debuzzResume(resume, { jobDescription: jd });
  assert.equal(out.summary, 'Built robust, scalable services');
  assert.deepEqual(removed, []);
});

test('debuzzResume passes through non-object input unchanged', () => {
  assert.deepEqual(debuzzResume(null), { resume: null, removed: [] });
  assert.deepEqual(debuzzResume(undefined), { resume: undefined, removed: [] });
});

// ── segmentByKeywords / extractKeywords ─────────────────────────────────────

test('segmentByKeywords flags whole-word matches, case-insensitively', () => {
  const segs = segmentByKeywords('Built React apps with Node.js', ['react', 'node.js']);
  const matches = segs.filter(s => s.isMatch).map(s => s.text);
  assert.deepEqual(matches, ['React', 'Node.js']);
});

test('segmentByKeywords concatenation reproduces the original text exactly', () => {
  const text = 'Hello,  world!  Shipped React & TypeScript (v5).';
  const segs = segmentByKeywords(text, ['react', 'typescript']);
  assert.equal(segs.map(s => s.text).join(''), text);
});

test('segmentByKeywords does not match a substring of a larger token', () => {
  const segs = segmentByKeywords('javascript and java', ['java']);
  const matched = segs.filter(s => s.isMatch).map(s => s.text);
  assert.deepEqual(matched, ['java'], 'only the standalone "java" matches, not "javascript"');
});

test('segmentByKeywords highlights each word of a multi-word keyword', () => {
  const segs = segmentByKeywords('strong machine learning background', ['machine learning']);
  const matched = segs.filter(s => s.isMatch).map(s => s.text);
  assert.deepEqual(matched, ['machine', 'learning']);
});

test('segmentByKeywords accepts a Set and handles empty inputs', () => {
  const segs = segmentByKeywords('React only', new Set(['react']));
  assert.ok(segs.find(s => s.text === 'React').isMatch);
  assert.deepEqual(segmentByKeywords('', ['react']), []);
  assert.ok(segmentByKeywords('React', []).every(s => s.isMatch === false));
});

test('extractKeywords drops stopwords, numbers, and 1-char tokens', () => {
  const kw = extractKeywords('We built 3 scalable React services in 2024 with a team');
  assert.ok(kw.has('built'));
  assert.ok(kw.has('react'));
  assert.ok(kw.has('services'));
  assert.ok(!kw.has('we'));      // stopword
  assert.ok(!kw.has('with'));    // stopword
  assert.ok(!kw.has('3'));       // pure number
  assert.ok(!kw.has('2024'));    // pure number
  assert.ok(!kw.has('a'));       // too short / stopword
});

// ── analyzeKeywordGaps ──────────────────────────────────────────────────────

const RESUME = {
  skills: [{ items: ['React', 'TypeScript', 'Docker'] }],
  experience: [{ bullets: ['Built data pipelines for analytics', 'Designed REST services'] }],
};

test('analyzeKeywordGaps splits matched vs missing and computes percent', () => {
  const out = analyzeKeywordGaps(RESUME, ['react', 'typescript', 'docker', 'kubernetes']);
  assert.deepEqual(out.matched.sort(), ['docker', 'react', 'typescript']);
  assert.deepEqual(out.missing, ['kubernetes']);
  assert.equal(out.percent, 75);
});

test('analyzeKeywordGaps marks a related-form missing keyword as injectable', () => {
  // "data engineering" is missing as a phrase, but the résumé already says
  // "data pipelines" → the "data" family is present → injectable, not hopeless.
  const out = analyzeKeywordGaps(RESUME, ['data engineering', 'kubernetes']);
  assert.ok(out.missing.includes('data engineering'));
  assert.ok(out.injectable.includes('data engineering'), 'should be reframable from existing material');
  assert.ok(!out.injectable.includes('kubernetes'), 'kubernetes has no footprint → not injectable');
});

test('analyzeKeywordGaps accepts a raw job-description string', () => {
  const out = analyzeKeywordGaps(RESUME, 'Looking for React and Kubernetes experience.');
  assert.ok(out.matched.includes('react'));
  assert.ok(out.missing.includes('kubernetes'));
  assert.ok(out.percent >= 0 && out.percent <= 100);
});

test('analyzeKeywordGaps accepts the extractJdKeywords object shape', () => {
  const out = analyzeKeywordGaps(RESUME, { skills: ['react', 'kubernetes'], terms: [] });
  assert.ok(out.matched.includes('react'));
  assert.ok(out.missing.includes('kubernetes'));
});

test('analyzeKeywordGaps handles empty keyword input', () => {
  assert.deepEqual(analyzeKeywordGaps(RESUME, []), { matched: [], missing: [], injectable: [], percent: 0 });
  assert.deepEqual(analyzeKeywordGaps(RESUME, ''), { matched: [], missing: [], injectable: [], percent: 0 });
});

test('analyzeKeywordGaps: injectable is always a subset of missing', () => {
  const out = analyzeKeywordGaps(RESUME, ['react', 'data engineering', 'kubernetes', 'typescript']);
  for (const k of out.injectable) assert.ok(out.missing.includes(k));
  for (const k of out.matched) assert.ok(!out.missing.includes(k));
});
