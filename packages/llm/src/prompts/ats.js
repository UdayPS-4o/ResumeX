// Prompt for the LLM portion of ATS scoring — qualitative, keyword-aware
// suggestions that complement the deterministic checks. A deterministic
// keyword scan already runs first; pass its findings in `ats` so the model
// adds judgment (synonyms, implied skills, reframing) instead of repeating it.

export function buildAtsPrompt(resume, jobDescription, ats = null) {
  const jdBlock = jobDescription?.trim()
    ? `\nA target job description is provided. Tailor keyword advice to it.\n=== JOB DESCRIPTION ===\n${jobDescription}\n`
    : '\nNo specific job description was provided — give general ATS advice for the candidate\'s apparent field.\n';

  const scanBlock = ats?.keywords
    ? `\nA deterministic keyword scan already ran. It found these job-description keywords MISSING from the résumé:\n${(ats.keywords.missing || []).slice(0, 25).join(', ') || '(none)'}\nDo NOT simply repeat this list. Instead, judge which are genuinely worth adding, flag any the candidate likely has but phrased differently (synonyms/implied skills), and explain how to surface them truthfully.\n`
    : '';

  return `You are an ATS (Applicant Tracking System) optimization expert. Review the
resume JSON and return concise, concrete advice for getting past automated
resume screeners.
${jdBlock}${scanBlock}
Return ONLY this JSON, no markdown fences:
{
  "keywordSuggestions": ["specific skills/terms the resume should include"],
  "topFixes": ["the 3-5 highest-impact, specific changes to make"],
  "verdict": "one-sentence overall assessment"
}

Rules:
- Be specific and actionable. No generic filler like "use keywords".
- Never invent experience; only suggest reframing or surfacing what's plausibly there.
- Prefer synonyms and implied skills the deterministic scan would miss.
- Keep each item short (a phrase or one sentence).

=== RESUME JSON ===
${JSON.stringify(resume, null, 2)}`;
}
