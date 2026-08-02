# Feature: Building construction time

**Status:** Not started

## Description

Some buildings should take time to construct (e.g. Extractor takes 10 seconds), with a visual build-up effect and a generic, configurable construction-time system.

## Requirements

- Bottom-to-top visual build-up effect on the building model, with particles falling from above.
- Display a construction-% indicator above the building while it's being built.
- Add a generic per-building config field for construction time (usable by any building, not hardcoded per-building).
- Show construction time in the building's UI (e.g. construction menu tooltip).
- Skill-tree modifiers can affect construction time in both directions: unlocking certain buildings can add time, while dedicated upgrades reduce it.
