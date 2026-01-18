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

- **Transport**: Moves items from Input to Output.
- **Directional**: Fixed direction upon placement.
- **Connections**:
  - **Input**: Back (or Sides for turns)
  - **Output**: Front
- **Turning**: Automatically updates visual to "Left" or "Right" turn based on incoming connections.

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.

## 🆙 Upgrades

Upgrades increase the transport speed of belts.

| Level | Name     | Description      | Cost                | Effect      |
| ----- | -------- | ---------------- | ------------------- | ----------- |
| 1     | Speed I  | Faster motors    | 100 Iron            | +50% Speed  |
| 2     | Speed II | High-speed belts | 250 Iron, 50 Copper | +100% Speed |
