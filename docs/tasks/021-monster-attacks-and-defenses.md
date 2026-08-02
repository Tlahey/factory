# Feature: Monster attacks and base defenses

**Status:** Not started

## Description

Monsters periodically attack the base at night. The player needs defensive turrets, and buildings (including the Hub) take damage and can be destroyed.

## Requirements

- Monsters spawn at regular intervals during the night; initially a single monster per night.
- Spawn frequency is configurable, and can be increased via skill-tree unlocks (unlocking new buildings alongside it).
- Turrets can be built around the base to defend against monsters.
- Turrets are upgradeable via the skill tree: firepower, range, and fire rate.
- Monsters destroy buildings they reach:
  - Each building has a fixed amount of HP.
  - A monster attacking a building deals damage at regular intervals.
  - A building is destroyed when its HP reaches zero.
- If a monster reaches the Hub, it damages the Hub's structure; if the Hub's HP reaches zero, the game ends.
- Until at least one turret exists, monsters ignore all other buildings and head straight for the Hub.
- The Hub itself has a base turret with limited firepower and a slow fire rate.
