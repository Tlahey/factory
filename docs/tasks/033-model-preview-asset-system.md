# Feature: Image-based asset preview alongside 3D models

**Status:** Not started

## Description

Support using a static image as a preview asset, in addition to 3D models, so previews can be either an "Image Asset" or a "3D Asset".

## Requirements

- Support two preview asset kinds: Image Asset and 3D Asset.
- Preview assets live alongside the relevant building/resource's config.
- Provide a loader function that fetches the correct preview (image or 3D model) depending on the asset kind.
