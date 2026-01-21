# Wood Resource Implementation

## Goal

Implement a new "Wood" resource with trees that can be harvested by a sawmill, featuring progressive depletion visuals.

## Tasks

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

## Done When

- [x] Trees render on the map as groups of 1-3
- [x] Trees shrink visually as resources deplete
- [x] Wood is a registered resource
- [x] Rarity system is in place for future use
- [x] Lint and build pass
