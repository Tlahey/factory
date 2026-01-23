# Stone (Rock)

## Description

A natural resource found in clusters on the world map.

## Implementation

- **Tile**: `Rock.ts` (ResourceTile)
- **Resource**: `StoneResource.ts` (GameResource, id: `stone`)
- **Visuals**: `NatureAssetVisual.tsx` (using `rock` entityId). Procedural fallback in `RockModel.ts`.
