import { TileType, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { useGameStore } from '../state/store';
import { BuildingEntity } from '../entities/BuildingEntity';
import { Extractor } from '../buildings/extractor/Extractor';
import { Conveyor } from '../buildings/conveyor/Conveyor';
import { Chest } from '../buildings/chest/Chest';
import { Hub } from '../buildings/hub/Hub';
import { ElectricPole } from '../buildings/electric-pole/ElectricPole';
import { getBuildingConfig } from '../buildings/BuildingConfig';
import { IWorld, WorldData, SerializedBuilding } from '../entities/types';
import { getDirectionOffset, getOppositeDirection, Direction } from '../buildings/conveyor/ConveyorLogicSystem';

import { Tile } from './Tile';

interface AutoOrientable {
    autoOrient(world: IWorld): void;
}

export class World implements IWorld {
  public grid: Tile[][];
  public buildings: Map<string, BuildingEntity>;
  public cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

  constructor() {
    this.grid = this.generateEmptyWorld();
    this.buildings = new Map();
  }
// ...
  public getBuilding(x: number, y: number): BuildingEntity | undefined {
      return this.buildings.get(`${x},${y}`);
  }

  public getTile(x: number, y: number): Tile {
      if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
          return new Tile(TileType.EMPTY); // Return dummy out of bounds
      }
      return this.grid[y][x];
  }

  public hasPathTo(startX: number, startY: number, targetType: string, viaTypes: string[] = ['conveyor']): boolean {
      // Simple BFS to check connectivity
      const start = this.getBuilding(startX, startY);
      if (!start) return false;

      const queue: {x: number, y: number}[] = [{x: startX, y: startY}];
      const visited = new Set<string>();
      visited.add(`${startX},${startY}`);

      while(queue.length > 0) {
          const curr = queue.shift()!;
          const b = this.getBuilding(curr.x, curr.y);
          if (!b) continue;

          if (b.getType() === targetType) return true;

          // Check neighbors
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dx, dy] of dirs) {
              const nx = curr.x + dx;
              const ny = curr.y + dy;
              const key = `${nx},${ny}`;
              
              if (visited.has(key)) continue;
              
              const nb = this.getBuilding(nx, ny);
              if (nb && (viaTypes.includes(nb.getType()) || nb.getType() === targetType)) {
                  visited.add(key);
                  queue.push({x: nx, y: ny});
              }
          }
      }
      return false;
  }

  public canPlaceBuilding(x: number, y: number, type: string): boolean {
      if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return false;
      
      const config = getBuildingConfig(type);
      const width = config?.width || 1;
      const height = config?.height || 1;

      // Check bounds
      if (x + width > WORLD_WIDTH || y + height > WORLD_HEIGHT) return false;

      // Check collision
      for (let dx = 0; dx < width; dx++) {
          for (let dy = 0; dy < height; dy++) {
              if (this.buildings.has(`${x + dx},${y + dy}`)) return false;
              
              // Tile validity
              const tile = this.getTile(x + dx, y + dy);
              // Temporary dummy building for check
              // We need to check validity without creating instance if possible, 
              // or create a temp one.
              // For now, simple checks based on type
              if (type === 'extractor' && !tile.isStone()) return false;
              if (type === 'hub' && tile.isWater()) return false;
              if (type !== 'extractor' && tile.isStone() && type !== 'conveyor') return false; // Most can't be on stone?
              if (tile.isWater()) return false; // Generally no build on water
          }
      }
      return true;
  }

  private generateEmptyWorld(): Tile[][] {
      const grid: Tile[][] = [];
      for (let y = 0; y < WORLD_HEIGHT; y++) {
          const row: Tile[] = [];
          for (let x = 0; x < WORLD_WIDTH; x++) {
              // Simple generation logic (Grass)
              let type: TileType = TileType.GRASS;
              const dist = Math.sqrt((x - WORLD_WIDTH/2)**2 + (y - WORLD_HEIGHT/2)**2);
              if (dist > WORLD_WIDTH/2 - 2) type = TileType.WATER;
              
              // Stone patches
              if (Math.random() < 0.05 && type !== TileType.WATER) type = TileType.STONE;
              
              const tile = new Tile(type);
              if (type === TileType.STONE) tile.resourceAmount = 1000;
              row.push(tile);
          }
          grid.push(row);
      }
      return grid;
  }

  public updateConveyorNetwork(): void {
      // 1. Re-orient all conveyors
      this.buildings.forEach(b => {
          if (b instanceof Conveyor) {
              b.isResolved = false; // Reset
              b.autoOrientToNeighbor(this);
          }
      });

      // 2. Resolve Network (Backwards from Chests)
      const queue: {x: number, y: number}[] = [];
      
      // Seed with Chests
      this.buildings.forEach(b => {
          if (b instanceof Chest) {
              queue.push({x: b.x, y: b.y});
          }
      });

      // BFS to mark resolved conveyors
      const processed = new Set<string>();
      
      while(queue.length > 0) {
          const {x, y} = queue.shift()!;
          const key = `${x},${y}`;
          if (processed.has(key)) continue;
          processed.add(key);

          // Find neighbors pointing TO this tile
          const dirs: {dx: number, dy: number, dir: Direction}[] = [
              {dx: 0, dy: 1, dir: 'north'}, // Neighbor is South, points North (dy=-1) to us? 
              // Wait. Neighbor at (x, y+1). If it points North, it points to (x, y).
              // North offset is (0, -1). 
              // So if neighbor at (x, y+1) has direction 'north', it targets (x, y).
              
              {dx: 0, dy: -1, dir: 'south'}, // Neighbor North, points South
              {dx: 1, dy: 0, dir: 'west'},   // Neighbor East, points West
              {dx: -1, dy: 0, dir: 'east'}   // Neighbor West, points East
          ];

          for (const d of dirs) {
              const nx = x + d.dx;
              const ny = y + d.dy;
              const neighbor = this.getBuilding(nx, ny);
              
              if (neighbor && neighbor instanceof Conveyor) {
                  // Check if it points to us
                  if (neighbor.direction === d.dir) {
                      if (!neighbor.isResolved) {
                          neighbor.isResolved = true;
                          queue.push({x: nx, y: ny});
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
      this.cables.push({x1, y1, x2, y2});
      return true;
  }

  public removeCable(x1: number, y1: number, x2: number, y2: number): void {
      this.cables = this.cables.filter(c => 
          !(c.x1 === x1 && c.y1 === y1 && c.x2 === x2 && c.y2 === y2) &&
          !(c.x1 === x2 && c.y1 === y2 && c.x2 === x1 && c.y2 === y1)
      );
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

  public removeBuilding(x: number, y: number): boolean {
      const building = this.getBuilding(x, y);
      if (!building) return false;

      // Remove from all occupied tiles
      for (let dx = 0; dx < building.width; dx++) {
          for (let dy = 0; dy < building.height; dy++) {
              this.buildings.delete(`${building.x + dx},${building.y + dy}`);
          }
      }
      
      // Update Store
      useGameStore.getState().updateBuildingCount(building.getType(), -1);
      
      // Update Network
      this.updateConveyorNetwork();
      
      return true;
  }

  public placeBuilding(x: number, y: number, type: string, direction: 'north' | 'south' | 'east' | 'west' = 'north'): boolean {
    const key = `${x},${y}`;
    if (this.buildings.has(key)) return false; // Already occupied
    
    // Validate first
    if (!this.canPlaceBuilding(x, y, type)) return false;

    // Check Limits
    const config = getBuildingConfig(type);
    if (config?.maxCount) {
        let count = 0;
        this.buildings.forEach(b => {
             if (b.getType() === type) count++;
        });
        if (count >= config.maxCount) {
            console.warn(`Limit reached for ${type}: ${config.maxCount}`);
            return false;
        }
    }

    // ... imports

    let building: BuildingEntity;
    switch(type) {
        case 'extractor': building = new Extractor(x, y, direction); break;
        case 'conveyor': building = new Conveyor(x, y, direction); break;
        case 'chest': building = new Chest(x, y, direction); break;
        case 'hub': building = new Hub(x, y); break;
        case 'electric_pole': building = new ElectricPole(x, y); break;
        default: return false;
    }

    // Register all tiles
    for (let dx = 0; dx < building.width; dx++) {
        for (let dy = 0; dy < building.height; dy++) {
            this.buildings.set(`${x + dx},${y + dy}`, building);
        }
    }
    
    // Auto-orient conveyors to connect to neighbors
    // 1. If we are a conveyor, look around
    if (building instanceof Conveyor) {
        building.autoOrientToNeighbor(this);
    }
    
    // 2. IMPORTANT: Notify ALL identifiable neighbors to re-check their orientation
    // This allows existing conveyors to react when we place a Chest or Extractor next to them
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    
    for (const dir of directions) {
        const offset = getDirectionOffset(dir);
        const nx = building.x + offset.dx;
        const ny = building.y + offset.dy;
        const neighbor = this.getBuilding(nx, ny);
        
        // Update neighbor logic
        if (neighbor) {
            if (neighbor.getType() === 'conveyor') {
                (neighbor as Conveyor).autoOrientToNeighbor(this);
            } else {
                // Try to auto-orient other neighbors (e.g. Extractors)
                this.autoOrientBuilding(nx, ny);
            }
        }
    }
    
    // CRITICAL: Propagate flow direction from sources BEFORE network update
    // This ensures all conveyors point AWAY from extractors
    this.propagateFlowFromSources();
    
    // Update Network
    this.updateConveyorNetwork();
    
    // Auto-orient other buildings (like Extractors)
    if (type !== 'conveyor') {
        this.autoOrientBuilding(x, y);
    }
    
    // Update Store Counts for UI
    useGameStore.getState().updateBuildingCount(type, 1);

    return true;
  }
// ...
  public autoOrientBuilding(x: number, y: number): void {
      const b = this.getBuilding(x, y);
      if (b && 'autoOrient' in b) {
          (b as unknown as AutoOrientable).autoOrient(this);
      }
  }
// ...
  /**
   * Propagate flow direction from all sources (Extractors) through the conveyor network.
   * This ensures all conveyors point AWAY from the source, creating a consistent flow.
   */
  public propagateFlowFromSources(): void {
      // Find all extractors (sources)
      const extractors: Extractor[] = [];
      this.buildings.forEach(b => {
          if (b instanceof Extractor) {
              extractors.push(b);
          }
      });
      
      // For each extractor, propagate flow through connected conveyors
      for (const extractor of extractors) {
          const outputOffset = getDirectionOffset(extractor.direction);
          const startX = extractor.x + outputOffset.dx;
          const startY = extractor.y + outputOffset.dy;
          
          const firstConveyor = this.getBuilding(startX, startY);
          if (!firstConveyor || firstConveyor.getType() !== 'conveyor') continue;
          
          // BFS to propagate direction
          const visited = new Set<string>();
          const queue: {x: number, y: number, fromDir: Direction}[] = [];
          
          // The first conveyor receives flow from the extractor's direction
          // It should NOT point back toward the extractor
          queue.push({ x: startX, y: startY, fromDir: getOppositeDirection(extractor.direction) });
          
          while (queue.length > 0) {
              const { x, y, fromDir } = queue.shift()!;
              const key = `${x},${y}`;
              
              if (visited.has(key)) continue;
              visited.add(key);
              
              const conveyor = this.getBuilding(x, y);
              if (!conveyor || conveyor.getType() !== 'conveyor') continue;
              
              const conv = conveyor as Conveyor;
              const forbiddenDir = fromDir; // Cannot point back to where we came from
              
              // If conveyor points back toward the source, find a better direction
              if (conv.direction === forbiddenDir) {
                  // Find first valid alternative (any adjacent conveyor or chest)
                  const directions: Direction[] = ['north', 'south', 'east', 'west'];
                  
                  for (const dir of directions) {
                      if (dir === forbiddenDir) continue;
                      
                      const offset = getDirectionOffset(dir);
                      const neighbor = this.getBuilding(x + offset.dx, y + offset.dy);
                      
                      if (neighbor) {
                          const nType = neighbor.getType();
                          if (nType === 'conveyor' || nType === 'chest') {
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
                  if (next && next.getType() === 'conveyor') {
                      // The next conveyor receives flow from `conv.direction` 
                      // which means it should not point back in the opposite direction
                      queue.push({ 
                          x: nextX, 
                          y: nextY, 
                          fromDir: getOppositeDirection(conv.direction) 
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
      return {
          grid: this.grid.map(row => row.map(tile => ({
              type: tile.type,
              resourceAmount: tile.resourceAmount
          }))),
          buildings: Array.from(this.buildings.values()).map(b => {
              const base = {
                  x: b.x,
                  y: b.y,
                  type: b.getType(),
                  direction: b.direction
              };

              if (b instanceof Conveyor) {
                  return {
                      ...base,
                      currentItem: b.currentItem,
                      itemId: b.itemId, // Persist ID to keep same rock shape
                      transportProgress: b.transportProgress
                  };
              }

              if (b instanceof Chest) {
                  return {
                      ...base,
                      slots: b.slots,
                      maxSlots: b.maxSlots
                  };
              }
              
              if (b instanceof Extractor) {
                  return {
                      ...base,
                      speedMultiplier: b.speedMultiplier
                  };
              }

              return base;
          }),
          cables: this.cables
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
                       this.grid[y][x].type = tData.type;
                       this.grid[y][x].resourceAmount = tData.resourceAmount;
                  }
              }
          }
      }

      // 2. Restore Buildings
      this.cables = (worldData.cables || []).map(c => ({...c}));
      this.buildings.clear();
      if (worldData.buildings && Array.isArray(worldData.buildings)) {
          console.log(`Deserializing ${worldData.buildings.length} buildings...`);
          worldData.buildings.forEach((bData: SerializedBuilding) => {
               // Cast direction to valid type
               const dir = bData.direction as 'north' | 'south' | 'east' | 'west';
               this.placeBuilding(bData.x, bData.y, bData.type, dir);
               
               // Restore internal state
               const building = this.getBuilding(bData.x, bData.y);
               if (building) {
                   if (building instanceof Conveyor) {
                       building.currentItem = bData.currentItem || null;
                       building.itemId = bData.itemId || null;
                       building.transportProgress = bData.transportProgress || 0;
                   } else if (building instanceof Chest) {
                       if (bData.slots) building.slots = bData.slots;
                       if (bData.maxSlots) building.maxSlots = bData.maxSlots;
                   } else if (building instanceof Extractor) {
                       if (bData.speedMultiplier) building.speedMultiplier = bData.speedMultiplier;
                   }
               }
          });
          
          // Force massive update one last time
          this.updateConveyorNetwork();
      }
  }
}
