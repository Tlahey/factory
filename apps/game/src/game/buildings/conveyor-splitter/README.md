# 🔀 Conveyor Splitter

Splits a single input conveyor line into up to three output lines.

## 📊 Overview

| Attribute | Value                            |
| --------- | -------------------------------- |
| **Type**  | Logistics                        |
| **Size**  | 1x1                              |
| **Cost**  | 4 Iron Plate, 4 Copper Wire      |
| **Speed** | 60 items/min (Matches Conveyors) |

## ⚙️ Functionality

- **Input**: Single input at the Back. Anything arriving from another side is
  refused, which is exactly what the green arrow shows.
- **Splitting**: Distributes items to Front, Left, and Right outputs — to any
  `ItemSink` (belt, chest, furnace, merger...).
- **Round-Robin Fairness**: Cycles through available outputs to ensure equal
  distribution among connected lines. Sides that are missing, blocked, or that
  refuse input from us are skipped without losing the turn.
- **Buffer**: Holds one item while waiting for an output to become available.
  While holding, it reports `operationStatus = "blocked"`.

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.
- **Placement Strategy**: Use to distribute resources from a main bus to multiple production lines.

## 🆙 Upgrades

Currently, the splitter inherits speed properties relative to the game's tick rate but base speed is set to match standard conveyors.
