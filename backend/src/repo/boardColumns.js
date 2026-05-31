// Board columns (kanban stages) data-access, scoped per user. Columns are fully
// user-defined: add, rename, recolour, reorder, delete. They are seeded lazily
// the first time a user touches the board (ensureForUser), so we never need a
// boot-time backfill across every account.
//
// `applications.status` stores a column `id`. There is no FK — when a column is
// deleted we reassign its cards in app logic (see routes/board.js + applications
// repo). ensureForUser also reconciles any orphan status (a card pointing at a
// column that no longer exists) by recreating a column for it, so cards can
// never silently disappear.

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { boardColumns, applications } from '../db/schema.js';
import { uid, now } from './util.js';

// Seeded once per user. The first column keeps the legacy id 'wishlist' (so
// older cards and the tailor auto-seed still resolve) while reading "Saved".
export const DEFAULT_COLUMNS = [
  { id: 'wishlist', label: 'Saved', color: '#94a3b8' },
  { id: 'applied', label: 'Applied', color: '#2563eb' },
  { id: 'interview', label: 'Interview', color: '#7c3aed' },
  { id: 'offer', label: 'Offer', color: '#0ea5e9' },
  { id: 'accepted', label: 'Accepted', color: '#16a34a' },
  { id: 'rejected', label: 'Rejected', color: '#e11d48' },
  { id: 'ghosted', label: 'Ghosted', color: '#a16207' },
];

const FALLBACK_COLOR = '#94a3b8';

// Humanise an orphan status id into a column label, e.g. 'on_site' → 'On Site'.
function labelFromId(id) {
  const s = String(id || '').replace(/[_-]+/g, ' ').trim();
  if (!s) return 'Untitled';
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function rawList(userId) {
  return db
    .select()
    .from(boardColumns)
    .where(eq(boardColumns.userId, userId))
    .all()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

// Ensure a user has columns: seed the defaults on first touch, then reconcile so
// every status referenced by an existing card has a backing column. Returns the
// ordered column list.
export function ensureForUser(userId) {
  let cols = rawList(userId);
  const ts = now();

  if (cols.length === 0) {
    const rows = DEFAULT_COLUMNS.map((c, i) => ({
      id: c.id,
      userId,
      label: c.label,
      color: c.color,
      position: i,
      createdAt: ts,
      updatedAt: ts,
    }));
    db.insert(boardColumns).values(rows).run();
    cols = rawList(userId);
  }

  // Reconcile orphan statuses → recreate a column so no card is stranded.
  const known = new Set(cols.map((c) => c.id));
  const statuses = db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.userId, userId))
    .all();
  const orphans = [...new Set(statuses.map((s) => s.status))].filter(
    (s) => s && !known.has(s),
  );
  if (orphans.length > 0) {
    let pos = cols.length;
    const rows = orphans.map((id) => ({
      id,
      userId,
      label: labelFromId(id),
      color: FALLBACK_COLOR,
      position: pos++,
      createdAt: ts,
      updatedAt: ts,
    }));
    db.insert(boardColumns).values(rows).run();
    cols = rawList(userId);
  }

  return cols;
}

export function list(userId) {
  return ensureForUser(userId);
}

// First column id — the safe place to land a card with an unknown status.
export function firstId(userId) {
  return ensureForUser(userId)[0]?.id || 'wishlist';
}

export function exists(userId, id) {
  return ensureForUser(userId).some((c) => c.id === id);
}

export function create(userId, init = {}) {
  const cols = ensureForUser(userId);
  const ts = now();
  const col = {
    id: uid(),
    userId,
    label: String(init.label || '').trim() || 'New column',
    color: String(init.color || '').trim() || FALLBACK_COLOR,
    position: cols.length,
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(boardColumns).values(col).run();
  return col;
}

export function update(userId, id, patch = {}) {
  const cur = db
    .select()
    .from(boardColumns)
    .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, id)))
    .get();
  if (!cur) return null;
  const set = { updatedAt: now() };
  if (patch.label !== undefined) set.label = String(patch.label).trim() || cur.label;
  if (patch.color !== undefined) set.color = String(patch.color).trim() || cur.color;
  db.update(boardColumns)
    .set(set)
    .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, id)))
    .run();
  return db
    .select()
    .from(boardColumns)
    .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, id)))
    .get();
}

// Delete a column. Its cards are reassigned to `reassignTo` (or the first
// remaining column) and appended after that column's existing cards. Refuses to
// delete the last remaining column — a board always keeps at least one stage.
// Returns { ok, reassignedTo } or { ok: false, reason }.
export function remove(userId, id, reassignTo = null) {
  const cols = ensureForUser(userId);
  if (!cols.some((c) => c.id === id)) return { ok: false, reason: 'not_found' };
  if (cols.length <= 1) return { ok: false, reason: 'last_column' };

  const target =
    (reassignTo && cols.find((c) => c.id === reassignTo && c.id !== id)?.id) ||
    cols.find((c) => c.id !== id)?.id;

  const ts = now();
  // Re-home the column's cards onto the end of the target column.
  const moving = db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.status, id)))
    .all();
  if (moving.length > 0) {
    const tail = db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.status, target)))
      .all().length;
    moving
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach((card, i) => {
        db.update(applications)
          .set({ status: target, position: tail + i, updatedAt: ts })
          .where(and(eq(applications.userId, userId), eq(applications.id, card.id)))
          .run();
      });
  }

  db.delete(boardColumns)
    .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, id)))
    .run();

  // Renumber remaining columns to 0..n-1.
  rawList(userId).forEach((c, i) => {
    if (c.position !== i) {
      db.update(boardColumns)
        .set({ position: i, updatedAt: ts })
        .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, c.id)))
        .run();
    }
  });

  return { ok: true, reassignedTo: target };
}

// Set column order to match `orderedIds`. Ids not present are appended in their
// current relative order, so a partial/stale list can't drop a column.
export function reorder(userId, orderedIds = []) {
  const cols = ensureForUser(userId);
  const byId = new Map(cols.map((c) => [c.id, c]));
  const seen = new Set();
  const ordered = [];
  for (const id of orderedIds) {
    if (byId.has(id) && !seen.has(id)) {
      ordered.push(byId.get(id));
      seen.add(id);
    }
  }
  for (const c of cols) if (!seen.has(c.id)) ordered.push(c);

  const ts = now();
  ordered.forEach((c, i) => {
    if (c.position !== i) {
      db.update(boardColumns)
        .set({ position: i, updatedAt: ts })
        .where(and(eq(boardColumns.userId, userId), eq(boardColumns.id, c.id)))
        .run();
    }
  });
  return rawList(userId);
}

// Used by the applications repo when validating a card's target status.
export function validIdOrFirst(userId, id) {
  const cols = ensureForUser(userId);
  return cols.some((c) => c.id === id) ? id : cols[0]?.id || 'wishlist';
}
