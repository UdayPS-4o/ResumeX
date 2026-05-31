// Keyword-gap analysis: given a résumé and the keywords a job description asks
// for, report which are matched, which are missing, and — the useful part —
// which of the missing ones are *injectable* (plausibly already supported by the
// résumé, so a tailoring pass could surface them without fabricating anything).
//
// Builds on matchKeywords/resumeToText from keywords.js. Pure & browser-safe.

import { matchKeywords, extractJdKeywords, resumeToText } from './keywords.js';
import { tokenize, normalizeToken, containsPhrase, STOPWORDS } from './text.js';

// Coerce the flexible `jdKeywords` argument into a flat keyword list + an
// optional raw-JD string (needed for the matcher's phrase/alias handling).
//   - string                       → treat as a raw job description, extract from it
//   - { skills, terms, all } object → use `.all` (falls back to skills+terms)
//   - array of strings              → use as-is
function normalizeJdInput(jdKeywords) {
  if (jdKeywords == null) return { keywords: [], jd: '' };
  if (typeof jdKeywords === 'string') {
    const ex = extractJdKeywords(jdKeywords);
    return { keywords: ex.all, jd: jdKeywords };
  }
  if (Array.isArray(jdKeywords)) {
    return { keywords: jdKeywords.filter(Boolean).map(String), jd: '' };
  }
  if (typeof jdKeywords === 'object') {
    const all = jdKeywords.all
      || [...(jdKeywords.skills || []), ...(jdKeywords.terms || [])];
    return { keywords: (all || []).filter(Boolean).map(String), jd: '' };
  }
  return { keywords: [], jd: '' };
}

/**
 * Analyze JD-keyword coverage for a résumé.
 *
 * @param {object} resume - Resumex résumé JSON.
 * @param {string|string[]|{skills?:string[],terms?:string[],all?:string[]}} jdKeywords
 *        Either a raw job description, a flat keyword array, or the object
 *        returned by extractJdKeywords().
 * @returns {{ matched: string[], missing: string[], injectable: string[], percent: number }}
 *   - matched:    keywords found in the résumé (whole-word / alias-aware).
 *   - missing:    keywords not found.
 *   - injectable: subset of `missing` that the résumé plausibly already supports
 *                 (a related form / same-family token is present) — safe to weave
 *                 in during tailoring. See isInjectable() for the heuristic.
 *   - percent:    integer 0..100 share of keywords matched.
 */
export function analyzeKeywordGaps(resume, jdKeywords) {
  const { keywords, jd } = normalizeJdInput(jdKeywords);
  const deduped = [...new Set(keywords.map(k => String(k).trim()).filter(Boolean))];
  if (deduped.length === 0) {
    return { matched: [], missing: [], injectable: [], percent: 0 };
  }

  // Reuse the production matcher (handles aliases, phrases, dotted skills). When
  // we were handed a flat keyword list we feed it a synthetic JD — the keywords
  // joined — so extractJdKeywords inside matchKeywords re-recognizes them.
  const jdText = jd && jd.trim() ? jd : deduped.join('. ') + '.';
  const m = matchKeywords(resume, jdText);

  const resumeText = resumeToText(resume);
  const resumeLower = resumeText.toLowerCase();
  const resumeKeys = new Set(tokenize(resumeText).map(normalizeToken));

  const matched = [];
  const missing = [];
  if (m) {
    // matchKeywords already classified what it extracted; intersect with our
    // requested list so the output is keyed to exactly what the caller asked for.
    const matchedSet = new Set(m.matched.map(s => s.toLowerCase()));
    for (const kw of deduped) {
      (matchedSet.has(kw.toLowerCase()) ? matched : missing).push(kw);
    }
  } else {
    // Matcher found nothing extractable (e.g. all-stopword list): fall back to a
    // direct phrase presence test per keyword.
    for (const kw of deduped) {
      (containsPhrase(resumeLower, kw.toLowerCase()) ? matched : missing).push(kw);
    }
  }

  const injectable = missing.filter(kw => isInjectable(kw, resumeKeys, resumeLower));

  const percent = Math.round((matched.length / deduped.length) * 100);
  return { matched, missing, injectable, percent };
}

// Heuristic for "the résumé plausibly already supports this missing keyword".
// Deliberately simple and conservative — we only claim injectability when there
// is concrete textual evidence of a related form, never a blind guess:
//   1. Multi-word keyword: at least one of its significant (non-stopword) tokens
//      already appears in the résumé (JD "data engineering" ↔ résumé "data
//      pipelines" — the "data" family is present, so it's reframable).
//   2. Single-word keyword: a normalized (singular/plural-folded) form of the
//      word appears in the résumé even though the strict match missed it.
// Anything with zero textual footprint stays in `missing` only (not injectable),
// because surfacing it would risk fabricating a skill the candidate lacks.
function isInjectable(keyword, resumeKeys, resumeLower) {
  const kw = String(keyword).toLowerCase().trim();
  if (!kw) return false;

  if (/\s/.test(kw)) {
    const toks = tokenize(kw).filter(t => !STOPWORDS.has(t)).map(normalizeToken);
    if (toks.length === 0) return false;
    // Present but not as a contiguous phrase → reframable from existing material.
    return toks.some(t => resumeKeys.has(t)) && !containsPhrase(resumeLower, kw);
  }

  const norm = normalizeToken(kw);
  return resumeKeys.has(norm);
}
