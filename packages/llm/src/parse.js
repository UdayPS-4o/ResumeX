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
