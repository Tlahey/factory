import { TileType, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { BuildingEntity } from '../entities/BuildingEntity';
import { Extractor } from '../buildings/extractor/Extractor';
import { Conveyor } from '../buildings/conveyor/Conveyor';
import { Chest } from '../buildings/chest/Chest';

import { Tile } from './Tile';

export class World {
  public grid: Tile[][];
  public buildings: Map<string, BuildingEntity>;

  constructor() {
    this.grid = this.generateEmptyWorld();
    this.buildings = new Map();
  }

  public reset(): void {
      this.grid = this.generateEmptyWorld();
      this.buildings.clear();
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
     const key = `${x},${y}`;
     if (this.buildings.has(key)) return false; 
     
     const tile = this.getTile(x, y);
     if (tile.isWater()) return false;
     
     // Quick check based on type rules (avoiding full instantiation if possible, but safer to match)
     if (type === 'extractor') {
         return tile.isStone();
     } else if (type === 'conveyor') {
         return !tile.isStone();
     } else if (type === 'chest') {
         return !tile.isStone();
     }
     
     return true;
  }

  public placeBuilding(x: number, y: number, type: string, direction: 'north' | 'south' | 'east' | 'west' = 'north'): boolean {
    const key = `${x},${y}`;
    if (this.buildings.has(key)) return false; // Already occupied
    
    // Validate first
    if (!this.canPlaceBuilding(x, y, type)) return false;

    let building: BuildingEntity;
    switch(type) {
        case 'extractor': building = new Extractor(x, y, direction); break;
        case 'conveyor': building = new Conveyor(x, y, direction); break;
        case 'chest': building = new Chest(x, y, direction); break;
        default: return false;
    }

    this.buildings.set(key, building);
    
    // Update Network
    this.updateConveyorNetwork();
    
    // Auto-orient other buildings (like Extractors)
    if (type !== 'conveyor') {
        this.autoOrientBuilding(x, y);
    }
    
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
      const key = `${x},${y}`;
      const res = this.buildings.delete(key);
      if (res) {
          this.updateConveyorNetwork();
      }
      return res;
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

      // 2. BFS from Chests (Sinks)
      const queue: {x: number, y: number}[] = [];
      const visited = new Set<string>();

      this.buildings.forEach(b => {
          if (b instanceof Chest) {
              queue.push({x: b.x, y: b.y});
              visited.add(`${b.x},${b.y}`);
          }
      });
      console.log(`Starting BFS with ${queue.length} chests.`);

      const dirs = [
          {dx: 0, dy: -1, dir: 'north'},
          {dx: 0, dy: 1, dir: 'south'},
          {dx: 1, dy: 0, dir: 'east'},
          {dx: -1, dy: 0, dir: 'west'}
      ];

      while (queue.length > 0) {
          const {x, y} = queue.shift()!;
          // console.log(`Processing ${x},${y}`); // Verbose
          
          for (const d of dirs) {
              const nx = x + d.dx;
              const ny = y + d.dy;
              const nKey = `${nx},${ny}`;
              const nb = this.getBuilding(nx, ny);

              if (nb && nb instanceof Conveyor && !nb.isResolved) {
                  // Found an unresolved conveyor adjacent to a resolved node
                  if (d.dir === 'north') nb.direction = 'south'; 
                  else if (d.dir === 'south') nb.direction = 'north'; 
                  else if (d.dir === 'east') nb.direction = 'west'; 
                  else if (d.dir === 'west') nb.direction = 'east'; 

                  nb.isResolved = true;
                  visited.add(nKey);
                  queue.push({x: nx, y: ny});
                  // console.log(`Resolved Conveyor at ${nx},${ny} -> ${nb.direction}`);
              }
          }
      }
      console.log(`BFS Complete. Visited ${visited.size} nodes.`);
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
          })
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
