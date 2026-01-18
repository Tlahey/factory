# 🔥 Furnace

Smelts raw ores into useable ingots. The heart of basic production.

## 📊 Overview

| Attribute       | Value               |
| --------------- | ------------------- |
| **Type**        | Production          |
| **Size**        | 1x2                 |
| **Cost**        | 15 Iron, 10 Stone   |
| **Power Usage** | 30 kW               |
| **Processing**  | Configurable Recipe |

## ⚙️ Functionality

- **Smelting**: Converts input materials to output products based on selected recipe.
- **Recipes**:
  - Iron Ore -> Iron Ingot
  - Copper Ore -> Copper Ingot
  - Gold Ore -> Gold Ingot
- **Input/Output**:
  - **Input**: Back
  - **Output**: Front
- **I/O Validation**:
  - **Strict Routing**: Items only enter via the Back port and exit via the Front port.
  - **Type Checking**: Rejects any items not matching the active recipe's input.
  - **Connectivity**: Automatically manages output flow; only pushes to active recipients (Conveyors, Chests) when connected.
- **Queue**: Holds multiple input items.

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.

## 🆙 Upgrades

| Level | Name       | Description        | Cost                 | Effect          |
| ----- | ---------- | ------------------ | -------------------- | --------------- |
| 1     | Speed I    | Higher temperature | 50 Iron Ingot        | +50% Speed      |
| 2     | Parallel I | Dual chambers      | 200 Iron, 100 Copper | +1 Parallel Job |
| 3     | Queue I    | Larger hopper      | 50 Gold Ingot        | +5 Input Slots  |
