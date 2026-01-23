# Sand

## Description

Terrain tile found near water bodies, creating the transition between the ocean and grassland.

## Implementation

- **Tile**: `Sand.ts`
- **Shader**: `SandShader.ts` (located in `game/visuals/`) - Procedural shader with:
  - Granular texture effect (visible sand grains)
  - Animated dust particles that drift slowly
  - Smooth gradient transition with grass at edges
  - Wind gust shadows
  - Micro shimmer sparkles
- **Legacy**: `SandTexture.ts` was replaced by the procedural shader and has been removed.

## Visual Properties

The sand shader provides a stylized, toon-appropriate look that matches the game's aesthetic while being procedurally generated to avoid texture repetition.
