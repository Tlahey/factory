import {
  HUB_STARTER_RADIUS,
  TileType,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../constants";
import { useGameStore } from "../state/store";
import { BuildingEntity } from "../entities/BuildingEntity";
import { Direction } from "../entities/types";
import {
  BuildingId,
  getBuildingConfig,
  IIOBuilding,
} from "../buildings/BuildingConfig";
import { createBuildingLogic } from "../buildings/BuildingFactory";
import { IWorld, WorldData, SerializedBuilding } from "../entities/types";
import { getAllowedCount } from "../buildings/hub/shop/ShopConfig";
import {
  getDirectionOffset,
  getOppositeDirection,
} from "../buildings/conveyor/ConveyorLogicSystem";
import { isValidConveyorDirection } from "../buildings/conveyor/ConveyorPlacementHelper";
import {
  hasOutputPortAt,
  updateBuildingConnectivity,
} from "../buildings/BuildingIOHelper";
import {
  getFootprintSizeForConfig,
  getOccupiedTiles,
} from "../buildings/BuildingFootprint";

import { Tile } from "../environment/Tile";
import { Conveyor } from "../buildings/conveyor/Conveyor";
import { ResourceTile } from "../environment/ResourceTile";
import { TileFactory } from "../environment/TileFactory";

interface AutoOrientable {
  autoOrient(world: IWorld): void;
}

/** Buildings that only move items around and are never a final destination. */
const LOGISTIC_TYPES: BuildingId[] = [
  "conveyor",
  "conveyor_merger",
  "conveyor_splitter",
];

const NEIGHBOR_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
];

export class World implements IWorld {
  public grid: Tile[][];
  public buildings: Map<string, BuildingEntity>;
  public cables: { x1: number; y1: number; x2: number; y2: number }[] = [];

  /**
   * Bumped whenever the set/orientation of buildings changes.
   * Per-tick systems compare against it to avoid recomputing connectivity
   * for every belt on every frame.
   */
  public topologyVersion: number = 0;

  /**
   * Fog-of-war: [y][x], parallel to `grid` but intentionally NOT a `Tile`
   * field — resource tiles (Rock/Tree) get replaced with a brand-new `Grass`
   * instance on depletion (see `tick()`), which would silently reset any
   * per-tile fog flag.
   */
  public discovered: boolean[][];

  constructor() {
    this.grid = this.generateEmptyWorld();
    this.buildings = new Map();
    this.discovered = this.createFogGrid();
    this.revealArea(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, HUB_STARTER_RADIUS);
  }

  /** Signal that the building topology changed. */
  public markTopologyDirty(): void {
    this.topologyVersion++;
  }

  private createFogGrid(): boolean[][] {
    return Array.from({ length: WORLD_HEIGHT }, () =>
      Array.from({ length: WORLD_WIDTH }, () => false),
    );
  }

  /**
   * Circular reveal, clamped to grid bounds.
   * Returns true iff at least one new tile was revealed, so callers can skip
   * a rebatch/event-emit when nothing actually changed.
   */
  public revealArea(cx: number, cy: number, radius: number): boolean {
    let changed = false;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(cy + radius));
    const radiusSq = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radiusSq && !this.discovered[y][x]) {
          this.discovered[y][x] = true;
          changed = true;
        }
      }
    }
    return changed;
  }

  /** Dev/test helper: reveals the whole map in one call. */
  public revealAll(): void {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        this.discovered[y][x] = true;
      }
    }
  }
  // ...
  public getBuilding(x: number, y: number): BuildingEntity | undefined {
    return this.buildings.get(`${x},${y}`);
  }

  public tick(_delta: number): void {
    // Iterate tiles to process onTick (e.g., Rock -> Grass transformation)
    // Note: Most tiles return 'this', so this is mostly no-op iterations
    // Future optimization: maintain a Set of "active" tiles that need updates
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const currentTile = this.grid[y][x];
        const newTile = currentTile.onTick(x, y, this);
        if (newTile !== currentTile) {
          this.grid[y][x] = newTile;
        }
      }
    }
  }

  public getTile(x: number, y: number): Tile {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
      return TileFactory.createTile(TileType.EMPTY); // Return dummy out of bounds
    }
    return this.grid[y][x];
  }

  public setTile(x: number, y: number, tile: Tile): void {
    if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
      this.grid[y][x] = tile;
    }
  }

  public hasPathTo(
    startX: number,
    startY: number,
    targetType: BuildingId,
    viaTypes: BuildingId[] = ["conveyor"],
  ): boolean {
    // Simple BFS to check connectivity
    const start = this.getBuilding(startX, startY);
    if (!start) return false;

    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const b = this.getBuilding(curr.x, curr.y);
      if (!b) continue;

      if (b.getType() === targetType) return true;

      // Check neighbors
      const dirs = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (const [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;

        const nb = this.getBuilding(nx, ny);
        if (
          nb &&
          (viaTypes.includes(nb.getType()) || nb.getType() === targetType)
        ) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  public canPlaceBuilding(
    x: number,
    y: number,
    type: BuildingId,
    direction: Direction = "north",
    logFailures: boolean = false,
  ): boolean {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
      if (logFailures) {
        useGameStore
          .getState()
          .addDebugLog(
            `[World] Placement failed: Out of bounds (coordinates x:${x}, y:${y})`,
          );
      }
      return false;
    }

    // Check Max Count Limits
    const config = getBuildingConfig(type);
    const purchasedCounts = useGameStore.getState().purchasedCounts;
    const maxCount = getAllowedCount(type, purchasedCounts[type] || 0);

    let count = 0;
    const uniqueBuildings = new Set(this.buildings.values());
    uniqueBuildings.forEach((b) => {
      if (b.getType() === type) count++;
    });
    if (count >= maxCount) {
      const msg = `[World] Placement failed: Max count reached for ${type} (${count}/${maxCount})`;
      console.log(msg);
      if (logFailures) {
        useGameStore.getState().addDebugLog(msg);
      }
      return false;
    }

    // Check Conveyor Direction Validity (No reverse flow)
    if (
      type === "conveyor" &&
      !isValidConveyorDirection(x, y, direction, this)
    ) {
      const msg = `[World] Placement failed: Invalid conveyor direction (Reverse Flow) at ${x},${y}`;
      console.log(msg);
      if (logFailures) {
        useGameStore.getState().addDebugLog(msg);
      }
      return false;
    }

    const { width, height } = getFootprintSizeForConfig(config, direction);

    // Check bounds. The anchor can be pulled left/up of the cursor by the
    // rotation pivot, so the low edge needs checking too.
    if (
      x < 0 ||
      y < 0 ||
      x + width > WORLD_WIDTH ||
      y + height > WORLD_HEIGHT
    ) {
      const msg = `[World] Placement failed: Out of bounds (Building width:${width}, height:${height} at x:${x}, y:${y})`;
      console.log(msg);
      if (logFailures) {
        useGameStore.getState().addDebugLog(msg);
      }
      return false;
    }

    // Create dummy for validation
    const dummy = createBuildingLogic(type, x, y, direction);
    if (!dummy) {
      const msg = `[World] Placement failed: Could not create dummy logic for ${type}`;
      console.log(msg);
      if (logFailures) {
        useGameStore.getState().addDebugLog(msg);
      }
      return false;
    }

    // Check collision and validity over the whole footprint
    for (const { x: tx, y: ty } of getOccupiedTiles(x, y, { width, height })) {
      if (this.buildings.has(`${tx},${ty}`)) {
        const msg = `[World] Placement failed: Tile occupied at ${tx},${ty}`;
        console.log(msg);
        if (logFailures) {
          useGameStore.getState().addDebugLog(msg);
        }
        return false;
      }

      if (!this.discovered[ty][tx]) {
        const msg = `[World] Placement failed: Tile not yet discovered at ${tx},${ty}`;
        console.log(msg);
        if (logFailures) {
          useGameStore.getState().addDebugLog(msg);
        }
        return false;
      }

      // Tile validity
      const tile = this.getTile(tx, ty);

      if (!dummy.isValidPlacement(tile)) {
        const placementConfig = dummy.getConfig()?.placement;
        let reason = "isValidPlacement returned false";
        if (tile.isWater()) {
          reason = "Tile is water";
        } else if (tile.isResource()) {
          if (!placementConfig) {
            reason =
              "Tile is resource but building config has no placement rules";
          } else if (!placementConfig.canPlaceOnResources) {
            reason = "Tile is resource but canPlaceOnResources is false";
          } else if (
            placementConfig.requiredResourceIds &&
            placementConfig.requiredResourceIds.length > 0
          ) {
            const resType =
              tile instanceof ResourceTile ? tile.getResourceType() : "unknown";
            reason = `Tile is resource of type '${resType}', which is not in building's requiredResourceIds: [${placementConfig.requiredResourceIds.join(", ")}]`;
          }
        } else {
          // Tile is grass/sand (not resource)
          if (
            placementConfig?.requiredResourceIds &&
            placementConfig.requiredResourceIds.length > 0
          ) {
            reason = `Tile is non-resource, but building requires a resource in: [${placementConfig.requiredResourceIds.join(", ")}]`;
          }
        }

        const msg = `[World] Placement failed: ${reason} at ${tx},${ty} (Tile type: ${tile.getType()})`;
        console.log(msg);
        if (logFailures) {
          useGameStore.getState().addDebugLog(msg);
        }
        return false;
      }
    }
    return true;
  }

  private generateEmptyWorld(): Tile[][] {
    const grid: Tile[][] = [];
    const WATER_BORDER = 5; // Water border thickness
    const SAND_BORDER = 7; // Total border thickness including water and sand

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const dx = Math.min(x, WORLD_WIDTH - 1 - x);
        const dy = Math.min(y, WORLD_HEIGHT - 1 - y);
        const d = Math.min(dx, dy);

        if (d < WATER_BORDER) {
          row.push(TileFactory.createTile(TileType.WATER));
        } else if (d < SAND_BORDER) {
          row.push(TileFactory.createTile(TileType.SAND));
        } else {
          // Inner world: Resource generation with rarity
          const rand = Math.random();
          if (rand < 0.08) {
            // 8% chance for stone (common)
            row.push(TileFactory.createTile(TileType.STONE));
          } else if (rand < 0.15) {
            // 7% chance for trees (common) - slightly less than stone
            // Wood amount: 300-700 (high yield, configurable)
            const woodAmount = 300 + Math.floor(Math.random() * 400);
            row.push(TileFactory.createTile(TileType.TREE, woodAmount));
          } else {
            row.push(TileFactory.createTile(TileType.GRASS));
          }
        }
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Recompute which belts actually lead somewhere useful (`isResolved`).
   *
   * Walks BACKWARDS from every real sink (chest, hub, furnace, ...) and marks
   * every belt whose output feeds an already-resolved tile. Mergers and
   * splitters are pass-through: resolution flows across them so a belt feeding
   * a splitter that feeds a chest is correctly resolved.
   */
  public updateConveyorNetwork(): void {
    const uniqueBuildings = new Set(this.buildings.values());

    // 1. Reset. Without this, belts stayed "resolved" forever after their
    //    chest was removed.
    uniqueBuildings.forEach((b) => {
      if (b instanceof Conveyor) b.isResolved = false;
    });

    // 2. Seed the queue with every tile of every real sink.
    const queue: { x: number; y: number }[] = [];
    uniqueBuildings.forEach((b) => {
      if (LOGISTIC_TYPES.includes(b.getType())) return; // intermediate, not a sink
      if (!("canInput" in b)) return;
      queue.push(...b.getOccupiedTiles());
    });

    const processed = new Set<string>();
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      processed.add(key);

      const sinkBuilding = this.getBuilding(x, y);
      if (!sinkBuilding) continue;

      // Look at the 4 neighbours and keep the ones whose OUTPUT targets us.
      for (const offset of NEIGHBOR_OFFSETS) {
        const nx = x + offset.dx;
        const ny = y + offset.dy;
        const neighbor = this.getBuilding(nx, ny);
        if (!neighbor || neighbor === sinkBuilding) continue;

        if (!hasOutputPortAt(neighbor as BuildingEntity & IIOBuilding, x, y)) {
          continue;
        }

        // The downstream tile must actually accept items from the neighbour.
        if (
          !("canInput" in sinkBuilding) ||
          !(sinkBuilding as unknown as IIOBuilding).canInput(nx, ny)
        ) {
          continue;
        }

        if (neighbor instanceof Conveyor) {
          if (neighbor.isResolved) continue;
          neighbor.isResolved = true;
          queue.push({ x: nx, y: ny });
        } else if (LOGISTIC_TYPES.includes(neighbor.getType())) {
          // Merger/splitter: pass-through, keep walking upstream through it.
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  public reset(): void {
    this.buildings.clear();
    this.cables = [];
    this.grid = this.generateEmptyWorld();
    this.discovered = this.createFogGrid();
    this.revealArea(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, HUB_STARTER_RADIUS);
    this.markTopologyDirty();
  }

  public addCable(x1: number, y1: number, x2: number, y2: number): boolean {
    this.cables.push({ x1, y1, x2, y2 });
    return true;
  }

  public getConnectionsCount(x: number, y: number): number {
    let count = 0;
    for (const c of this.cables) {
      if ((c.x1 === x && c.y1 === y) || (c.x2 === x && c.y2 === y)) {
        count++;
      }
    }
    return count;
  }

  public getBuildingConnectionsCount(building: BuildingEntity): number {
    let count = 0;
    const occupiedTiles = new Set(
      building.getOccupiedTiles().map((t) => `${t.x},${t.y}`),
    );

    for (const c of this.cables) {
      if (
        occupiedTiles.has(`${c.x1},${c.y1}`) ||
        occupiedTiles.has(`${c.x2},${c.y2}`)
      ) {
        count++;
      }
    }
    return count;
  }

  public removeBuilding(x: number, y: number): boolean {
    const building = this.getBuilding(x, y);
    if (!building) return false;

    // Remove cables connected to ANY tile of this building
    const tiles = building.getOccupiedTiles();
    const occupiedTiles = new Set(tiles.map((t) => `${t.x},${t.y}`));

    this.cables = this.cables.filter(
      (c) =>
        !occupiedTiles.has(`${c.x1},${c.y1}`) &&
        !occupiedTiles.has(`${c.x2},${c.y2}`),
    );

    // Remove from all occupied tiles
    for (const key of occupiedTiles) {
      this.buildings.delete(key);
    }

    // Update Store
    useGameStore.getState().updateBuildingCount(building.getType(), -1);

    // Update Network & Connectivity
    this.markTopologyDirty();
    this.updateNeighborConnectivity(building.x, building.y, building);
    this.updateConveyorNetwork();

    return true;
  }

  public removeCable(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): boolean {
    const initialLen = this.cables.length;

    // Remove exact match or reversed match
    this.cables = this.cables.filter(
      (c) =>
        !(
          (c.x1 === start.x &&
            c.y1 === start.y &&
            c.x2 === end.x &&
            c.y2 === end.y) ||
          (c.x1 === end.x &&
            c.y1 === end.y &&
            c.x2 === start.x &&
            c.y2 === start.y)
        ),
    );

    if (this.cables.length < initialLen) {
      // Cable was removed
      // Trigger connectivity update if needed
      return true;
    }
    return false;
  }

  public placeBuilding(
    x: number,
    y: number,
    type: BuildingId,
    direction: Direction = "north",
    skipValidation: boolean = false,
  ): boolean {
    if (!skipValidation) {
      // Validate first
      if (!this.canPlaceBuilding(x, y, type, direction)) return false;
    }

    const building = createBuildingLogic(type, x, y, direction);
    if (!building) {
      console.warn(`[World] Unknown building type: ${type}`);
      return false;
    }

    // Guard the whole footprint, not just the anchor: a 1x2 laid over a single
    // occupied tile used to overwrite its neighbour's entry in the tile map.
    const tiles = building.getOccupiedTiles();
    if (tiles.some((t) => this.buildings.has(`${t.x},${t.y}`))) return false;

    // Register all tiles
    for (const tile of tiles) {
      this.buildings.set(`${tile.x},${tile.y}`, building);
    }

    this.markTopologyDirty();

    // 1. Settle our own orientation first. Conveyors are excluded: their
    //    direction is decided at placement time by ConveyorPlacementHelper.
    if (type !== "conveyor") {
      this.autoOrientBuilding(x, y);
    }

    // 2. Refresh the neighbours, so they can orient/curve toward us.
    this.updateNeighborConnectivity(x, y, building);

    // 3. Then update ourselves (we can now see the neighbours pointing at us).
    if (building instanceof Conveyor) {
      building.invalidateTopology();
      building.updateVisualState(this);
    }
    if ("io" in building) {
      updateBuildingConnectivity(
        building as BuildingEntity & IIOBuilding,
        this,
      );
    }

    // 4. Recompute which belts lead to a real sink.
    this.updateConveyorNetwork();

    // Update Store Counts for UI
    useGameStore.getState().updateBuildingCount(type, 1);

    return true;
  }
  // ...
  public autoOrientBuilding(x: number, y: number): void {
    const b = this.getBuilding(x, y);
    if (b && "autoOrient" in b) {
      (b as unknown as AutoOrientable).autoOrient(this);
    }
  }

  /**
   * Refresh connectivity/visuals of every building adjacent to (x, y).
   * Called when a building is placed or removed so arrows and belt curves
   * update immediately instead of waiting for a tick.
   *
   * @param subject - when given, every tile it occupies is used as an origin
   *                  (multi-tile buildings touch more than 4 neighbours).
   */
  public updateNeighborConnectivity(
    x: number,
    y: number,
    subject?: BuildingEntity,
  ): void {
    const origins = subject ? subject.getOccupiedTiles() : [{ x, y }];

    const visited = new Set<BuildingEntity>();

    for (const origin of origins) {
      for (const dir of NEIGHBOR_OFFSETS) {
        const neighborX = origin.x + dir.dx;
        const neighborY = origin.y + dir.dy;
        const neighbor = this.getBuilding(neighborX, neighborY);

        if (!neighbor || neighbor === subject) continue;
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);

        // Let idle machines snap toward the new building — but never steal a
        // machine that is already feeding something: re-orienting a working
        // extractor because the player dropped a chest next to it is worse
        // than making them press R.
        if (neighbor.getType() !== "conveyor" && !neighbor.isOutputConnected) {
          this.autoOrientBuilding(neighborX, neighborY);
        }

        if (neighbor instanceof Conveyor) {
          neighbor.invalidateTopology();
          neighbor.updateVisualState(this);
        }

        if ("io" in neighbor) {
          updateBuildingConnectivity(
            neighbor as BuildingEntity & IIOBuilding,
            this,
          );
        }
      }
    }
  }
  // ...
  /**
   * Propagate flow direction from all sources (Extractors) through the conveyor network.
   * This ensures all conveyors point AWAY from the source, creating a consistent flow.
   */
  public propagateFlowFromSources(): void {
    // Find all extractors (sources)
    const extractors: BuildingEntity[] = [];
    const uniqueBuildings = new Set(this.buildings.values());
    uniqueBuildings.forEach((b) => {
      if (b.getType() === "extractor") {
        extractors.push(b);
      }
    });

    // For each extractor, propagate flow through connected conveyors
    for (const extractor of extractors) {
      const outputOffset = getDirectionOffset(extractor.direction);
      const startX = extractor.x + outputOffset.dx;
      const startY = extractor.y + outputOffset.dy;

      const firstConveyor = this.getBuilding(startX, startY);
      if (!firstConveyor || firstConveyor.getType() !== "conveyor") continue;

      // BFS to propagate direction
      const visited = new Set<string>();
      const queue: { x: number; y: number; fromDir: Direction }[] = [];

      // The first conveyor receives flow from the extractor's direction
      // It should NOT point back toward the extractor
      queue.push({
        x: startX,
        y: startY,
        fromDir: getOppositeDirection(extractor.direction),
      });

      while (queue.length > 0) {
        const { x, y, fromDir } = queue.shift()!;
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const conveyor = this.getBuilding(x, y);
        if (!conveyor || conveyor.getType() !== "conveyor") continue;

        const conv = conveyor;
        const forbiddenDir = fromDir; // Cannot point back to where we came from

        // If conveyor points back toward the source, find a better direction
        if (conv.direction === forbiddenDir) {
          // Find first valid alternative (any adjacent conveyor or chest)
          const directions: Direction[] = ["north", "south", "east", "west"];

          for (const dir of directions) {
            if (dir === forbiddenDir) continue;

            const offset = getDirectionOffset(dir);
            const neighbor = this.getBuilding(x + offset.dx, y + offset.dy);

            if (neighbor) {
              const nType = neighbor.getType();
              // Can snap to anything that can receive input
              if (nType === "conveyor" || "canInput" in neighbor) {
                conv.direction = dir;
                conv.syncFootprint();
                break;
              }
            }
          }
        }

        // Continue propagation to where we output
        const outOffset = getDirectionOffset(conv.direction);
        const nextX = x + outOffset.dx;
        const nextY = y + outOffset.dy;
        const nextKey = `${nextX},${nextY}`;

        if (!visited.has(nextKey)) {
          const next = this.getBuilding(nextX, nextY);
          if (next && next.getType() === "conveyor") {
            // The next conveyor receives flow from `conv.direction`
            // which means it should not point back in the opposite direction
            queue.push({
              x: nextX,
              y: nextY,
              fromDir: getOppositeDirection(conv.direction),
            });
          }
        }
      }
    }
  }

  public getDistanceToChest(startX: number, startY: number): number {
    const b = this.getBuilding(startX, startY);
    if (b instanceof Conveyor && !b.isResolved) return Infinity;
    return 0;
  }

  // --- Serialization ---

  public serialize(): WorldData {
    // Collect unique buildings to avoid duplicates for multi-tile structures
    const uniqueBuildings = Array.from(new Set(this.buildings.values()));

    return {
      grid: this.grid.map((row) =>
        row.map((tile) => ({
          type: tile.getType(),
          resourceAmount:
            tile instanceof ResourceTile ? tile.resourceAmount : 0,
          variantId:
            tile instanceof ResourceTile
              ? (tile.variantId ?? undefined)
              : undefined,
        })),
      ),
      discovered: this.discovered,
      buildings: uniqueBuildings.map((b) => {
        const base = {
          x: b.x,
          y: b.y,
          type: b.getType(),
          direction: b.direction,
        };

        console.log(
          `[World] Serializing building: ${b.getType()} at ${b.x},${b.y}`,
        );
        return {
          ...base,
          ...b.serialize(),
        };
      }),
      cables: this.cables,
    };
  }

  public deserialize(data: unknown): void {
    if (!data) return;

    const worldData = data as WorldData;

    // 1. Restore Grid
    if (worldData.grid) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
          if (worldData.grid[y] && worldData.grid[y][x]) {
            const tData = worldData.grid[y][x];
            // Safe access for potential old save data without variantId
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const variantId = (tData as any).variantId;

            this.grid[y][x] = TileFactory.createTile(
              tData.type,
              tData.resourceAmount,
              variantId,
            );
          }
        }
      }
    }

    // 2. Restore fog-of-war. Missing/old saves (no `discovered` field)
    // default every tile to already-revealed rather than re-fogging an
    // existing player's built-out world.
    this.discovered = Array.from({ length: WORLD_HEIGHT }, (_, y) =>
      Array.from(
        { length: WORLD_WIDTH },
        (_, x) => worldData.discovered?.[y]?.[x] ?? true,
      ),
    );

    // 3. Restore Buildings
    this.cables = (worldData.cables || []).map((c) => ({ ...c }));
    this.buildings.clear();

    // START FIX: Reset building counts in store to avoid double counting
    // We use set inside World.ts usually, but here we need to sync with Store.
    // The Store's reset() might clear inventory too, which we might not want if we are just loading a save.
    // But typically loading a save REPLACES current state.
    // Ideally we should use a dedicated action `resetCounts` or simply rely on `reset` being called BEFORE deserialize is called by the UI.
    // However, the test calls deserialize directly.
    useGameStore.getState().resetBuildingCounts();
    // END FIX

    if (worldData.buildings && Array.isArray(worldData.buildings)) {
      console.log(`Deserializing ${worldData.buildings.length} buildings...`);
      worldData.buildings.forEach((bData: SerializedBuilding) => {
        // Cast direction to Direction8 (handles both old 4-dir and new 8-dir saves)
        const dir = bData.direction as Direction;
        this.placeBuilding(bData.x, bData.y, bData.type, dir, true);

        // Restore internal state
        const building = this.getBuilding(bData.x, bData.y);
        if (building) {
          building.deserialize(bData);
        }
      });

      // Force a full refresh once every building exists: connectivity computed
      // during the loop above saw a partially-built world.
      this.markTopologyDirty();
      const uniqueBuildings = new Set(this.buildings.values());
      uniqueBuildings.forEach((b) => {
        if (b instanceof Conveyor) {
          b.invalidateTopology();
          b.updateVisualState(this);
        }
        if ("io" in b) {
          updateBuildingConnectivity(b as BuildingEntity & IIOBuilding, this);
        }
      });
      this.updateConveyorNetwork();
    }
  }
}
