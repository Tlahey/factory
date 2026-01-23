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
├── stone/
├── wood/
├── GameResource.ts          # Base class for all resources
├── ResourceInitialization.ts # Central registration logic
├── ResourceRegistry.ts      # Central registry singleton
├── ResourceRegistryHelper.ts# Visual helpers for simplified usage
└── ResourceModelBuilder.ts  # Shared geometric logic for Ores/Ingots
```

## 🔌 Adding a New Resource

1.  Create a folder: `src/game/resources/my-resource/`.
2.  Implement `MyResource.ts` extending `GameResource`.
3.  Register it in `ResourceInitialization.ts`.
4.  (Optional) Add it to `RESOURCES` list in `src/game/data/Items.ts`.

## 🎨 Visuals

Resources use `createModel()` to provide their 3D representation via `ResourceModelBuilder` or custom model logic.

- **Ores**: Use clustered icosahedrons for a rough, natural look.
- **Ingots**: Use box geometry with metallic materials.
- **Wood**: Use cylinder geometry for logs.
- **Special**: Can implement custom model logic (like Stone/Rock, Trees).
