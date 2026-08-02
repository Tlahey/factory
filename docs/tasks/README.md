# Task Backlog

Task backlog converted from the repo's root `TODO.md` on 2026-08-02. Each entry is a standalone bug or feature request as originally noted, translated to English and split into individually actionable files. Some features reference buildings that already exist in `apps/game/src/game/buildings/` (e.g. Furnace, Solar Panel, Battery, Conveyor Merger/Splitter) — those are marked **Needs verification (partially implemented)** since the task is to complete/verify requirements against the current code, not build from scratch.

Each task file carries a `closed: true|false` frontmatter field: `true` once the task is fully done or retired (e.g. superseded by another task), `false` while it's still open (not started, partially implemented, or design-only).

## Bugs

| #   | Task                                                                                             | Status                                     |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 001 | [Drag-and-drop lacks a shared, typed interface](001-drag-drop-typed-interface.md)                | Done                                       |
| 002 | [Resources can enter through a building's output side](002-conveyor-io-direction-enforcement.md) | Done                                       |
| 003 | [Construction menu dialogue popup reopens every time](003-construction-menu-dialogue-repeats.md) | Done                                       |
| 004 | [Battery's stored energy is not saved](004-battery-energy-not-persisted.md)                      | Needs verification (partially implemented) |
| 005 | [Sawmill doesn't show power consumption in HUD](005-sawmill-hud-consumption-missing.md)          | Needs verification (partially implemented) |

## Features

| #   | Task                                                                                              | Status                                     |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 006 | [Scripted intro to bootstrap starting rock](006-scripted-intro-resource-bootstrap.md)             | Not started                                |
| 007 | [Per-resource extraction yield ratio](007-resource-extraction-yield-ratio.md)                     | Not started                                |
| 008 | [Hover + "c" hotkey to select a building](008-hover-hotkey-select-building.md)                    | Done                                       |
| 009 | [Minimap](009-minimap.md)                                                                         | Not started                                |
| 010 | [Building input/output system](010-building-io-system.md)                                         | Needs verification (partially implemented) |
| 011 | [Restrict initial Container placement to next to the Hub](011-container-placement-restriction.md) | Not started                                |
| 012 | [Hub starting conditions](012-hub-starting-conditions.md)                                         | Not started                                |
| 013 | [Furnace building](013-furnace-building.md)                                                       | Needs verification (partially implemented) |
| 014 | [Conveyor merger](014-conveyor-merger.md)                                                         | Needs verification (partially implemented) |
| 015 | [Conveyor splitter](015-conveyor-splitter.md)                                                     | Needs verification (partially implemented) |
| 016 | [Starting iron ore and coal deposits](016-starting-ore-coal-deposits.md)                          | Not started                                |
| 017 | [Hub upgrade for solar panel output](017-hub-solar-upgrade.md)                                    | Not started                                |
| 018 | [Wind turbine building](018-wind-turbine-building.md)                                             | Not started                                |
| 019 | [Dynamic weather system](019-dynamic-weather-system.md)                                           | Not started                                |
| 020 | [Solar panel building](020-solar-panel-building.md)                                               | Needs verification (partially implemented) |
| 021 | [Monster attacks and base defenses](021-monster-attacks-and-defenses.md)                          | Not started                                |
| 022 | [Underground conveyor](022-underground-conveyor.md)                                               | Not started                                |
| 023 | [Watchtower building for map discovery](023-watchtower-building.md)                               | Superseded by 037                          |
| 024 | [Hidden rare minerals inside rock tiles](024-hidden-rare-minerals-in-rock.md)                     | Not started                                |
| 025 | [Trade system and Market building](025-trade-system-market.md)                                    | Not started                                |
| 026 | [Building construction time](026-building-construction-time.md)                                   | Not started                                |
| 027 | [Continuous conveyor placement while dragging](027-conveyor-drag-placement-v2.md)                 | Not started                                |
| 028 | [Building HUD panels inherit from capability interfaces](028-building-hud-type-inheritance.md)    | Not started                                |
| 029 | [Keep IO arrow colors unchanged in placement preview](029-preview-mode-io-arrow-color.md)         | Not started                                |
| 030 | [Restrict skill-tree upgrades to one at a time](030-sequential-upgrades-only.md)                  | Done                                       |
| 031 | [Workshop for manual crafting](031-workshop-manual-crafting.md)                                   | Not started                                |
| 032 | [Chunk-based map with per-chunk resource limits](032-chunk-based-map-resource-limits.md)          | Not started                                |
| 033 | [Image-based asset preview alongside 3D models](033-model-preview-asset-system.md)                | Not started                                |
| 034 | [Constructor building](034-constructor-building.md)                                               | Not started                                |
| 035 | [Grinder building](035-grinder-building.md)                                                       | Not started                                |
| 036 | [Tower building for vision and resource generation](036-tower-vision-resource-generation.md)      | Superseded by 037                          |
| 037 | [Multi-island exploration & progression](037-multi-island-exploration-progression.md)             | Design complete                            |
