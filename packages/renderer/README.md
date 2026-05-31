# @resumex/renderer

Pure-JS resume templates and Typst rendering helpers. No dependencies.

## Public API

### `.` (`./src/index.js`)
The package root re-exports everything callers need:

- `renderTemplate(id, resume, opts)` — renders `resume` with template `id` (e.g. `{ pageSize }`), returning a Typst source string.
- `listTemplates()` — returns the list of available template descriptors.
- `getSeed(id)` — returns the seed/sample resume data for template `id`.
- `getFormat(id)` — returns the compiler format for template `id` (`'typst'`).
- `TEMPLATES` — the template registry.
- `DEFAULT_SECTION_TITLES` — default heading text per section key.
- `sectionTitle(resume, key, fallback)` — resolves a section heading (user override wins, then `fallback`, then the built-in default).
- `orderSections(blocks, fallbackOrder, explicitOrder)` — orders rendered section blocks; the resume's explicit order wins, else the template's fallback, with any extras appended.

## Typst helpers (`./src/typst.js`)

Used by the templates to build Typst source. Escaping + inline-Markdown helpers:

- `typ(value)` — escapes characters with Typst markup meaning so user text renders literally.
- `typMd(value)` — escapes text and converts inline Markdown (`**bold**`, `*italic*`, `++highlight++`) to Typst calls.
- `typLink(url, display)` — builds a Typst `#link("url")[display]`.
- `typDate(start, end)` — formats a date range (either side may be missing).
- `typPaper(pageSize)` — maps the app's `pageSize` to a Typst paper name.
- `typIcon(name)` — renders an inline SVG icon from `packages/renderer/icons/`.
- `shortenUrl(url)` — strips the scheme and common host prefixes for display.
