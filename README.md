# Resumex

A chat-driven LaTeX résumé builder. Talk to it like a coach, and it lays out
your résumé in a polished template — live preview on the right, downloadable
PDF or `.tex` source any time.

![architecture](https://img.shields.io/badge/stack-React%2019%20%2B%20Node-2563eb)
![providers](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude%20%7C%20OpenAI-1f2937)

## Features

- **Dashboard of saved resumes**. Create, open, rename, duplicate, and delete
  multiple resumes — each keeps its own chat history, template, and content
  (stored in your browser's localStorage).
- **Chat → resume**. Conversational extraction of name, contact, summary,
  experience, education, projects, skills, certifications, awards. The model
  returns a structured update each turn; the renderer pours it into the
  selected LaTeX template.
- **Import an existing resume**. Upload a PDF or Word (`.docx`) file when
  creating a new resume — the text is extracted and structured into the builder
  automatically.
- **Image input in chat**. Attach, drag-drop, or paste (Ctrl+V) screenshots —
  e.g. a photo of an old resume or a job posting — and the vision-capable model
  reads them.
- **ATS compatibility scorer**. One click gives a 0–100 readiness score with a
  category breakdown (contact, sections, quantified impact, action verbs,
  dates, keywords, conciseness), concrete fixes, and — with a key — LLM keyword
  suggestions tailored to a pasted job description.
- **Bring your own provider**. Pick Google Gemini, Anthropic Claude, or OpenAI
  from the in-app Settings panel. API keys stay in your browser's localStorage
  and are sent straight to the provider — the backend never persists them.
- **Four hand-built templates**: *Jake* (the popular GitHub Jake Gutierrez
  style), *Modern* (blue accent bar), *Classic* (serif, conservative),
  *Compact* (dense, senior-engineer-friendly). Switch templates any time from
  the editor; your content reflows.
- **Live PDF preview**. `npm run setup` installs a local **Tectonic** engine so
  compiles run fast and **fully offline** — no resume data leaves your machine.
  A system `tectonic`/`pdflatex` is used if present, with online compilers
  ([ytotech](https://latex.ytotech.com), [latexonline.cc](https://latexonline.cc))
  only as a last-resort fallback.
- **Job-match mode**. Paste a job description and get a fit score, missing
  keywords, suggested edits, and a tailored summary you can apply with one
  click.
- **Download** the polished PDF or the raw `.tex` source.

## Quick start

```powershell
npm run setup    # installs deps (root/backend/frontend) + a local Tectonic engine
npm run dev      # backend → http://localhost:8000, frontend → http://localhost:5173
```

`npm run setup` works on Windows, macOS, and Linux — it downloads the Tectonic
build for your OS/arch, vendors it into `backend/vendor/`, and warms its
package cache so compiles are **fully offline** afterward. Then open
http://localhost:5173, click **Settings**, paste an API key for whichever
provider you'd like, and start chatting.

## Offline LaTeX compilation

The backend compiles resumes with **Tectonic** locally — no resume data ever
leaves your machine. `npm run setup` handles this automatically; the engine is
auto-detected from `backend/vendor/`, so there's nothing to configure.

Re-run just the engine step any time:

```powershell
npm run install-engine              # reinstall/repair the vendored engine
npm run install-engine -- --force   # force re-download
npm run install-engine -- --skip-warm   # install only, skip cache warm-up
```

Prefer a system-wide install? Any `tectonic` or `pdflatex` on your `PATH` is
detected too (`winget install TectonicProject.Tectonic`, or `scoop`/`choco`).
You can also point at one explicitly via `TECTONIC_PATH` / `PDFLATEX_PATH` in
`backend/.env`.

`GET /api/health` reports the active engine
(`"compile": { "mode": "local", "engine": "tectonic" }`). Force behaviour with
`COMPILE_MODE` (`local` requires the native engine and never goes online;
`auto` falls back to online services; `online` forces them).

> **Note:** the first compile downloads Tectonic's TeX package bundle once and
> caches it permanently. `npm run setup` pre-warms this, so a machine that's
> already been set up compiles with no network at all.

> No key handy? Get one in a couple minutes:
> - Gemini (free): https://aistudio.google.com/apikey
> - Anthropic: https://console.anthropic.com/
> - OpenAI: https://platform.openai.com/api-keys

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────────┐
│  React + Vite + Tailwind │ <─────> │  Node + Express             │
│  - ChatPanel             │  /api   │  - /chat  (LLM, JSON mode)  │
│  - PreviewPanel (iframe) │ <─────> │  - /render (resume → LaTeX) │
│  - SettingsModal         │         │  - /compile (LaTeX → PDF)   │
│  - JobMatchModal         │         │  - /job-match               │
│  - localStorage state    │         │  Provider adapters:         │
└─────────────────────────┘         │   gemini | anthropic | openai│
                                     └─────────────────────────────┘
```

The canonical resume is a JSON document (see
[`backend/src/schema.js`](backend/src/schema.js)). Templates are JS render
functions that take the JSON and return a complete `.tex` source string —
nothing in the runtime knows or cares about which provider produced the JSON.

## Adding a template

1. Create `backend/src/templates/<id>.js` exporting a `META` object and a
   `render(resume)` function that returns a full LaTeX document.
2. Register it in `backend/src/templates/index.js`.

Look at [`jake.js`](backend/src/templates/jake.js) for a feature-complete
example.

## Adding a provider

Create `backend/src/providers/<name>.js` exporting an `async function` with
the shape `({ apiKey, model, system, messages, jsonMode }) => { text }`.
Register it in `backend/src/providers/index.js` along with its display
metadata, then add the same metadata block to `frontend/src/lib/storage.js`.

## Notes

- The dev server proxies `/api/*` to the backend, so the frontend has no
  hardcoded URLs.
- Online LaTeX compilers can be slow or down occasionally — the backend tries
  two services before failing.
- API keys live only in `localStorage`. Clearing site data wipes them.
- `backend/.env` is supported as a fallback for keys when you'd rather not
  type them in the UI (useful in CI).
