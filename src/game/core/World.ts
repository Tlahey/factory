import { TileType, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { useGameStore } from '../state/store';
import { BuildingEntity } from '../entities/BuildingEntity';
import { Extractor } from '../buildings/extractor/Extractor';
import { Conveyor } from '../buildings/conveyor/Conveyor';
import { Chest } from '../buildings/chest/Chest';
import { Hub } from '../buildings/hub/Hub';
import { ElectricPole } from '../buildings/electric-pole/ElectricPole';
import { getBuildingConfig } from '../buildings/BuildingConfig';

import { Tile } from './Tile';

export class World {
  public grid: Tile[][];
  public buildings: Map<string, BuildingEntity>;
  public cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

  constructor() {
    this.grid = this.generateEmptyWorld();
    this.buildings = new Map();
  }

  public addCable(x1: number, y1: number, x2: number, y2: number): boolean {
      // Check if already exists (undirected)
      const exists = this.cables.some(c => 
          (c.x1 === x1 && c.y1 === y1 && c.x2 === x2 && c.y2 === y2) ||
          (c.x1 === x2 && c.y1 === y2 && c.x2 === x1 && c.y2 === y1)
      );
      if (exists) return false;

      // Max distance check (Euclidean or Manhattan? Plan said validation limits. Let's enforce here or in InputSystem.
      // World should probably just be storage, but basic validation is good.)
      // Let's assume validation happens before calling addCable.
      
      this.cables.push({x1, y1, x2, y2});
      return true;
  }

  public removeCable(x1: number, y1: number, x2: number, y2: number): void {
      this.cables = this.cables.filter(c => 
          !((c.x1 === x1 && c.y1 === y1 && c.x2 === x2 && c.y2 === y2) ||
            (c.x1 === x2 && c.y1 === y2 && c.x2 === x1 && c.y2 === y1))
      );
  }

  public reset(): void {
      this.grid = this.generateEmptyWorld();
      this.buildings.clear();
      this.cables = [];
      // Reset store counts
      useGameStore.setState({ buildingCounts: {} });
  }

  private generateEmptyWorld(): Tile[][] {
    const grid: Tile[][] = [];
    const WATER_BORDER = 5; // Water border thickness
    const SAND_BORDER = 7;  // Total border thickness including water and sand

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const dx = Math.min(x, WORLD_WIDTH - 1 - x);
        const dy = Math.min(y, WORLD_HEIGHT - 1 - y);
        const d = Math.min(dx, dy);

        if (d < WATER_BORDER) {
          row.push(new Tile(TileType.WATER));
        } else if (d < SAND_BORDER) {
          row.push(new Tile(TileType.SAND));
        } else {
          // Inner world: Simple random generation
          if (Math.random() < 0.1) {
            row.push(new Tile(TileType.STONE));
          } else {
            row.push(new Tile(TileType.GRASS));
          }
        }
      }
      grid.push(row);
    }
    return grid;
  }

  public getTile(x: number, y: number): Tile {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
      return new Tile(TileType.EMPTY);
    }
    return this.grid[y][x];
  }


  public canPlaceBuilding(x: number, y: number, type: string): boolean {
     const config = getBuildingConfig(type);
     
     if (config?.maxCount) {
         const current = useGameStore.getState().buildingCounts[type] || 0;
         if (current >= config.maxCount) return false;
     }

     const width = config?.width || 1;
     const height = config?.height || 1;

     for (let dx = 0; dx < width; dx++) {
         for (let dy = 0; dy < height; dy++) {
             const checkX = x + dx;
             const checkY = y + dy;
             
             // Check bounds
             if (checkX >= WORLD_WIDTH || checkY >= WORLD_HEIGHT) return false;

             const key = `${checkX},${checkY}`;
             if (this.buildings.has(key)) return false; 
             
             const tile = this.getTile(checkX, checkY);
             if (tile.isWater()) return false;
             
             // Specific checks (only check origin or all? usually all for terrain)
             if (type === 'extractor') {
                 if (!tile.isStone()) return false;
             } else if (type === 'conveyor' || type === 'chest' || type === 'hub' || type === 'electric_pole') {
                 if (tile.isStone()) return false;
             }
         }
     }
     
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
    const { getDirectionOffset } = require('../buildings/conveyor/ConveyorLogicSystem');
    const directions = ['north', 'south', 'east', 'west'];
    
    for (const dir of directions) {
        const offset = getDirectionOffset(dir);
        const neighbor = this.getBuilding(building.x + offset.dx, building.y + offset.dy);
        
        // If neighbor is a conveyor, tell it to re-orient
        if (neighbor && neighbor.getType() === 'conveyor') {
            (neighbor as Conveyor).autoOrientToNeighbor(this);
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

  public hasPathTo(startX: number, startY: number, targetType: string, viaTypes: string[]): boolean {
    const startBuilding = this.getBuilding(startX, startY);
    if (!startBuilding) return false;

    const visited = new Set<string>();
    const queue: {x: number, y: number}[] = [{x: startX, y: startY}];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const {x, y} = queue.shift()!;
      const building = this.getBuilding(x, y);
      
      if (building?.getType() === targetType) return true;

      // Directions: Up, Down, Left, Right
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        const nKey = `${nx},${ny}`;
        
        if (!visited.has(nKey)) {
          const nextBuilding = this.getBuilding(nx, ny);
          if (nextBuilding && (viaTypes.includes(nextBuilding.getType()) || nextBuilding.getType() === targetType)) {
            visited.add(nKey);
            queue.push({x: nx, y: ny});
          }
        }
      }
    }

    return false;
  }

  public removeBuilding(x: number, y: number): boolean {
      const b = this.getBuilding(x, y);
      if (!b) return false;

      // Remove all keys
      for (let dx = 0; dx < b.width; dx++) {
          for (let dy = 0; dy < b.height; dy++) {
              this.buildings.delete(`${b.x + dx},${b.y + dy}`);
          }
      }

      const type = b.getType();
      this.updateConveyorNetwork();
      useGameStore.getState().updateBuildingCount(type, -1);

      // Remove connected cables
      this.cables = this.cables.filter(c => {
          // Check if cable connects to any tile of the building
          const connectedToStart = c.x1 >= b.x && c.x1 < b.x + b.width && c.y1 >= b.y && c.y1 < b.y + b.height;
          const connectedToEnd = c.x2 >= b.x && c.x2 < b.x + b.width && c.y2 >= b.y && c.y2 < b.y + b.height;
          return !connectedToStart && !connectedToEnd;
      });
      
      return true;
  }

  public getConnectionsCount(x: number, y: number): number {
      return this.cables.filter(c => 
          (c.x1 === x && c.y1 === y) || (c.x2 === x && c.y2 === y)
      ).length;
  }

  public getBuilding(x: number, y: number): BuildingEntity | undefined {
      return this.buildings.get(`${x},${y}`);
  }

  public autoOrientBuilding(x: number, y: number): void {
      const b = this.getBuilding(x, y);
      if (b && (b as any).autoOrient) {
          (b as any).autoOrient(this);
      }
  }

  public updateConveyorNetwork(): void {
      console.log('--- Start Network Update ---');
      
      // 1. Reset all conveyors
      let convCount = 0;
      this.buildings.forEach(b => {
          if (b instanceof Conveyor) {
              b.isResolved = false;
              convCount++;
          }
      });
      console.log(`Reset ${convCount} conveyors.`);

      // 2. Pass 1: Forward flow tracking from extractors
      const queue: {x: number, y: number}[] = [];
      const visited = new Set<string>();

      // Start from all extractors (sources)
      // NOTE: Chests are DESTINATIONS by default, not sources (Phase 2 will add output sides)
      this.buildings.forEach(b => {
          if (b instanceof Extractor) {
              queue.push({x: b.x, y: b.y});
              visited.add(`${b.x},${b.y}`);
          }
      });
      console.log(`Pass 1: Starting forward flow from ${queue.length} extractors.`);

      let resolvedCount = 0;

      while (queue.length > 0) {
          const {x, y} = queue.shift()!;
          const current = this.getBuilding(x, y);
          
          if (!current) continue;
          
          // Determine output direction
          let outputDir = current.direction;
          
          // Calculate target position based on output direction  
          let tx = x, ty = y;
          if (outputDir === 'north') ty -= 1;
          else if (outputDir === 'south') ty += 1;
          else if (outputDir === 'east') tx += 1;
          else if (outputDir === 'west') tx -= 1;
          
          const target = this.getBuilding(tx, ty);
          
          if (target) {
              if (target instanceof Conveyor && !target.isResolved) {
                  // Mark this conveyor as resolved (it's reachable from a source)
                  target.isResolved = true;
                  resolvedCount++;
                  visited.add(`${tx},${ty}`);
                  queue.push({x: tx, y: ty});
                  console.log(`Pass 1: Resolved Conveyor at ${tx},${ty} (flow from ${x},${y})`);
              } else if (target instanceof Chest) {
                  console.log(`Pass 1: Flow reaches Chest at ${tx},${ty} from ${x},${y}`);
              }
          }
      }
      
      console.log(`Pass 1 complete. Resolved ${resolvedCount} conveyors from extractors.`);
      
      // 3. Pass 2: Resolve conveyors connecting to resolved conveyors or chests
      // Keep iterating until no new conveyors are resolved
      let pass2Count = 0;
      let changed = true;
      
      while (changed) {
          changed = false;
          
          this.buildings.forEach(b => {
              if (b instanceof Conveyor && !b.isResolved) {
                  // Check if this conveyor points to a resolved conveyor or chest
                  let tx = b.x, ty = b.y;
                  if (b.direction === 'north') ty -= 1;
                  else if (b.direction === 'south') ty += 1;
                  else if (b.direction === 'east') tx += 1;
                  else if (b.direction === 'west') tx -= 1;
                  
                  const target = this.getBuilding(tx, ty);
                  
                  if (target) {
                      if ((target instanceof Conveyor && target.isResolved) || target instanceof Chest) {
                          b.isResolved = true;
                          pass2Count++;
                          changed = true;
                          console.log(`Pass 2: Resolved Conveyor at ${b.x},${b.y} (connects to resolved ${tx},${ty})`);
                      }
                  }
              }
          });
      }
      
      console.log(`Pass 2 complete. Resolved ${pass2Count} additional conveyors.`);
      console.log(`Total resolved: ${resolvedCount + pass2Count} conveyors.`);
  }

  /**
   * Propagate flow direction from all sources (Extractors) through the conveyor network.
   * This ensures all conveyors point AWAY from the source, creating a consistent flow.
   */
  public propagateFlowFromSources(): void {
      const { getDirectionOffset, getOppositeDirection } = require('../buildings/conveyor/ConveyorLogicSystem');
      
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
          const queue: {x: number, y: number, fromDir: 'north' | 'south' | 'east' | 'west'}[] = [];
          
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
                  const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
                  
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

  public serialize(): any {
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

  public deserialize(data: any): void {
      if (!data) return;

      // 1. Restore Grid
      if (data.grid) {
          for (let y = 0; y < WORLD_HEIGHT; y++) {
              for (let x = 0; x < WORLD_WIDTH; x++) {
                  if (data.grid[y] && data.grid[y][x]) {
                       const tData = data.grid[y][x];
                       this.grid[y][x].type = tData.type;
                       this.grid[y][x].resourceAmount = tData.resourceAmount;
                  }
              }
          }
      }

      // 2. Restore Buildings
      this.cables = (data.cables || []).map((c: any) => ({...c}));
      this.buildings.clear();
      if (data.buildings && Array.isArray(data.buildings)) {
          console.log(`Deserializing ${data.buildings.length} buildings...`);
          data.buildings.forEach((bData: any) => {
               this.placeBuilding(bData.x, bData.y, bData.type, bData.direction);
               
               // Restore internal state
               const building = this.getBuilding(bData.x, bData.y);
               if (building) {
                   if (building instanceof Conveyor) {
                       building.currentItem = bData.currentItem;
                       building.itemId = bData.itemId;
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
