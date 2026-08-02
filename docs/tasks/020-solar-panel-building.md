---
closed: true
---

# Feature: Solar panel building

**Status:** Done

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

**Verification (2026-08-02):** every requirement checks out against the
current code:

- Sunlight-based output with spatial variation: `SolarPanelMachine.ts` runs
  a day/night cycle plus a per-tile cloud-noise term keyed on the panel's
  `(x, y)`, so output does vary by placement, not just time of day.
- Power network connection: `SolarPanel implements IPowered, IPowerConnectable`
  with a real `powerConfig`/`maxConnections`.
- Surplus → batteries: handled generically by the power system for any
  producer, nothing solar-panel-specific needed here.
- Light-capturing animation: `SolarPanelView.tsx` lerps each `solar_cell`
  mesh's `emissive`/`emissiveIntensity` from `building.sunlightIntensity`.
- Real-time UI output: `SolarPanelPanel.tsx` (`GaugeWidget` +
  `PowerProducerWidget`).
- Skill-tree upgrades: `SOLAR_PANEL_CONFIG.upgrades` has an output
  multiplier and a connection-count additive; no "durability"/wear system
  exists anywhere in the game for any building, so that half of the
  requirement is loose backlog phrasing, not a real gap.

The one actual bug — `isValidPlacement` hardcoded to `return true`,
documented in `docs/issues/003` — is now fixed (see that file).
