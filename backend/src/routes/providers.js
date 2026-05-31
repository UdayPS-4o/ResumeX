import { Router } from 'express';
import { complete } from '@resumex/llm';

const router = Router();

// POST /api/providers/test
// body: { provider, model, apiKey, baseUrl } -> { ok, model, output, error }
// Issues a tiny "ping" completion and reports health. Threads baseUrl for the
// OpenAI-compatible providers (ollama / openrouter / deepseek / groq /
// openai_compatible). A bad key / unreachable endpoint is a normal result, not a
// server error — we always answer 200 with { ok:false, error } so the Settings
// UI can show it inline.
router.post('/test', async (req, res) => {
  const { provider, model, apiKey, baseUrl } = req.body || {};
  try {
    const { text } = await complete({
      provider,
      model,
      apiKey,
      baseUrl,
      system: 'Reply with the single word OK.',
      messages: [{ role: 'user', content: 'ping' }],
      temperature: 0,
    });
    res.json({ ok: true, model: model || undefined, output: (text || '').trim() });
  } catch (e) {
    res.json({ ok: false, error: e?.message || 'Connection failed.' });
  }
});

export default router;
