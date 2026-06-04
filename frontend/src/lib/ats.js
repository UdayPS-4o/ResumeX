// Thin re-export shim. The canonical implementation now lives in @resumex/ats.
// Kept at this path so existing component imports (`../lib/ats.js`) keep working.
export { runAtsChecks, gradeFor } from '@resumex/ats';
