// Prompt for the LLM portion of ATS scoring — qualitative, keyword-aware
// suggestions that complement the deterministic checks.

export function buildAtsPrompt(resume, jobDescription) {
  const jdBlock = jobDescription?.trim()
    ? `\nA target job description is provided. Tailor keyword advice to it.\n=== JOB DESCRIPTION ===\n${jobDescription}\n`
    : '\nNo specific job description was provided — give general ATS advice for the candidate\'s apparent field.\n';

  return `You are an ATS (Applicant Tracking System) optimization expert. Review the
resume JSON and return concise, concrete advice for getting past automated
resume screeners.
${jdBlock}
Return ONLY this JSON, no markdown fences:
{
  "keywordSuggestions": ["specific skills/terms the resume should include"],
  "topFixes": ["the 3-5 highest-impact, specific changes to make"],
  "verdict": "one-sentence overall assessment"
}

Rules:
- Be specific and actionable. No generic filler like "use keywords".
- Never invent experience; only suggest reframing or surfacing what's plausibly there.
- Keep each item short (a phrase or one sentence).

=== RESUME JSON ===
${JSON.stringify(resume, null, 2)}`;
}
