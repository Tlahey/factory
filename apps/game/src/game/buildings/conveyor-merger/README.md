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
- **Round-Robin Fairness**: Cycles through inputs to ensure equal throughput from
  all sources. A side whose turn has not come refuses input (`canInput`) while a
  higher-priority side has an item waiting, so one saturated belt cannot starve
  the other two.
- **Pull + push**: it pulls the item waiting at the end of an input belt _and_
  accepts pushes, so it runs at full belt speed without losing a tick per
  hand-off. Both paths forward the item immediately (zero latency).
- **Output**: Single output at the Front, to any `ItemSink`
  (belt, chest, furnace, splitter...).

## 🏗️ Placement

- **Allowed**: Any solid ground.
- **Forbidden**: Water, Stone.
- **Placement Strategy**: Use to combine ore lines or manufacturing outputs onto a main bus.

## 🆙 Upgrades

Currently, the merger inherits speed properties relative to the game's tick rate but base speed is set to match standard conveyors.
