// Authentication primitives: password hashing (bcryptjs — pure JS, no native
// build, friendly on Windows) and stateless session tokens (JWT in an httpOnly
// cookie). Sessions are stateless so there's no sessions table to manage; logout
// just clears the cookie.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ensureSecrets } from './secrets.js';

export const SESSION_COOKIE = 'rx_session';
const SESSION_TTL = '30d';

export function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), 10);
}

export function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(String(plain), String(hash || ''));
  } catch {
    return false;
  }
}

export function signSession(userId) {
  const { authSecret } = ensureSecrets();
  return jwt.sign({ uid: userId }, authSecret, { expiresIn: SESSION_TTL });
}

export function verifySession(token) {
  if (!token) return null;
  try {
    const { authSecret } = ensureSecrets();
    const payload = jwt.verify(token, authSecret);
    return payload?.uid ? { userId: payload.uid } : null;
  } catch {
    return null;
  }
}

// Cookie options. `secure: false` so it works over plain http on localhost / a
// self-hosted box; sameSite 'lax' is fine since the frontend proxies same-origin.
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export function setSessionCookie(res, userId) {
  res.cookie(SESSION_COOKIE, signSession(userId), cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}
