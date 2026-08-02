# Water

## Description

Animated water tiles creating the world boundaries.

## Implementation

- **Tile**: `Water.ts`
- **Shader**: `WaterShader.ts` (in `game/visuals/shaders/`) — `MeshStandardMaterial`
  customised via `onBeforeCompile`, low roughness so it reflects the same
  `scene.environment` sky/sun map as the buildings (see `environment/GEMINI.md`).
  Keeps the vertex wave animation and the depth-texture shoreline foam pass
  (driven by `WaterLayer.tsx`); stays opaque (no refraction) for now.
- **Waterfalls**: `WaterfallShader.ts` / `WaterfallTexture.ts` (scrolling UVs)
  — not yet migrated to the PBR pipeline above.
