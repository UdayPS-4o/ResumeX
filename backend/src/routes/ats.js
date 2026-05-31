import { Router } from 'express';
import { complete } from '../providers/index.js';
import { buildAtsPrompt } from '../prompts/ats.js';
import { runAtsChecks } from '../services/atsChecks.js';

const router = Router();

// POST /api/ats-score
// body: { provider, model, apiKey, resume, jobDescription? }
// returns: { score, grade, breakdown[], issues[], passed[], llm?:{keywordSuggestions,topFixes,verdict} }
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, resume, jobDescription } = req.body || {};

    // Deterministic checks always run — fast and reliable.
    const base = runAtsChecks(resume || {});

    // LLM enrichment is best-effort; if it fails we still return the score.
    let llm = null;
    if (apiKey) {
      try {
        const prompt = buildAtsPrompt(resume || {}, jobDescription);
        const { text } = await complete({
          provider, model, apiKey,
          system: 'You return only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
        });
        llm = parseJsonLoose(text);
      } catch (e) {
        llm = { error: e.message };
      }
    }

    res.json({ ...base, grade: gradeFor(base.score), llm });
  } catch (e) {
    next(e);
  }
});

function gradeFor(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'Poor';
}

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
