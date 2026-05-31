import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyResume,
  diffResume,
  splitChangesIntoCards,
  applyCardPatch,
  invertCardPatch,
  undoCardPatch,
  hasContent,
  itemName,
  ARRAY_KEYS,
} from '../src/index.js';

// Apply every card produced from a diff, then undo each in reverse, and assert
// we land back exactly where we started.
test('diff → cards → apply → undo round-trips to the original resume', () => {
  const current = {
    ...emptyResume(),
    name: 'Ada Lovelace',
    headline: 'Engineer',
    summary: 'Old summary.',
    contact: { ...emptyResume().contact, email: 'old@x.com' },
    experience: [
      { company: 'Analytical Engines', title: 'Lead', bullets: ['Did things'] },
      { company: 'OldCo', title: 'Junior', bullets: ['Left this place'] },
    ],
    projects: [{ name: 'Notes', description: 'A thing' }],
  };

  const proposed = {
    ...current,
    headline: 'Principal Engineer',
    summary: 'Brand new summary.',
    contact: { ...current.contact, email: 'new@x.com', github: 'ada' },
    experience: [
      // edited existing item (revise a bullet)
      { company: 'Analytical Engines', title: 'Lead', bullets: ['Did great things'] },
      // OldCo removed
      // brand new item added
      { company: 'NewCo', title: 'Architect', bullets: ['Designed it all'] },
    ],
    projects: [{ name: 'Notes', description: 'A thing' }], // unchanged
  };

  const changes = diffResume(current, proposed);
  assert.ok(changes.length > 0, 'expected some changes');

  const cards = splitChangesIntoCards(changes, proposed, current);
  assert.ok(cards.length > 0, 'expected some cards');

  // Apply all cards in order, recording undo snapshots taken against the
  // pre-apply state of each card.
  let working = current;
  const undos = [];
  for (const card of cards) {
    const undo = invertCardPatch(working, card.id, card.patch);
    undos.push(undo);
    working = applyCardPatch(working, card.id, card.patch);
  }

  // Sanity: applying cards reproduces the proposed changes.
  assert.equal(working.headline, 'Principal Engineer');
  assert.equal(working.summary, 'Brand new summary.');
  assert.equal(working.contact.email, 'new@x.com');
  assert.equal(working.contact.github, 'ada');
  assert.ok(working.experience.some(e => e.company === 'NewCo'));
  assert.ok(!working.experience.some(e => e.company === 'OldCo'));
  assert.deepEqual(
    working.experience.find(e => e.company === 'Analytical Engines').bullets,
    ['Did great things'],
  );

  // Undo in reverse order → back to the exact original.
  for (let i = undos.length - 1; i >= 0; i--) {
    working = undoCardPatch(working, undos[i]);
  }

  assert.deepEqual(working, current);
});

test('hasContent detects populated vs empty resumes', () => {
  assert.equal(hasContent(emptyResume()), false);
  assert.equal(hasContent(null), false);
  assert.equal(hasContent({ ...emptyResume(), name: '  ' }), false);
  assert.equal(hasContent({ ...emptyResume(), name: 'Ada' }), true);
  assert.equal(hasContent({ ...emptyResume(), contact: { ...emptyResume().contact, email: 'a@x.com' } }), true);
  assert.equal(hasContent({ ...emptyResume(), experience: [{ company: 'A' }] }), true);
});

test('itemName picks the stable label per section, falling back to index', () => {
  assert.equal(itemName('experience', { company: 'Acme', title: 'Eng' }, 0), 'Acme');
  assert.equal(itemName('experience', { title: 'Eng' }, 0), 'Eng');
  assert.equal(itemName('education', { school: 'MIT' }, 0), 'MIT');
  assert.equal(itemName('projects', { name: 'Notes' }, 0), 'Notes');
  assert.equal(itemName('skills', { category: 'Langs' }, 0), 'Langs');
  assert.equal(itemName('certifications', { name: 'AWS' }, 0), 'AWS');
  assert.equal(itemName('experience', {}, 3), '#3');
  assert.equal(itemName('experience', null, 2), '#2');
});

test('applyCardPatch appends a new array item whose name contains a colon', () => {
  const current = { ...emptyResume(), projects: [] };
  const itemWithColon = { name: 'Ratio: a study', description: 'x' };
  const patch = { projects: [itemWithColon] };
  const cardId = `projects:${itemName('projects', itemWithColon, 0)}`;
  const next = applyCardPatch(current, cardId, patch);
  assert.deepEqual(next.projects, [itemWithColon]);
});

test('ARRAY_KEYS lists the array sections', () => {
  assert.deepEqual(ARRAY_KEYS, ['experience', 'education', 'projects', 'skills', 'certifications', 'awards']);
});
