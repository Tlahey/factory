# Grass

## Description

The primary terrain tile of the world.

## Implementation

- **Tile**: `Grass.ts`
- **Shader**: `GrassShader.ts` (in `game/visuals/shaders/`) — `MeshStandardMaterial`
  customised via `onBeforeCompile` with procedural colour/grain variation, lit
  by THREE's real PBR pipeline (see `environment/GEMINI.md`).
- **Note**: `GrassGeometry.ts`/`GrassMaterial.ts` in this folder are leftover
  from an earlier instanced-blade approach and are unused — the ground plane
  above is what actually renders.
