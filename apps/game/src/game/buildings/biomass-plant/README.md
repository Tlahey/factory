# Biomass Power Plant

## Description

The Biomass Power Plant generates electricity by burning wood. It provides an alternative power source to the Hub's solar panels, allowing players to create decentralized power generation using renewable biomass resources.

## Mechanics

### Power Generation

- **Base Power Output**: ~20 units/second (with ±3 fluctuation)
- **Fluctuation**: Power output varies sinusoidally to simulate realistic combustion
- **Condition**: Only generates power when burning fuel and enabled

### Fuel Consumption

- **Fuel Type**: Wood only
- **Consumption Rate**: 1 wood per 5 seconds (configurable)
- **Storage Capacity**: 20 wood (upgradable)

### Breaker Control

The plant includes an on/off breaker:

- **ON**: Plant will burn fuel and generate power
- **OFF**: Plant stops consuming fuel and stops generating power

## I/O Layout

| Side | Port         |
| ---- | ------------ |
| Back | Input (Wood) |

## Status Indicators

| Color  | State                  |
| ------ | ---------------------- |
| Green  | Active and burning     |
| Orange | Enabled but no fuel    |
| Grey   | Disabled (breaker off) |

## Upgrades

| Level | Name         | Effect                |
| ----- | ------------ | --------------------- |
| 1     | Efficiency I | +25% power generation |
| 2     | Capacity I   | +10 fuel storage      |
| 3     | Speed I      | -20% consumption time |

## Visual Features

- Fire glow with flicker effect when burning
- Smoke particles from chimney
- Wood logs visibility changes with fuel level
- Breaker switch changes color (green/red)

## Implementation

- **Config**: `BiomassPlantConfig.ts`
- **Logic**: `BiomassPlant.ts`
- **Model**: `BiomassPlantModel.ts`
- **Visual**: `BiomassPlantVisual.ts`
