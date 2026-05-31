import { Router } from 'express';
import { complete } from '../providers/index.js';
import { buildJobMatchPrompt } from '../prompts/jobMatch.js';

const router = Router();

// POST /api/job-match
// body: { provider, model, apiKey, resume, jobDescription }
// returns: { score, scoreReason, missingKeywords[], strengths[], suggestions[], rewrittenSummary }
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, resume, jobDescription } = req.body || {};
    if (!jobDescription || !jobDescription.trim()) {
      const err = new Error('jobDescription required');
      err.status = 400;
      throw err;
    }

    const prompt = buildJobMatchPrompt(resume || {}, jobDescription);
    const { text } = await complete({
      provider,
      model,
      apiKey,
      system: 'You return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
    });

    const parsed = parseJsonLoose(text);
    if (!parsed) {
      const err = new Error('Model did not return valid JSON for the match request.');
      err.status = 502;
      throw err;
    }
    res.json(parsed);
  } catch (e) {
    next(e);
  }
});

function parseJsonLoose(text) {
  if (!text) return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

export default router;
