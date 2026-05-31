import { Router } from 'express';
import { compileLatex } from '../services/compiler.js';
import { trimPdfBottom } from '../services/pdfTrim.js';

const router = Router();

// POST /api/compile  body: { latex, trim }  -> application/pdf
// trim (default true): crop trailing blank space off a short single-page resume.
router.post('/', async (req, res, next) => {
  try {
    const { latex, trim = true } = req.body || {};
    let pdf = await compileLatex(latex);
    if (trim) pdf = trimPdfBottom(pdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});

export default router;
