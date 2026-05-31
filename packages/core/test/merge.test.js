import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeResume, emptyResume } from '../src/index.js';

// (a) Merging a partial patch into a populated resume preserves untouched fields.
test('merges a partial patch into a populated resume, preserving existing fields', () => {
  const current = {
    ...emptyResume(),
    name: 'Ada Lovelace',
    headline: 'Engineer',
    summary: 'Original summary.',
    experience: [{ company: 'Analytical Engines', title: 'Lead' }],
  };
  const patch = { headline: 'Principal Engineer' };
  const merged = mergeResume(current, patch);

  assert.equal(merged.headline, 'Principal Engineer'); // patched
  assert.equal(merged.name, 'Ada Lovelace');           // preserved
  assert.equal(merged.summary, 'Original summary.');   // preserved
  assert.deepEqual(merged.experience, [{ company: 'Analytical Engines', title: 'Lead' }]); // preserved
});

// (b) Arrays are replaced wholesale, not merged element-by-element.
test('replaces array sections wholesale', () => {
  const current = {
    ...emptyResume(),
    experience: [
      { company: 'A', title: 'X' },
      { company: 'B', title: 'Y' },
    ],
  };
  const patch = { experience: [{ company: 'C', title: 'Z' }] };
  const merged = mergeResume(current, patch);

  assert.deepEqual(merged.experience, [{ company: 'C', title: 'Z' }]);
  assert.equal(merged.experience.length, 1);
});

// (c) contact and sectionTitles partials are shallow-merged, not replaced.
test('shallow-merges contact and sectionTitles partials', () => {
  const current = {
    ...emptyResume(),
    contact: { ...emptyResume().contact, email: 'a@x.com', phone: '111' },
    sectionTitles: { projects: 'Selected Work', skills: 'Toolbox' },
  };
  const patch = {
    contact: { phone: '222', github: 'gh' },
    sectionTitles: { projects: 'Featured Projects' },
  };
  const merged = mergeResume(current, patch);

  // contact: email preserved, phone overwritten, github added
  assert.equal(merged.contact.email, 'a@x.com');
  assert.equal(merged.contact.phone, '222');
  assert.equal(merged.contact.github, 'gh');

  // sectionTitles: projects overwritten, skills preserved (NOT wiped)
  assert.equal(merged.sectionTitles.projects, 'Featured Projects');
  assert.equal(merged.sectionTitles.skills, 'Toolbox');
});

// Null/undefined patch values are skipped; a non-object update returns current unchanged.
test('skips null/undefined patch values and ignores non-object updates', () => {
  const current = { ...emptyResume(), name: 'Keep Me' };

  const merged = mergeResume(current, { name: null, headline: undefined, summary: 'Set' });
  assert.equal(merged.name, 'Keep Me'); // null skipped
  assert.equal(merged.summary, 'Set');

  assert.equal(mergeResume(current, null), current);
  assert.equal(mergeResume(current, 'nope'), current);
});

// Merging onto an empty/undefined current fills in the canonical empty shape.
test('fills the canonical empty shape when current is undefined', () => {
  const merged = mergeResume(undefined, { name: 'New' });
  assert.equal(merged.name, 'New');
  assert.deepEqual(merged.experience, []);
  assert.deepEqual(merged.contact, emptyResume().contact);
  assert.deepEqual(merged.sectionTitles, {});
});
