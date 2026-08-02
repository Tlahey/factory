---
closed: true
---

# Bug: Resources can enter through a building's output side

**Status:** Done

## Description

Resources can currently flow into a building or conveyor through its output side, which should never be possible. Flow direction needs to be strictly enforced on both ends.

## Requirements

- Resources may only enter through an input; if they can't, the feeding conveyor must stop/block rather than let them slip in through the output.
- Resources may only exit through an output; if there's nowhere for them to go, nothing should exit.
