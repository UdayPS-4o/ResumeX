// Typst renderer for the standalone cover letter PDF (task #6).
//
// Produces a clean, minimal, brand-appropriate letter: a letterhead with the
// candidate's name + a single contact line, the date, then the body paragraphs.
// This is a LETTER, not a résumé — ATS parsing is irrelevant here, so we optimise
// for looking like a real, well-typeset cover letter.
//
// The document is fully self-contained: it uses NO external Typst packages, so it
// compiles with the vendored offline `typst` binary just like the résumé sources.
// (Inspired by neat-cv/src/letter.typ, but deliberately dependency-free.)

// Escape characters that carry markup meaning in Typst *content* mode so arbitrary
// user text renders literally. Backslash is matched first so it is safely doubled.
function esc(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\\#$*_`\[\]<>@~]/g, (ch) => '\\' + ch);
}

// A Typst string literal (for #set document(...) etc.). JSON.stringify yields a
// valid Typst string — Typst shares the \" and \\ escapes.
function str(value) {
  return JSON.stringify(String(value ?? ''));
}

// Build the single contact line shown under the name. Keeps only the fields that
// read well in a letter header; joins with a thin dot separator.
function contactLine(contact = {}) {
  const c = contact || {};
  const parts = [c.email, c.phone, c.location, c.linkedin, c.website]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean)
    .map(esc);
  if (!parts.length) return '';
  return parts.join(' #h(0.4em) #text(fill: rule-color)[#sym.bullet] #h(0.4em) ');
}

// Split the model's plain-text body into paragraphs (blank-line separated). Within
// a paragraph, single newlines become explicit Typst line breaks so deliberate
// wrapping (e.g. a list the model produced) is preserved. Strips any stray leading
// salutation/sign-off is left to the prompt — here we just lay out what we get.
function bodyBlocks(body = '') {
  const text = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paras
    .map((p) => esc(p).split('\n').join(' \\\n'))
    .join('\n\n');
}

/**
 * Render a cover letter as a self-contained Typst document string.
 *
 * @param {object}  args
 * @param {string}  args.name     Candidate name (letterhead).
 * @param {object}  args.contact  { email, phone, location, linkedin, website, ... }
 * @param {string} [args.date]    Pre-formatted date string from the client (e.g.
 *                                "June 5, 2026"). Omitted from the letter if blank.
 *                                We intentionally do NOT call Date() here.
 * @param {string}  args.body     The letter body (plain text, blank-line paragraphs).
 * @returns {string} Typst source ready for compileSource().
 */
export function renderCoverLetterTypst({ name, contact, date, body } = {}) {
  const safeName = esc(name) || 'Your Name';
  const line = contactLine(contact);
  const dateStr = date == null ? '' : String(date).trim();
  const blocks = bodyBlocks(body);

  return `#set document(title: ${str((name && String(name).trim()) || 'Cover Letter')}, author: ${str((name && String(name).trim()) || '')})
#set page(paper: "a4", margin: (x: 1in, y: 1in))
#set text(font: ("Arial", "Helvetica Neue", "Liberation Sans"), size: 11pt, fill: rgb("#1E2330"))
#set par(leading: 0.65em, spacing: 1.1em, justify: true)

#let brand = rgb("#2062C9")
#let rule-color = rgb("#C9D4E5")
#let muted = rgb("#5A6273")

// Letterhead — name in brand blue, a single quiet contact line, then a hairline.
#text(size: 20pt, weight: "bold", fill: brand)[${safeName}]
${line ? `\n#v(3pt)\n#text(size: 9.5pt, fill: muted)[${line}]\n` : ''}
#v(8pt)
#line(length: 100%, stroke: 0.6pt + rule-color)
#v(16pt)

${dateStr ? `#text(fill: muted)[${esc(dateStr)}]\n#v(14pt)\n` : ''}${blocks || '#text(fill: rgb("#9AA3B2"))[Your cover letter will appear here.]'}
`;
}

export default renderCoverLetterTypst;
