// Application-tracker (kanban) data-access, scoped per user. Status columns are
// now user-defined (see repo/boardColumns.js): cards bucket into whatever
// columns the user has, sorted by position, with drag-move renumbering, bulk
// ops, and cascade cleanup when a resume is deleted.

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { applications } from '../db/schema.js';
import * as board from './boardColumns.js';
import { uid, now } from './util.js';

export function all(userId) {
  return db.select().from(applications).where(eq(applications.userId, userId)).all();
}

// Cards grouped into the user's columns (by id), each sorted by position. Any
// card whose status no longer matches a column is folded into the first column
// (boardColumns.ensureForUser already recreates orphan columns, so this only
// catches a transient mismatch).
export function columns(userId) {
  const cols = board.list(userId);
  const firstId = cols[0]?.id || 'wishlist';
  const known = new Set(cols.map((c) => c.id));
  const byStatus = Object.fromEntries(cols.map((c) => [c.id, []]));
  for (const card of all(userId)) {
    const status = known.has(card.status) ? card.status : firstId;
    byStatus[status].push(card);
  }
  for (const id of Object.keys(byStatus)) {
    byStatus[id].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return byStatus;
}

// Full board snapshot for the client: ordered column metadata + grouped cards.
export function board_(userId) {
  return { columns: board.list(userId), cards: columns(userId) };
}

export function create(userId, init = {}) {
  const status = board.validIdOrFirst(userId, init.status);
  const siblings = all(userId).filter((c) => c.status === status);
  const ts = now();
  const card = {
    id: uid(),
    userId,
    resumeId: init.resumeId || null,
    parentId: init.parentId || null,
    company: init.company || '',
    role: init.role || '',
    status,
    position: siblings.length,
    notes: init.notes || '',
    appliedAt: init.appliedAt || null,
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(applications).values(card).run();
  return card;
}

const PATCHABLE = ['resumeId', 'parentId', 'company', 'role', 'status', 'position', 'notes', 'appliedAt'];

export function update(userId, id, patch = {}) {
  const cur = db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).get();
  if (!cur) return null;
  const set = { updatedAt: now() };
  for (const k of PATCHABLE) if (patch[k] !== undefined) set[k] = patch[k];
  if (set.status !== undefined) set.status = board.validIdOrFirst(userId, set.status);
  db.update(applications).set(set).where(and(eq(applications.userId, userId), eq(applications.id, id))).run();
  return db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).get();
}

// Move a card to a status at a target index, renumbering that column.
export function move(userId, id, status, position) {
  const rows = all(userId);
  const card = rows.find((c) => c.id === id);
  if (!card) return null;
  status = board.validIdOrFirst(userId, status);
  card.status = status;
  const column = rows
    .filter((c) => c.status === status && c.id !== id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const at = Math.max(0, Math.min(position ?? column.length, column.length));
  column.splice(at, 0, card);
  const ts = now();
  column.forEach((c, i) => {
    db.update(applications)
      .set({ status: c.id === id ? status : c.status, position: i, updatedAt: ts })
      .where(and(eq(applications.userId, userId), eq(applications.id, c.id)))
      .run();
  });
  return db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).get();
}

export function remove(userId, id) {
  db.delete(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).run();
}

export function bulkUpdate(userId, ids, patch = {}) {
  if (!ids?.length) return;
  const set = { updatedAt: now() };
  for (const k of PATCHABLE) if (patch[k] !== undefined) set[k] = patch[k];
  if (set.status !== undefined) set.status = board.validIdOrFirst(userId, set.status);
  db.update(applications).set(set).where(and(eq(applications.userId, userId), inArray(applications.id, ids))).run();
}

export function bulkDelete(userId, ids) {
  if (!ids?.length) return;
  db.delete(applications).where(and(eq(applications.userId, userId), inArray(applications.id, ids))).run();
}

// Remove cards whose resume was deleted.
export function dropByResume(userId, resumeIds) {
  if (!resumeIds?.length) return;
  db.delete(applications).where(and(eq(applications.userId, userId), inArray(applications.resumeId, resumeIds))).run();
}
