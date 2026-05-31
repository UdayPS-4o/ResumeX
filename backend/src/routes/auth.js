// Auth routes. Login accepts username OR email. Signup lives at a secret,
// unlinked URL (no invite token) — knowing the /signup path is the gate. The
// frontend decides whether to even show a login page based on the user count
// returned by GET /me (count-driven: 1 user → auto-login, >1 → login required).

import { Router } from 'express';
import {
  getByLogin, getById, create, countUsers,
  existsByUsername, existsByEmail, publicUser,
} from '../repo/users.js';
import { ensureForUser } from '../repo/settings.js';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '../services/auth.js';
import { resolveUser } from '../middleware/auth.js';

const router = Router();

// Current session — also performs sole-user auto-login. The frontend calls this
// on load to decide between rendering the app and redirecting to /login.
router.get('/me', (req, res) => {
  const user = resolveUser(req, res);
  const userCount = countUsers();
  if (!user) return res.status(401).json({ authenticated: false, userCount });
  res.json({ authenticated: true, user: publicUser(user), userCount });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  const user = getByLogin(login);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }
  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post('/signup', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (username.length < 2) return res.status(400).json({ error: 'Username must be at least 2 characters.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  if (existsByUsername(username)) return res.status(409).json({ error: 'That username is taken.' });
  if (existsByEmail(email)) return res.status(409).json({ error: 'That email is already registered.' });

  const user = create({ username, email, passwordHash: hashPassword(password), isDefault: false });
  ensureForUser(user.id);
  setSessionCookie(res, user.id); // log the new user straight in
  res.status(201).json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
