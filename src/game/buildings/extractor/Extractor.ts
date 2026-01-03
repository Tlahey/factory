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
        rate: 10 // Consumes 10 units
    };
  }
  
  public tick(delta: number, world?: any): void {
    if (!world) return;
    
    this.accumTime += delta;
    const interval = 1.0 / this.speedMultiplier;


    if (this.accumTime < interval) return;

    // Check Power
    if (this.powerStatus !== 'active') {
        this.active = false;
        return;
    }

    const isConnected = this.isConnectedTo(world, 'chest');
    const tile = world.getTile(this.x, this.y);
    const hasResources = tile.isStone() && tile.resourceAmount > 0;

    this.active = isConnected && hasResources;

    if (this.active) {
      if (this.tryOutputResource(world)) {
          tile.deplete(1);
          this.accumTime -= interval;
      }
    }
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
