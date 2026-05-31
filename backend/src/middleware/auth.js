// Session resolution + the count-driven auto-login rule:
//
//   • A valid session cookie  → that user.
//   • No session, exactly ONE user in the DB → auto-login the sole (default)
//     user and mint a cookie. This is what makes single-user installs feel
//     password-free.
//   • No session, MORE THAN ONE user → unauthenticated (login page required).

import { SESSION_COOKIE, verifySession, setSessionCookie } from '../services/auth.js';
import { getById, countUsers, getDefault } from '../repo/users.js';

// Returns the resolved user (and sets a fresh cookie on auto-login), or null.
export function resolveUser(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = verifySession(token);
  if (session) {
    const user = getById(session.userId);
    if (user) return user;
  }
  // Auto-login only when the default account is the *only* one.
  if (countUsers() === 1) {
    const sole = getDefault() || null;
    if (sole) {
      setSessionCookie(res, sole.id);
      return sole;
    }
  }
  return null;
}

// Gate for all data + LLM routes.
export function requireAuth(req, res, next) {
  const user = resolveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = user;
  next();
}
