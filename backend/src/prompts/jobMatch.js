// Prompt for the job-match feature.
// Returns { score, missingKeywords, suggestions:[{section,detail}], rewrittenSummary }.

export function buildJobMatchPrompt(resume, jobDescription) {
  return `You are an expert technical recruiter and resume coach. Given a resume and a
job description, evaluate fit and propose tailored, specific changes.

Return ONLY this JSON, no markdown fences, no prose around it:
{
  "score": 0-100,                            // overall match
  "scoreReason": "one sentence",
  "missingKeywords": ["..."],                // concrete terms from the JD that the resume lacks
  "strengths": ["..."],                       // things in the resume that already match well
  "suggestions": [
    {
      "section": "summary" | "experience" | "skills" | "projects",
      "target": "optional: which item to edit (e.g. company name)",
      "change": "what to change, in one sentence"
    }
  ],
  "rewrittenSummary": "a tailored 2-3 sentence summary aimed at this JD"
}

Rules:
- Never invent experience the candidate does not have. Only reframe what is there.
- Prefer concrete, quantified phrasing.
- Keep suggestions actionable — no vague advice.

=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME JSON ===
${JSON.stringify(resume, null, 2)}`;
}
