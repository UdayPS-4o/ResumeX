import './env.js'; // MUST be first — scaffolds + loads backend/.env before any env read
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import chatRouter from './routes/chat.js';
import compileRouter from './routes/compile.js';
import templatesRouter from './routes/templates.js';
import renderRouter from './routes/render.js';
import extractRouter from './routes/extract.js';
import atsRouter from './routes/ats.js';
import jdRouter from './routes/jd.js';
import tailorRouter from './routes/tailor.js';
import documentsRouter from './routes/documents.js';
import enrichRouter from './routes/enrich.js';
import providersRouter from './routes/providers.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import resumesRouter from './routes/resumes.js';
import applicationsRouter from './routes/applications.js';
import boardRouter from './routes/board.js';

import { compileInfo } from './services/compiler.js';
import { warmupTypst } from './services/typstCompiler.js';
import { ensureSecrets } from './services/secrets.js';
import { runMigrations } from './db/index.js';
import { seedDefaultUser } from './services/seed.js';
import { requireAuth } from './middleware/auth.js';
import { injectUserKeys } from './middleware/injectUserKeys.js';

// ── Bootstrap persistence before serving ────────────────────────────────────
// Order matters: secrets (encryption key) → schema migrations → seed default
// user. All synchronous (better-sqlite3), so the server is ready to serve the
// moment listen() fires.
ensureSecrets();
runMigrations();
seedDefaultUser();

const app = express();

app.use(cors({ origin: true, credentials: true })); // credentials → session cookie
app.use(express.json({ limit: '20mb' })); // headroom for base64 image attachments
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resumex-backend', compile: compileInfo() });
});

// ── Auth (open — /me performs sole-user auto-login itself) ───────────────────
app.use('/api/auth', authRouter);

// ── User-scoped data (gated) ────────────────────────────────────────────────
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/resumes', requireAuth, resumesRouter);
app.use('/api/applications', requireAuth, applicationsRouter);
app.use('/api/board', requireAuth, boardRouter);

// ── Pure utility routes (open — no user state; templates is also SSR-fetched) ─
app.use('/api/compile', compileRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/render', renderRouter);
app.use('/api/extract', extractRouter);

// ── LLM routes (gated + server-side key injection) ──────────────────────────
app.use('/api/chat', requireAuth, injectUserKeys, chatRouter);
app.use('/api/ats-score', requireAuth, injectUserKeys, atsRouter);
app.use('/api/jd', requireAuth, injectUserKeys, jdRouter);
app.use('/api/tailor', requireAuth, injectUserKeys, tailorRouter);
app.use('/api/documents', requireAuth, injectUserKeys, documentsRouter);
app.use('/api/enrich', requireAuth, injectUserKeys, enrichRouter);
app.use('/api/providers', requireAuth, injectUserKeys, providersRouter);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const port = Number(process.env.PORT || 8000);
app.listen(port, () => {
  console.log(`Resumex backend listening on http://localhost:${port}`);
  // Fire a background warmup compile so the first real user request doesn't
  // pay the Typst cold-start penalty (OS binary load + font scanning).
  warmupTypst();
});
// restart hook
