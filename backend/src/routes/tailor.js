import { Router } from 'express';
import { complete, buildTailorPrompt, RESUME_DELIM, parseModelJson, sanitizeJobText } from '@resumex/llm';
import { mergeResume, emptyResume, itemName, ARRAY_KEYS } from '@resumex/core';
import { debuzzResume, analyzeKeywordGaps } from '@resumex/ats';

const router = Router();

// ── Anti-hallucination gates ──────────────────────────────────────────────────
// The tailoring model returns a FULL résumé. Before we hand it back to the client
// we run it through deterministic guardrails that mirror Resume-Matcher's
// `validate_master_alignment`: identity/dates can never change, invented metrics
// are stripped, and skills are append-or-reorder only. The model is a writing
// assistant — these gates make sure it can't fabricate the candidate's history.

// Structural sub-fields that define an item's identity / timeline. The model may
// rewrite prose (bullets, details, description) but never these.
const IDENTITY_FIELDS = {
  experience: ['company', 'title', 'location', 'start', 'end'],
  education: ['school', 'degree', 'location', 'start', 'end', 'gpa'],
  projects: ['name', 'link'],
  certifications: ['name', 'issuer', 'date'],
  awards: ['name', 'issuer', 'date'],
  skills: ['category'],
};

// Pull every standalone number-ish token out of a string: 42, 3.5, 1,000, 40%, $2M, 10x.
const NUMBER_RE = /\$?\d[\d,.]*\s?(?:%|k|m|b|x|\+)?/gi;
function numbersIn(text) {
  if (typeof text !== 'string') return [];
  return (text.match(NUMBER_RE) || []).map((n) => n.replace(/\s+/g, '').toLowerCase());
}

// Concatenate all the free text of one item (or the whole résumé scalar block) so
// we can ask "did this number exist ANYWHERE in the original for this thing?".
function itemText(item) {
  if (!item || typeof item !== 'object') return '';
  const parts = [];
  for (const v of Object.values(item)) {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') parts.push(x);
  }
  return parts.join('  ');
}

// (b) Reject any number/%/$ in `tailored` that has no source in `originalText`.
// If a tailored string introduces a fresh metric, fall back to `originalString`
// (its matched original) when we have one, otherwise drop the string entirely.
function gateMetrics(tailoredString, originalString, originalText) {
  if (typeof tailoredString !== 'string') return tailoredString;
  const allowed = new Set(numbersIn(originalText));
  const invented = numbersIn(tailoredString).filter((n) => !allowed.has(n));
  if (invented.length === 0) return tailoredString;
  // A bullet/sentence that smuggled in an unsupported number is untrustworthy —
  // restore the original wording, or drop it if it's brand-new (no original).
  return typeof originalString === 'string' ? originalString : null;
}

// Gate a list of prose strings (bullets / details): keep order/rewrites the model
// proposed, but scrub invented metrics. New strings (no positional original) are
// dropped if they invent a number; revised strings revert to their original.
function gateStringList(tailoredArr, originalArr, originalText) {
  if (!Array.isArray(tailoredArr)) return Array.isArray(originalArr) ? originalArr : tailoredArr;
  const out = [];
  for (let i = 0; i < tailoredArr.length; i++) {
    const original = Array.isArray(originalArr) ? originalArr[i] : undefined;
    const gated = gateMetrics(tailoredArr[i], original, originalText);
    if (gated != null && gated !== '') out.push(gated);
  }
  // Never let the gate shrink a section to nothing if the original had content.
  return out.length === 0 && Array.isArray(originalArr) && originalArr.length ? originalArr : out;
}

// Normalized identity tokens for fuzzy item matching (so a light rename like
// "Acme" → "Acme Corp" or "Engineer" → "Staff Engineer" still pairs to its
// original, letting us snap identity/dates back while keeping the model's bullet
// rewrites — instead of discarding the whole entry as "invented").
function idTokens(key, item) {
  if (!item || typeof item !== 'object') return [];
  const fields = key === 'experience' ? ['company', 'title']
    : key === 'education' ? ['school', 'degree']
    : key === 'projects' ? ['name']
    : key === 'skills' ? ['category']
    : ['name'];
  return fields
    .map((f) => (typeof item[f] === 'string' ? item[f].trim().toLowerCase() : ''))
    .filter(Boolean);
}
function fuzzyMatchIndex(key, tItem, originals, taken) {
  const tt = idTokens(key, tItem);
  if (!tt.length) return -1;
  let best = -1, bestScore = 0;
  originals.forEach((o, i) => {
    if (taken.has(i)) return;
    const ot = idTokens(key, o);
    // Score = number of identity tokens where one string contains the other.
    let score = 0;
    for (const a of tt) for (const b of ot) if (a === b || a.includes(b) || b.includes(a)) { score++; break; }
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return bestScore > 0 ? best : -1;
}

// Gate one array section: match each tailored item to its original (exact item
// name → fuzzy identity → positional fallback), force-restore identity/date
// fields, scrub invented metrics in prose, and re-append any original item the
// model dropped (so tailoring never deletes real history).
function gateArraySection(key, tailoredArr, originalArr) {
  const originals = Array.isArray(originalArr) ? originalArr : [];
  const tailored = Array.isArray(tailoredArr) ? tailoredArr : [];
  const origByName = new Map();
  originals.forEach((it, i) => origByName.set(itemName(key, it, i), it));

  const idFields = IDENTITY_FIELDS[key] || [];
  // Prose arrays the model may rewrite: education uses "details", everything else "bullets".
  const proseFields = key === 'education' ? ['details'] : ['bullets'];
  const samelen = originals.length === tailored.length;
  const taken = new Set();

  // Resolve each tailored item to the index of its matching original (or -1).
  const matchIdx = tailored.map((item, i) => {
    if (!item || typeof item !== 'object') return -1;
    const exact = originals.findIndex((o, j) => !taken.has(j) && itemName(key, o, j) === itemName(key, item, i));
    let idx = exact;
    if (idx === -1) idx = fuzzyMatchIndex(key, item, originals, taken);
    // Last resort: if both arrays are the same length, pair by position so a
    // simultaneous rename of company AND title still snaps back to the original.
    if (idx === -1 && samelen && !taken.has(i)) idx = i;
    if (idx !== -1) taken.add(idx);
    return idx;
  });

  const gated = tailored.map((item, i) => {
    if (!item || typeof item !== 'object') return item;
    const idx = matchIdx[i];
    const original = idx !== -1 ? originals[idx] : undefined;
    if (!original) return item; // genuinely new item — dropInventedItems decides its fate

    const merged = { ...item };
    // Force-restore identity + dates from the original; the model can't touch them.
    for (const f of idFields) if (original[f] !== undefined) merged[f] = original[f];
    // Scrub invented metrics in prose arrays against the ORIGINAL item's full text.
    const srcText = itemText(original);
    for (const f of proseFields) {
      if (Array.isArray(item[f]) || Array.isArray(original[f])) {
        merged[f] = gateStringList(item[f], original[f], srcText);
      }
    }
    // Project description is a scalar prose field.
    if (key === 'projects' && (typeof item.description === 'string' || typeof original.description === 'string')) {
      merged.description = gateMetrics(item.description, original.description, srcText) ?? original.description ?? '';
    }
    return merged;
  });

  // Re-append any original item that no tailored item matched — never lose history.
  originals.forEach((original, j) => {
    if (!taken.has(j)) gated.push(original);
  });
  return gated;
}

// (a) Drop brand-new experience/education/cert items the model invented (no
// matching identity in the original). Projects/awards are allowed to be added
// since a tailored résumé may legitimately surface an existing side project the
// master happened to omit — but we keep the conservative default of NOT inventing
// new history-bearing entries (experience, education, certifications).
const NO_NEW_ITEMS = new Set(['experience', 'education', 'certifications']);
function dropInventedItems(key, gatedArr, originalArr) {
  if (!NO_NEW_ITEMS.has(key)) return gatedArr;
  const origNames = new Set((originalArr || []).map((it, i) => itemName(key, it, i)));
  return gatedArr.filter((it, i) => origNames.has(itemName(key, it, i)));
}

// (c) Skills are append-or-reorder only: every original skill (per category) must
// survive. Rebuild each category preserving all original items, allow reordering
// and additions, and restore any whole category the model dropped.
function gateSkills(tailoredSkills, originalSkills) {
  const orig = Array.isArray(originalSkills) ? originalSkills : [];
  const tailored = Array.isArray(tailoredSkills) ? tailoredSkills : [];
  const origByCat = new Map();
  orig.forEach((c, i) => origByCat.set(itemName('skills', c, i), c));

  const lc = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '');

  // Master-alignment (mirrors Resume-Matcher's validate_master_alignment): a
  // tailored résumé may REORDER or RE-CATEGORIZE skills, but it may never claim a
  // skill the candidate doesn't actually have. Ground every tailored skill token
  // against the master's full skill set; originals are always restored, so this
  // only removes model-invented net-new skills (the real fabrication risk).
  const masterSet = new Set();
  for (const c of orig) for (const s of (Array.isArray(c?.items) ? c.items : [])) { const v = lc(s); if (v) masterSet.add(v); }
  const groundItems = (items) => (Array.isArray(items) ? items.filter((s) => masterSet.has(lc(s))) : []);

  const seen = new Set();
  const out = [];
  tailored.forEach((cat, i) => {
    if (!cat || typeof cat !== 'object') return;
    const name = itemName('skills', cat, i);
    const original = origByCat.get(name);
    if (original) {
      seen.add(name);
      const tItems = groundItems(cat.items);            // drop invented skills, keep model order
      const present = new Set(tItems.map(lc));
      const restored = [...tItems];
      for (const s of (Array.isArray(original.items) ? original.items : [])) if (!present.has(lc(s))) restored.push(s);
      out.push({ ...cat, category: original.category, items: restored });
    } else {
      // A brand-new category is allowed ONLY for skills already in the master.
      const grounded = groundItems(cat.items);
      if (grounded.length) out.push({ ...cat, items: grounded });
    }
  });

  // Restore any original category the model omitted entirely.
  for (const [name, original] of origByCat) {
    if (!seen.has(name)) out.push(original);
  }
  return out;
}

// Run the full gate set over the model's proposed résumé, grounded to the master.
// Returns a sanitized résumé JSON in the canonical shape — safe to merge and to
// feed the suggestion-card diff on the client.
function applyGates(original, proposed) {
  const orig = original || {};
  const prop = proposed && typeof proposed === 'object' ? proposed : {};
  const out = { ...prop };

  // (a) Identity scalars: name + contact are never the model's to change.
  out.name = orig.name ?? prop.name ?? '';
  out.contact = { ...(orig.contact || {}) };

  // Array sections: gate prose + identity, drop invented history, append dropped.
  for (const key of ARRAY_KEYS) {
    if (key === 'skills') {
      out.skills = gateSkills(prop.skills, orig.skills);
      continue;
    }
    let gated = gateArraySection(key, prop[key], orig[key]);
    gated = dropInventedItems(key, gated, orig[key]);
    out[key] = gated;
  }

  // (b) Scalar summary: scrub invented metrics against the original summary.
  if (typeof prop.summary === 'string') {
    out.summary = gateMetrics(prop.summary, orig.summary, orig.summary || '') ?? orig.summary ?? '';
  }

  return out;
}

// POST /api/tailor
// body: { provider, model, apiKey, baseUrl, resume, jobDescription, job, strategy }
// -> { message, resume, patch, notes }
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, baseUrl, resume = emptyResume(), jobDescription: rawJobDescription = '', job = null, strategy } = req.body || {};
    const jobDescription = sanitizeJobText(rawJobDescription); // neutralize prompt-injection in the pasted JD
    if (!jobDescription || !jobDescription.trim()) {
      const err = new Error('jobDescription required');
      err.status = 400;
      throw err;
    }

    const prompt = buildTailorPrompt(resume, jobDescription, { job, strategy });
    const { text } = await complete({
      provider, model, apiKey, baseUrl,
      system: 'You are an expert résumé editor. Reply with a short message, then the delimiter, then the full résumé JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const { message, resumeJson } = splitResponse(text);

    // If the model gave us nothing parseable, return a no-op (no changes) rather
    // than 500 — the client just shows the message with no cards.
    if (!resumeJson) {
      return res.json({ message: message || text.slice(0, 1000), resume, patch: null, notes: [] });
    }

    // ── Anti-hallucination gates (deterministic, grounded to the master) ──
    // `gatedJson` is `let` and `notes` is declared up-front so the refinement seam
    // below is a literal drop-in (no refactor needed when task #5/#10 lands).
    let gatedJson = applyGates(resume, resumeJson);
    const notes = [];

    // ── Refinement engine (task #5) ──────────────────────────────────────────
    // Deterministic, gate-safe passes from @resumex/ats: strip AI buzzwords /
    // filler (never touching a term the JD itself uses), then flag any JD
    // keywords still missing. Re-run the gates after the rephrase so the master
    // stays authoritative. Best-effort — any failure ships the gated output.
    try {
      const { resume: cleaned, removed } = debuzzResume(gatedJson, { jobDescription });
      gatedJson = applyGates(resume, cleaned);
      if (removed?.length) {
        notes.push(`Cleaned ${removed.length} filler/buzz phrase${removed.length === 1 ? '' : 's'}.`);
      }
      const gaps = analyzeKeywordGaps(gatedJson, job?.keywords?.length ? job.keywords : jobDescription);
      if (gaps?.missing?.length) {
        notes.push(`${gaps.missing.length} job keyword${gaps.missing.length === 1 ? '' : 's'} still not reflected.`);
      }
    } catch {
      /* refinement is best-effort; ship the gated output as-is */
    }

    // ── REFINEMENT-ENGINE SEAM (task #5 / integration task #10) ───────────────
    // The @resumex/ats refinement passes plug in HERE, operating on `gatedJson`
    // (already grounded to the master) before the merge. The relevant exports
    // (packages/ats/src) are gate-safe — they only rephrase/reorder, never
    // fabricate — so the gates above remain authoritative. Wire them like:
    //
    //   import { debuzzResume } from '@resumex/ats';        // strip AI buzzwords / em-dashes
    //   import { analyzeKeywordGaps } from '@resumex/ats';  // which JD keywords are surfaceable
    //   const { resume: cleaned } = debuzzResume(gatedJson);
    //   gatedJson = cleaned;
    //   notes.push(...);  // e.g. a summary of analyzeKeywordGaps(gatedJson, job) for the UI
    //
    // (A keyword-injection pass that adds JD terms must re-run applyGates on its
    // output, or restrict edits to master-supported content.) Until task #10
    // lands we ship the gated output directly.

    // `patch` is the gated full-résumé JSON the client diffs against the master to
    // build per-section suggestion cards (diffResume → splitChangesIntoCards). The
    // merged `resume` mirrors chat.js: mergeResume(master, gatedJson).
    const merged = mergeResume(resume, gatedJson);
    res.json({ message: message || 'Tailored your résumé to the job.', resume: merged, patch: gatedJson, notes });
  } catch (e) {
    next(e);
  }
});

// Split "<message>\n<<<RESUME_JSON>>>\n{json}" into parts. Copied from chat.js's
// helper — tolerant of the model omitting the delimiter or fencing the JSON.
function splitResponse(text) {
  if (!text) return { message: '', resumeJson: null };
  const idx = text.indexOf(RESUME_DELIM);
  if (idx === -1) {
    const obj = parseModelJson(text);
    if (obj && (obj.message || obj.resume)) {
      return { message: obj.message || '', resumeJson: obj.resume || null };
    }
    return { message: text.trim(), resumeJson: null };
  }
  const message = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + RESUME_DELIM.length);
  return { message, resumeJson: parseModelJson(jsonPart) };
}

export default router;
