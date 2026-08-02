# Bug: Solar Panel placement validation is completely disabled (debug bypass left in)

**Severity:** High (gameplay/balance correctness) — the building can be placed anywhere, including on water and on top of resource tiles, once the player can afford it.

**Status:** Fixed (2026-08-02). Removed the `isValidPlacement` override in
`SolarPanel.ts` entirely, so it now falls back to `BuildingEntity`'s default
implementation, which already correctly reads `SolarPanelConfig.ts`'s
existing `placement: { canPlaceOnResources: true }` block (rejects water,
allows resource tiles, same as most producer buildings). `locked: true` was
also already set in the current config — the stale `locked: false` comment
quoted below no longer matches the code. Added placement regression tests
to `SolarPanel.test.ts` (rejects water, allows grass, allows resource
tiles).

## Root cause

`apps/game/src/game/buildings/solar-panel/SolarPanel.ts`:

```ts
// Force allow placement everywhere for testing/unblocking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
public isValidPlacement(_tile: any): boolean {
  return true;
}
```

This overrides the base `BuildingEntity.isValidPlacement()` tile/terrain validation entirely and always returns `true`, regardless of tile type. `World.canPlaceBuilding()` (`apps/game/src/game/core/World.ts`) relies on this method to reject invalid tiles (water, wrong resource type, etc.) for every other building — Solar Panel is the only building that opts out.

Related: `SolarPanelConfig.ts` has:

```ts
locked: false, // Start unlocked for testing? Or locked if skill tree. Plan said locked.
```

confirming (in the author's own words) that the intended design was to gate Solar Panel behind the skill tree like other advanced buildings, but it currently ships unlocked from the start.

## Impact

Once a player has the resources for a Solar Panel, they can place it on water, on ore/tree/stone tiles, overlapping other placement rules that every other building must respect — breaking the terrain-based placement rules documented in `apps/game/src/game/buildings/GEMINI.md` ("Multi-Tile Buildings & Connectivity" / placement config section).

## Suggested fix

Remove the `isValidPlacement` override so Solar Panel falls back to the standard `BuildingEntity` implementation (respecting `placement` config like every other building), and set an explicit `placement` block in `SolarPanelConfig.ts` (e.g. grass/sand only, no water, no resource tiles) instead of allow-all. Revisit `locked: false` vs. skill-tree gating per the original plan referenced in the comment.
