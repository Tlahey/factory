# Drag and Drop System Specification

## Overview

This document outlines the robust Drag and Drop system implemented in the Factory Game. The system is designed to handle item transfers between the Player Inventory, Buildings (Chests, Furnaces, Extractors), and the World (Conveyors), ensuring state consistency and preventing item duplication or loss.

## Core Principles

### 1. Immediate Removal (The "Hot Potato" Rule)

To prevent gameplay exploits and state inconsistencies, an item is **immediately removed from its source logic** as soon as the drag operation begins.

- **Why?** If an item remains in a machine while being dragged, the machine might process it (e.g., a furnace smelting an ore, or a conveyor moving it into a tunnel) _while_ the player is holding it. This would lead to duplication if the player then drops existing "ghost" item into their inventory.
- **Implementation**: In `onDragStart`, the item is spliced from the source array (or set to null).

### 2. Transaction Safety (The Handshake)

Relying solely on the browser's `dropEffect` is unreliable for complex game UI, especially when dealing with nested components and "background" drops.

- **The Problem**: A drop on a generic `<div>` often defaults to `dropEffect = "none"`, but sometimes specifically handled areas might report `move` incorrectly, or `dragEnd` might fire before the drop logic completes.
- **The Solution**: We use an explicit **Success Event Pattern**.
  - The **Receiver** (Introduction, TrashZone, Chest) dispatches a global `GAME_ITEM_TRANSFER_SUCCESS` event upon a valid drop.
  - The **Source** (Dragging Component) listens for this event.

### 3. Restoration on Failure (The Safety Net)

If a drag operation ends (`onDragEnd`) and the transaction was not confirmed, the item must be **restored** to its original position.

- **Logic**:
  ````typescript
  ```typescript
  // Strict Mode: Only the explicit event confirms success
  // Browser dropEffect is ignored because it is unreliable (false positives on self-drop)
  const isSuccess = transferSuccessRef.current;
  if (!isSuccess) {
      restoreItem();
  }
  ````

### 4. Strict Mode

UI components must explicitly handle `onDragOver` to prevent false positives.

- Panels must explicitly set `e.dataTransfer.dropEffect = "none"` on their background containers to prevent the browser from thinking a drop on the "grey area" was successful.

## Implementation Details

### Global State

- `useGameStore.isDraggingItem`: Boolean flag used to toggle visibility of global drop zones (like the `TrashZone`).

### Components

#### 1. HUD (Inventory)

- **Role**: Primary Receiver & Source.
- **Behavior**:
  - Exchanges items with itself (Sort/Swap).
  - Accepts items from external sources.
  - **Crucial**: On accepting an external item, it dispatches:
    ```typescript
    window.dispatchEvent(
      new CustomEvent("GAME_ITEM_TRANSFER_SUCCESS", {
        detail: { source, sourceIndex },
      }),
    );
    ```

#### 2. TrashZone

- **Role**: Item Sink (deletion).
- **Behavior**:
  - Appears only when `isDraggingItem` is true.
  - On drop, it effectively "consumes" the item (does nothing, just signals success).
  - Dispatches duplication prevention event: `GAME_ITEM_TRANSFER_SUCCESS`.

#### 3. BuildingInfoPanel (Chest / Extractor / Conveyor) & FurnaceDashboard

- **Role**: Source (and Receiver for chests/furnaces).
- **Drag Start**:
  - Captures item data.
  - Removes item from `building.slots` / `inputQueue` / etc.
  - Sets `transferSuccessRef.current = false`.
- **Drag End**:
  - Checks `transferSuccessRef`.
  - If false, calls `building.addItem()` to restore.

#### 4. Conveyors

- **Special Case**: Items on conveyors are "floating" entities.
- **Drag Start**: The item is nullified on the conveyor `currentItem = null`.
- **Visualization**: The `ConveyorPanel` renders a draggable visual representation when an item is present.

## UI Layering (Z-Index)

Crucial for ensuring drop targets are accessible over modal windows.

- **Inventory (HUD)**: `z-index: 210` (Always on top).
- **TrashZone**: `z-index: 210` (Matches HUD).
- **Dialogs (Furnace/Assembler)**: `z-index: 200`.
- **Panels (Chest/General)**: `z-index: 100`.

## Container Drops (Chests/Furnaces)

When dropping an item INTO a building (e.g. from Furnace Output -> Chest):

1.  **Drop Handler**: The receiving component (e.g., `ChestPanel`) must prevent default and bubbling.
2.  **Logic**: `BuildingInfoPanel` handles the logic to add the item to the building state.
3.  **Success Event**: If the source was **NOT** the inventory (e.g. another machine), `BuildingInfoPanel` **MUST** dispatch `GAME_ITEM_TRANSFER_SUCCESS`.
    - _Reasoning_: The source machine (Furnace) needs to know the move succeeded so it doesn't try to restore the item.

## Testing

- **Unit Tests**: Located in `apps/game/src/components/ui/BuildingInfoPanel.DragDrop.test.tsx`.
- **Validation**: Tests must simulate:
  - Drop on Invalid Target -> Expect Restoration.
  - Drop on Valid Target (Event Fired) -> Expect NO Restoration.
  - Drop with `dropEffect="move"` but NO Event -> Expect Restoration (Strict Mode).
