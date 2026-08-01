# Known Issues

Findings from a validation pass on the current working tree (uncommitted XState migration + Solar Panel feature), 2026-08-01. Method: `npm test`, `npm run lint`, `npm run build`, then live testing in Chrome via the dev server, plus targeted code review of the areas the tests/build/lint surfaced as suspicious.

`npm test` (386 tests) and `npm run build` both pass. No regressions were found in existing, already-tested logic.

| #                                                       | Issue                                                                                                                   | Severity | Type                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| [001](001-localization-hydration-mismatch.md)           | Every page load throws a React hydration error because `LocalizationManager` renders raw i18n keys during SSR           | High     | Confirmed live bug  |
| [002](002-io-arrow-input-rotation-east-west.md)         | Input IO arrows on East/West sides point away from the building instead of toward it (affects Battery)                  | Medium   | Confirmed logic bug |
| [003](003-solar-panel-placement-validation-bypassed.md) | Solar Panel placement validation is hard-coded to always succeed (debug bypass left in)                                 | High     | Confirmed logic bug |
| [004](004-lint-gate-failing-and-hardcoded-string.md)    | `npm run lint` currently fails (49 errors, mostly `any` in new XState machines) + one hardcoded, untranslated UI string | Medium   | Quality gate / i18n |

Not investigated in depth: full manual playthrough of the new XState-based building machines (Furnace, Extractor, Conveyor, etc.) beyond their existing unit tests, since those all pass and reviewing every migrated file was out of scope for this pass.
