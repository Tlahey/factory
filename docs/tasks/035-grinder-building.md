# Feature: Grinder building

**Status:** Not started

## Description

A Grinder/Crusher building that processes rock into rare resources at a low, tunable drop chance.

## Requirements

- Accepts rock via its input; resources must arrive via the input or nothing happens and the feeding conveyor blocks.
- Grinding one batch of rock takes 10 seconds.
- Drop chance is low by default (~0.1%) and adjustable higher for testing.
- Per batch of 10 rock, roll independently for:
  - 0.1% chance of gold
  - 0.2% chance of silver
  - 0.3% chance of bronze
  - 0.4% chance of copper
  - 0.5% chance of iron
