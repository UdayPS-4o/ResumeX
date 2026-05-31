# @resumex/llm

Provider-agnostic LLM client and prompt builders for Resumex.

## Dependencies
- `@anthropic-ai/sdk`
- `openai`
- `@google/generative-ai`

## Public API

Exported from `./src/index.js`:

### Completion
- `complete(args)` — runs a non-streaming completion across the configured provider.
- `streamComplete(args)` — runs a streaming completion.

### Providers
- `PROVIDERS` — the registry of supported providers.
- `resolveProviderKey(...)` — resolves the API key/provider configuration to use.

### Prompt builders
- `buildSystemPrompt(...)` — builds the system prompt.
- `buildImportPrompt(...)` — builds the resume-import prompt.
- `RESUME_DELIM` — delimiter used to fence resume content within prompts.
- `buildAtsPrompt(...)` — builds the ATS analysis prompt.
- `buildJobMatchPrompt(...)` — builds the job-match prompt.

### Parsing
- `parseModelJson(text)` — extracts and parses JSON from a model response.
