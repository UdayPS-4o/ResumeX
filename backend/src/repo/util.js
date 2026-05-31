import crypto from 'node:crypto';

// Short, URL-safe unique id. Matches the spirit of the old client `uid()` but
// generated server-side now.
export function uid() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

export function now() {
  return Date.now();
}
