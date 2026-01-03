import { Tile } from '../../core/Tile';
import { BuildingEntity } from '../../entities/BuildingEntity';

export class Conveyor extends BuildingEntity {
  constructor(x: number, y: number, direction: 'north' | 'south' | 'east' | 'west' = 'north') {
    super(x, y, 'conveyor', direction);
  }

  public currentItem: string | null = null;
  public itemId: number | null = null; // Unique ID for tracking mesh
  public transportProgress: number = 0;
  public isResolved: boolean = false; // True only if connected to a valid destination (chest)
  private readonly TRANSPORT_SPEED = 1.0; // Tiles per second

  public tick(delta: number, world?: any): void {
    if (!this.currentItem || !this.isResolved) return;

    this.transportProgress += this.TRANSPORT_SPEED * delta;

    if (this.transportProgress >= 1) {
      this.moveItem(world);
    }
  }

  private moveItem(world: any): void {
    if (!world) return;

    // Determine target coordinates based on direction
    let tx = this.x;
    let ty = this.y;

    if (this.direction === 'north') ty -= 1;
    else if (this.direction === 'south') ty += 1;
    else if (this.direction === 'east') tx += 1;
    else if (this.direction === 'west') tx -= 1;

    const targetBuilding = world.getBuilding(tx, ty);

    if (targetBuilding) {
      if (targetBuilding instanceof Conveyor && !targetBuilding.currentItem) {
          // Push only to resolved conveyors
          if (targetBuilding.isResolved) {
            targetBuilding.currentItem = this.currentItem;
            targetBuilding.itemId = this.itemId; 
            // Preserve overflow time for smooth transition
            targetBuilding.transportProgress = this.transportProgress - 1;
            this.currentItem = null;
            this.itemId = null;
            this.transportProgress = 0;
          }
      } else if (targetBuilding.getType() === 'chest') {
        (targetBuilding as any).addItem(this.currentItem);
        this.currentItem = null;
        this.itemId = null;
        this.transportProgress = 0;
      }
    }
    
    // Clamp progress
    if (this.transportProgress > 1) this.transportProgress = 1;
  }

  public autoOrient(world: any): void {
      // Deprecated: Orientation is now handled globally by World.updateConveyorNetwork()
  }

  public getColor(): number {
      return 0xaaaaaa; // Light Gray
  }

  public isValidPlacement(tile: Tile): boolean {
      return !tile.isStone();
  }

  public getVisualState(world: any): { type: 'straight' | 'left' | 'right', outDir: 'north' | 'south' | 'east' | 'west', shapeId: string } {
      let conveyorType: 'straight' | 'left' | 'right' = 'straight';
      let conveyorOutDir = this.direction;
      let isConveyorResolved = this.isResolved;

      if (isConveyorResolved) {
          let inputDir: string | null = null;
          const dirs = [
              { dx: 0, dy: -1, dir: 'north', opposite: 'south' },
              { dx: 0, dy: 1, dir: 'south', opposite: 'north' },
              { dx: 1, dy: 0, dir: 'east', opposite: 'west' },
              { dx: -1, dy: 0, dir: 'west', opposite: 'east' }
          ];

          for (const d of dirs) {
              const nb = world.getBuilding(this.x + d.dx, this.y + d.dy);
              if (nb) {
                  // Check if neighbor is outputting to THIS conveyor
                  if (nb instanceof Conveyor) {
                      if (nb.isResolved && nb.direction === d.opposite) {
                          inputDir = d.dir;
                          break;
                      }
                  } else if (nb.getType() === 'extractor') {
                       // Extractor outputting to us
                      if (nb.direction === d.opposite) {
                          inputDir = d.dir;
                          break;
                      }
                  }
              }
          }

          if (inputDir) {
              const lefts: Record<string, string> = { 'north': 'west', 'west': 'south', 'south': 'east', 'east': 'north' };
              const rights: Record<string, string> = { 'north': 'east', 'east': 'south', 'south': 'west', 'west': 'north' };
              
              if (lefts[conveyorOutDir] === inputDir) conveyorType = 'left';
              else if (rights[conveyorOutDir] === inputDir) conveyorType = 'right';
          }
      }
      
      const shapeId = isConveyorResolved ? `conveyor-${conveyorType}-${conveyorOutDir}-v2` : `conveyor-unresolved-v2`;
      return { type: conveyorType, outDir: conveyorOutDir, shapeId };
  }
}
