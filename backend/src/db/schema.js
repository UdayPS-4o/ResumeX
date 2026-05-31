// Drizzle schema — SQLite. This is the single source of truth for the server's
// persisted state. Everything that used to live in the browser's localStorage
// (settings, API keys, resumes, application-tracker cards) now lives here,
// scoped per user.
//
// JSON-shaped columns use `{ mode: 'json' }` so Drizzle (de)serializes them
// transparently. Timestamps are plain epoch-millisecond integers to stay
// byte-for-byte compatible with the old `Date.now()` values the frontend uses.

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // The auto-seeded account. Exactly one user is the default; it is the one
  // auto-logged-in while it is the *only* account in the database.
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// One settings row per user. API keys are deliberately NOT here — they live in
// `apiKeys`, encrypted, and are never serialized into this blob.
export const settings = sqliteTable('settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('gemini'),
  model: text('model').notNull().default(''),
  baseUrls: text('base_urls', { mode: 'json' }).notNull().default('{}'),
  reasoningEffort: text('reasoning_effort').notNull().default('auto'),
  features: text('features', { mode: 'json' }).notNull().default('{}'),
  tailorStrategy: text('tailor_strategy').notNull().default('keywords'),
  language: text('language').notNull().default('en'),
  updatedAt: integer('updated_at').notNull(),
});

// Encrypted provider API keys, one row per (user, provider). `ciphertext` is the
// AES-256-GCM payload produced by services/crypto.js (iv:tag:data, base64). The
// raw key never leaves the server.
export const apiKeys = sqliteTable(
  'api_keys',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    ciphertext: text('ciphertext').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.provider] }),
  }),
);

// Resumes — masters (parentId == null) and tailored variants (parentId set).
// Mirrors the old localStorage entry shape exactly so the frontend data model
// is unchanged; only the persistence layer moved.
export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Resume'),
  templateId: text('template_id').notNull(),
  pageSize: text('page_size').notNull().default('a4'),
  trim: integer('trim', { mode: 'boolean' }).notNull().default(true),
  kind: text('kind').notNull().default('master'), // 'master' | 'tailored'
  parentId: text('parent_id'), // null for masters
  resume: text('resume', { mode: 'json' }).notNull(),
  messages: text('messages', { mode: 'json' }).notNull().default('[]'),
  job: text('job', { mode: 'json' }), // null | { description, company, role, ... }
  matchScore: integer('match_score'), // null | number
  documents: text('documents', { mode: 'json' }).notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Board columns (kanban stages), one row per (user, column). Columns are fully
// user-defined now: they can be added, renamed, recoloured, reordered and
// deleted. `applications.status` stores a column `id` (no FK — reassignment on
// delete is handled in app logic). Default columns are seeded per user with
// stable slug ids ('wishlist', 'applied', …) so the auto-seed and older cards
// keep resolving (the first column's id stays 'wishlist' for back-compat even
// though its label now reads "Saved").
export const boardColumns = sqliteTable('board_columns', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull().default(''),
  color: text('color').notNull().default('#94a3b8'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Application-tracker cards (kanban). Mirrors the old localStorage card shape.
// `status` is the id of the board column the card lives in.
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeId: text('resume_id'), // null allowed
  parentId: text('parent_id'),
  company: text('company').notNull().default(''),
  role: text('role').notNull().default(''),
  status: text('status').notNull().default('wishlist'), // board column id
  position: integer('position').notNull().default(0),
  notes: text('notes').notNull().default(''),
  appliedAt: integer('applied_at'), // null | epoch ms
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
