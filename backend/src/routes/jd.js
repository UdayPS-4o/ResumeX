import { Router } from 'express';
import { complete, buildJdExtractPrompt, buildTitlePrompt, parseModelJson, sanitizeJobText } from '@resumex/llm';

const router = Router();

// Normalize the model's extracted object into our stable contract so the
// frontend can rely on every field existing (arrays are always arrays).
function shapeJd(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const list = (v) =>
    Array.isArray(v)
      ? [...new Set(v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean))]
      : [];
  const role = str(obj.role);
  const company = str(obj.company);
  const fallbackTitle = company && role ? `${role} · ${company}` : role || company || '';
  return {
    company,
    role,
    seniority: str(obj.seniority) || 'unknown',
    requiredSkills: list(obj.requiredSkills),
    preferredSkills: list(obj.preferredSkills),
    responsibilities: list(obj.responsibilities),
    keywords: list(obj.keywords),
    suggestedTitle: str(obj.suggestedTitle) || fallbackTitle,
  };
}

// POST /api/jd
// body: { provider, model, apiKey, baseUrl, jobDescription }
// -> { company, role, seniority, requiredSkills[], preferredSkills[], responsibilities[], keywords[], suggestedTitle }
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, jobDescription: rawJobDescription = '' } = req.body || {};
    const jobDescription = sanitizeJobText(rawJobDescription);
    if (!jobDescription || !jobDescription.trim()) {
      const err = new Error('jobDescription required');
      err.status = 400;
      throw err;
    }

    const prompt = buildJdExtractPrompt(jobDescription);
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
    });

    res.json(shapeJd(parseModelJson(text)));
  } catch (e) {
    next(e);
  }
});

// POST /api/jd/title
// body: { provider, model, apiKey, baseUrl, jobDescription } -> { title }
router.post('/title', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, jobDescription: rawJobDescription = '' } = req.body || {};
    const jobDescription = sanitizeJobText(rawJobDescription);
    if (!jobDescription || !jobDescription.trim()) {
      const err = new Error('jobDescription required');
      err.status = 400;
      throw err;
    }

    const prompt = buildTitlePrompt(jobDescription);
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
    });

    const obj = parseModelJson(text) || {};
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    res.json({ title });
  } catch (e) {
    next(e);
  }
});

export default router;
