# Sawmill

## Description

The Sawmill is a production building that harvests wood from tree tiles. It must be placed directly on a tree to function. The rotating saw blade cuts through the tree, producing wood resources that can be transported via conveyors or stored in chests.

## Behavior

- **Placement**: Must be placed on a tile containing a tree (`TileType.TREE`)
- **Resource**: Produces "wood" items when active
- **Power**: Requires 15 units of power to operate
- **Extraction Rate**: 45 items per minute (base rate)
- **Buffer**: Internal storage for up to 20 items
- **Output**: Automatically outputs to adjacent conveyors or chests in the facing direction

## Visual Features

- **Hollow Center**: The building frame is open in the middle, allowing the tree to be visible
- **Rotating Saw Blade**: A circular saw that spins when the building is active
- **Status Light**: Indicates operational status (red = no power, orange = idle/warning, green = active)
- **Sawdust Particles**: Particles spawn when cutting wood

## States

| Status       | Condition                   | Visual                    |
| ------------ | --------------------------- | ------------------------- |
| Working      | Has resources + power       | Green light, saw rotating |
| No Resources | Tree depleted, buffer empty | Orange light, saw stopped |
| Blocked      | Buffer full, can't output   | Orange light, saw stopped |
| No Power     | No power connection         | Red light, saw stopped    |

## Upgrades

| Level | Name                | Cost                         | Effect               |
| ----- | ------------------- | ---------------------------- | -------------------- |
| 1     | Sharpened Blade I   | 50 Wood                      | +20% extraction rate |
| 2     | Sharpened Blade II  | 100 Wood, 30 Iron            | +40% extraction rate |
| 3     | Sharpened Blade III | 200 Wood, 75 Iron, 30 Copper | +60% extraction rate |

## I/O Configuration

- **Input**: None
- **Output**: Front side (direction building faces)

## Implementation

- **Logic**: `Sawmill.ts` (extends `BuildingEntity`, implements `IExtractable`, `IPowered`, `IIOBuilding`)
- **Visual**: `SawmillVisual.ts` with rotating saw animation
- **Model**: `SawmillModel.ts` with hollow frame design
- **Config**: `SawmillConfig.ts`
