# Issue: `npm run lint` currently fails (49 errors) — merge gate is broken

**Severity:** Medium (process/quality gate, not a runtime bug) — but per the project's own rules (`GEMINI.md`: _"We must strictly validate the linter before merging... All code must adhere to the defined ESLint rules without exception"_), this currently blocks a clean merge.

**Status:** Confirmed — `npm run lint` at repo root exits with 49 errors / 9 warnings on the current working tree.

## Summary

The in-progress XState migration (new `*Machine.ts` files for every building) introduces `@typescript-eslint/no-explicit-any` errors — this rule is `"error"` for all non-test files (`eslint.config.mjs`). Affected files (new, untracked):

- `BatteryMachine.ts`, `BiomassPlantMachine.ts`, `ChestMachine.ts`, `ConveyorMachine.ts`, `ConveyorMergerMachine.ts`, `ConveyorSplitterMachine.ts`, `ExtractorMachine.ts`, `FurnaceMachine.ts`, `HubMachine.ts`, `SawmillMachine.ts`
- Plus `XStateInspector.tsx`, `World.ts`, `BuildingEntity.ts`, `BaseNatureVisual.tsx`, `CloudShadowPatcher.ts` (pre-existing `any` usages)

Also flagged:

- `apps/game/src/game/components/visuals/PickaxeTool.tsx:21` — `react-hooks/set-state-in-effect` **error** (calling `setState` synchronously inside a `useEffect` body; not necessarily wrong behavior, but it's a hard error under this project's ESLint config, not just a style nit).
- `apps/game/src/game/buildings/solar-panel/SolarPanel.ts:10` — `@typescript-eslint/prefer-as-const`.
- Several `unused-imports/no-unused-vars` / `no-unused-imports` warnings (e.g. unused `ResourceTile` import in `World.ts`, `BuildingEntity.ts`, `BaseNatureVisual.tsx`, several `*Machine.ts` files; unused `startX`/`startY` in `SolarPanelModel.ts`).

None of these break `npm test` or `npm run build` (both currently pass), but they do mean the branch is not in a mergeable state per the project's documented linting requirement.

## Separate, smaller issue found nearby: hardcoded UI string

`apps/game/src/components/ui/panels/widgets/FuelCombustionPanel.tsx:59`:

```tsx
} else if (!hasNetwork) {
  statusText = "No Network"; // TODO: Add translation
```

This violates the project's i18n rule (`GEMINI.md`: _"Hardcoded strings in UI components or building configs are strictly prohibited"_) — every other branch in this same function correctly uses `t("common.statuses.*")`. Any building panel that can be in a "no network" state (e.g. an unpowered/disconnected machine) will show this untranslated string to French-locale players.

## Suggested fix

- Type the XState machine `context`/`event` shapes properly instead of `any` (this is the bulk of the failures and is expected cleanup work for an in-progress migration — flagging here so it isn't missed before merge).
- Add `building.status.no_network` (or similar) to `en.json`/`fr.json` and use `t(...)` in `FuelCombustionPanel.tsx`.
- Address or explicitly justify the `PickaxeTool.tsx` `set-state-in-effect` error and the `prefer-as-const` in `SolarPanel.ts`.
