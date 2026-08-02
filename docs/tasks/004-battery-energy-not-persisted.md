---
closed: true
---

# Bug: Battery's stored energy is not saved

**Status:** Done — was already implemented, added regression test coverage

## Description

The Battery building doesn't persist the amount of energy it's currently storing in save data, so it loses its charge on reload.

## Requirements

- Include the battery's current stored energy in `World` serialize/deserialize.
- Restore the stored energy correctly on load.

## Notes

The `battery` building folder already exists in `apps/game/src/game/buildings/`. This task is about completing/fixing the save/load path for its energy state, not building the battery from scratch.

**Verification (2026-08-02):** `Battery.serialize()`/`deserialize()`
(`apps/game/src/game/buildings/battery/Battery.ts`) already read/write
`currentCharge` and `isEnabled`, and `World.serialize()`/`deserialize()`
already spread each building's own `serialize()`/`deserialize()` output —
so the save/load path was already correct. No existing test covered the
full round-trip through `World`, so a regression test was added
(`World.test.ts` — "should persist battery stored charge and breaker
state") to lock in the behavior.
