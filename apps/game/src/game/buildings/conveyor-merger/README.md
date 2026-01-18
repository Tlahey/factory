# 🔀 Conveyor Merger

Merges up to three input conveyor lines into a single output line.

## 📊 Overview

| Attribute | Value                            |
| --------- | -------------------------------- |
| **Type**  | Logistics                        |
| **Size**  | 1x1                              |
| **Cost**  | 4 Iron Plate, 4 Copper Wire      |
| **Speed** | 60 items/min (Matches Conveyors) |

## ⚙️ Functionality

- **Merging**: Takes inputs from Back, Left, and Right.
- **Round-Robin Fairness**: Cycles through inputs to ensure equal throughput from all sources.
- **Output**: Single output at the Front.

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.
- **Placement Strategy**: Use to combine ore lines or manufacturing outputs onto a main bus.

## 🆙 Upgrades

Currently, the merger inherits speed properties relative to the game's tick rate but base speed is set to match standard conveyors.
