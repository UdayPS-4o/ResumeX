// Strip prompt-injection attempts out of untrusted text (job descriptions the
// user pastes) before it enters an LLM prompt. Mirrors Resume-Matcher's
// _sanitize_user_input: we neutralize common instruction-override patterns so a
// malicious JD can't hijack the tailoring/extraction prompts. Best-effort — this
// is defense-in-depth, not a guarantee.

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|preceding)\s+instructions?/gi,
  /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above)/gi,
  /forget\s+(?:everything|all|the\s+above|previous\s+instructions?)/gi,
  /you\s+are\s+now\s+(?:a|an|the)\b/gi,
  /new\s+instructions?\s*:/gi,
  /^\s*system\s*:/gim,
  /\[\/?(?:INST|SYS|SYSTEM)\]/gi,
  /<\/?(?:system|assistant|user)\s*>/gi,
  /#{2,}\s*(?:system|instruction|prompt)/gi,
];

export function sanitizeJobText(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const re of INJECTION_PATTERNS) out = out.replace(re, '[removed]');
  return out;
}
