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
├── BaseNatureVisual.tsx     # Generic GLTF/Persistence wrapper
├── NatureAssetVisual.tsx    # Unified entry point for nature visuals
├── ProceduralNatureFallback.tsx # Unified procedural rendering logic
├── ResourceTile.ts          # Base for depletable tiles
├── Tile.ts                  # Base tile class
└── EnvironmentConfig.ts     # Procedural visual parameters
```

## 🌳 Nature Asset System (Phase 2)

We use a unified, persistent system for rendering all nature entities (Trees, Rocks, etc.).

### 1. Unified Visual Pipeline

Instead of having specific visual components per type, we use a single entry point:

- **`NatureAssetVisual`**: Determines the entity type and orchestrates loading.
- **`BaseNatureVisual`**: Handles the logic for dynamic GLTF discovery and persistence.
- **`ProceduralNatureFallback`**: Centralized logic for procedural models (used when no specialized GLTF is found).

### 2. Dynamic Discovery

GLTF models are discovered dynamically by scanning the `public/models/[entityId]/` directory.

- API: `/api/assets` returns the manifest.
- Proxy: `/api/model/` serves assets correctly (bypassing IDM issues).

### 3. Persistence

Selected model variants are stored in the Save File:

- Each `ResourceTile` has a `variantId`.
- If missing, a variant is lazily assigned and persisted.

## ⚙️ EnvironmentConfig.ts

Centralized configuration for all environment visual elements. Provides interfaces and utility functions for randomizing tree and rock placements.

## 🌲 Resource Depletion

Some tiles (like Trees, Rocks) contain resources that deplete progressively:

- `ResourceTile` tracks `resourceAmount` and `initialResourceAmount`.
- `getVisualScale()` returns a value 0-1 based on remaining resources.
- Visual models shrink/change as resources are harvested.
- When depleted, tiles transform (e.g., Tree → Grass).
