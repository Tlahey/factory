# Bug: Battery's stored energy is not saved

**Status:** Needs verification (partially implemented)

## Description

The Battery building doesn't persist the amount of energy it's currently storing in save data, so it loses its charge on reload.

## Requirements

- Include the battery's current stored energy in `World` serialize/deserialize.
- Restore the stored energy correctly on load.

## Notes

The `battery` building folder already exists in `apps/game/src/game/buildings/`. This task is about completing/fixing the save/load path for its energy state, not building the battery from scratch.
