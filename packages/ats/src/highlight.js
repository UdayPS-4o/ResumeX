// Inline keyword highlighting: split a block of résumé/JD text into renderable
// segments, flagging which ones are keyword matches. Whole-word and
// case-insensitive, mirroring Resume-Matcher's keyword-matcher.ts
// segmentTextByKeywords so the UI can wrap matched tokens in a <mark>.
//
// Pure and browser-safe (the frontend bundles this directly). No DOM, no LLM.

import { STOPWORDS } from './text.js';

// Token = a run of letters/digits plus the tech-name characters we keep so
// "node.js", "c++", "c#", and "ci/cd" survive as single tokens. Everything else
// (whitespace, commas, parens, etc.) is a separator we preserve verbatim.
const TOKEN_CHARS = 'a-zA-Z0-9+.#/-';
const SPLIT_RE = new RegExp(`([^${TOKEN_CHARS}]+)`);
const IS_TOKEN_RE = new RegExp(`^[${TOKEN_CHARS}]+$`);

const MIN_KEYWORD_LEN = 2;

// Normalize one token for comparison: lowercase, strip leading/trailing
// separators that may have clung on (e.g. "-React" → "react", "C++." → "c++").
function normToken(part) {
  return part.toLowerCase().replace(/^[.+#/-]+/, '').replace(/[.+#/-]+$/, '');
}

// Flatten a keyword list/Set into a lowercase Set of single comparable tokens.
// Multi-word keywords ("machine learning") are split so each component word can
// highlight individually — token-level segmentation can't match a phrase as one
// unit, and highlighting both words is the useful, predictable behavior.
function toKeywordSet(keywords) {
  const set = new Set();
  if (!keywords) return set;
  const list = keywords instanceof Set ? [...keywords] : (Array.isArray(keywords) ? keywords : [keywords]);
  for (const kw of list) {
    if (kw == null) continue;
    for (const part of String(kw).split(SPLIT_RE)) {
      if (!part || !IS_TOKEN_RE.test(part)) continue;
      const t = normToken(part);
      if (t) set.add(t);
    }
  }
  return set;
}

/**
 * Segment text by keyword matches.
 *
 * @param {string} text
 * @param {string[]|Set<string>} keywords - keywords to highlight (case-insensitive).
 *        Multi-word entries highlight each of their component words.
 * @returns {Array<{ text: string, isMatch: boolean }>} segments in original order;
 *          concatenating every `.text` reproduces the input exactly.
 */
export function segmentByKeywords(text, keywords) {
  if (text == null || text === '') return [];
  const kw = toKeywordSet(keywords);
  const segments = [];
  for (const part of String(text).split(SPLIT_RE)) {
    if (!part) continue;
    if (IS_TOKEN_RE.test(part)) {
      segments.push({ text: part, isMatch: kw.size > 0 && kw.has(normToken(part)) });
    } else {
      segments.push({ text: part, isMatch: false }); // whitespace / punctuation
    }
  }
  return segments;
}

/**
 * Cheap stopword-filtered keyword extraction for callers that only have raw
 * text (e.g. "highlight everything meaningful in this bullet"). Returns a Set of
 * distinct lowercase tokens, dropping stopwords, pure numbers, and 1-char tokens.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractKeywords(text) {
  const set = new Set();
  if (!text) return set;
  for (const part of String(text).split(SPLIT_RE)) {
    if (!part || !IS_TOKEN_RE.test(part)) continue;
    const t = normToken(part);
    if (t.length < MIN_KEYWORD_LEN) continue;
    if (/^\d+$/.test(t)) continue;        // pure numbers aren't keywords
    if (STOPWORDS.has(t)) continue;
    set.add(t);
  }
  return set;
}
