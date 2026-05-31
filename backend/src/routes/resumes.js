// Resume CRUD (behind requireAuth). Endpoints map 1:1 to the old client store
// methods so the new async storage wrapper is a thin translation layer.

import { Router } from 'express';
import * as resumesRepo from '../repo/resumes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ resumes: resumesRepo.list(req.user.id) });
});

router.get('/:id', (req, res) => {
  const entry = resumesRepo.get(req.user.id, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: entry });
});

router.post('/', (req, res) => {
  const { templateId, init = {} } = req.body || {};
  if (!templateId) return res.status(400).json({ error: 'templateId is required' });
  res.status(201).json({ resume: resumesRepo.create(req.user.id, templateId, init) });
});

router.post('/:id/variant', (req, res) => {
  const { init = {} } = req.body || {};
  const variant = resumesRepo.createVariant(req.user.id, req.params.id, init);
  if (!variant) return res.status(404).json({ error: 'Master resume not found' });
  res.status(201).json({ resume: variant });
});

router.post('/:id/duplicate', (req, res) => {
  const dup = resumesRepo.duplicate(req.user.id, req.params.id);
  if (!dup) return res.status(404).json({ error: 'Resume not found' });
  res.status(201).json({ resume: dup });
});

router.patch('/:id', (req, res) => {
  const updated = resumesRepo.update(req.user.id, req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: updated });
});

router.patch('/:id/documents', (req, res) => {
  const updated = resumesRepo.setDocuments(req.user.id, req.params.id, req.body?.documents || {});
  if (!updated) return res.status(404).json({ error: 'Resume not found' });
  res.json({ resume: updated });
});

router.delete('/:id', (req, res) => {
  resumesRepo.remove(req.user.id, req.params.id);
  res.json({ ok: true });
});

export default router;
