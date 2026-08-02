---
closed: false
---

# Feature: Solar panel building

**Status:** Needs verification (partially implemented)

## Description

Solar panel produces energy based on sunlight, feeding the power network with surplus stored in batteries.

## Requirements

- Produces energy based on sunlight; should be placed in zones with optimal sunlight to maximize output.
- Connects to the power network to supply other buildings.
- Surplus energy is stored in batteries.
- Light-capturing animation on the panel cells.
- UI shows real-time energy output.
- Skill-tree upgrades increase output and durability.

## Notes

The `solar-panel` building folder already exists in `apps/game/src/game/buildings/`. There is a known, related bug already documented in [docs/issues/003-solar-panel-placement-validation-bypassed.md](../issues/003-solar-panel-placement-validation-bypassed.md) — placement validation is currently hard-coded to always succeed. Fixing that should be considered part of getting this building's requirements (optimal-sunlight placement) correctly enforced.
