import { Router } from 'express';
import multer from 'multer';
import { extractText } from '../services/extract.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// POST /api/extract  (multipart, field "file")  ->  { text, filename }
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded (expected form field "file").');
      err.status = 400;
      throw err;
    }
    const text = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    if (!text || text.length < 20) {
      const err = new Error('Could not read meaningful text from this file. If it is a scanned image, try a text-based PDF.');
      err.status = 422;
      throw err;
    }
    res.json({ text, filename: req.file.originalname });
  } catch (e) {
    next(e);
  }
});

export default router;
