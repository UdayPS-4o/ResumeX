# @resumex/renderer

Pure-JS resume templates and LaTeX rendering helpers. No dependencies.

## Public API

### `.` (`./src/index.js`)
- `listTemplates()` — returns the list of available template descriptors.
- `renderTemplate(id, resume, opts)` — renders resume `resume` with template `id` using options `opts`.
- `getSeed(id)` — returns the seed/sample resume data for template `id`.
- `TEMPLATES` — the template registry.

### `./latex` (`./src/latex.js`)
LaTeX string helpers:
- `tex(...)` — escapes/builds raw LaTeX text.
- `mdTex(...)` — converts lightweight markdown to LaTeX.
- `hrefTex(url, label)` — builds a LaTeX hyperlink.
- `dateRange(start, end)` — formats a date range.
- `joinTex(parts, sep)` — joins LaTeX fragments.
- `sectionTitle(title)` — renders a section title.
- `orderSections(resume, order)` — orders resume sections for output.
