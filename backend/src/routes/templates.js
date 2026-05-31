import { Router } from 'express';
import { listTemplates } from '@resumex/renderer';

const router = Router();

// GET /api/templates -> [{ id, name, description, author, license, accent }]
router.get('/', (_req, res) => {
  res.json({ templates: listTemplates() });
});

export default router;
