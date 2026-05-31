# @resumex/ats

Pure-JS applicant-tracking-system (ATS) checks for resumes. No dependencies.

## Public API

Exported from `./src/index.js`:

- `runAtsChecks(resume)` — runs the ATS checks against `resume` and returns:
  ```js
  {
    score,      // numeric overall score
    breakdown,  // per-category score breakdown
    issues,     // list of detected issues
    passed,     // checks that passed
    grade       // letter/grade summary
  }
  ```
