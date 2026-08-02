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

The sand shader is a `MeshStandardMaterial` customised via `onBeforeCompile`: procedural colour/grain/dune-normal variation is injected into THREE's own PBR pipeline, so sand is lit and shadowed like every other PBR surface in the game (see `environment/GEMINI.md`) while staying fully procedural (no texture repetition).
