---
closed: true
---

# Feature: Keep IO arrow colors unchanged in placement preview

**Status:** Done — was already implemented, added regression test coverage

## Description

While in placement-preview mode, a building's IO arrows currently change color (e.g. turn gray). They should keep their normal color instead.

## Requirements

- In preview/placement mode, IO arrows must retain their normal (placed-state) color.
- No color change should be applied to IO arrows specifically for preview mode.

## Verification (2026-08-02)

The old imperative `PlacementVisuals.ts` class (which this backlog item may
have originally been describing) is confirmed dead code — never
instantiated anywhere outside its own test. The actual active ghost-preview
component, `apps/game/src/game/components/visuals/PlacementView.tsx`, has
already protected arrow colors since it was created during the
React-Three-Fiber migration: the initial ghost-material substitution runs
_before_ IO arrows are added as children (so it never touches them), and the
per-frame validity-tint effect only recolors meshes whose material is a
`THREE.MeshStandardMaterial` — arrow meshes use `MeshBasicMaterial`
(`IOArrowHelper.ts`'s `createArrowMesh`), so they're structurally immune.

Couldn't get a live browser screenshot this session (the dev-server launch
was repeatedly blocked by a tool/classifier outage), so verification here is
static-analysis-based rather than visually confirmed. Added
`IOArrowHelper.materials.test.ts` — a real (unmocked) THREE.js check that
arrow meshes are `MeshBasicMaterial`, not `MeshStandardMaterial` — to lock in
the invariant `PlacementView.tsx`'s tint-skip logic depends on.
