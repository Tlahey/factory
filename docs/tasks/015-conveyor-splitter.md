---
closed: true
---

# Feature: Conveyor splitter

**Status:** Done

## Description

A conveyor split system that routes a single input conveyor to multiple outputs, each filtered by resource type.

## Requirements

- Support one input conveyor feeding multiple outputs.
- Each output is configured to accept only a specific resource type.

## Notes

The `conveyor-splitter` building folder already exists in `apps/game/src/game/buildings/`. Treat this task as verifying/completing the requirements above against the current implementation.

**Implementation (2026-08-02):** the round-robin distribution (one input →
three outputs) was already correct, but there was no per-output resource-type
filter and no HUD panel at all (`hasMenu: false`). Added: a per-instance
`outputFilters` map on `ConveyorSplitter` (`front`/`left`/`right` →
`ResourceType | null`), a guard in `tryOutput()` that skips a port whose
filter doesn't match the held item (same skip semantics as an already-full
port), persistence in `serialize()`/`deserialize()`, and a new
`ConveyorSplitterPanel` (flipped `hasMenu: true`) letting the player pick a
resource per port from a chip grid, or "Any" for the previous unfiltered
behavior. IO-arrow recoloring per configured filter was investigated and
scoped out as a separate, moderate-effort follow-up (arrows aren't currently
recolored reactively).
