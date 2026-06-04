import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJson } from '../src/parse.js';

test('parses raw JSON', () => {
  const out = parseModelJson('{"name":"Ada","score":98}');
  assert.deepEqual(out, { name: 'Ada', score: 98 });
});

test('parses raw JSON with surrounding whitespace', () => {
  const out = parseModelJson('\n\n  { "a": 1 }  \n');
  assert.deepEqual(out, { a: 1 });
});

test('parses fenced ```json block', () => {
  const text = '```json\n{ "verdict": "good", "topFixes": ["x", "y"] }\n```';
  const out = parseModelJson(text);
  assert.deepEqual(out, { verdict: 'good', topFixes: ['x', 'y'] });
});

test('parses fenced block without json language tag', () => {
  const text = '```\n{ "ok": true }\n```';
  const out = parseModelJson(text);
  assert.deepEqual(out, { ok: true });
});

test('parses JSON embedded in surrounding prose', () => {
  const text = 'Sure! Here is your result:\n{ "score": 42, "missing": ["k8s"] }\nHope that helps.';
  const out = parseModelJson(text);
  assert.deepEqual(out, { score: 42, missing: ['k8s'] });
});

test('returns null for empty input', () => {
  assert.equal(parseModelJson(''), null);
  assert.equal(parseModelJson(null), null);
  assert.equal(parseModelJson(undefined), null);
});

test('returns null when no JSON object is present', () => {
  assert.equal(parseModelJson('no json here at all'), null);
});
