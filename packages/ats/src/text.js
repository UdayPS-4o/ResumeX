// Pure, dependency-free, browser-safe text utilities for ATS keyword analysis.
// No Node APIs — this module is bundled into the frontend too.

// Common English stopwords + résumé/JD boilerplate that should never count as
// a meaningful keyword. Kept deliberately broad on the JD-boilerplate side
// ("responsibilities", "requirements", "candidate"…) so extracted keywords are
// actual skills/nouns, not filler.
export const STOPWORDS = new Set([
  'a','an','and','the','or','but','if','then','else','for','of','to','in','on','at','by','with',
  'as','is','are','was','were','be','been','being','am','do','does','did','done','have','has','had',
  'this','that','these','those','it','its','they','them','their','our','your','you','we','us','i',
  'he','she','his','her','him','my','me','from','up','down','out','over','under','again','further',
  'so','than','too','very','can','will','would','should','could','may','might','must','shall',
  'not','no','nor','only','own','same','such','about','into','through','during','before','after',
  'above','below','between','each','few','more','most','other','some','any','all','both','which',
  'who','whom','what','where','when','why','how','there','here','also','etc','per','via','within',
  // résumé / job-description boilerplate
  'experience','experiences','work','working','job','role','roles','position','positions','team',
  'teams','company','companies','organization','responsibility','responsibilities','requirement',
  'requirements','candidate','candidates','applicant','applicants','ability','abilities','strong',
  'excellent','good','great','required','preferred','plus','years','year','using','use','used',
  'including','include','includes','help','helping','ensure','provide','providing','support',
  'new','well','able','looking','seeking','join','across','within','related','various','etc',
  'including','knowledge','understanding','skills','skill','proficiency','proficient','familiar',
  'familiarity','demonstrated','proven','track','record','degree','field','similar','relevant',
  // generic action/filler words that pollute keyword extraction
  'build','building','scalable','maintain','maintaining','deliver','delivering','drive','driving',
  'develop','developing','manage','managing','create','creating','design','designing','collaborate',
  'collaborating','responsible','tasked','duties','must','want','need','needs','hiring','hire',
]);

const WORD_RE = /[a-z0-9][a-z0-9+.#-]*/gi;

// Tokenize to lowercased word-ish tokens. Keeps tech-friendly characters so
// "c++", "node.js", ".net", "ci/cd"→["ci","cd"] survive reasonably.
export function tokenize(text) {
  if (!text) return [];
  return (String(text).toLowerCase().match(WORD_RE) || []);
}

// Conservative singularizer — strips a trailing plural "s"/"es" only when it's
// clearly safe. Avoids the over-stemming that causes false keyword matches
// (e.g. we do NOT reduce "css" or "aws" or short tokens).
export function normalizeToken(tok) {
  if (!tok) return tok;
  let t = tok.toLowerCase();
  if (t.length <= 3) return t;             // js, css, aws, sql, api, ci…
  if (/(ss|us|is|os)$/.test(t)) return t;  // class, status, analysis, chaos
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y'; // libraries→library
  if (t.endsWith('es') && t.length > 4) {
    // queues→queue, but only drop "es" → "e" when it reads naturally; default drop "s"
    return t.slice(0, -1);
  }
  if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

// A normalized, stopword-free token list (good for overlap/frequency work).
export function contentTokens(text) {
  const out = [];
  for (const tok of tokenize(text)) {
    if (STOPWORDS.has(tok)) continue;
    const n = normalizeToken(tok);
    if (n.length < 2) continue;
    if (STOPWORDS.has(n)) continue;
    out.push(n);
  }
  return out;
}

// Word-boundary presence test for a phrase inside a body of text.
// Handles multi-word phrases and regex-special skill names ("c++", "node.js").
export function containsPhrase(haystackLower, phrase) {
  if (!phrase) return false;
  const p = String(phrase).toLowerCase().trim();
  if (!p) return false;
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow whitespace flexibility between words in multi-word phrases.
  const pattern = esc.replace(/\s+/g, '\\s+');
  // Boundaries that treat +/#/. as part of the token so "java" ≠ "javascript".
  const re = new RegExp(`(^|[^a-z0-9+.#])${pattern}([^a-z0-9+.#]|$)`, 'i');
  return re.test(haystackLower);
}
