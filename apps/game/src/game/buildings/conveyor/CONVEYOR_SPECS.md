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
- **Auto-Orientation:** If placed without manual rotation, the conveyor attempts to infer the best direction:
  - Connect to a valid Output (Chest, Hub) if adjacent.
  - Continue the flow from an Input (Extractor) if adjacent.

### 1.3 Collision

- Conveyors occupy 1x1 tile.
- They cannot be placed on top of existing buildings (unless replacing another conveyor, if upgrading is supported in future).

## 2. Connections & Flow

### 2.1 Input (Receiving Items)

- **Primary Input:** From the back (Opposite to direction).
- **Side Input (Turns):** Conveyors accept items from the side if the side neighbor outputs to them.
- **Rules:**
  - An Extractor outputting to the conveyor is a valid input.
  - Another Conveyor pointing at this conveyor is a valid input.

### 2.2 Output (Sending Items)

- **Primary Output:** To the front (Direction).
- **Valid Targets:**
  - Another Conveyor (creates a chain).
  - Chest (stores items).
  - Hub (sells items).
  - Other machines (Furnace, etc.) inputs.
- **Resolution:** A conveyor is considered "Resolved" (`isResolved = true`) only if it eventually leads to a valid sink (Chest, Hub, Machine). However, **non-resolved conveyors still transport items** as long as they have a valid path forward. Resolution is primarily a visual hint for the player.

## 3. Visuals

### 3.1 3D Model

- **Straight:** Standard belt.
- **Turns:**
  - **Left Turn:** Visualized when input comes specifically from the Left side (relative to flow).
  - **Right Turn:** Visualized when input comes specifically from the Right side.
  - **Geometry:** Right turns are often mirrored geometry of Left turns. Materials must be DoubleSide to prevent culling.

### 3.2 Arrows (Debug/Placement)

- **Input Arrow (Green):** Visible only if the input port is _not_ connected. Hidden when a valid source is connected.
- **Output Arrow (Red):** Visible only if the output port is _not_ connected. Hidden when a valid target is connected.

## 4. Behavior (Tick)

- **Speed:** Defined in config (e.g., 60 tiles/minute = 1 tile/second).
- **Item Transport:**
  - Items move from 0 to 1 progress.
  - At progress >= 1, the conveyor attempts to push the item to the target.
  - If target is full or invalid, item stops at end of belt.
