import { Router } from 'express';
import { complete, buildAtsPrompt, parseModelJson } from '@resumex/llm';
import { runAtsChecks } from '@resumex/ats';

const router = Router();

// POST /api/ats-score
// body: { provider, model, apiKey, resume, jobDescription? }
// returns: { score, grade, breakdown[], issues[], passed[], llm?:{keywordSuggestions,topFixes,verdict} }
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume, jobDescription } = req.body || {};

    // Deterministic checks always run — fast and reliable. When a JD is given,
    // this also computes a real keyword-match score (no LLM needed).
    const base = runAtsChecks(resume || {}, { jobDescription });

    // LLM enrichment is best-effort; if it fails we still return the score.
    let llm = null;
    if (apiKey) {
      try {
        const prompt = buildAtsPrompt(resume || {}, jobDescription, base);
        const { text } = await complete({
          provider, model, apiKey, baseUrl,
          system: 'You return only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
        });
        llm = parseModelJson(text);
      } catch (e) {
        llm = { error: e.message };
      }
    }

    res.json({ ...base, llm });
  } catch (e) {
    next(e);
  }
});

export default router;
