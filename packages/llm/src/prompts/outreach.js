// Outreach / networking message prompt. Owned/refined by task #6. Plain text.

export function buildOutreachPrompt(resume = {}, jobDescription = '', { job = null, language = 'en', channel = 'linkedin' } = {}) {
  const isEmail = channel === 'email';
  const format = isEmail
    ? 'an email: a "Subject:" line, then a 120-160 word body. End with a short sign-off using only the candidate\'s first name.'
    : 'a LinkedIn message: ONE short paragraph under 90 words so it fits the connection-note limit. No subject line, no sign-off.';
  const who = resume?.name || 'the candidate';
  const company = job?.company ? job.company : '';
  const target = company ? ` at ${company}` : '';
  const role = job?.role ? ` about the ${job.role} role` : ' about a role';
  const hasJd = String(jobDescription || '').trim().length > 0;

  return `You are writing a cold ${channel} outreach message to a recruiter or hiring manager${target}, sent by ${who}${role}.

REQUIREMENTS
- Format as ${format}
- Lead with a specific, genuine reason for reaching out about this role. Banned openers (never start with these): "I hope this message finds you well", "I came across your company", "My name is", or the candidate's own job title. Earn the reply in the first line.
- Reference ONE concrete, REAL strength from the résumé below that fits ${hasJd ? 'the job' : 'this kind of role'}. NEVER invent experience, employers, metrics, or skills.
- Warm, concise, and low-pressure. Close with a soft ask (a quick chat, or their guidance) — never a hard demand.
- Write in ${language}.

OUTPUT
- Output ONLY the message as plain text${isEmail ? ' (including the "Subject:" line)' : ''}.
- No markdown, no placeholders like [Name] or [Company], no preamble or explanation.

=== JOB DESCRIPTION ===
${hasJd ? jobDescription : '(none provided — keep the message general but grounded in the résumé and the target role/company above.)'}

=== CANDIDATE RÉSUMÉ (JSON) ===
${JSON.stringify(resume, null, 2)}`;
}
