# Resumex

**A chat-driven, privacy-first résumé builder.** Talk to it like a coach and it assembles your résumé into a polished Typst template — with a live PDF preview beside the conversation and a one-click download of the PDF or the raw `.typ` source. Compilation happens entirely on your machine, so your résumé data never leaves it.

![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Node-2563eb)
![providers](https://img.shields.io/badge/AI-8%20providers-1f2937)
![compiler](https://img.shields.io/badge/compiler-Typst%20%28local%29-0ea5e9)
![license](https://img.shields.io/badge/license-personal%20use-64748b)

```sh
npm run setup   # install deps + vendor a local Typst engine
npm run dev     # backend → :8000, frontend → :3000
```

Open <http://localhost:3000>, paste an API key in **Settings**, and start chatting.

---

## Why Resumex

- **It's a conversation, not a form.** Describe your experience in plain language; the model structures it. No field-by-field data entry.
- **Nothing leaves your machine.** PDFs compile locally via a vendored Typst binary. Your résumé content is never sent anywhere except the LLM provider *you* choose — and your API key is encrypted at rest on your own server.
- **Every edit is reviewable.** AI changes arrive as suggestion cards you accept or dismiss one at a time, each with full undo.
- **It closes the loop.** Tailor to a job, generate a cover letter, and track the application — all in one place.

---

## Features

### Chat-driven editor
- **Chat → résumé.** Conversational extraction of every section — name, contact, summary, experience, education, projects, skills, certifications, awards. Each turn returns a structured JSON patch that the renderer pours into the selected template.
- **Suggestion cards with per-card undo.** Every AI edit surfaces as a reviewable card. Accept or dismiss individual changes; undo any applied card later from the chat panel.
- **Import an existing résumé.** Upload a PDF or Word (`.docx`) file — the text is copied in *verbatim*, exactly as written. Optimization is a separate, explicit step.
- **Image input.** Attach, drag-drop, or paste (Ctrl+V) screenshots — an old résumé, a job posting, anything — and the model reads them.
- **8 Typst templates** — *Jake*, *Modern*, *Classic*, *Minimalist*, *Compact*, *Executive*, *Deedy*, *Alta*. Switch any time; content reflows instantly.
- **Live, fully-offline PDF.** Compiles locally via a vendored Typst engine. Download the polished PDF or the raw `.typ` source.

### Tailoring & job match
- **Tailor to a job.** Paste a description → structured signals are extracted (company, role, seniority, required/preferred skills, ATS keywords) → pick a strategy (*Nudge*, *Keywords*, *Full*) → review the diff with **per-edit accept/reject checkboxes** → save as a linked tailored variant.
- **Anti-hallucination gates.** Deterministic checks lock identity fields (dates, company names, titles), strip invented metrics, and keep skills grounded in the master résumé — the model can re-angle and rephrase, never fabricate.
- **ATS scorer.** A deterministic 0–100 readiness score across 8 categories (contact, sections, quantified impact, action verbs, dates, keywords, conciseness, writing quality). Works with or without a job description — no API key required.
- **Keyword & gap analysis.** Missing keywords are flagged inline, and an *injectable* subset is surfaced (skills the résumé plausibly supports but doesn't yet state).
- **AI-phrase de-buzz.** Deterministic removal of filler buzzwords ("leveraged", "spearheaded", "synergy", …) before tailoring, so the output reads like a person wrote it.

### Masters & variants
- **Multiple master résumés.** Create as many base résumés as you like — each independent, with its own template, chat history, and content.
- **Tailored variants.** Each tailored résumé is a child of a master. The dashboard groups variants under their parent and shows each one's ATS match score.
- **Auto-naming.** Variants are titled automatically from the job role and company (e.g. *Senior Engineer · Stripe*) via a single LLM call at save time.

### Application tracker
A kanban board for your whole job search.
- **Customizable columns.** Stages are fully yours — **add, rename, recolour, reorder, and delete** columns to match how you actually job-hunt. Ships with a sensible default pipeline: *Saved → Applied → Interview → Offer → Accepted → Rejected → Ghosted*.
- **Drag-and-drop** cards between columns with native HTML5 DnD; positions auto-renumber.
- **Per-card notes**, applied-on dates, linked résumé, plus bulk select / move / delete.
- **Auto-seeded from tailoring.** Saving a tailored variant with a known company/role drops an *Applied* card onto the board for you.

### Documents
- **Cover letter generator** in three tones — *Professional*, *Warm*, *Direct*. Exports to PDF through the same local Typst pipeline.
- **Outreach generator** for LinkedIn and email — short, direct, no filler openers.

### Enrichment wizard
A guided 3-step pass to strengthen weak bullets:
1. **Analyze** — flags vague or passive bullets and asks one clarifying question each.
2. **Answer** — add the missing context (numbers, scope, outcome) per item, or skip.
3. **Review** — before/after diffs as suggestion cards; apply any subset, with full undo.

### Providers & settings
Pick whichever model you have access to:

| Provider | Type | Key required |
|---|---|---|
| Google Gemini | Native | Yes |
| Anthropic Claude | Native | Yes |
| OpenAI | Native | Yes |
| Ollama | OpenAI-compatible | No (local) |
| OpenRouter | OpenAI-compatible | Yes |
| DeepSeek | OpenAI-compatible | Yes |
| Groq | OpenAI-compatible | Yes |
| OpenAI-compatible | Custom endpoint | Optional |

- **Keys are encrypted on your server.** Each API key is stored per-account in the local SQLite database, encrypted at rest (AES-256-GCM), and sent to the provider only from the backend. They are **never returned to the browser** — the UI only knows *which* providers have a key set.
- **Per-provider base URL override.** Point any provider at a self-hosted endpoint (LM Studio, vLLM, llama.cpp).
- **Test connection.** One-click connectivity check before you commit to a provider.
- **Reasoning effort.** `auto / minimal / low / medium / high` for models that support it.

### Accounts & storage
- **Server-backed.** All state — settings, encrypted keys, résumés (masters + variants), and tracker board — lives in a local SQLite database (`backend/data/resumex.db`) managed with Drizzle ORM, scoped per account. Nothing is kept in the browser.
- **Count-driven auth, zero-config.** A default account is seeded on first boot. While it's the *only* account, it auto-logs-in — no login page. Add a second user via the unlinked `/signup` URL and a login page appears for everyone.
- **Self-hosted secrets.** The session signing key and key-encryption key are generated into `backend/.env` on first run. The default user's credentials and the SQLite path are env-configurable (`DEFAULT_USER_*`, `DATABASE_URL`) — see `backend/.env.example`.

---

## Quick start

```sh
npm run setup   # installs all deps + downloads a local Typst engine
npm run dev     # backend → :8000, frontend (Next.js) → :3000
```

`npm run setup` works on Windows, macOS, and Linux. It vendors the Typst binary into `backend/vendor/`, so every compile afterward is **fully offline**.

Open <http://localhost:3000> — you're auto-logged-in as the seeded default account. Click **Settings**, paste an API key for your preferred provider (stored encrypted on the server), and start chatting.

## Offline compilation

Résumés and cover letters compile to PDF with **Typst**, running locally — no data leaves your machine.

```sh
npm run install-engine             # reinstall / repair the vendored engine
npm run install-engine -- --force  # force a re-download
```

Any `typst` binary already on your `PATH` is auto-detected, or point at one explicitly via `TYPST_PATH` in `backend/.env`. `GET /api/health` confirms the active engine (`"compile": { "typst": true }`).

---

## Architecture

```
┌──────────────────────────────┐        ┌─────────────────────────────────────┐
│  Next.js + React + Tailwind  │ <────> │  Node + Express + SQLite (Drizzle)  │
│  - AuthGate / login / signup │  /api  │  - /auth         login / signup     │
│  - ChatPanel (non-streaming) │ (proxy │  - /settings     settings + keys    │
│  - TailorPanel               │  same- │  - /resumes      CRUD (per account) │
│  - Tracker (Kanban)          │ origin)│  - /applications card CRUD          │
│  - DocumentsPanel            │        │  - /board        columns + snapshot │
│  - EnrichWizard / AtsModal   │        │  - /chat /tailor /jd /enrich  → LLM │
│  - SettingsModal             │        │  - /documents    cover letter       │
│  - server-backed via REST    │        │  - /render /compile  resume → PDF   │
└──────────────────────────────┘        └─────────────────────────────────────┘
                          session: httpOnly JWT cookie (sole user → auto-login)
                          data:    backend/data/resumex.db (per-account, keys encrypted)
```

### Monorepo packages

| Package | Purpose |
|---|---|
| `@resumex/core` | Résumé JSON schema, diff/merge, suggestion-card splitting, undo snapshots |
| `@resumex/ats` | Deterministic ATS scoring, keyword extraction & gap analysis, de-buzz, highlighting |
| `@resumex/llm` | 8-provider registry, completion/stream, all prompt builders |
| `@resumex/renderer` | 8 Typst template renderers + metadata |

### Adding a template

1. Create `packages/renderer/src/templates/typst/<id>.js` — export a `META` object and a `render<Id>(resume, opts)` function that returns a Typst document string.
2. Register it in `packages/renderer/src/templates/index.js`.

### Database changes

The schema lives in `backend/src/db/schema.js` (single source of truth). After editing it:

```sh
cd backend && npm run db:generate   # emit a SQL migration into ./drizzle
```

Migrations apply automatically on server startup — a fresh clone spins up a ready database with no manual migrate step.

---

## License

**Personal use only — all rights reserved.** This is a personal project, published for reference; it is not open source and no license is granted to use, copy, modify, or distribute it. See [LICENSE](LICENSE).
