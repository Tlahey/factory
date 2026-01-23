import { TileType, WORLD_HEIGHT, WORLD_WIDTH } from "../constants";
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
import { updateBuildingConnectivity } from "../buildings/BuildingIOHelper";

import { Tile } from "../environment/Tile";
import { Conveyor } from "../buildings/conveyor/Conveyor";
import { ResourceTile } from "../environment/ResourceTile";
import { TileFactory } from "../environment/TileFactory";

interface AutoOrientable {
  autoOrient(world: IWorld): void;
}

export class World implements IWorld {
  public grid: Tile[][];
  public buildings: Map<string, BuildingEntity>;
  public cables: { x1: number; y1: number; x2: number; y2: number }[] = [];

  constructor() {
    this.grid = this.generateEmptyWorld();
    this.buildings = new Map();
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
  ): boolean {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return false;

    // Check Max Count Limits
    const config = getBuildingConfig(type);
    const purchasedCounts = useGameStore.getState().purchasedCounts;
    const maxCount = getAllowedCount(type, purchasedCounts[type] || 0);

    let count = 0;
    this.buildings.forEach((b) => {
      if (b.getType() === type) count++;
    });
    if (count >= maxCount) {
      console.log(
        `[World] Placement failed: Max count reached for ${type} (${count}/${maxCount})`,
      );
      return false;
    }

    // Check Conveyor Direction Validity (No reverse flow)
    if (
      type === "conveyor" &&
      !isValidConveyorDirection(x, y, direction, this)
    ) {
      console.log(
        `[World] Placement failed: Invalid conveyor direction (Reverse Flow) at ${x},${y}`,
      );
      return false;
    }

    const isRotated = direction === "east" || direction === "west";
    const width = isRotated ? config?.height || 1 : config?.width || 1;
    const height = isRotated ? config?.width || 1 : config?.height || 1;

    // Check bounds
    if (x + width > WORLD_WIDTH || y + height > WORLD_HEIGHT) {
      console.log(`[World] Placement failed: Out of bounds`);
      return false;
    }

    // Create dummy for validation
    const dummy = createBuildingLogic(type, x, y, direction);
    if (!dummy) {
      console.log(
        `[World] Placement failed: Could not create dummy logic for ${type}`,
      );
      return false;
    }

    // Check collision and validity
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        if (this.buildings.has(`${x + dx},${y + dy}`)) {
          console.log(
            `[World] Placement failed: Tile occupied at ${x + dx},${y + dy}`,
          );
          return false;
        }

        // Tile validity
        const tile = this.getTile(x + dx, y + dy);

        if (!dummy.isValidPlacement(tile)) {
          console.log(
            `[World] Placement failed: Invalid tile placement logic for ${type} at ${x + dx},${y + dy} (Tile: ${tile.getType()})`,
          );
          return false;
        }
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

  public updateConveyorNetwork(): void {
    // 1. Reset all conveyors to unresolved
    this.buildings.forEach((_b) => {
      // Reset logic here if needed
    });

    // 2. Propagate resolution backwards from all sinks (buildings that can receive input)
    const queue: { x: number; y: number }[] = [];
    this.buildings.forEach((b) => {
      if (b.getType() === "conveyor" || b.getType() === "conveyor_merger")
        return; // Logistics are intermediate
      if ("canInput" in b) {
        // Add all tiles of the building as potential sink origins
        for (let dx = 0; dx < b.width; dx++) {
          for (let dy = 0; dy < b.height; dy++) {
            queue.push({ x: b.x + dx, y: b.y + dy });
          }
        }
      }
    });

    const processed = new Set<string>();
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;
      if (processed.has(key)) continue;
      processed.add(key);

      // Check all 4 directions for conveyors pointing at this cell
      const dirs: { dx: number; dy: number; dir: Direction }[] = [
        { dx: 0, dy: 1, dir: "north" },
        { dx: 0, dy: -1, dir: "south" },
        { dx: 1, dy: 0, dir: "west" },
        { dx: -1, dy: 0, dir: "east" },
      ];

      for (const d of dirs) {
        const nx = x + d.dx;
        const ny = y + d.dy;
        const neighbor = this.getBuilding(nx, ny);

        if (neighbor && neighbor.getType() === "conveyor") {
          // If the conveyor points at us (x, y), check if it's a valid connection
          if (neighbor.direction === d.dir) {
            // Validate that the sink building at (x, y) accepts input from (nx, ny)
            const sinkBuilding = this.getBuilding(x, y);
            if (
              sinkBuilding &&
              "canInput" in sinkBuilding &&
              (sinkBuilding as unknown as IIOBuilding).canInput(nx, ny)
            ) {
              if (!(neighbor as unknown as Conveyor).isResolved) {
                (neighbor as unknown as Conveyor).isResolved = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
    }
  }

  public reset(): void {
    this.buildings.clear();
    this.cables = [];
    this.grid = this.generateEmptyWorld();
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
    // Get all tiles occupied by building
    const occupiedTiles = new Set<string>();
    for (let dx = 0; dx < building.width; dx++) {
      for (let dy = 0; dy < building.height; dy++) {
        occupiedTiles.add(`${building.x + dx},${building.y + dy}`);
      }
    }

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
    const occupiedTiles = new Set<string>();
    for (let dx = 0; dx < building.width; dx++) {
      for (let dy = 0; dy < building.height; dy++) {
        occupiedTiles.add(`${building.x + dx},${building.y + dy}`);
      }
    }

    this.cables = this.cables.filter(
      (c) =>
        !occupiedTiles.has(`${c.x1},${c.y1}`) &&
        !occupiedTiles.has(`${c.x2},${c.y2}`),
    );

    // Remove from all occupied tiles
    for (let dx = 0; dx < building.width; dx++) {
      for (let dy = 0; dy < building.height; dy++) {
        this.buildings.delete(`${building.x + dx},${building.y + dy}`);
      }
    }

    // Update Store
    useGameStore.getState().updateBuildingCount(building.getType(), -1);

    // Update Network & Connectivity
    this.updateNeighborConnectivity(x, y);
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
    const key = `${x},${y}`;
    if (this.buildings.has(key)) return false; // Already occupied

    if (!skipValidation) {
      // Validate first
      if (!this.canPlaceBuilding(x, y, type, direction)) return false;
    }

    const building = createBuildingLogic(type, x, y, direction);
    if (!building) {
      console.warn(`[World] Unknown building type: ${type}`);
      return false;
    }

    // Register all tiles
    for (let dx = 0; dx < building.width; dx++) {
      for (let dy = 0; dy < building.height; dy++) {
        this.buildings.set(`${x + dx},${y + dy}`, building);
      }
    }

    // Direction is now fixed at placement time via ConveyorPlacementHelper
    // No runtime auto-orientation needed for conveyors

    // For conveyors and mergers, compute visual state and connectivity
    if (type === "conveyor" || type === "conveyor_merger") {
      // 1. Update neighbors first (so they orient toward us)
      this.updateNeighborConnectivity(x, y);

      // 2. Now update ourselves (we can see neighbors pointing at us)
      if (type === "conveyor") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (building as any).updateVisualState(this);
      }

      if ("io" in building) {
        updateBuildingConnectivity(
          building as BuildingEntity & IIOBuilding,
          this,
        );
      }
    }

    // Update conveyor network resolution (which conveyors lead to chests)
    this.updateConveyorNetwork();

    // Auto-orient other buildings (like Extractors) - NOT conveyors
    if (type !== "conveyor") {
      this.autoOrientBuilding(x, y);
    }

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
   * Update connectivity of all neighboring IO buildings at (x, y).
   * Called when a new building is placed to update arrow visibility.
   */
  public updateNeighborConnectivity(x: number, y: number): void {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
    ];

    for (const dir of directions) {
      const neighborX = x + dir.dx;
      const neighborY = y + dir.dy;
      const neighbor = this.getBuilding(neighborX, neighborY);

      if (neighbor) {
        // Force non-conveyor neighbors to re-orient toward the new building
        if (neighbor.getType() !== "conveyor") {
          this.autoOrientBuilding(neighborX, neighborY);
        }

        if ("io" in neighbor) {
          updateBuildingConnectivity(
            neighbor as BuildingEntity & IIOBuilding,
            this,
          );
        }

        // Force visual update (straight/left/right) for neighboring conveyors
        if (neighbor.getType() === "conveyor") {
          (neighbor as unknown as Conveyor).updateVisualState(this);
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
    this.buildings.forEach((b) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (b?.getType() === "conveyor" && !(b as any).isResolved) return Infinity;
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
        })),
      ),
      buildings: uniqueBuildings.map((b) => {
        const base = {
          x: b.x,
          y: b.y,
          type: b.getType(),
          direction: b.direction,
        };

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
            this.grid[y][x] = TileFactory.createTile(
              tData.type,
              tData.resourceAmount,
            );
          }
        }
      }
    }

    // 2. Restore Buildings
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

      // Force massive update one last time
      this.updateConveyorNetwork();
    }
  }
}
