import { Router } from 'express';
import { renderTemplate, getFormat } from '@resumex/renderer';

const router = Router();

// POST /api/render   body: { templateId, resume, pageSize }
//   -> { source, format }   (format: 'typst' | 'latex' — drives the compiler)
router.post('/', (req, res, next) => {
  try {
    const { templateId, resume, pageSize } = req.body || {};
    if (!templateId) {
      const err = new Error('templateId required');
      err.status = 400;
      throw err;
    }
    const source = renderTemplate(templateId, resume || {}, { pageSize });
    res.json({ source, format: getFormat(templateId) });
  } catch (e) {
    next(e);
  }
});

export default router;
