---
closed: false
---

# Feature: Building input/output system

**Status:** Needs verification (partially implemented)

## Description

Buildings need a general input/output system so conveyors know where to feed resources in and take them out, with clear visual indicators.

## Requirements

- Extractor has an output that sends extracted resources to conveyors.
- Container has an input (receives resources from conveyors) and an output (lets the player retrieve stored resources); the output is always on the opposite side from the input.
- Future buildings may support multiple inputs (placed side by side) but always a single output, opposite the inputs.
- Inputs are visually marked with a green arrow, outputs with a red arrow.
- Any conveyor that isn't connected to a building input or output does not function.

## Notes

This system appears to already be substantially implemented — see `IOArrowHelper`, `connectedInputSides`, `isInputConnected`, and `updateBuildingConnectivity()` referenced in [docs/issues/002-io-arrow-input-rotation-east-west.md](../issues/002-io-arrow-input-rotation-east-west.md) and the "Multi-Tile Buildings & Connectivity" / "Arrow Visibility Rules" sections of `apps/game/src/game/buildings/GEMINI.md`. Treat this task as verifying the current implementation against the requirements above rather than building it from scratch.
