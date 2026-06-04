// Thin re-export shim. The canonical implementation now lives in @resumex/core.
// Kept at this path so existing component imports (`../lib/resume.js`) keep working.
export {
  mergeResume,
  diffResume,
  hasContent,
  itemName,
  ARRAY_KEYS,
  splitChangesIntoCards,
  applyCardPatch,
  invertCardPatch,
  undoCardPatch,
} from '@resumex/core';
