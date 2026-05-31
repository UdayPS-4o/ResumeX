import { Router } from 'express';
import { compileSource } from '../services/compiler.js';
import { trimPdfBottom } from '../services/pdfTrim.js';
import { fingerprintPdf } from '../services/pdfFingerprint.js';

const router = Router();

// POST /api/compile
//   body: { source, format, trim }   -> application/pdf
// trim (default true): crop trailing blank space off a short single-page resume.
router.post('/', async (req, res, next) => {
  try {
    const { source, format = 'typst', trim = true } = req.body || {};
    let pdf = await compileSource(source, format);
    if (trim) {
      // Trimming is best-effort — never fail a good compile because the crop pass
      // hit an unexpected PDF shape.
      try {
        pdf = trimPdfBottom(pdf);
      } catch (e) {
        console.warn('[compile] trim skipped:', e.message);
      }
    }
    // Fingerprinting is best-effort — embeds Resumex identity markers into the
    // PDF so the source can be identified later (metadata + hidden annotation).
    pdf = fingerprintPdf(pdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});

export default router;
