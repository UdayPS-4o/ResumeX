// Helpers for the ATS modal's inline keyword-highlight view.
//
// DECOUPLING: a parallel task is adding `segmentByKeywords` to @resumex/ats, but
// it may not be present when this builds. So we resolve it defensively — use the
// package export if it's a function, otherwise fall back to the local
// implementation below. Either way callers get the same shape: an array of
// { text, isMatch } segments that preserve the original text exactly.

import { segmentByKeywords as atsSegmentByKeywords } from '@resumex/ats';

// Whole-word, case-insensitive segmentation. Splits on the same word character
// class used to tokenize (letters, digits, hyphen, plus, dot, hash — so "node.js",
// "c++", "ci-cd" stay intact) while preserving every original character so the
// rejoined segments reconstruct `text` byte-for-byte.
const WORD_CHARS = "a-z0-9+.#-";
const SPLIT_RE = new RegExp(`([^${WORD_CHARS}]+)`, 'i');
const WORD_TEST = new RegExp(`^[${WORD_CHARS}]+$`, 'i');

export function localSegmentByKeywords(text, keywords) {
  const src = String(text || '');
  if (!src) return [];
  const set = toLowerSet(keywords);
  if (set.size === 0) return [{ text: src, isMatch: false }];

  const out = [];
  for (const part of src.split(SPLIT_RE)) {
    if (!part) continue;
    if (WORD_TEST.test(part)) {
      // Trim leading/trailing connector chars before comparing, so a trailing
      // period or hyphen in prose ("React.") still matches the "react" keyword.
      const clean = part.toLowerCase().replace(/^[.#+-]+|[.#+-]+$/g, '');
      out.push({ text: part, isMatch: set.has(clean) || set.has(part.toLowerCase()) });
    } else {
      out.push({ text: part, isMatch: false });
    }
  }
  return out;
}

// Resolve the package export if present, else the local fallback. Accepts a
// keyword list (array or Set) — if the package version wants a Set we hand it
// one so both signatures are satisfied.
export function segmentByKeywords(text, keywords) {
  if (typeof atsSegmentByKeywords === 'function') {
    return atsSegmentByKeywords(text, normalizeKeywords(keywords));
  }
  return localSegmentByKeywords(text, keywords);
}

// Expand matched keywords (which can be multi-word phrases like "machine
// learning" or "ci/cd") into the individual lowercased word tokens that the
// segmenter compares against, so every constituent word lights up.
export function highlightTokens(matched = []) {
  const tokens = new Set();
  for (const kw of matched) {
    for (const t of String(kw).toLowerCase().split(/[^a-z0-9+.#-]+/)) {
      if (t) tokens.add(t.replace(/^[.#+-]+|[.#+-]+$/g, ''));
    }
  }
  tokens.delete('');
  return tokens;
}

// Ring/accent color for a 0-100 score, per the feature spec's thresholds.
export function ringColor(score) {
  return score >= 75 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#ef4444';
}

// Tone for a 0..1 category ratio (meter fill / label color).
export function ratioColor(ratio) {
  return ratio >= 0.8 ? '#16a34a' : ratio >= 0.5 ? '#f59e0b' : '#ef4444';
}

function toLowerSet(keywords) {
  if (keywords instanceof Set) {
    const s = new Set();
    for (const k of keywords) s.add(String(k).toLowerCase());
    return s;
  }
  return new Set((keywords || []).map(k => String(k).toLowerCase()));
}

function normalizeKeywords(keywords) {
  // The package implementation (if any) is expected to take a Set<string>.
  return keywords instanceof Set ? keywords : new Set((keywords || []).map(k => String(k).toLowerCase()));
}
