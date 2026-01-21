# Tree (Wood)

## Description

A natural resource found in clusters of 1-3 trees on the world map. Trees are a common resource that provides wood when harvested by a Sawmill.

## Implementation

- **Tile**: `Tree.ts` (ResourceTile)
- **Resource**: `WoodResource.ts` (GameResource, id: `wood`)
- **Visuals**: `TreeModel.ts` (Low-poly toon-style tree)

## Behavior

- **Grouping**: Trees spawn in clusters of 1-3 trees.
- **Depletion**: Wood resource amount is configurable and random (high yield).
- **Visual Feedback**: As wood is harvested, the tree model progressively shrinks from the top (based on % remaining).
- **Rarity**: Common resource (defined via `ResourceRarity.COMMON`).
- **Harvesting**: Extractable via Sawmill building (not yet developed).

## Visual Properties

The tree model features:

- Low-poly stylized trunk (brown)
- Low-poly foliage (multiple shades of green)
- Scale modification based on remaining resources (shrinks from top)
