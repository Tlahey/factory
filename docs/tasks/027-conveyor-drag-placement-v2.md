# Feature: Continuous conveyor placement while dragging

**Status:** Not started

## Description

Rework conveyor placement so conveyors are laid down continuously while the mouse button is held, instead of a single drag-then-place-all gesture.

## Requirements

- Pressing the mouse button down places one conveyor at the cursor position.
- Dragging the mouse in a direction places additional conveyors following the cursor in real time, rather than only committing the whole path on release.
