// Tailor-to-JD prompt. Owned/refined by task #4.
// Reuses the shared RESUME_SHAPE + RESPONSE_FORMAT so the model's output flows
// straight into the existing suggestion-card pipeline (splitResponse →
// diffResume → splitChangesIntoCards). The model is instructed up-front to stay
// truthful, but the hard anti-hallucination GATES are enforced in code after the
// model returns (routes/tailor.js) — the prompt is the soft first line of defense.

import { RESUME_SHAPE, RESPONSE_FORMAT } from './builder.js';

// Per-strategy editing latitude. The only axis that changes is how aggressively
// the model may rewrite/add bullets — never whether it may fabricate.
const STRATEGY = {
  nudge: `STRATEGY — NUDGE (minimal, conservative):
- Make the smallest set of high-impact edits. Only touch a bullet or the summary
  where there is a clear, existing match to the job.
- Rephrase to mirror the job's language; surface skills the candidate already has.
- Do NOT add new bullets and do NOT restructure or reorder sections.
- Preserve the original bullet count within each role.`,
  keywords: `STRATEGY — KEYWORDS (balanced, default):
- Weave the job's required keywords and phrasing into existing bullets and the
  summary wherever the candidate's real experience already supports them.
- You may rephrase existing bullets, but do NOT add brand-new bullets.
- Reorder the skills so the most JD-relevant appear first (keep ALL of them).`,
  full: `STRATEGY — FULL (aggressive re-angle):
- Re-angle the résumé toward this role: rewrite the summary, rewrite and
  re-prioritize bullets to emphasize matching impact, and reorder sections/skills.
- You may add a bullet only if it elaborates on work the candidate already did
  (restating real experience in the JD's terms) — never an invented responsibility.`,
};

export function buildTailorPrompt(resume = {}, jobDescription = '', { job = null, strategy = 'keywords' } = {}) {
  const jobBlock = job
    ? `\nEXTRACTED JOB SIGNALS (mirror these truthfully — they summarize the JD):\n${JSON.stringify(job, null, 2)}\n`
    : '';

  return `You are an expert résumé editor tailoring a candidate's résumé to one specific job.
Re-angle the résumé so an ATS and a hiring manager immediately see the match —
WITHOUT inventing, exaggerating, or removing anything real.

HOW TO TAILOR — reason through this silently first, then edit:
1. Identify the 3-5 things this job cares about most (skills, outcomes, scope, domain).
2. For each, find where the candidate ALREADY meets it and make that match unmissable —
   surface it earlier in the role and describe it in the job's own words.
3. ATS reality: screeners match on exact phrases. When the candidate has a skill the JD
   names differently, adopt the JD's exact term (résumé "continuous integration" + JD
   "CI/CD" → write "CI/CD") — but ONLY when it's genuinely the same thing. Never relabel
   one technology as another to force a match.

${STRATEGY[strategy] || STRATEGY.keywords}

TRUTHFULNESS RULES — hard constraints, never violate:
1. Do NOT add a company, job title, school, degree, certification, date, or credential
   that isn't already in the résumé. Copy every company/title/school/degree and every
   date range EXACTLY as written (keep months, e.g. "Jan 2022 - Present").
2. Do NOT invent metrics: never introduce a number, %, $, or quantity that isn't already
   present for that bullet. Keep existing numbers exact. If real impact has no number,
   describe it qualitatively rather than fabricating one.
3. Only surface skills the candidate plausibly already has from their experience. Skills
   are append-or-reorder ONLY — you may reorder by relevance and add a JD skill the work
   clearly supports, but NEVER delete one of the candidate's real skills.
4. Keep personal info and contact details (name, email, phone, links) exactly as-is.
5. Preserve the candidate's voice and the original capitalization of proper nouns and
   acronyms (REST, API, AWS, SQL). Avoid AI-tell buzzwords ("spearheaded", "leveraged",
   "synergy", "world-class") and do NOT use em dashes (—); use commas or "to" instead.
${jobBlock}
For your short conversational message: in one or two sentences, say what you re-angled
and which job requirements you aligned to. Do not list every edit.

${RESPONSE_FORMAT}

Résumé JSON shape (return the FULL updated résumé, keeping EVERY existing field and item):
${RESUME_SHAPE}

=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== CURRENT RÉSUMÉ (tailor this; do not drop anything) ===
${JSON.stringify(resume, null, 2)}`;
}
