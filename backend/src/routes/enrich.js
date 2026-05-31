import { Router } from 'express';
import {
  complete,
  buildEnrichAnalyzePrompt,
  buildEnrichEnhancePrompt,
  RESUME_DELIM,
  parseModelJson,
} from '@resumex/llm';
import { emptyResume, mergeResume } from '@resumex/core';

const router = Router();

// Owned by task #8 (Enrichment wizard).
//   analyze → find weak/vague bullets and emit a clarifying question per item.
//   enhance → take the user's answers and return a resume `patch` (feeds the
//   suggestion-card before/after review via diffResume).

// POST /api/enrich/analyze
// body: { provider, model, apiKey, baseUrl, resume }
// -> { items:[{ id, section, where, field, original, weakness, question }] }
router.post('/analyze', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume = emptyResume() } = req.body || {};
    const prompt = buildEnrichAnalyzePrompt(resume);
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
    });

    const parsed = parseModelJson(text) || {};
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    // Normalize each item so the client always gets a stable id + the fields it
    // needs to render the question and round-trip the answer back to /enhance.
    const normalized = items
      .filter((it) => it && (it.original || it.question))
      .map((it, i) => ({
        id: String(it.id || `weak-${i}`),
        section: it.section || 'experience',
        where: it.where || '',
        field: it.field || 'bullets',
        original: it.original || '',
        weakness: it.weakness || '',
        question: it.question || '',
      }));

    res.json({ items: normalized });
  } catch (e) {
    next(e);
  }
});

// POST /api/enrich/enhance
// body: { provider, model, apiKey, baseUrl, resume, answers }
//   answers = [{ id, where, field, original, question, answer }]
// -> { message, resume, patch }
router.post('/enhance', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume = emptyResume(), answers = [] } = req.body || {};
    const prompt = buildEnrichEnhancePrompt(resume, answers);
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: buildSystemNote(),
      messages: [{ role: 'user', content: prompt }],
    });

    const { message, resumeJson } = splitResponse(text);
    const updated = resumeJson ? mergeResume(resume, resumeJson) : resume;
    // patch = the raw résumé delta the model proposed; the client renders the
    // before/after review from diffResume(resume, updated).
    res.json({ message: message || text.slice(0, 1000), resume: updated, patch: resumeJson || null });
  } catch (e) {
    next(e);
  }
});

// A light system nudge for the enhance call (the heavy contract lives in the
// user prompt so it stays adjacent to the résumé + answers).
function buildSystemNote() {
  return 'You are an expert résumé coach. Strengthen only the lines the candidate '
    + 'answered, using strictly the facts they provided plus what already exists. '
    + 'Never invent metrics or details.';
}

// Split "<message>\n<<<RESUME_JSON>>>\n{json}" into parts. Mirrors chat.js so the
// enhance reply parses identically: tolerant of a missing delimiter or the model
// returning the legacy { message, resume } JSON shape / fenced JSON.
function splitResponse(text) {
  if (!text) return { message: '', resumeJson: null };
  const idx = text.indexOf(RESUME_DELIM);
  if (idx === -1) {
    const obj = parseModelJson(text);
    if (obj && (obj.message || obj.resume)) {
      return { message: obj.message || '', resumeJson: obj.resume || null };
    }
    return { message: text.trim(), resumeJson: null };
  }
  const message = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + RESUME_DELIM.length);
  return { message, resumeJson: parseModelJson(jsonPart) };
}

export default router;
