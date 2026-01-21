# Environment & Resource System

This directory manages the game's environment (tiles) and the definitions of all collectable/craftable resources.

## 🏗 Architecture

The system is split into two main parts:

1.  **Tiles**: Represent the world map (Grass, Water, Rocks, Trees).
2.  **Resources**: Represent the items that can be transported and processed (Stone, Ores, Ingots, Wood).

### Resource Registry

All items are defined as classes extending `GameResource` and are registered in the `ResourceRegistry`. This ensures a single source of truth for:

- Item ID and Name
- 3D Models (for previews and conveyors)
- Visual updates (deterministic scrambling via seeds)

### Resource Rarity

Resources have a rarity level defined in `constants.ts`:

- **COMMON**: Easily available (e.g., Wood, Stone)
- **UNCOMMON**: Moderately available (e.g., Iron, Copper)
- **RARE**: Scarce resources (e.g., Gold)

## 📁 Structure

```text
src/game/environment/
├── EnvironmentConfig.ts     # Centralized visual configuration
├── [ResourceName]/          # Specific Resource/Tile Folder
│   ├── [Name]Resource.ts    # GameResource implementation
│   ├── [Name].ts            # (Optional) Tile implementation
│   ├── [Name]Model.ts       # (Optional) Specific 3D model logic
│   └── GEMINI.md            # Local documentation
├── GameResource.ts          # Base class for all resources
├── ResourceRegistry.ts      # Central registry singleton
├── ResourceRegistryHelper.ts# Visual helpers for simplified usage
└── ResourceModelBuilder.ts  # Shared geometric logic for Ores/Ingots
```

## ⚙️ EnvironmentConfig.ts

Centralized configuration for all environment visual elements. Provides:

### Interfaces

- `RandomRange`: Min/max for random value generation
- `ColorPalette`: Array of hex colors for variety
- `ResourceVisualConfig`: Base config with scale and variation
- `TreeVisualConfig`: Tree-specific settings (trunk, foliage layers, wind animation)
- `RockVisualConfig`: Rock-specific settings (chunks, axis scale variation)

### Configuration Objects

- `TREE_VISUAL_CONFIG`: Default tree settings (scale: 1.2x)
- `ROCK_VISUAL_CONFIG`: Default rock settings (scale: 0.8x)

### Utility Functions

- `randomInRange(range)`: Generate random value in range
- `randomIntInRange(range)`: Generate random integer in range
- `randomColor(palette)`: Pick random color from palette
- `generateTreeVisualParams(config)`: Generate tree visual parameters
- `generateTreeOffset(treeCount, config)`: Generate tree position offset
- `generateRockChunkParams(config)`: Generate rock chunk parameters
- `generateRockOffset(config)`: Generate rock position offset
- `getRockChunkCount(config)`: Get number of rock chunks

## 🔌 Adding a New Resource

1.  Create a folder: `src/game/environment/my-resource/`.
2.  Implement `MyResource.ts` extending `GameResource`.
3.  Register it in `ResourceInitialization.ts`.
4.  (Optional) Add visual config to `EnvironmentConfig.ts`.
5.  (Optional) Add it to `RESOURCES` list in `src/game/data/Items.ts`.

## 🎨 Visuals

Resources use `createModel()` to provide their 3D representation.

- **Ores**: Use clustered icosahedrons for a rough, natural look.
- **Ingots**: Use box geometry with metallic materials.
- **Wood**: Use cylinder geometry for logs.
- **Special**: Can implement custom model logic (like Stone/Rock, Trees).

## 🌲 Resource Depletion

Some resources (like Trees, Rocks) deplete progressively:

- `ResourceTile` tracks `resourceAmount` and `initialResourceAmount`
- `getVisualScale()` returns a value 0-1 based on remaining resources
- Visual models shrink/change as resources are harvested
- When depleted, tiles transform (e.g., Tree → Grass)
