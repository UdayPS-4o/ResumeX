// Resume data-access — masters + tailored variants, scoped per user. Mirrors the
// semantics of the old client-side resumeStore (normalize, cascade-delete
// variants, duplicate, spawn-variant) so the frontend behaves identically.

import { eq, and, desc } from 'drizzle-orm';
import { emptyResume } from '@resumex/core';
import { db } from '../db/index.js';
import { resumes } from '../db/schema.js';
import { dropByResume } from './applications.js';
import { uid, now } from './util.js';

// Backfill/derive fields the same way the old client normalize() did.
function normalize(e) {
  if (!e) return null;
  const parentId = e.parentId ?? null;
  return {
    id: e.id,
    title: e.title,
    templateId: e.templateId,
    pageSize: e.pageSize || 'a4',
    trim: e.trim ?? true,
    kind: parentId ? 'tailored' : e.kind || 'master',
    parentId,
    resume: e.resume,
    messages: e.messages || [],
    job: e.job ?? null,
    matchScore: e.matchScore ?? null,
    documents: e.documents || {},
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function list(userId) {
  return db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt))
    .all()
    .map(normalize);
}

export function get(userId, id) {
  const e = db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.id, id))).get();
  return normalize(e);
}

export function create(userId, templateId, init = {}) {
  const ts = now();
  const parentId = init.parentId ?? null;
  const row = {
    id: uid(),
    userId,
    title: init.title || 'Untitled Resume',
    templateId,
    pageSize: init.pageSize || 'a4',
    trim: init.trim ?? true,
    kind: parentId ? 'tailored' : 'master',
    parentId,
    resume: init.resume || emptyResume(),
    messages: init.messages || [],
    job: init.job ?? null,
    matchScore: init.matchScore ?? null,
    documents: init.documents || {},
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(resumes).values(row).run();
  return normalize(row);
}

// Spawn a tailored variant from a master: deep-copies content + template, then
// layers the job + any tailored resume passed in.
export function createVariant(userId, parentId, init = {}) {
  const master = get(userId, parentId);
  if (!master) return null;
  const job = init.job || null;
  const title =
    init.title ||
    (job?.role && job?.company
      ? `${job.role} · ${job.company}`
      : job?.role || job?.company || `${master.title} (tailored)`);
  return create(userId, master.templateId, {
    title,
    parentId,
    pageSize: master.pageSize,
    trim: master.trim,
    resume: init.resume || JSON.parse(JSON.stringify(master.resume)),
    messages: init.messages || [],
    job,
    matchScore: init.matchScore ?? null,
    documents: init.documents || {},
  });
}

const PATCHABLE = ['title', 'templateId', 'pageSize', 'trim', 'resume', 'messages', 'job', 'matchScore', 'documents'];

export function update(userId, id, patch = {}) {
  const cur = get(userId, id);
  if (!cur) return null;
  const set = { updatedAt: now() };
  for (const k of PATCHABLE) {
    if (patch[k] !== undefined) set[k] = patch[k];
  }
  db.update(resumes).set(set).where(and(eq(resumes.userId, userId), eq(resumes.id, id))).run();
  return get(userId, id);
}

export function setDocuments(userId, id, docs) {
  const cur = get(userId, id);
  if (!cur) return null;
  return update(userId, id, { documents: { ...(cur.documents || {}), ...docs } });
}

// Delete an entry. Deleting a master also removes its tailored variants and any
// tracker cards that referenced the removed resumes.
export function remove(userId, id) {
  const all = db.select().from(resumes).where(eq(resumes.userId, userId)).all();
  const target = all.find((r) => r.id === id);
  if (!target) return;
  const removeIds = new Set([id]);
  if (!target.parentId) {
    for (const r of all) if (r.parentId === id) removeIds.add(r.id);
  }
  for (const rid of removeIds) {
    db.delete(resumes).where(and(eq(resumes.userId, userId), eq(resumes.id, rid))).run();
  }
  dropByResume(userId, [...removeIds]);
}

export function duplicate(userId, id) {
  const src = get(userId, id);
  if (!src) return null;
  return create(userId, src.templateId, {
    title: `${src.title} (copy)`,
    parentId: src.parentId,
    pageSize: src.pageSize,
    trim: src.trim,
    resume: JSON.parse(JSON.stringify(src.resume)),
    messages: [...src.messages],
    job: src.job ? { ...src.job } : null,
    documents: { ...(src.documents || {}) },
  });
}
