import { Router } from 'express';
import { renderTemplate } from '../templates/index.js';

const router = Router();

// POST /api/render   body: { templateId, resume }   -> { latex }
router.post('/', (req, res, next) => {
  try {
    const { templateId, resume, pageSize } = req.body || {};
    if (!templateId) {
      const err = new Error('templateId required');
      err.status = 400;
      throw err;
    }
    const latex = renderTemplate(templateId, resume || {}, { pageSize });
    res.json({ latex });
  } catch (e) {
    next(e);
  }
});

export default router;
