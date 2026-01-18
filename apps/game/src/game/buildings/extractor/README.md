# ⛏️ Extractor

Automated mining drill that extracts raw resources from the ground.

## 📊 Overview

| Attribute           | Value        |
| ------------------- | ------------ |
| **Type**            | Production   |
| **Size**            | 1x1          |
| **Cost**            | 10 Iron      |
| **Extraction Rate** | 60 items/min |
| **Power Usage**     | 20 kW        |

## ⚙️ Functionality

- **Extraction**: Mines the resource tile it is placed on.
- **Output**: Ejects items to the Front (requires Conveyor or Chest).
- **Buffering**: Has a small internal buffer. Stops if output is blocked.

## 🏗️ Placement

- **Required**: **Stone/Resource Tile**. It must be placed on a node to function.
- **Output**: Ensure the arrow points towards a conveyor or storage.

## 🆙 Upgrades

| Level | Name      | Description       | Cost                          | Effect     |
| ----- | --------- | ----------------- | ----------------------------- | ---------- |
| 1     | Speed I   | Better drill bits | 50 Stone                      | +20% Speed |
| 2     | Speed II  | Faster motors     | 100 Stone, 20 Iron            | +40% Speed |
| 3     | Speed III | Diamond drills    | 200 Stone, 50 Iron, 25 Copper | +60% Speed |
