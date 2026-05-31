import { Router } from 'express';
import { complete, buildCoverLetterPrompt, buildOutreachPrompt } from '@resumex/llm';
import { compileSource } from '../services/compiler.js';
import { renderCoverLetterTypst } from '../services/coverLetterDoc.js';

const router = Router();

// Cover letter + outreach generators (task #6). These return PLAIN TEXT (no JSON)
// from the model — the house style for free-form writing. We follow routes/ats.js
// for the complete() call shape (provider/model/apiKey/baseUrl + system + messages).

// POST /api/documents/cover-letter
// body: { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, tone } -> { text }
router.post('/cover-letter', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, tone } = req.body || {};
    const prompt = buildCoverLetterPrompt(resume || {}, jobDescription || '', { job, language, tone });
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You are an expert career writer.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
    res.json({ text: (text || '').trim() });
  } catch (e) {
    next(e);
  }
});

// POST /api/documents/outreach
// body: { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, channel } -> { text }
router.post('/outreach', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume, jobDescription, job, language, channel } = req.body || {};
    const prompt = buildOutreachPrompt(resume || {}, jobDescription || '', { job, language, channel });
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You are an expert career writer.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
    res.json({ text: (text || '').trim() });
  } catch (e) {
    next(e);
  }
});

// POST /api/documents/cover-letter/pdf
// body: { resume, body, date? } -> application/pdf
// Renders the edited cover-letter text as a standalone Typst letter and compiles
// it with the same engine the résumés use. `date` is an optional pre-formatted
// string from the client (we never call Date() here).
router.post('/cover-letter/pdf', async (req, res, next) => {
  try {
    const { resume, body, date } = req.body || {};
    const source = renderCoverLetterTypst({
      name: resume?.name,
      contact: resume?.contact,
      date,
      body: body || '',
    });
    const pdf = await compileSource(source);
    res.type('application/pdf').send(pdf);
  } catch (e) {
    next(e);
  }
});

export default router;
