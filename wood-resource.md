# Wood Resource Implementation

## Goal

Implement a new "Wood" resource with trees that can be harvested by a sawmill, featuring progressive depletion visuals.

## Tasks - Phase 1: Wood Resource

- [x] **Task 1:** Add `TREE` TileType to constants.ts → Verify: TileType enum contains TREE
- [x] **Task 2:** Create `tree/` folder with Tree.ts (ResourceTile), WoodResource.ts (GameResource), TreeModel.ts → Verify: Files exist and compile
- [x] **Task 3:** Implement TreeModel with progressive shrinking based on % remaining (scale from top) → Verify: Model renders a low-poly tree
- [x] **Task 4:** Add rarity concept to resource tiles (common/uncommon/rare) → Verify: ResourceTile has rarity property
- [x] **Task 5:** Register WoodResource in ResourceInitialization.ts and data/Items.ts → Verify: 'wood' appears in RESOURCES
- [x] **Task 6:** Update TileFactory to create Tree tiles → Verify: TileFactory handles TREE type
- [x] **Task 7:** Update GameApp.ts to render trees (similar to rocks, grouped 1-3) → Verify: Trees appear on map
- [x] **Task 8:** Add tree placement logic in World.ts (random groups of 1-3) → Verify: Trees spawn randomly
- [x] **Task 9:** Add GEMINI.md documentation for tree resource → Verify: Documentation exists
- [x] **Task 10:** Run lint and build → Verify: No errors

## Tasks - Phase 2: Sawmill Building

- [x] **Task 11:** Create `sawmill/` folder with SawmillConfig.ts → Verify: Config exists with correct structure
- [x] **Task 12:** Implement Sawmill.ts logic (based on Extractor, validates tree placement) → Verify: Sawmill class compiles
- [x] **Task 13:** Create SawmillModel.ts with hollow center and rotating saw blade → Verify: Model renders correctly
- [x] **Task 14:** Implement SawmillVisual.ts with saw animation and particles → Verify: Visual animates
- [x] **Task 15:** Register in BuildingConfig.ts (add to BuildingId, BuildingConfig union, BUILDINGS) → Verify: sawmill in BUILDINGS
- [x] **Task 16:** Register in BuildingFactory.ts → Verify: sawmill in BuildingRegistry
- [x] **Task 17:** Add README.md documentation → Verify: Documentation exists
- [x] **Task 18:** Add i18n translations for sawmill → Verify: Translations in locale files
- [x] **Task 19:** Refine Sawmill model (low profile, horizontal movement) and fix Preview → Verify: Model looks correct and appears in UI
- [ ] **Task 20:** Test placement on trees and wood production → Verify: Sawmill works in-game

## Done When

- [x] Trees render on the map as groups of 1-3
- [x] Trees shrink visually as resources deplete
- [x] Wood is a registered resource
- [x] Rarity system is in place for future use
- [x] Sawmill building implemented with rotating saw
- [x] Sawmill can only be placed on tree tiles
- [ ] Sawmill produces wood when powered
- [ ] Full lint and build pass
