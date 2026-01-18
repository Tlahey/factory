# Environment & Resource System

This directory manages the game's environment (tiles) and the definitions of all collectable/craftable resources.

## 🏗 Architecture

The system is split into two main parts:

1.  **Tiles**: Represent the world map (Grass, Water, Rocks).
2.  **Resources**: Represent the items that can be transported and processed (Stone, Ores, Ingots).

### Resource Registry

All items are defined as classes extending `GameResource` and are registered in the `ResourceRegistry`. This ensures a single source of truth for:

- Item ID and Name
- 3D Models (for previews and conveyors)
- Visual updates (deterministic scrambling via seeds)

## 📁 Structure

```text
src/game/environment/
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

## 🔌 Adding a New Resource

1.  Create a folder: `src/game/environment/my-resource/`.
2.  Implement `MyResource.ts` extending `GameResource`.
3.  Register it in `ResourceInitialization.ts`.
4.  (Optional) Add it to `RESOURCES` list in `src/game/data/Items.ts`.

## 🎨 Visuals

Resources use `createModel()` to provide their 3D representation.

- **Ores**: Use clustered icosahedrons for a rough, natural look.
- **Ingots**: Use box geometry with metallic materials.
- **Special**: Can implement custom model logic (like Stone/Rock).
