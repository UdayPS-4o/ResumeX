// Application-tracker CRUD (behind requireAuth). Mirrors the old applicationStore.

import { Router } from 'express';
import * as appsRepo from '../repo/applications.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ applications: appsRepo.all(req.user.id) });
});

router.post('/', (req, res) => {
  res.status(201).json({ card: appsRepo.create(req.user.id, req.body || {}) });
});

router.post('/bulk/update', (req, res) => {
  const { ids, patch } = req.body || {};
  appsRepo.bulkUpdate(req.user.id, ids || [], patch || {});
  res.json({ ok: true });
});

router.post('/bulk/delete', (req, res) => {
  appsRepo.bulkDelete(req.user.id, req.body?.ids || []);
  res.json({ ok: true });
});

router.post('/:id/move', (req, res) => {
  const { status, position } = req.body || {};
  const card = appsRepo.move(req.user.id, req.params.id, status, position);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json({ card });
});

router.patch('/:id', (req, res) => {
  const card = appsRepo.update(req.user.id, req.params.id, req.body || {});
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json({ card });
});

router.delete('/:id', (req, res) => {
  appsRepo.remove(req.user.id, req.params.id);
  res.json({ ok: true });
});

export default router;
