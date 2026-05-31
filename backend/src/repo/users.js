// User data-access. SQLite via better-sqlite3 is synchronous, so these are plain
// synchronous functions (no await needed).

import { eq, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { uid, now } from './util.js';

export function countUsers() {
  const row = db.select({ n: sql`count(*)` }).from(users).get();
  return Number(row?.n || 0);
}

export function getById(id) {
  if (!id) return null;
  return db.select().from(users).where(eq(users.id, id)).get() || null;
}

// Login accepts either username or email (case-insensitive on email).
export function getByLogin(login) {
  const l = String(login || '').trim();
  if (!l) return null;
  return (
    db
      .select()
      .from(users)
      .where(or(eq(users.username, l), eq(users.email, l.toLowerCase())))
      .get() || null
  );
}

export function getDefault() {
  return db.select().from(users).where(eq(users.isDefault, true)).get() || null;
}

export function existsByUsername(username) {
  return !!db.select({ id: users.id }).from(users).where(eq(users.username, String(username))).get();
}

export function existsByEmail(email) {
  return !!db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, String(email).toLowerCase()))
    .get();
}

export function create({ username, email, passwordHash, isDefault = false }) {
  const ts = now();
  const row = {
    id: uid(),
    username: String(username).trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash,
    isDefault,
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(users).values(row).run();
  return row;
}

// Public-safe projection (never expose passwordHash).
export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, email: u.email, isDefault: !!u.isDefault };
}
