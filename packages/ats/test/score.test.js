import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAtsChecks, gradeFor } from '../src/index.js';

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
