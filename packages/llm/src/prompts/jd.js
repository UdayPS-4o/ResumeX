// Job-description analysis prompts. Owned/refined by task #4.
// Structured extraction + a short résumé title for a job. Both are JSON-only so
// the route can hand the text straight to parseModelJson (jsonMode:true).

export function buildJdExtractPrompt(jobDescription = '') {
  return `You are an expert technical recruiter. Read the job description below and
extract the structured signals a candidate would mirror when tailoring a résumé.

Return ONLY this JSON object — no prose, no markdown fences:
{
  "company": "hiring company name, exactly as written ('' if not stated)",
  "role": "job title, exactly as written ('' if not stated)",
  "seniority": "intern | junior | mid | senior | lead | staff | principal | manager | director | unknown",
  "requiredSkills": ["hard skills, tools, languages, or platforms the posting requires"],
  "preferredSkills": ["nice-to-have / 'bonus' skills"],
  "responsibilities": ["the core things this person will do — short phrases"],
  "keywords": ["other ATS terms worth mirroring (methodologies, domains, acronyms)"],
  "suggestedTitle": "Role · Company (<= 6 words)"
}

EXTRACTION RULES:
- Extract only what is actually present. Use "" for unknown strings and [] for
  empty lists. NEVER invent a company, role, or skill that isn't in the text.
- Infer "seniority" from titles and years-of-experience cues; use "unknown" if unclear.
- Skills must be concrete nouns (e.g. "PostgreSQL", "Kubernetes", "React"), NOT soft
  traits like "team player" or "fast learner" — those don't belong in any list.
- Put a skill in requiredSkills only if the posting frames it as a must-have; otherwise
  prefer preferredSkills. A skill should appear in at most one of the two lists. Signal words:
  "required / must have / minimum qualifications" → required; "nice to have / bonus / a plus /
  preferred" → preferred.
- Normalize each skill to its common canonical name ("PostgreSQL" not "Postgres",
  "Kubernetes" not "k8s", "JavaScript" not "JS") so it matches a résumé cleanly.
- Keep every list item short (1-4 words), Title/Original case, and deduplicated.
- "suggestedTitle" uses a middle dot " · " and stays <= 6 words; if the company is
  unknown, use just the role.

=== JOB DESCRIPTION ===
${jobDescription}`;
}

export function buildTitlePrompt(jobDescription = '') {
  return `Read this job description and produce a short résumé title of the form
"Role · Company" (use a middle dot " · ").

Rules:
- Use the most specific role title and the hiring company, both as written.
- If the company is not stated, return just the role.
- Maximum 6 words. No quotes, no extra commentary.

Return ONLY this JSON: { "title": "..." }

=== JOB DESCRIPTION ===
${jobDescription}`;
}
