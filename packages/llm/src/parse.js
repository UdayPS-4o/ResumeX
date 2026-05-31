// Canonical tolerant JSON parser for model output. Handles raw JSON, markdown
// ```json fences, and JSON embedded in surrounding prose. Returns the parsed
// object, or null if nothing parseable is found.
export function parseModelJson(text) {
  if (!text) return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

// Tolerant parser for the ACTIONS channel — expects a JSON array of action
// objects. Accepts a bare array, a ```json fence, an array embedded in prose, or
// an object wrapper like { "actions": [...] }. Returns an array (possibly empty)
// or null when nothing parseable is present.
export function parseModelActions(text) {
  if (!text || !text.trim()) return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const tryParse = (str) => { try { return JSON.parse(str); } catch { return undefined; } };
  const coerce = (v) => (Array.isArray(v) ? v : (v && Array.isArray(v.actions) ? v.actions : null));

  let parsed = tryParse(s);
  let out = coerce(parsed);
  if (out) return out;

  const first = s.indexOf('[');
  const last = s.lastIndexOf(']');
  if (first !== -1 && last > first) {
    out = coerce(tryParse(s.slice(first, last + 1)));
    if (out) return out;
  }
  // Last resort: an object wrapper { "actions": [...] } parsed by the object parser.
  out = coerce(parseModelJson(s));
  return out;
}
