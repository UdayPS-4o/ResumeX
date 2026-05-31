// Settings + API-key routes (all behind requireAuth via server.js). The client
// receives settings WITHOUT raw keys — only a keyPresent map. Saving sends new
// key values which are encrypted server-side.

import { Router } from 'express';
import * as settingsRepo from '../repo/settings.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(settingsRepo.getForClient(req.user.id));
});

// Save settings fields and, optionally, new API keys (apiKeys map of non-empty
// values) and/or a clearKeys flag (danger-zone "clear all keys").
router.put('/', (req, res) => {
  const userId = req.user.id;
  const { apiKeys, clearKeys, ...fields } = req.body || {};
  settingsRepo.update(userId, fields);
  if (clearKeys) settingsRepo.clearKeys(userId);
  if (apiKeys && typeof apiKeys === 'object') settingsRepo.setKeys(userId, apiKeys);
  res.json(settingsRepo.getForClient(userId));
});

// Granular single-key set/remove (empty value removes).
router.post('/keys', (req, res) => {
  const { provider, apiKey } = req.body || {};
  settingsRepo.setKey(req.user.id, provider, apiKey);
  res.json(settingsRepo.getForClient(req.user.id));
});

router.delete('/keys', (req, res) => {
  settingsRepo.clearKeys(req.user.id);
  res.json(settingsRepo.getForClient(req.user.id));
});

export default router;
