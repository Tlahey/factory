# Bug: Input IO arrows on East/West sides point outward instead of inward

**Severity:** Medium — visual/UX correctness bug in the building connectivity indicators. Currently affects the Battery building (`inputSide: "left"`), and will silently affect any future building that declares an `input` port on the `left`/`right` side.

**Status:** Confirmed via code + esbuild dead-code warning surfaced by the test run (`npm test`).

## Root cause

`getArrowRotation()` in `apps/game/src/game/visuals/helpers/IOArrowHelper.ts` (lines 135–185) is supposed to flip the rotation for **input** arrows so they point _toward_ the building, regardless of which side they're on — and it does so correctly for `north`/`south`:

```ts
switch (sideDirection) {
  case "north":
    return rotMap.south; // At North, point South (In)  -- correctly flipped
  case "south":
    return rotMap.north; // At South, point North (In)  -- correctly flipped
  case "east":
    return rotMap.east; // At East, point East (Out) - Wait, we want IN.
  // ... several lines of the author debating with themselves in comments ...
  case "east":
    return rotMap.east; // <-- dead code, unreachable (duplicate case)
  case "west":
    return rotMap.west;
}
```

For `east`/`west` it returns the **unflipped** rotation (`rotMap.east`/`rotMap.west`), i.e. the same direction used for **output** arrows. `vitest`/esbuild actually flags this during the test run:

```
[vite] (client) warning: This case clause will never be evaluated because it duplicates an earlier case clause
  176 |      case "east":
  177 |        return rotMap.east;
```

Net effect: an input arrow placed on the `east` side points East (away from the building) instead of West (toward the building) — and symmetrically for `west`. This is inconsistent with the correct `north`/`south` behavior and contradicts the function's own doc comment above it, which explicitly says input arrows on the `west` side should "point East (In)".

## Where it's user-visible

`BatteryConfig.ts` sets:

```ts
inputSide: "left",   // -> west
outputSide: "right",  // -> east
```

So the Battery's green input arrow (west side) currently points further west (away from the battery) instead of east (into the battery), while its red output arrow is correctly oriented. Any future building with a side-loaded input (e.g. splitters/mergers using this static-arrow path) would have the same problem.

No existing test in `IOArrowHelper.test.ts` asserts `rotation.y` for east/west sides, which is why this shipped unnoticed — only position/visibility are asserted there.

## Suggested fix

Remove the duplicate `case "east"` and fix the logic so east/west inputs are flipped like north/south:

```ts
if (isInput) {
  switch (sideDirection) {
    case "north":
      return rotMap.south;
    case "south":
      return rotMap.north;
    case "east":
      return rotMap.west;
    case "west":
      return rotMap.east;
  }
}
```

Add a regression test asserting `rotation.y` for an input arrow on the `left`/`right` side (e.g. using `Battery`), so this can't silently regress again.
