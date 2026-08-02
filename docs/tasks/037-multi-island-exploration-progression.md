# Feature: Multi-island exploration & progression (fog-of-war, exploration tower, shipwreck unlock)

**Status:** Design complete — not started (implementation not yet begun)

**Supersedes:** [023-watchtower-building.md](023-watchtower-building.md),
[036-tower-vision-resource-generation.md](036-tower-vision-resource-generation.md) — both
described a map-discovery tower in isolation; this document covers the same tower as one
piece of a coherent architecture (fog-of-war data model, multi-island world generation,
and the shipwreck-gated unlock loop between islands). See those files for the original,
narrower requirements they're superseded from.

**Related:** [009-minimap.md](009-minimap.md) — a foreseeable consequence of this
feature (see §1.4-3 below) once more than one island exists; not solved by this document,
but flagged as a dependency to revisit.

## Description

The world should become evolutive, Age-of-Empires-style: dark/unexplored zones beyond
the seas that get revealed by placing exploration towers, and a way to progress from one
island to the next by repairing a shipwreck washed up on the beach — delivering it
resources unlocks access to the next island.

This is a from-scratch feature area: there is no existing multi-island, fog-of-war, or
quest/objective concept anywhere in the codebase today — the world is a single fixed
50×50 grid, one rectangular island with a uniform water/sand border. The full
architectural design below covers all four pieces (multi-island generation, fog-of-war,
exploration tower, shipwreck unlock) plus a recommended build order, so implementation
can proceed phase-by-phase — each phase getting its own focused implementation plan when
it's actually started, not all at once.

---

## 0. Cross-cutting foundations

**No player-avatar/traversal system exists.** No movement/pathing code was found anywhere
in `game/`. Placement is pure click-to-build; nothing "walks" to an island. This means
"unlocking an island" is a pure _permission + visibility_ concept, not a physical-travel
one — no pathfinding/ferries/bridges needed. **Flag to confirm before implementation**: if
a traversal system is planned separately, "unlocked" needs a third dimension later.

**Two independent, unversioned save blobs exist today, and multi-island generation
breaks both:**

- Zustand's `persist` middleware writes UI/meta state to `localStorage["factory-game-storage"]` (`game/state/store.ts:625`).
- `World.serialize()`/`deserialize()` writes the world itself to a _separate_ key, `localStorage["factory_save"]` (`game/providers/GameProvider.tsx:179,190`).

Neither has a `version`/`migrate` field. Growing `WORLD_WIDTH`/`WORLD_HEIGHT` changes the
shape of `worldData.grid` outright — old saves will crash or silently corrupt on load.
**Decision needed before piece 1 ships**: recommend adding a `saveVersion` field and
wiping-and-regenerating on mismatch (simplest, acceptable at this project's stage) rather
than building a real migration path.

**The building plugin checklist (`game/buildings/GEMINI.md`, automated by the
`add-new-building` skill)** is the reference procedure for the Exploration Tower and the
Shipwreck — both are new `BuildingEntity` plugins, nothing new to invent there.

**The game loop** (`game/providers/GameProvider.tsx` instantiates systems;
`game/components/GameLoop.tsx:54-59` calls `world.tick(delta)` then each system's
`.update(delta)`) is where any new per-frame logic would hook in if needed.

**The event bus** (`game/events/GameEventManager.ts`, a closed union type) should gain
`AREA_REVEALED` and `ISLAND_UNLOCKED` events — cheap, typed, gives `GuidanceSystem` a
natural hook for one-shot "you found a shipwreck!" / "new island unlocked!" dialogues.

---

## 1. Multi-island world generation

### 1.1 Data model

```ts
// game/constants.ts — grow from the fixed 50x50 (exact number is TBD, see risk 1.4-1)
export const WORLD_WIDTH = 140; // placeholder
export const WORLD_HEIGHT = 140;

// New: game/core/Island.ts
export interface Island {
  id: number; // 0 = starting/hub island
  center: { x: number; y: number };
  radius: number; // base blob radius before noise perturbation
  unlocksIslandId: number | null; // which island this one's shipwreck grants access to
}
```

`Island[]` is generated once by a new `WorldGenerator` module, stored on `World`
(`public islands: Island[]`), and added to `WorldData`/`serialize()`/`deserialize()` as a
new top-level array (same treatment `cables` already gets). Tiles do **not** need a
stored `islandId` — nothing needs "which island is this tile" at runtime; it can be
derived on demand via nearest-island distance if ever needed.

### 1.2 Generation algorithm

Stays a single synchronous eager pass over the whole grid (same shape as today's
`World.generateEmptyWorld()`, `World.ts:285-320`), just island-aware instead of one
hardcoded rectangle:

1. **Place island centers** via rejection-sampled placement (island count is small, so
   brute-force rejection sampling beats a true Poisson-disc grid in simplicity): keep a
   fixed hub position for island 0, then repeatedly sample random points until each is
   `>= minGap` from all existing centers (`minGap = maxIslandRadius*2 + desiredSeaGapWidth`
   guarantees a believable sea gap). If sampling exhausts its attempt budget, generate
   fewer islands than requested rather than throwing — a smaller archipelago is an
   acceptable degrade.
2. **Per-island blob radius**: `r(theta) = radius * (1 + amplitude * noise1D(theta, seed_i))`
   using 2-3 random sine harmonics (no new noise dependency needed). A tile belongs to
   island `i` if its distance from `center_i` is `<= r(angleToCenter)`.
3. **Classify every tile** land/water in one pass over the blobs above.
4. **Per-island beach correction** (fixes a real bug in the current shoreline math): run a
   multi-source BFS from every water tile adjacent to land, computing `distanceToWater`
   per land tile. A land tile becomes `SAND` if within the existing `SAND_BORDER` width of
   water, else `GRASS`/resource — same constants as today, now measured from the nearest
   shore instead of the world rectangle's edge. This directly fixes
   `TerrainBatcher.getHeightAt` (`TerrainBatcher.ts:27-32`), which today computes
   `Math.min(x, WORLD_WIDTH-1-x)` — literally "distance to rectangle edge" — and must
   become a lookup into this precomputed per-tile distance field instead.
5. **Resource seeding** reuses today's per-tile random rolls (`World.ts:307-317`)
   unchanged, applied only to land tiles.
6. **Hub placement**: island 0's center is where the Hub spawns today (verify existing
   convention and keep it for island 0).

### 1.3 World-size growth implications

- **Batched mesh perf**: `TerrainBatcher.createBatchedTerrain` merges every tile into
  static meshes via `mergeGeometries`. Going from 2,500 to ~19,600 tiles is a ~7.8×
  geometry increase — likely fine for static batching, but **must be profiled at the
  real target size before locking it in**, not assumed.
- **Camera**: `CAMERA_BOUNDS`/`DEFAULT_CAMERA_TARGET` (`game/camera/CameraConfig.ts:24-33`)
  already derive from `WORLD_WIDTH`/`WORLD_HEIGHT`, so they auto-scale. But
  `CAMERA_LIMITS.maxDistance = 110` (`CameraConfig.ts:8`) is a hardcoded zoom-out cap,
  unrelated to world size — at a bigger world the player may not be able to zoom out far
  enough to see two islands at once. **No minimap exists anywhere** (see
  [009-minimap.md](009-minimap.md)).
- **Save size**: roughly proportional to tile count; back-of-envelope ~800KB uncompressed
  at 140×140 with 4 fields/tile — comfortably within `localStorage`'s typical quota, but
  unmeasured.

### 1.4 Open decisions / risks

1. **World size is unpicked.** Trades off "feels like a real ocean between islands"
   against untested mesh/perf cost and camera navigability. Needs a quick spike
   (generate N islands at candidate sizes, measure frame time) before locking in — 140 is
   a placeholder, not a recommendation.
2. **Hub island placement — center vs. corner of the world.** Center gives symmetric
   "explore outward" feel and matches existing camera defaults; a corner gives a
   directional "push the frontier" feel. Game-feel call, not an engineering one.
3. **No minimap or fast-travel exists** ([009-minimap.md](009-minimap.md) is backlogged
   but not implemented), and free-roam camera + no waypoints risks players getting lost
   across a multi-island world. Recommend at minimum a "jump to island N" button list
   once >2 islands exist, even before a full minimap.
4. **Determinism/seeding**: world-gen uses raw `Math.random()` today (irreproducible).
   This is the cheapest moment to introduce a seeded PRNG (store the seed, regenerate
   deterministically) — retrofitting later touches every random call in world-gen.

---

## 2. Fog-of-war

### 2.1 Data model — `World`-level parallel array, not a `Tile` field

**Concrete reason**: `Tile` subclasses are disposable value objects — `Rock.onTick`/
`Tree.onTick` (`Rock.ts:31`, `Tree.ts:53`) **return a brand-new `Tile` instance** (an
`EmptyTile`) when a resource depletes. If `discovered` lived on the `Tile` instance,
every depleted rock/tree would silently re-fog itself the instant it changed type — a
constant, player-visible bug. `discovered` must outlive whatever `Tile` object currently
occupies a cell.

```ts
// World.ts
public discovered: boolean[][]; // [y][x], same indexing as `grid`
```

`boolean[][]` (not a packed `Uint8Array`) for consistency with `grid`'s own style — fog
data isn't hot-path per-frame data. Persist it in the same 4 touch-points that already
need fixing for the pre-existing `variantId` type drift: the `WorldData` type,
`serialize()`'s per-tile object, `deserialize()`'s per-tile read, and `TileFactory`.

### 2.2 Seeding at world-gen

After tile classification, call the same reveal API used at runtime (§2.3) once, centered
on the hub: `world.revealArea(hubX, hubY, HUB_STARTER_RADIUS)`. Using the same function
for initial seeding and later runtime reveals means one reveal code path to test, not two.

**Size `HUB_STARTER_RADIUS` deliberately smaller than the island's full playable
interior** — if the initial reveal already covers most of the island, the exploration
tower (piece 3) has nothing real to prove before multi-island generation (piece 1) even
exists, defeating the point of the build order in §5.

### 2.3 Reveal API

```ts
// World.ts
public revealArea(cx: number, cy: number, radius: number): boolean {
  // circular reveal, clamped to grid bounds; returns true iff >=1 NEW tile was revealed
}
```

Returning `boolean` lets callers (tower placement, shipwreck completion) skip a rebatch/
event-emit when nothing actually changed (e.g. a second tower placed entirely inside an
already-revealed area).

### 2.4 Rendering: 4th merged mesh + fixing the real rebatch-trigger gap

Add a `fogMesh` to `createBatchedTerrain`'s return, built like the other three (flat,
cheap `MeshStandardMaterial`, dark/desaturated — the simplest member of the terrain
PBR-material family from the recent rework, no custom shader needed for v1). Any tile
where `!discovered[y][x]` contributes to `fogGeometries` instead of its normal bucket,
regardless of underlying type.

**The real question isn't "debounced or synchronous" — it's that reveals don't render at
all today.** `Terrain.tsx`'s `useMemo(() => createBatchedTerrain(...), [world])` only
depends on `world`, which is a stable class-instance reference from `GameProvider` that
never changes identity — so this `useMemo` only ever runs once, on mount. Calling
`world.revealArea(...)` today would silently do nothing visually.

Fix: a store-based version counter (same shape as `World.topologyVersion`,
`World.ts:59-64`, but living in Zustand so React can subscribe):

```ts
// store.ts
terrainVersion: number;
bumpTerrainVersion: () => void;
```

`World.revealArea` calls `useGameStore.getState().bumpTerrainVersion()` only when it
actually changed something; `Terrain.tsx` adds `terrainVersion` to its `useMemo` deps.
`World` reaching into the store directly is already an existing pattern elsewhere in
`World.ts` (e.g. `purchasedCounts`, `addDebugLog`), not a new coupling style. Since
reveals are rare, discrete, player-triggered events, a full synchronous rebatch per
reveal is fine — no debouncing needed beyond what React's own batching already gives.

### 2.5 Placement gate integration

Add a `discovered[y][x]` check to `World.canPlaceBuilding`'s existing per-occupied-tile
loop (`World.ts:232-281`), alongside bounds/footprint/`isValidPlacement`, using the same
`logFailures`/`addDebugLog` convention already there. The exploration tower needs an
explicit exemption from this — see §3.3, the seam between pieces 2 and 3.

### 2.6 Open decisions / risks

1. `boolean[][]` vs `Uint8Array` — minor, low risk either way, call it a conscious choice.
2. **Reveal shape**: pure circular radius vs. line-of-sight/elevation-aware. Recommend
   circular for v1 — terrain here is flat-shaded per-tile with only shoreline slope, so
   line-of-sight has little payoff for its complexity.
3. Buildings can never straddle a reveal boundary mid-frame (nothing can be placed on
   undiscovered tiles except the tower/shipwreck, and existing buildings are never
   retroactively un-placed by fog) — confirmed non-issue, stated explicitly rather than
   left implicit.

---

## 3. Exploration Tower building

_(Supersedes [023-watchtower-building.md](023-watchtower-building.md) and
[036-tower-vision-resource-generation.md](036-tower-vision-resource-generation.md).)_

### 3.1 Fit with the plugin architecture

Standard new building at `game/buildings/exploration-tower/`: `ExplorationTower.ts`
(extends `BuildingEntity`; does **not** need `IPowered` for v1 — see §3.2, making it one
of the structurally simplest buildings in the codebase), `ExplorationTowerConfig.ts`
(shop cost, reveal radius, optional skill-tree-upgradeable radius mirroring how
`Furnace.getProcessingSpeed()` reads `skillTreeManager.getStatMultiplier()`),
`Model.ts`/`Visual.ts` (procedural primitive geometry, no external assets, drawing from
the shared `BuildingMaterials.ts` PBR palette), full registration
(`BuildingConfig.ts`/`BuildingFactory.ts`/`PlacementVisuals.ts`/`ModelPreview.tsx`/
`SkillTreeConfig.ts` unlock node/HUD panel/i18n) per the `GEMINI.md` 17-step checklist —
nothing new to invent in the plugin mechanics themselves.

### 3.2 Mechanic: reveal-on-placement, one-time and permanent

**Recommendation: one-time, permanent reveal on placement — not "reveal while powered."**

1. **Narrative fit**: the brief frames discovery as permanent progression ("discover
   zones," "unlocks access"), not tactical line-of-sight that should collapse if power
   browns out — a state this game's power system genuinely produces (see Furnace's
   `no_power` state). Re-fogging explored territory on a power dip would actively punish
   a progression system.
2. **Engineering cost**: "reveal while powered" needs reference-counting across
   overlapping tower ranges (tile revealed by both tower A and B; A loses power; tile
   must stay revealed because B still covers it) on top of the rebatch plumbing in §2.4.
   One-time reveal keeps `discovered` strictly monotonic (`false → true`, never reverse),
   which makes persistence append-only and avoids that whole bug class.
3. **Precedent**: the skill tree's unlock mechanism is already "fire once, permanent, no
   upkeep" — keeps unlock semantics consistent across the game's two progression systems
   (skills, and now territory) instead of introducing a second philosophy just for towers.
4. Progression isn't lost even so: shop cost gates the tower, and skill-tree upgrade tiers
   can scale `getRevealRadius()`, same shape as Furnace's stat multipliers.

Flag before implementation: a genuinely tactical "sentry" building whose vision depends
on staying powered/alive is a real v2 feature, needing the reference-counting design
above — should be scoped separately, not silently folded into v1's monotonic model. Note
[036-tower-vision-resource-generation.md](036-tower-vision-resource-generation.md)'s
original idea of spawning resources within the revealed zone (tiered by distance from
hub) is not covered here — worth a follow-up decision on whether to fold it in.

### 3.3 The placement-gate contradiction (must be resolved explicitly)

§2.5 makes "target tile must already be `discovered`" a rule for all buildings — but the
tower's entire purpose is to be placed at the fog's edge to push it back, so it must be
exempt, or the two features contradict each other and nothing could ever be built past
the hub's starter radius.

Fix: a placement-config flag, `placement.canPlaceOnUndiscovered: boolean`, checked in
`canPlaceBuilding`'s discovered-check, `true` only for `exploration_tower` — an explicit,
data-driven exception rather than an ad-hoc `if (type === 'exploration_tower')` branch,
which would violate the plugin architecture's "no building-specific branching outside its
own files" principle.

### 3.4 Open decisions / risks

1. **§3.3's exemption is the load-bearing decision here** — implemented wrong, it either
   makes the tower unplaceable or loosens the discovery rule for everyone.
2. Selling/removing a tower should not re-fog its area (consistent with "permanent") —
   should be an explicit statement in its config, not an accidental side effect of however
   removal is implemented elsewhere.
3. Testing this piece meaningfully requires a world bigger than the hub's starter reveal
   radius (§2.2) — reinforces sizing that radius deliberately small from the start.

---

## 4. Shipwreck quest / island unlock

### 4.1 Data model

```ts
interface ShipwreckRequirement {
  resourceId: string;
  amount: number;
}

class Shipwreck extends BuildingEntity implements IIOBuilding {
  islandId: number;
  unlocksIslandId: number;
  requirements: ShipwreckRequirement[]; // fixed, not player-selectable
  delivered: Record<string, number>; // per-resource, capped at requirement
  repaired: boolean;
}
```

Persist as a new top-level `shipwrecks` array in `WorldData` (parallel to `islands`), not
folded into the generic `buildings` array — its unlock-progress is quest state, and a
separate array makes "what's the state of island N's unlock" a direct lookup.

### 4.2 Is it a `BuildingEntity`? — yes, placed outside the shop/economy path

Weighed a bespoke non-building world object (cleanest semantically — not purchased,
sellable, or subject to `purchasedCounts`) against a real `BuildingEntity` plugin (reuses
`IIOBuilding` input ports so belts can feed it like a Chest/Furnace, and
`BuildingInfoPanel`'s `instanceof`-dispatch for its HUD panel "for free").

**Recommendation: `BuildingEntity`, placed via the same silent, direct path
`deserialize()` already uses.** `World.deserialize()` calls
`this.placeBuilding(x, y, type, dir, true)` directly (`World.ts:774`), bypassing
`canPlaceBuilding` entirely — world-gen should call this same internal `placeBuilding`
for shipwrecks. Consequence: `canPlaceBuilding`'s max-count logic never runs for
shipwrecks (no special-casing needed), and the tower's placement-gate exemption (§3.3)
doesn't need to extend to shipwrecks either, since they never go through
`canPlaceBuilding` at all. Mark it un-sellable via a config flag (e.g.
`placement.nonRemovable: true`) — **to verify at implementation time**: confirm the
building-removal code path actually checks such a flag.

**Placement location** (world-gen time, part of piece 1's algorithm): for island `i` with
`unlocksIslandId = j`, pick the shore tile whose direction from `center_i` most closely
matches the direction toward `center_j` — literally "washed up on the beach facing the
next island."

### 4.3 Delivery/progress mechanism — adapted Furnace shape

Structurally copy `FurnaceMachine.ts`'s TICK/`evalState` pattern into a new, simpler
`ShipwreckMachine.ts`:

- No recipe selection — `requirements` fixed at world-gen time.
- Delivery capped per-resource at the requirement, mirroring Furnace's
  `hasSpaceFor()` capacity-gating almost verbatim, against a fixed target instead of a
  queue size.
- **Per-resource progress display** ("Wood 140/200, Iron Ingot 30/50"), not one blended
  bar — matches how players read a multi-resource requirement and prevents "padding" the
  display by over-delivering one resource while under-delivering another.
- States: `awaiting_resources → ready_to_complete → repairing (timed) → repaired`.
  Entering `repairing` calls `startIslandUnlock(unlocksIslandId, duration)` (§4.4) — the
  direct swap-in for Furnace's "start a processing job," except completion fires a
  _global unlock_ instead of an output item.

### 4.4 New store slice + manager + HUD (parallel to skill-tree, not reusing `SkillNode`)

`SkillNode.buildingId: BuildingId` is hard-coupled to buildings — not reusable as-is.

```ts
// store.ts — structurally identical to unlockedSkills/pendingUnlocks/startUnlock/completeUnlock
unlockedIslands: number[];                 // island 0 (hub) unlocked by default
pendingIslandUnlocks: { islandId: number; startTime: number; duration: number }[];
startIslandUnlock: (islandId: number, duration: number) => void;
cancelIslandUnlock: (islandId: number) => void;
completeIslandUnlock: (islandId: number) => void;
```

New `IslandUnlockManager` (mirrors `SkillTreeManager`'s read API:
`isIslandUnlocked`/`isPending`/`getUnlockProgress`/`getRemainingTime`/
`checkPendingIslandUnlocks`), and a `PendingIslandUnlocksHUD.tsx` structurally copied
from `PendingUnlocksHUD.tsx`'s 500ms polling pattern. Whether this renders as its own
tray or merges into the existing pending-unlocks panel is a UI preference to decide,
not an architecture decision.

### 4.5 What "unlocked" means — explicit interaction with fog

**`unlockedIslands` (permission) and `discovered` (visibility) are independent,
orthogonal flags — repairing a shipwreck must flip both.** `completeIslandUnlock(islandId)`
should:

1. Add `islandId` to `unlockedIslands` — the **permission gate**.
   `World.canPlaceBuilding` should additionally reject placement on any tile belonging to
   a locked island, independent of whether it happens to be `discovered` (defense in
   depth — see point 3).
2. **Immediately** call `world.revealArea(...)` on the newly unlocked island, centered on
   its shipwreck's own shore position, with a starter "beachhead" radius — using the exact
   same reveal path as the hub's own seeding (§2.2). Without this, the player unlocks an
   island that's still 100% fogged, with nothing to click or build a first tower on.
3. **Why both flags**: if towers could reveal anywhere regardless of unlock state, a
   tower placed near an island boundary could bleed its reveal circle across the sea gap
   onto a not-yet-unlocked island's shore — the player would "see" the next island before
   earning it. Recommend `revealArea` silently no-ops on tiles belonging to a locked
   island, making `unlockedIslands` the hard authority and `discovered` fully subordinate
   to it — the cleanest mental model.

This creates a real dependency: piece 4's `completeIslandUnlock` calls piece 2's
`revealArea` and needs piece 1's `Island` descriptors — informs the build order in §5.

### 4.6 Open decisions / risks

1. Confirm there's really no player-avatar/traversal system (§0) — if one exists,
   "unlocked" needs a third dimension.
2. **Resource-availability soft-lock risk**: if a shipwreck requires a resource that only
   spawns on an island _behind_ that same shipwreck, the game becomes unwinnable. This
   couples piece 1's resource-seeding rules and piece 4's requirement authoring —
   recommend a hard rule (content review or a generation-time assertion) that a
   shipwreck's requirements only reference resources already available on already-
   reachable islands.
3. Delivered resources consumed immediately and irreversibly, matching Furnace/Chest
   precedent — a UX-clarity flag (should delivery show a confirmation?), not an
   architecture risk.

---

## 5. Build order

**Fog-of-war (current single island) → exploration tower → multi-island generation →
shipwreck** — confirmed correct, with two refinements:

- Fog-of-war (2) has zero new dependencies, is testable entirely on the existing island,
  and is the foundational data model (`discovered`, `revealArea`, the 4th batched mesh,
  the placement gate, and critically the `Terrain.tsx` reactivity fix in §2.4) both later
  pieces build on. Least risky possible first slice.
- Exploration tower (3) is the smallest net-new plugin, and exercises `revealArea` + the
  rebatch plumbing under real gameplay on a stable, understood world before multi-island
  complexity (bigger grid, per-island beaches, camera/perf unknowns) layers on top.
- Multi-island generation (1) is the largest, riskiest, most self-contained net-new
  logic. Third, it only has to _reuse_ fog's existing reveal path at a bigger scale, and
  it lets the tower manually verify a freshly generated second island before the
  shipwreck's automated flow exists.
- Shipwreck (4) has the most cross-cutting dependencies (needs `Island` descriptors from
  1, `revealArea` from 2) so it structurally comes last — despite being the most directly
  copy-adaptable from existing code (Furnace + skill tree), so lowest _technical_ risk
  even though it's sequenced last.

**Refinements:**

1. Size the hub's starter fog radius deliberately smaller than the current island's
   playable interior from the start of piece 2 — otherwise the tower (piece 3) has
   nothing real to prove until multi-island generation exists.
2. Insert a lightweight "two-island smoke test" checkpoint between pieces 1 and 4 (a
   dev-only debug hook to manually verify a second island's fog seeding, camera reach,
   and tower placement) so piece 1's integration bugs surface before being entangled with
   piece 4's own new code.

Note: piece 1 technically only depends on piece 2 (needs `revealArea`/`discovered` to
exist), not on piece 3 — building the tower before multi-island generation is a
de-risking choice to validate the API on a smaller surface first, not a hard dependency.

---

## 6. Risks requiring explicit sign-off before implementation starts

1. World size is unpicked and untested — needs a perf spike before locking in.
2. No save versioning exists in either save blob today; piece 1 breaks old saves outright
   — needs an explicit strategy (wipe-and-regenerate recommended) before piece 1 ships.
3. No minimap/fast-travel exists ([009-minimap.md](009-minimap.md)) — a foreseeable
   consequence of piece 1, out of this doc's core scope but should be planned for.
4. The tower's placement-gate exemption (§3.3) must be an explicit config flag, not an
   ad-hoc type check.
5. Confirm there is genuinely no player-avatar/traversal system — §4's entire framing
   depends on it.
6. Resource-availability soft-lock risk between world-gen's resource palette and
   shipwreck requirements — needs a cross-checked authoring rule.
7. Whether fog reveals should be clipped to unlocked islands only (§4.5-3) — affects
   whether players can "peek" at a locked island before repairing its way there;
   recommend clipping, but it's a game-feel choice as much as a technical one.

## Critical files (for whichever phase is implemented first)

- `game/core/World.ts` — placement gate, world generation, serialize/deserialize; touch
  point for `discovered`, `revealArea`, `islands`, `shipwrecks`, generation algorithm.
- `game/visuals/shaders/TerrainBatcher.ts` — 4th fog mesh, per-island shore-distance
  `getHeightAt` replacement, accepts `discovered`/island data as new inputs.
- `game/components/Terrain.tsx` — the `useMemo([world])` reactivity gap, fixed via a
  store-based `terrainVersion`.
- `game/state/store.ts` — new `unlockedIslands`/`pendingIslandUnlocks`/`terrainVersion`
  slice, parallel to the existing `unlockedSkills`/`pendingUnlocks` pattern.
- `game/buildings/furnace/FurnaceMachine.ts` and
  `game/buildings/hub/skill-tree/SkillTreeManager.ts` — structural templates for the
  Shipwreck's progress machine and its `IslandUnlockManager`.

## Next step

Start implementation with **piece 2 (fog-of-war on the current island)** as its own
focused implementation plan — not all four pieces at once.
