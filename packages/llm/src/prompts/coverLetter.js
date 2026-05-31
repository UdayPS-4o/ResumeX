// Cover-letter prompt. Owned/refined by task #6. Plain-text output (no JSON).

const TONES = {
  professional: 'Professional and polished — confident but never stuffy.',
  warm: 'Warm and personable — genuine enthusiasm, still concise and businesslike.',
  direct: 'Direct and punchy — short sentences, results-first, no filler.',
};

export function buildCoverLetterPrompt(resume = {}, jobDescription = '', { job = null, language = 'en', tone = 'professional' } = {}) {
  const who = resume?.name || 'the candidate';
  const company = job?.company ? job.company : '';
  const target = company ? ` at ${company}` : '';
  const role = job?.role ? ` for the ${job.role} role` : '';
  const toneLine = TONES[tone] || TONES.professional;
  const hasJd = String(jobDescription || '').trim().length > 0;

  return `You are writing a tailored cover letter${role}${target} on behalf of ${who}.

TONE: ${toneLine}

VOICE — write like a sharp, specific human, not a template:
- Banned dead phrases (never use): "I am writing to", "I am excited to apply", "I believe I
  would be a great fit", "team player", "passionate about", "proven track record",
  "fast-paced environment", "wear many hats", "think outside the box", "hit the ground running".
- Open on a real hook: one specific thing about THIS role, product, team, or problem — then
  connect the candidate to it. No throat-clearing.
- Show, don't tell: prove each strength with a concrete result, never self-describing adjectives.
- Mirror the job's own language for the skills the candidate genuinely has.

REQUIREMENTS
- 3 short paragraphs, ~250-320 words total.
- Opening: lead with a specific, genuine reason for wanting ${role ? 'this role' : 'this role'}${company ? ` at ${company}` : ''}. Avoid clichés like "I am writing to apply" or "I am excited to apply".
- Middle: connect 2-3 of the candidate's REAL achievements (taken only from the résumé below) to ${hasJd ? "the job's stated needs" : 'the kind of impact this role calls for'}. Be concrete. NEVER invent experience, employers, titles, dates, metrics, or skills the résumé does not contain.
- Closing: a confident, specific call to action.
- Write in ${language}.

OUTPUT
- Output ONLY the letter body as plain text.
- Do NOT include a header, the date, an address block, a greeting line, or a sign-off — the document template adds the letterhead and the candidate's name. Start directly with the first body paragraph.
- No placeholders like [Your Name] or [Company]. No markdown, bullet points, or preamble. Separate paragraphs with a single blank line.

=== JOB DESCRIPTION ===
${hasJd ? jobDescription : '(none provided — infer the role from the target company/role above and keep claims general but grounded in the résumé.)'}

=== CANDIDATE RÉSUMÉ (JSON) ===
${JSON.stringify(resume, null, 2)}`;
}
