// Seed the auto-created default user on first boot. Its credentials come from env
// (with sensible defaults) so an operator who later adds a 2nd user still knows
// how to log the default account back in once auto-login switches off.
//
//   DEFAULT_USER_USERNAME   default: admin
//   DEFAULT_USER_EMAIL      default: admin@resumex.local
//   DEFAULT_USER_PASSWORD   default: admin

import { countUsers, create, getDefault } from '../repo/users.js';
import { ensureForUser } from '../repo/settings.js';
import { hashPassword } from './auth.js';

export function seedDefaultUser() {
  if (countUsers() > 0) {
    const def = getDefault();
    if (def) ensureForUser(def.id);
    return;
  }
  const username = (process.env.DEFAULT_USER_USERNAME || 'admin').trim();
  const email = (process.env.DEFAULT_USER_EMAIL || 'admin@resumex.local').trim();
  const password = process.env.DEFAULT_USER_PASSWORD || 'admin';

  const user = create({
    username,
    email,
    passwordHash: hashPassword(password),
    isDefault: true,
  });
  ensureForUser(user.id);
  console.log(`[seed] created default user "${username}" (${email})`);
}
