import { Tile } from '../../core/Tile';
import { BuildingEntity } from '../../entities/BuildingEntity';
import { useGameStore } from '@/game/state/store';

export class Extractor extends BuildingEntity {
  public active: boolean = false;

  public speedMultiplier: number = 1.0;
  private accumTime: number = 0;
  
  constructor(x: number, y: number, direction: 'north' | 'south' | 'east' | 'west' = 'north') {
    super(x, y, 'extractor', direction);
    this.powerConfig = {
        type: 'consumer',
        rate: 20 // Consumes 20 units
    };
  }
  
  public tick(delta: number, world?: any): void {
      if (!world) return;

      const tile = world.getTile(this.x, this.y);
      const hasResources = tile.isStone() && tile.resourceAmount > 0;
      
      const canOutput = this.checkOutputClear(world); 
      const interval = 1.0 / this.speedMultiplier;
      const isReadyToOutput = this.accumTime >= interval;
      
      // Only "Demand" power if:
      // 1. We have resources
      // 2. AND (We are still processing OR We can output)
      // If we are ready to output but cannot, THEN we stop demanding (Idle/Blocked)
      this.hasDemand = hasResources && (!isReadyToOutput || canOutput);
  
      // If we don't have demand (e.g. Blocked), we don't tick accumTime (pause processing)
      // But wait, if !isReadyToOutput, we DO have demand. 
      // If isReadyToOutput and !canOutput, hasDemand is false. We stop power.
      // This allows us to "Process" -> "Wait if blocked" -> "Process".
  
      // If we don't have demand (e.g. Blocked), we don't tick accumTime (pause processing)
    // We ALSO don't tick if we have no power (but we still Demand it so grid knows we need it)

    // 2. Check Power Status
    const isPowered = this.powerStatus === 'active';

    if (this.hasDemand && isPowered) {
         this.accumTime += delta;
    }
    
    if (!isPowered) {
        this.active = false;
        return;
    }

    // Double check demand logic
    if (!this.hasDemand) {
        this.active = false;
        return;
    }
  
      this.active = true;
  
      // Check output only if ready
      if (this.accumTime >= interval) {
          if (this.tryOutputResource(world)) {
              tile.deplete(1);
              this.accumTime -= interval;
          } else {
              // Should be caught by hasDemand logic above, but for safety:
              // If output failed unexpectedly
          }
      }
  }

  private checkOutputClear(world: any): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === 'north') ty -= 1;
    else if (this.direction === 'south') ty += 1;
    else if (this.direction === 'east') tx += 1;
    else if (this.direction === 'west') tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (!target) return false;

    if (target.getType() === 'conveyor') {
         // Conveyor has space if currentItem is null
         return !(target as any).currentItem;
    } else if (target.getType() === 'chest') {
         // Chest has space if not full
         return !(target as any).isFull();
    }
    
    return false;
  }

  public upgradeSpeed(): void {
      this.speedMultiplier += 0.5;
  }

  public autoOrient(world: any): void {
      const dirs: {dx: number, dy: number, dir: 'north' | 'south' | 'east' | 'west'}[] = [
          {dx: 0, dy: -1, dir: 'north'},
          {dx: 0, dy: 1, dir: 'south'},
          {dx: 1, dy: 0, dir: 'east'},
          {dx: -1, dy: 0, dir: 'west'}
      ];

      for (const d of dirs) {
          const nb = world.getBuilding(this.x + d.dx, this.y + d.dy);
          if (nb && (nb.getType() === 'conveyor' || nb.getType() === 'chest')) {
              this.direction = d.dir;
              return;
          }
      }
  }

  private tryOutputResource(world: any): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === 'north') ty -= 1;
    else if (this.direction === 'south') ty += 1;
    else if (this.direction === 'east') tx += 1;
    else if (this.direction === 'west') tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (target && target.getType() === 'conveyor') {
      const conveyor = target as any;
      if (!conveyor.currentItem) {
        conveyor.currentItem = 'stone';
        // Generate unique ID for visual persistence
        conveyor.itemId = Math.floor(Math.random() * 1000000); 
        conveyor.transportProgress = 0;
        return true;
      }
    } else if (target && target.getType() === 'chest') {
        // Return result of addItem (true if added, false if full)
        return (target as any).addItem('stone');
    }
    return false;
  }

  public getColor(): number {
      return 0xff0000; // Red
  }

  public isValidPlacement(tile: Tile): boolean {
      return tile.isStone(); 
  }
}
