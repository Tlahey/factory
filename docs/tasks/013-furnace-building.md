---
closed: false
---

# Feature: Furnace building

**Status:** Needs verification (partially implemented)

## Description

The Furnace transforms raw ore into ingots (e.g. iron ore → iron ingot), consuming electricity only while actively crafting, with a UI for recipe selection, progress, and a transformation queue.

## Requirements

- Transforms raw ore into ingots (e.g. iron ore → iron ingot).
- Consumes electricity only while actively crafting (idle furnace draws no power).
- Production speed is upgradeable via the skill tree.
- Has one input (ore) and one output (ingots).
- UI shows the ore currently being transformed, remaining time per transformation, and quantity of ingots produced.
- Has a queue of pending transformations; queue size is upgradeable via the skill tree.
- Upgradeable for simultaneous transformation capacity and reduced transformation time.
- Does not start producing until the player selects which ingot type to produce, via a dropdown.
  - The dropdown UI shows the required input resource (3D model), an arrow, and the produced output resource (3D model).
- Recipe unlocking happens via the Hub's skill tree (e.g. 100 iron ore required to unlock the iron ingot recipe; thresholds differ per resource).
  - The dropdown must only list recipes the player has already unlocked.
- Each recipe has an input stack ratio (e.g. 5 iron ore → 1 iron ingot); ratios may change per recipe over time.
- Resources must arrive via the input, or nothing happens and the feeding conveyor blocks.
- When the internal stack limit is reached, the input conveyor blocks.
- Crafted stacks exit via the output.
- Consumed input resources are destroyed, not re-emitted.
- Only the crafted output resource is re-injected into the output.
- If no conveyor is connected to the output, the furnace stockpiles up to 20 items, then stops.
- Generate placeholder 3D models for any missing resource models, and log a console warning when doing so.

## Notes

The `furnace` building folder already exists in `apps/game/src/game/buildings/`. This task combines the original "implement a furnace" request with a later follow-up spec pass — treat it as verifying/completing the requirements above against the current implementation, not building from scratch.
