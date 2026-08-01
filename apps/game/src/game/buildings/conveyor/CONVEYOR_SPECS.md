# Conveyor Specifications

This document details the functional specifications for the Conveyor building in the Factory Game.

## 1. Placement Rules

### 1.1 Valid Terrain

- Conveyors can be placed on **Empty**, **Grass**, **Sand** tiles.
- Conveyors **cannot** be placed on **Water** and **Stone** (ressources).

### 1.2 Direction

- Conveyors have a fixed direction (`north`, `south`, `east`, `west`) determined at placement.
- **Rotation:** Users can rotate the conveyor before placement using the `R` key.
  - **Reverse Flow Prevention:** The rotation preview automatically skips directions that would cause the conveyor to point directly into an upstream Output port (e.g., facing into an Extractor's output or another Conveyor's output that points to it).
- **Auto-Orientation:** If placed without manual rotation, the conveyor infers the best direction from the surrounding **IO ports** (never from building types):
  - Connect to any neighbour exposing an input port on our tile (Chest, Furnace, Merger side input, ...).
  - Otherwise continue the flow from any neighbour whose output port targets our tile (Extractor, Splitter side output, Chest output, ...).

### 1.3 Collision

- Conveyors occupy 1x1 tile.
- They cannot be placed on top of existing buildings (unless replacing another conveyor, if upgrading is supported in future).

## 2. Connections & Flow

### 2.1 Input (Receiving Items)

- **Primary Input:** From the back (Opposite to direction). This is the canonical
  port returned by `getInputPosition()`.
- **Side Input:** The two lateral tiles also accept items; all three are returned
  by `getInputPositions()`.
- **Never the front:** a belt refuses anything arriving through its output face,
  which is what prevents two belts facing each other from ping-ponging an item.

### 2.2 Output (Sending Items)

- **Primary Output:** To the front (Direction).
- **Valid Targets:** anything implementing the `ItemSink` contract
  (`canInput` + `addItem`): another Conveyor, Chest, Furnace, Merger, Splitter,
  Biomass Plant...
- **Resolution:** A conveyor is "Resolved" (`isResolved = true`) only if it
  eventually leads to a valid sink. Resolution is recomputed from scratch on
  every topology change and propagates _through_ mergers and splitters. It is a
  visual hint only — non-resolved conveyors still transport items.

### 2.3 The transfer contract

Two questions are answered separately (see `buildings/ItemTransfer.ts`):

| Question                              | Method                      | Used for                        |
| ------------------------------------- | --------------------------- | ------------------------------- |
| "is that tile one of my input ports?" | `canInput(fromX, fromY)`    | arrows, connectivity, placement |
| "do I have room right now?"           | `hasSpaceFor(type, amount)` | blocked/idle status, transfer   |

A transfer only happens when both are true. Keeping them separate is what makes
arrows stable (they don't flicker when a belt is momentarily full) while still
reporting machines as `blocked` when the destination is saturated.

**The Hub is not an item sink.** `HUB_CONFIG` declares `hasInput: false` and the
Hub has no storage, so belts pointing at it show a red output arrow and stay
unresolved.

## 3. Visuals

### 3.1 3D Model

- **Straight:** belt slab, two side frames with hazard trim, end rollers and legs.
- **Turns:**
  - **Left Turn:** Visualized when input comes specifically from the Left side (relative to flow).
  - **Right Turn:** Visualized when input comes specifically from the Right side.
  - **Geometry:** Right turns are mirrored geometry of Left turns. Materials must be DoubleSide to prevent culling.
- **Turn detection priority:** the tile **behind** the belt wins over the sides.
  A straight run that also receives a side merge keeps rendering straight.
- **Belt animation:** scroll speed follows the actual `transportSpeed` and stops
  when the belt is `blocked`. Unresolved belts are dimmed.

### 3.2 Arrows (Debug/Placement)

- **Input Arrow (Green):** points INWARD. Visible only if no source is connected.
- **Output Arrow (Red):** points OUTWARD. Visible only if the output port is not connected.
- Arrows are rendered in a group rotated **only** by the belt direction — never
  parented to the belt mesh, which carries an extra ±90° rotation and an X
  mirror on turns.

## 4. Behavior (Tick)

- **Speed:** Defined in config (e.g., 60 tiles/minute = 1 tile/second).
- **Item Transport:**
  - Items move from 0 to 1 progress.
  - At progress >= 1, the conveyor attempts to push the item to the target.
  - On a successful belt-to-belt hand-off the progress **overflow** is carried
    over, so items keep a constant speed across tiles.
  - If target is full or invalid, item stops at end of belt and the belt reports
    `operationStatus = "blocked"`.
- **Cost control:** turn visuals and IO connectivity are only recomputed when
  `world.topologyVersion` changes (a building was placed/removed), not every
  frame for every belt.
