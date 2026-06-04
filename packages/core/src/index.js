// @resumex/core — canonical resume schema and shared resume helpers.

export { emptyResume, resumeJsonSchema, mergeResume } from './schema.js';

export {
  hasContent,
  ARRAY_KEYS,
  itemName,
  diffResume,
  splitChangesIntoCards,
  applyCardPatch,
  invertCardPatch,
  undoCardPatch,
} from './resume.js';
