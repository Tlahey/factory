# Environment System

This directory manages the game's environment (tiles).

## 🏗 Architecture

The world is composed of **Tiles** representing the world map:

- **Grass**: Main terrain.
- **Water**: Boundaries and obstacles.
- **Sand**: Transition between land and water.
- **Rocks**: Source of Stone resource.
- **Trees**: Source of Wood resource.

## 📁 Structure

```text
src/game/environment/
├── grass/                   # Grass tile logic
├── rock/                    # Rock tile logic
├── sand/                    # Sand tile logic
├── tree/                    # Tree tile logic
├── water/                   # Water tile logic
└── EnvironmentConfig.ts     # Centralized visual configuration
```

## ⚙️ EnvironmentConfig.ts

Centralized configuration for all environment visual elements. Provides interfaces and utility functions for randomizing tree and rock placements.

## 🌲 Resource Depletion

Some tiles (like Trees, Rocks) contain resources that deplete progressively:

- `ResourceTile` tracks `resourceAmount` and `initialResourceAmount`.
- `getVisualScale()` returns a value 0-1 based on remaining resources.
- Visual models shrink/change as resources are harvested.
- When depleted, tiles transform (e.g., Tree → Grass).
