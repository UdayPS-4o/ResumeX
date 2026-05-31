// Deterministic de-buzzwording: strip AI-flavored filler phrases and swap weak
// "résumé-coach" words for plainer ones. No LLM, no network — pure, fast, and
// browser-safe, so the same pass runs in the Vite frontend and the Node backend.
//
// Design mirrors Resume-Matcher's refiner.remove_ai_phrases (AI_PHRASE_BLACKLIST
// / AI_PHRASE_REPLACEMENTS) but is reframed for the Resumex résumé shape and is
// careful to NEVER touch a phrase the caller wants to keep (e.g. a real keyword
// from the target job description — we don't want to delete a skill the JD asks
// for just because it's on the buzzword list, like "robust" or "scalable").

import { AI_WORD_REPLACEMENTS, AI_PHRASE_REPLACEMENTS_RAW } from './dictionary.js';
import { extractJdKeywords } from './keywords.js';

// Public combined replacement map: weak/AI term (lowercase) → plainer text.
// A value of '' means "strip this phrase entirely". Single words and multi-word
// phrases live in one map; debuzzText handles them with the right matcher.
export const AI_PHRASE_REPLACEMENTS = Object.freeze({
  ...AI_PHRASE_REPLACEMENTS_RAW,
  ...AI_WORD_REPLACEMENTS,
});

// Public blacklist: every term we may rewrite or remove (keys of the map above).
// Multi-word phrases first and longest-first so callers that iterate it match
// greedily ("in light of the fact that" before "in order to").
export const AI_PHRASE_BLACKLIST = Object.freeze(
  Object.keys(AI_PHRASE_REPLACEMENTS).sort((a, b) => b.length - a.length),
);

// Phrases (≥1 space) vs single words, precomputed once. Phrases are applied as
// whole-phrase regexes; single words as whole-word regexes with casing carried
// over from the original match.
const PHRASES = AI_PHRASE_BLACKLIST.filter(p => /\s/.test(p)); // already longest-first
const WORDS = AI_PHRASE_BLACKLIST.filter(p => !/\s/.test(p));

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-phrase matcher: tolerant of internal whitespace, bounded so we don't
// match inside another word. Capture groups carry leading/trailing boundaries.
function phraseRegex(phrase) {
  const body = escapeRe(phrase).replace(/\\?\s+/g, '\\s+');
  return new RegExp(`(^|[^\\w-])(${body})(?![\\w-])`, 'gi');
}

// Whole-word matcher for single tokens (hyphenated words count as one token).
function wordRegex(word) {
  return new RegExp(`(^|[^\\w-])(${escapeRe(word)})(?![\\w-])`, 'gi');
}

// Carry the casing of the original word onto its replacement so "Utilized" →
// "Used" (not "used") and "UTILIZED" → "Used"/"USED" stays readable. We only
// bother with first-letter capitalization, which covers résumé bullet starts.
function matchCase(original, replacement) {
  if (!replacement) return replacement;
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// Tidy whitespace/punctuation left behind after a strip-only removal, e.g.
// "I will, going forward, ship" → "I will, ship", and collapse doubled spaces.
function tidy(text) {
  return text
    .replace(/\s+([,.;:!?])/g, '$1')   // space before punctuation
    .replace(/([([])\s+/g, '$1')        // space after an opening bracket
    .replace(/[ \t]{2,}/g, ' ')         // collapse runs of spaces/tabs
    .replace(/ +\n/g, '\n')             // trailing spaces before newline
    .replace(/,\s*,/g, ',')             // doubled commas from a mid-strip
    .replace(/^[\s,;:]+/, '')           // orphaned leading punctuation (phrase was at the start)
    .trim();
}

/**
 * De-buzz a single string.
 *
 * @param {string} str
 * @param {{ keep?: string[] }} [opts] - phrases/words that must NOT be touched
 *        (case-insensitive whole-phrase match). Use this to protect real keywords.
 * @returns {{ text: string, removed: string[] }} the rewritten text and the
 *          distinct blacklist terms that were actually applied.
 */
export function debuzzText(str, opts = {}) {
  if (str == null || str === '') return { text: str == null ? '' : str, removed: [] };
  let text = String(str);
  const keep = new Set((opts.keep || []).map(k => String(k).toLowerCase().trim()).filter(Boolean));
  const removed = new Set();

  const apply = (term, makeRe) => {
    if (keep.has(term)) return;                       // protected keyword — skip
    const replacement = AI_PHRASE_REPLACEMENTS[term] ?? '';
    const re = makeRe(term);
    text = text.replace(re, (m, pre, hit) => {
      removed.add(term);
      const repl = matchCase(hit, replacement);
      // Drop the matched term; keep its leading boundary char. If we replaced
      // with empty, also avoid leaving a doubled space (tidy() finishes the job).
      return repl ? `${pre}${repl}` : pre;
    });
  };

  // Phrases first (longest-first) so they don't get shredded by single-word
  // passes, then single weak words.
  for (const phrase of PHRASES) apply(phrase, phraseRegex);
  for (const word of WORDS) apply(word, wordRegex);

  if (removed.size) text = tidy(text);
  return { text, removed: [...removed] };
}

// Build the protected-keyword set for a résumé pass: every keyword the target
// JD actually asks for, plus any blacklisted term that appears verbatim in the
// JD. We never want to strip a term the job is screening for.
function jdKeepSet(jobDescription) {
  const jd = String(jobDescription || '');
  if (!jd.trim()) return [];
  const keep = new Set();
  const { all } = extractJdKeywords(jd);
  for (const k of all) keep.add(String(k).toLowerCase());
  const lower = jd.toLowerCase();
  for (const term of AI_PHRASE_BLACKLIST) {
    if (lower.includes(term)) keep.add(term);
  }
  return [...keep];
}

/**
 * De-buzz an entire résumé, returning a NEW résumé (no mutation). Only the
 * prose-bearing fields are rewritten — summary, headline, experience bullets,
 * project descriptions/bullets, education details, and award descriptions. We
 * deliberately leave names, titles, companies, and skill tokens alone (a skill
 * literally called "scalable" or a title containing "architected" shouldn't be
 * reworded).
 *
 * @param {object} resume
 * @param {{ jobDescription?: string, keep?: string[] }} [opts]
 * @returns {{ resume: object, removed: string[] }}
 */
export function debuzzResume(resume, opts = {}) {
  if (!resume || typeof resume !== 'object') {
    return { resume: resume, removed: [] };
  }
  const keep = [...jdKeepSet(opts.jobDescription), ...(opts.keep || [])];
  const removed = new Set();

  // Run a string through debuzzText, accumulating removals; passthrough non-strings.
  const clean = v => {
    if (typeof v !== 'string') return v;
    const r = debuzzText(v, { keep });
    for (const t of r.removed) removed.add(t);
    return r.text;
  };
  const cleanArr = arr => (Array.isArray(arr) ? arr.map(clean) : arr);

  const out = { ...resume };

  if (typeof out.summary === 'string') out.summary = clean(out.summary);
  if (typeof out.headline === 'string') out.headline = clean(out.headline);

  if (Array.isArray(out.experience)) {
    out.experience = out.experience.map(e => {
      if (!e || typeof e !== 'object') return e;
      const ne = { ...e };
      if (Array.isArray(ne.bullets)) ne.bullets = cleanArr(ne.bullets);
      if (typeof ne.summary === 'string') ne.summary = clean(ne.summary);
      return ne;
    });
  }

  if (Array.isArray(out.projects)) {
    out.projects = out.projects.map(p => {
      if (!p || typeof p !== 'object') return p;
      const np = { ...p };
      if (typeof np.description === 'string') np.description = clean(np.description);
      if (Array.isArray(np.bullets)) np.bullets = cleanArr(np.bullets);
      return np;
    });
  }

  if (Array.isArray(out.education)) {
    out.education = out.education.map(ed => {
      if (!ed || typeof ed !== 'object') return ed;
      const ne = { ...ed };
      if (Array.isArray(ne.details)) ne.details = cleanArr(ne.details);
      return ne;
    });
  }

  if (Array.isArray(out.awards)) {
    out.awards = out.awards.map(a => {
      if (!a || typeof a !== 'object') return a;
      const na = { ...a };
      if (typeof na.description === 'string') na.description = clean(na.description);
      return na;
    });
  }

  return { resume: out, removed: [...removed] };
}
