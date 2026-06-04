// Shared resume helpers: diffing for suggestions, splitting into cards,
// applying/undoing card patches, and detecting whether a resume has content.
//
// mergeResume lives in schema.js (the reconciled implementation) and is
// re-exported from the package index.

import { emptyResume } from './schema.js';

// True if the resume holds anything worth previewing/saving.
export function hasContent(r) {
  if (!r) return false;
  if (r.name?.trim()) return true;
  if (r.headline?.trim()) return true;
  if (r.summary?.trim()) return true;
  if (r.contact && Object.values(r.contact).some(v => (v || '').trim())) return true;
  return ['experience', 'education', 'projects', 'skills', 'certifications', 'awards']
    .some(k => Array.isArray(r[k]) && r[k].length > 0);
}

const SECTION_LABELS = {
  name: 'Name',
  headline: 'Headline',
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
};

// Friendly labels for the sub-fields inside an array item.
const FIELD_LABELS = {
  title: 'Title', company: 'Company', school: 'School', degree: 'Degree',
  location: 'Location', start: 'Start date', end: 'End date', gpa: 'GPA',
  name: 'Name', description: 'Description', link: 'Link',
  issuer: 'Issuer', date: 'Date', category: 'Category',
  bullets: 'Bullet', details: 'Detail', items: 'Skill', tech: 'Tech',
};

export const ARRAY_KEYS = ['experience', 'education', 'projects', 'skills', 'certifications', 'awards'];

const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// A stable label identifying an array item (so we can match old↔new across a patch).
export function itemName(key, item, idx) {
  if (!item || typeof item !== 'object') return `#${idx}`;
  const n =
    key === 'experience' ? (item.company || item.title)
    : key === 'education' ? (item.school || item.degree)
    : key === 'projects' ? item.name
    : key === 'skills' ? item.category
    : (item.name);
  return (n && String(n).trim()) || `#${idx}`;
}

// One-line summary of a whole item, for added/removed-item edits.
function briefItem(key, item) {
  if (!item || typeof item !== 'object') return '';
  switch (key) {
    case 'experience': return [item.title, item.company].filter(Boolean).join(' · ');
    case 'education': return [item.degree, item.school].filter(Boolean).join(' · ');
    case 'projects': return [item.name, item.description].filter(Boolean).join(' — ');
    case 'skills': return `${item.category || 'Skills'}: ${(item.items || []).join(', ')}`;
    case 'certifications':
    case 'awards': return [item.name, item.issuer].filter(Boolean).join(' — ');
    default: return item.name || '';
  }
}

// Diff two arrays of strings (bullets, tech, skill items…). Pairs an equal number
// of removed/added entries as in-place "revise" edits (the common rephrase case),
// and reports any leftovers as pure add/remove.
function diffStringArray(oldArr, newArr, field) {
  const removed = oldArr.filter(x => !newArr.includes(x));
  const added = newArr.filter(x => !oldArr.includes(x));
  const edits = [];
  const pairs = Math.min(removed.length, added.length);
  for (let i = 0; i < pairs; i++) edits.push({ kind: 'revise', field, before: removed[i], after: added[i] });
  for (let i = pairs; i < added.length; i++) edits.push({ kind: 'add', field, after: added[i] });
  for (let i = pairs; i < removed.length; i++) edits.push({ kind: 'remove', field, before: removed[i] });
  return edits;
}

// Diff the scalar/array fields inside a single matched array item.
function diffItem(oldItem = {}, newItem = {}) {
  const edits = [];
  const fields = new Set([...Object.keys(oldItem), ...Object.keys(newItem)]);
  for (const f of fields) {
    const ov = oldItem[f];
    const nv = newItem[f];
    const label = FIELD_LABELS[f] || cap(f);
    if (Array.isArray(ov) || Array.isArray(nv)) {
      for (const e of diffStringArray(Array.isArray(ov) ? ov : [], Array.isArray(nv) ? nv : [], label)) {
        edits.push(e);
      }
    } else if (typeof ov === 'string' || typeof nv === 'string') {
      const a = (ov || '').trim();
      const b = (nv || '').trim();
      if (a === b) continue;
      if (a && b) edits.push({ kind: 'revise', field: label, before: a, after: b });
      else if (!a && b) edits.push({ kind: 'add', field: label, after: b });
      else if (a && !b) edits.push({ kind: 'remove', field: label, before: a });
    }
  }
  return edits;
}

// Diff an array section (experience, projects…): match items by name, drill into
// each changed item, and flag whole items added/removed.
function diffArraySection(key, oldArr, newArr) {
  const edits = [];
  const oldByName = new Map();
  oldArr.forEach((it, i) => oldByName.set(itemName(key, it, i), it));
  const newNames = new Set(newArr.map((it, i) => itemName(key, it, i)));

  newArr.forEach((it, i) => {
    const name = itemName(key, it, i);
    if (oldByName.has(name)) {
      for (const e of diffItem(oldByName.get(name), it)) edits.push({ ...e, where: name });
    } else {
      // Brand-new item: tag it with its own name so it gets its own card and
      // applyCardPatch can find/append it (previously these were bucketed under
      // "General" and silently failed to insert).
      edits.push({ kind: 'add', where: name, after: briefItem(key, it) });
    }
  });

  oldArr.forEach((it, i) => {
    const name = itemName(key, it, i);
    if (!newNames.has(name)) edits.push({ kind: 'remove', where: name, before: briefItem(key, it) });
  });

  return edits;
}

// Produce a granular, human-readable list of changes between two resumes.
// Returns: [{ key, label, kind, edits:[{ kind:'add'|'remove'|'revise', where?, field?, before?, after? }] }]
export function diffResume(current, proposed) {
  const cur = current || {};
  const next = proposed || {};
  const changes = [];

  const pushChange = (key, edits) => {
    if (!edits.length) return;
    const kind = edits.every(e => e.kind === 'add') ? 'add'
      : edits.every(e => e.kind === 'remove') ? 'remove'
      : 'revise';
    changes.push({ key, label: SECTION_LABELS[key], kind, edits });
  };

  // Scalar text fields.
  for (const key of ['name', 'headline', 'summary']) {
    const a = (cur[key] || '').trim();
    const b = (next[key] || '').trim();
    if (a === b) continue;
    if (a && b) pushChange(key, [{ kind: 'revise', before: a, after: b }]);
    else if (!a && b) pushChange(key, [{ kind: 'add', after: b }]);
    // ignore proposals that only clear a scalar
  }

  // Contact sub-fields.
  if (next.contact && typeof next.contact === 'object') {
    const edits = [];
    for (const f of ['email', 'phone', 'location', 'website', 'linkedin', 'github']) {
      const a = (cur.contact?.[f] || '').trim();
      const b = (next.contact[f] || '').trim();
      if (a === b) continue;
      if (a && b) edits.push({ kind: 'revise', field: cap(f), before: a, after: b });
      else if (!a && b) edits.push({ kind: 'add', field: cap(f), after: b });
    }
    pushChange('contact', edits);
  }

  // Array sections.
  for (const key of ARRAY_KEYS) {
    const a = Array.isArray(cur[key]) ? cur[key] : [];
    const b = Array.isArray(next[key]) ? next[key] : [];
    if (eq(a, b)) continue;
    if (b.length === 0 && a.length > 0) continue; // ignore wholesale clear (model likely just omitted it)
    pushChange(key, diffArraySection(key, a, b));
  }

  return changes;
}

// Split a unified list of changes and proposed patch into cards by section/item
export function splitChangesIntoCards(changes, patch, resume) {
  if (!changes || !changes.length || !patch) return [];
  const cards = [];

  for (const section of changes) {
    const { key, label, edits } = section;

    if (key === 'name' || key === 'headline' || key === 'summary' || key === 'contact') {
      // Group profile details (scalars and contact info) together
      let profileCard = cards.find(c => c.id === 'profile');
      if (!profileCard) {
        profileCard = {
          id: 'profile',
          label: 'Profile Details',
          changes: [],
          patch: {}
        };
        cards.push(profileCard);
      }

      let secChange = profileCard.changes.find(sc => sc.key === key);
      if (!secChange) {
        secChange = { key, label, edits: [] };
        profileCard.changes.push(secChange);
      }
      secChange.edits.push(...edits);

      if (key === 'contact') {
        profileCard.patch.contact = { ...(profileCard.patch.contact || {}), ...patch.contact };
      } else {
        profileCard.patch[key] = patch[key];
      }
    } else if (ARRAY_KEYS.includes(key)) {
      // For arrays, separate edits into different cards by item (e.g. per project / experience company)
      const editsByWhere = {};
      for (const edit of edits) {
        const where = edit.where || 'General';
        if (!editsByWhere[where]) editsByWhere[where] = [];
        editsByWhere[where].push(edit);
      }

      for (const [where, itemEdits] of Object.entries(editsByWhere)) {
        const cardId = `${key}:${where}`;
        const cardLabel = `${label} · ${where}`;

        let card = cards.find(c => c.id === cardId);
        if (!card) {
          card = {
            id: cardId,
            label: cardLabel,
            changes: [],
            patch: { [key]: patch[key] }
          };
          cards.push(card);
        }

        let secChange = card.changes.find(sc => sc.key === key);
        if (!secChange) {
          secChange = { key, label, edits: [] };
          card.changes.push(secChange);
        }
        secChange.edits.push(...itemEdits);
      }
    }
  }

  return cards;
}

// Apply a single card's patch to the resume.
export function applyCardPatch(resume, cardId, patch) {
  if (!patch || !cardId) return resume;
  const next = { ...resume };

  if (cardId === 'profile') {
    for (const key of ['name', 'headline', 'summary']) {
      if (patch[key] !== undefined) next[key] = patch[key];
    }
    if (patch.contact) {
      next.contact = { ...(next.contact || {}), ...patch.contact };
    }
    return next;
  }

  // Split on the FIRST ":" only — an item name can itself contain a colon.
  const sep = cardId.indexOf(':');
  if (sep === -1) return resume;
  const sectionKey = cardId.slice(0, sep);
  const itemWhere = cardId.slice(sep + 1);
  if (!sectionKey || !itemWhere) return resume;

  const currentArray = Array.isArray(resume[sectionKey]) ? resume[sectionKey] : [];
  const proposedArray = Array.isArray(patch[sectionKey]) ? patch[sectionKey] : [];

  const updatedArray = [...currentArray];
  const proposedItem = proposedArray.find((it, idx) => itemName(sectionKey, it, idx) === itemWhere);

  if (proposedItem) {
    // Replace the matching item in place, or append it if it's new.
    const curIdx = currentArray.findIndex((it, idx) => itemName(sectionKey, it, idx) === itemWhere);
    if (curIdx !== -1) updatedArray[curIdx] = proposedItem;
    else updatedArray.push(proposedItem);
  } else {
    // The item isn't in the proposal → this card represents a removal.
    const filtered = updatedArray.filter((it, idx) => itemName(sectionKey, it, idx) !== itemWhere);
    if (filtered.length === updatedArray.length) return resume; // nothing matched — no-op
    next[sectionKey] = filtered;
    return next;
  }

  next[sectionKey] = updatedArray;
  return next;
}

// Capture the minimal prior state needed to reverse applyCardPatch for one card.
export function invertCardPatch(resume, cardId, patch) {
  if (!cardId) return null;
  if (cardId === 'profile') {
    return {
      kind: 'profile',
      name: resume?.name,
      headline: resume?.headline,
      summary: resume?.summary,
      contact: { ...(resume?.contact || {}) },
    };
  }
  const sep = cardId.indexOf(':');
  if (sep === -1) return null;
  const sectionKey = cardId.slice(0, sep);
  const itemWhere = cardId.slice(sep + 1);
  const currentArray = Array.isArray(resume?.[sectionKey]) ? resume[sectionKey] : [];
  const idx = currentArray.findIndex((it, i) => itemName(sectionKey, it, i) === itemWhere);
  return {
    kind: 'array',
    sectionKey,
    itemWhere,
    prevItem: idx !== -1 ? currentArray[idx] : null, // null → the card added a brand-new item
  };
}

// Reverse a previously-applied card using the snapshot from invertCardPatch.
export function undoCardPatch(resume, undo) {
  if (!undo) return resume;
  const next = { ...resume };

  if (undo.kind === 'profile') {
    next.name = undo.name;
    next.headline = undo.headline;
    next.summary = undo.summary;
    next.contact = { ...(undo.contact || {}) };
    return next;
  }

  if (undo.kind === 'array') {
    const { sectionKey, itemWhere, prevItem } = undo;
    const currentArray = Array.isArray(resume?.[sectionKey]) ? resume[sectionKey] : [];
    const idx = currentArray.findIndex((it, i) => itemName(sectionKey, it, i) === itemWhere);
    const arr = [...currentArray];
    if (prevItem == null) {
      // The card had added a new item → take it back out.
      if (idx !== -1) arr.splice(idx, 1);
    } else if (idx !== -1) {
      arr[idx] = prevItem;   // restore the prior version of an edited item
    } else {
      arr.push(prevItem);    // the card had removed it → put it back
    }
    next[sectionKey] = arr;
    return next;
  }

  return next;
}
