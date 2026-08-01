# 🛤️ Conveyor

The backbone of factory logic, Conveyor Belts transport items between buildings.

## 📊 Overview

| Attribute      | Value        |
| -------------- | ------------ |
| **Type**       | Logistics    |
| **Size**       | 1x1          |
| **Cost**       | 1 Iron       |
| **Base Speed** | 60 items/min |

## ⚙️ Functionality

- **Transport**: Moves items from Input to Output. On a belt-to-belt hand-off the
  progress overflow is carried over, so items keep a constant speed.
- **Directional**: Fixed direction upon placement.
- **Connections**:
  - **Input**: Back **and both sides** — never the front. Refusing the front is
    what prevents two belts facing each other from ping-ponging an item.
  - **Output**: Front, to anything implementing the `ItemSink` contract
    (belt, chest, furnace, merger, splitter...). See
    [`buildings/ItemTransfer.ts`](../ItemTransfer.ts).
- **Turning**: Automatically updates visual to "Left" or "Right" turn based on
  incoming connections. A **back** feed always wins over a side feed, so a
  straight run that is also side-merged keeps rendering straight.
- **Resolution**: `isResolved` marks belts that lead to a real sink. It is
  recomputed from scratch on every topology change and propagates through
  mergers and splitters. Unresolved belts are dimmed in the renderer.

Full rules: [CONVEYOR_SPECS.md](./CONVEYOR_SPECS.md).

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.

## 🆙 Upgrades

Upgrades increase the transport speed of belts.

| Level | Name     | Description      | Cost                | Effect      |
| ----- | -------- | ---------------- | ------------------- | ----------- |
| 1     | Speed I  | Faster motors    | 100 Iron            | +50% Speed  |
| 2     | Speed II | High-speed belts | 250 Iron, 50 Copper | +100% Speed |
