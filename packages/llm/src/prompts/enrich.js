// Résumé enrichment prompts. Owned/refined by task #8.
// analyze → finds weak/vague bullets and asks ONE clarifying question each.
// enhance → rewrites them from the user's answers, output via the shared
// card-compatible contract so the result flows into the before/after review.

import { RESUME_SHAPE, RESPONSE_FORMAT } from './builder.js';

export function buildEnrichAnalyzePrompt(resume = {}) {
  return `You are an expert résumé coach. Scan this résumé and find the WEAKEST lines — the
bullets/descriptions that would cost the candidate the most in front of a recruiter or ATS.

A line is weak if it is any of: vague or generic; unquantified (no %, $, count, or time); a
list of responsibilities instead of outcomes; passive voice or a flat opener ("Responsible
for", "Worked on", "Helped with"); padded with filler/buzzwords; of unclear scope (a reader
can't tell how big or hard it was); or a near-duplicate of another bullet.

Pick the 3-6 weakest. Do NOT flag lines that are already strong and quantified. For each one,
ask ONE specific question whose answer would let you rewrite it into a strong, quantified,
impact-focused bullet — anchored to THAT line (e.g. "How many users did the checkout flow
serve, and by how much did your change cut load time?"). The question must be answerable by
the candidate from memory; never ask them to invent.

Return ONLY this JSON (no markdown fences, no prose before or after):
{
  "items": [
    {
      "id": "kebab-case-stable-id",          // unique & stable per line, e.g. "acme-bullet-1"
      "section": "experience|projects|summary|education",
      "where": "the item this belongs to (company / project / school name; omit for summary)",
      "field": "bullets|description|summary",
      "original": "the exact weak text, copied verbatim from the résumé",
      "weakness": "one short phrase on why it's weak (e.g. 'no metrics')",
      "question": "one specific, answerable question for the candidate"
    }
  ]
}

Rules:
- Favor questions whose answer is a number, a scale, or a concrete outcome — that is what
  turns a weak line strong. One question per line; never stack two asks into one.
- "original" MUST be copied character-for-character from the résumé so it can be matched back.
- Never fabricate weaknesses or numbers; keep questions short and concrete.
- If the résumé is already strong (or nearly empty), return {"items": []}.

=== RÉSUMÉ JSON ===
${JSON.stringify(resume, null, 2)}`;
}

export function buildEnrichEnhancePrompt(resume = {}, answers = []) {
  return `You are an expert résumé coach. The candidate answered your clarifying questions about
specific weak lines. Rewrite ONLY those lines into strong, quantified, impact-focused bullets,
working their answers in. Leave every other part of the résumé exactly as it is.

STRICT FACT RULES:
- Use ONLY facts the candidate gave in their answers, plus facts already present in the résumé.
- NEVER invent, estimate, or embellish numbers, scope, technologies, or outcomes. If an answer
  is vague or empty, improve the wording/verb only — do not manufacture a metric.
- Match each answer to its line via the "where"/"field"/"original" it carries, and replace that
  original text with your improved version (keep it to roughly one line per bullet).

WRITING RULES for the lines you rewrite:
- Start with a strong action verb; cut filler like "Responsible for" / "Worked on".
- Quantify with the candidate's real numbers (%, $, time, users, scale) when provided.
- Past tense for past roles, present tense for the current role.

For your short conversational message: summarize what you strengthened in one sentence.

${RESPONSE_FORMAT}

Résumé JSON shape (return the FULL updated résumé, keeping every existing field intact):
${RESUME_SHAPE}

Candidate answers (each carries the location of the line to update):
${JSON.stringify(answers, null, 2)}

=== CURRENT RÉSUMÉ (update the answered lines in place; do not drop or reorder anything else) ===
${JSON.stringify(resume, null, 2)}`;
}
