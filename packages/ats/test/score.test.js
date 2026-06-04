import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAtsChecks, gradeFor, matchKeywords, extractJdKeywords } from '../src/index.js';

const BREAKDOWN_KEYS = [
  'Contact info',
  'Section coverage',
  'Quantified impact',
  'Action verbs',
  'Employment dates',
  'Skills / keywords',
  'Conciseness',
];

// A fully-populated resume that should score high.
const FULL_RESUME = {
  contact: { email: 'jane@example.com', phone: '555-1234', location: 'NYC' },
  summary: 'Senior engineer with a decade of experience shipping products.',
  experience: [
    {
      start: '2020',
      end: '2024',
      bullets: [
        'Led a team of 8 to deliver a platform serving 2M users',
        'Reduced latency by 40% across core services',
        'Built CI pipeline cutting deploy time from 30m to 5m',
        'Increased revenue 25% by launching a new checkout flow',
      ],
    },
    {
      start: '2016',
      end: '2020',
      bullets: [
        'Designed 3 microservices handling 500 req/s',
        'Migrated 12 legacy modules to a modern stack',
      ],
    },
  ],
  education: [{ school: 'MIT', degree: 'BS CS' }],
  skills: [
    { items: ['JavaScript', 'TypeScript', 'Node', 'React', 'Go', 'Python'] },
    { items: ['AWS', 'Docker', 'Kubernetes', 'Postgres', 'Redis', 'GraphQL'] },
  ],
  projects: [
    { bullets: ['Created an open-source tool with 1000 GitHub stars'] },
  ],
};

test('empty resume scores low', () => {
  const res = runAtsChecks({});
  assert.ok(res.score < 50, `expected low score, got ${res.score}`);
  assert.equal(res.grade, 'Poor');
  assert.ok(res.issues.length > 0);
});

test('undefined resume does not throw and scores low', () => {
  const res = runAtsChecks(undefined);
  assert.ok(res.score < 50);
  assert.equal(res.grade, 'Poor');
});

test('fully-populated resume scores high', () => {
  const res = runAtsChecks(FULL_RESUME);
  assert.ok(res.score >= 85, `expected high score, got ${res.score}`);
  assert.equal(res.grade, 'Excellent');
  assert.ok(res.passed.length > 0);
});

test('return shape has all required fields', () => {
  const res = runAtsChecks(FULL_RESUME);
  for (const key of ['score', 'grade', 'breakdown', 'issues', 'passed']) {
    assert.ok(key in res, `missing field: ${key}`);
  }
  assert.equal(typeof res.score, 'number');
  assert.equal(typeof res.grade, 'string');
  assert.ok(Array.isArray(res.breakdown));
  assert.ok(Array.isArray(res.issues));
  assert.ok(Array.isArray(res.passed));
});

test('each breakdown category is present with score/max', () => {
  const res = runAtsChecks(FULL_RESUME);
  const categories = res.breakdown.map(b => b.category);
  for (const key of BREAKDOWN_KEYS) {
    assert.ok(categories.includes(key), `missing breakdown category: ${key}`);
  }
  for (const b of res.breakdown) {
    assert.equal(typeof b.score, 'number');
    assert.equal(typeof b.max, 'number');
    assert.ok(b.score >= 0 && b.score <= b.max, `${b.category} score out of range`);
  }
});

test('breakdown present even for empty resume', () => {
  const res = runAtsChecks({});
  const categories = res.breakdown.map(b => b.category);
  for (const key of BREAKDOWN_KEYS) {
    assert.ok(categories.includes(key), `missing breakdown category: ${key}`);
  }
});

test('score equals sum of breakdown scores', () => {
  const res = runAtsChecks(FULL_RESUME);
  const sum = res.breakdown.reduce((s, b) => s + b.score, 0);
  assert.equal(res.score, sum);
});

test('total max weighting is 100', () => {
  const res = runAtsChecks(FULL_RESUME);
  const totalMax = res.breakdown.reduce((s, b) => s + b.max, 0);
  assert.equal(totalMax, 100);
});

test('gradeFor thresholds', () => {
  assert.equal(gradeFor(85), 'Excellent');
  assert.equal(gradeFor(70), 'Good');
  assert.equal(gradeFor(50), 'Needs work');
  assert.equal(gradeFor(49), 'Poor');
  assert.equal(gradeFor(0), 'Poor');
});

test('quantified and action-verb cases produce passed entries', () => {
  const res = runAtsChecks(FULL_RESUME);
  assert.ok(res.passed.some(p => /measurable impact/.test(p)));
  assert.ok(res.passed.some(p => /action verbs/.test(p)));
});

// ── metric detection ────────────────────────────────────────────────────────

const cat = (res, name) => res.breakdown.find(b => b.category === name);

test('a bare year is not counted as a quantified achievement', () => {
  const res = runAtsChecks({
    experience: [{ start: '2019', end: '2020', bullets: ['Worked on the 2020 annual report'] }],
  });
  assert.equal(cat(res, 'Quantified impact').score, 0, 'year-only bullet should not count as a metric');
});

test('real metrics (%, scale, counts) are counted', () => {
  for (const bullet of ['Reduced costs by 30%', 'Served 2M users daily', 'Shipped 14 features', 'Saved $1.2M annually']) {
    const res = runAtsChecks({ experience: [{ bullets: [bullet] }] });
    assert.ok(cat(res, 'Quantified impact').score > 0, `expected metric in: ${bullet}`);
  }
});

// ── action verbs / weak openers / buzzwords ─────────────────────────────────

test('a leading adverb does not hide a strong verb', () => {
  const res = runAtsChecks({ experience: [{ bullets: ['Successfully led a team of 6 engineers'] }] });
  assert.ok(cat(res, 'Action verbs').score > 0, 'strong verb after adverb should be detected');
});

test('weak openers are flagged', () => {
  const res = runAtsChecks({ experience: [{ bullets: ['Responsible for maintaining the build system'] }] });
  assert.ok(res.issues.some(i => /weak phrasing/i.test(i.text)), 'expected a weak-phrasing issue');
});

test('buzzwords are flagged', () => {
  const res = runAtsChecks({
    summary: 'A hard-working team player and self-starter who is detail-oriented',
    experience: [{ bullets: ['Built a thing that worked'] }],
  });
  assert.ok(res.issues.some(i => /team player/.test(i.text)), 'expected buzzwords surfaced in an issue');
});

// ── job-description keyword matching ────────────────────────────────────────

const JD = `We are hiring a Senior Software Engineer. You will build microservices in
Node.js, deploy on AWS with Docker and Kubernetes, and design GraphQL APIs backed
by Postgres. Strong React and TypeScript skills required. Experience with Rust and
Kafka is a big plus.`;

test('extractJdKeywords surfaces recognized hard skills', () => {
  const { skills, all } = extractJdKeywords(JD);
  for (const s of ['react', 'typescript', 'aws', 'docker', 'kubernetes', 'graphql', 'rust', 'kafka']) {
    assert.ok(all.includes(s), `expected JD keyword: ${s} (got ${all.join(', ')})`);
  }
  assert.ok(skills.length > 0);
});

test('matchKeywords distinguishes present vs missing skills', () => {
  const m = matchKeywords(FULL_RESUME, JD);
  assert.ok(m, 'expected a match result');
  assert.ok(m.percent >= 0 && m.percent <= 100);
  // FULL_RESUME has React/TypeScript/AWS/Docker/Kubernetes/GraphQL/Postgres…
  assert.ok(m.matchedSkills.includes('react'), 'react should match');
  assert.ok(m.matchedSkills.includes('typescript'), 'typescript should match');
  // …but not Rust or Kafka.
  assert.ok(m.missingSkills.includes('rust'), 'rust should be missing');
  assert.ok(m.missingSkills.includes('kafka'), 'kafka should be missing');
  assert.equal(m.matched.length + m.missing.length, m.matchedSkills.length + m.missingSkills.length + m.matchedTerms.length + m.missingTerms.length);
});

test('matchKeywords returns null for an empty job description', () => {
  assert.equal(matchKeywords(FULL_RESUME, ''), null);
  assert.equal(matchKeywords(FULL_RESUME, '   '), null);
});

// ── JD-aware scoring mode ───────────────────────────────────────────────────

test('JD mode adds a Keyword match category and still totals 100', () => {
  const res = runAtsChecks(FULL_RESUME, { jobDescription: JD });
  const categories = res.breakdown.map(b => b.category);
  assert.ok(categories.includes('Keyword match'), 'expected a Keyword match category');
  assert.equal(res.breakdown.reduce((s, b) => s + b.max, 0), 100, 'weights must still total 100 with a JD');
  assert.equal(res.score, res.breakdown.reduce((s, b) => s + b.score, 0));
});

test('JD mode attaches a keywords report', () => {
  const res = runAtsChecks(FULL_RESUME, { jobDescription: JD });
  assert.ok(res.keywords, 'expected keywords on the result');
  assert.ok(Array.isArray(res.keywords.missing));
  assert.ok(typeof res.keywords.percent === 'number');
});

test('no-JD mode does not attach a keywords report', () => {
  const res = runAtsChecks(FULL_RESUME);
  assert.equal(res.keywords, undefined);
  assert.ok(!res.breakdown.some(b => b.category === 'Keyword match'));
});

test('missing JD skills surface as an issue', () => {
  const res = runAtsChecks(FULL_RESUME, { jobDescription: JD });
  assert.ok(res.issues.some(i => /job description/i.test(i.text)), 'expected a missing-keyword issue');
});
