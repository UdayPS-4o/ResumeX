import { Router } from 'express';
import { listTemplates, getSeed } from '@resumex/renderer';

const router = Router();

// GET /api/templates -> [{ id, name, description, author, license, accent, hasSeed }]
router.get('/', (_req, res) => {
  res.json({ templates: listTemplates() });
});

// GET /api/templates/:id/seed -> { seed } | 404
router.get('/:id/seed', (req, res, next) => {
  const seed = getSeed(req.params.id);
  if (!seed) {
    const err = new Error(`No seed data for template "${req.params.id}"`);
    err.status = 404;
    return next(err);
  }
  res.json({ seed });
});

export default router;
