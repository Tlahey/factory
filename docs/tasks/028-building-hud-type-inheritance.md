# Feature: Building HUD panels inherit from capability interfaces

**Status:** Not started

## Description

Building HUD panels should be automatically derived from the building's capability interfaces (e.g. resource producer, loader) instead of being manually wired per building.

## Requirements

- A building implementing a given capability interface (resource producer, loader, storage, etc.) automatically gets the corresponding HUD panel/fields, with no manual per-building wiring.
- Special-case buildings like the Hub, which need custom panels with more information, remain explicit exceptions to this automatic behavior.
