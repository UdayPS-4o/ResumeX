# @resumex/core

Pure-JS resume data model, schema, diffing, and suggestion-card logic. No dependencies.

## Public API

Exported from `./src/index.js`:

### Data model
- `emptyResume()` — returns a fresh, empty resume object.
- `mergeResume(current, update)` — merges an `update` into `current`, returning the merged resume.
- `resumeJsonSchema` — the JSON Schema describing a resume object.
- `hasContent(r)` — `true` if resume `r` contains any meaningful content.
- `ARRAY_KEYS` — the set/list of resume keys whose values are arrays of items.
- `itemName(key, item, idx)` — derives a human-readable name for an array item at `idx` under `key`.

### Diffing
- `diffResume(current, proposed)` — computes the list of changes between `current` and `proposed`.

### Suggestion cards
- `splitChangesIntoCards(changes, patch, resume)` — groups raw changes into discrete suggestion cards.
- `applyCardPatch(resume, cardId, patch)` — applies the patch for a single card to `resume`.
- `invertCardPatch(resume, cardId, patch)` — produces an undo snapshot for a card's patch.
- `undoCardPatch(resume, undo)` — reverts a previously applied card patch using its undo snapshot.
