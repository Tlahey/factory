# Resource System

This directory manages the definitions of all collectable/craftable resources (items) in the game.

## 🏗 Architecture

All items are defined as classes extending `GameResource` and are registered in the `ResourceRegistry`. This ensures a single source of truth for:

- Item ID and Name
- 3D Models (for previews and conveyors)
- Visual updates (deterministic scrambling via seeds)

### Resource Registry

The `ResourceRegistry` is a singleton that holds all registered resources.

### Resource Rarity

Resources have a rarity level defined in `constants.ts`:

- **COMMON**: Easily available (e.g., Wood, Stone)
- **UNCOMMON**: Moderately available (e.g., Iron, Copper)
- **RARE**: Scarce resources (e.g., Gold)

## 📁 Structure

```text
src/game/resources/
├── copper_ingot/            # Specific Resource Folder
├── copper_ore/
├── gold_ingot/
├── gold_ore/
├── iron_ingot/
├── iron_ore/
├── stone/                   # StoneResource.ts + StoneModel.ts
├── wood/                    # WoodResource.ts + WoodModel.ts
├── models/                  # Models shared by several resources
│   ├── ChunkGeometry.ts     # Chipped rock geometry helper
│   ├── IngotModel.ts        # Shared by the three ingots
│   └── OreModel.ts          # Shared by the three ores
├── GameResource.ts          # Base class for all resources
├── ResourceInitialization.ts # Central registration logic
├── ResourceModels.test.ts   # Size/pose contracts for every item model
├── ResourceRegistry.ts      # Central registry singleton
└── ResourceRegistryHelper.ts# Visual helpers for simplified usage
```

## 🔌 Adding a New Resource

1.  Create a folder: `src/game/resources/my-resource/`.
2.  Implement `MyResource.ts` extending `GameResource`.
3.  Register it in `ResourceInitialization.ts`.
4.  (Optional) Add it to `RESOURCES` list in `src/game/data/Items.ts`.

## 🎨 Visuals

`createModel()` builds the mesh once; `updateVisuals(group, seed)` poses it from
the item id and **runs every frame**, so it may only set transforms and
visibility — never build geometry or materials there.

Materials come from `visuals/materials/ResourceMaterials.ts`, which mirrors the
building palette. Every item is a dark body plus one bright accent, because at
belt scale (~0.2 world units) that contrast is all the player can read:

- **Ores**: chipped rock chunk in a darkened ore tint, with brighter metallic
  vein crystals breaking the surface (`models/OreModel.ts`).
- **Ingots**: cast bar, drafted on all four sides, with a stamped top face
  (`models/IngotModel.ts`).
- **Wood**: a stacked bundle of logs, bark on the sides and pale end grain on
  the cut faces (`wood/WoodModel.ts`).
- **Stone**: three to five chipped chunks in two granite tones
  (`stone/StoneModel.ts`).

Deterministic variation uses `utils/SeededRandom.ts` — never `Math.random()`,
which would make items twitch as they travel.

Item meshes deliberately stay out of the shadow pass: there is one per occupied
belt tile, so shadow-casting items would cost hundreds of extra draw calls.

`ResourceModels.test.ts` locks each model's size budget, so a redesign can
change the shape but not the scale the item reads at on a belt.
