# Bug: Construction menu dialogue popup reopens every time

**Status:** Not started

## Description

The dialogue popup opens every time the construction menu is opened. It should only appear once — the first time the player ever opens the menu.

## Requirements

- Track whether the intro dialogue has already been shown (persisted so it doesn't reset on reload).
- Only display the dialogue popup on the very first time the construction menu is opened.
