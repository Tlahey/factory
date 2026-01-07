import { Tile } from '../../core/Tile';
import { BuildingEntity } from '../../entities/BuildingEntity';
import { IWorld } from '../../entities/types';
import { Conveyor } from '../conveyor/Conveyor';
import { Chest } from '../chest/Chest';
import { TileFactory } from '../../TileFactory';
import { TileType } from '../../constants';
import { ResourceTile } from '../../core/ResourceTile';
import { IExtractable, IPowered, IIOBuilding, ExtractorConfigType, PowerConfig } from '../BuildingConfig';

export class Extractor extends BuildingEntity implements IExtractable, IPowered, IIOBuilding {
  public active: boolean = false;

  public speedMultiplier: number = 1.0;
  private accumTime: number = 0;

  // Stability Timers
  private blockStabilityTimer: number = 0;
  private readonly STABILITY_THRESHOLD = 1.5; // Seconds to wait before switching to 'blocked'
  
  constructor(x: number, y: number, direction: 'north' | 'south' | 'east' | 'west' = 'north') {
    super(x, y, 'extractor', direction);
  }
  
  public tick(delta: number, world?: IWorld): void {
      if (!world) return;

      const tile = world.getTile(this.x, this.y);
      const hasResources = tile instanceof ResourceTile && tile.resourceAmount > 0;
      const canOutput = this.canOutput(world); 
      const interval = this.getExtractionInterval();
      const isReadyToOutput = this.accumTime >= interval;
      
      // STABLE DEMAND: We demand power as long as we have resources to work on.
      this.hasDemand = hasResources;

      // Determine "Logical" Status
      let logicalStatus: typeof this.operationStatus = 'working';
      if (!hasResources) {
          logicalStatus = 'no_resources';
      } else if (!canOutput) {
          logicalStatus = 'blocked';
      } else if (!this.hasPowerSource) {
          logicalStatus = 'no_power';
      }

      // Status Debouncing:
      // If we want to switch to 'blocked', we wait for the threshold.
      // If we want to switch to anything else (working, no_power, etc), we do it instantly.
      if (logicalStatus === 'blocked') {
          this.blockStabilityTimer += delta;
      } else {
          this.blockStabilityTimer = 0;
      }

      const oldStatus = this.operationStatus;
      if (logicalStatus !== 'blocked' || this.blockStabilityTimer >= this.STABILITY_THRESHOLD) {
          this.operationStatus = logicalStatus;
      } else {
          // If we are waiting for timer, we stay in 'working' if we were there
          if (this.operationStatus === 'working' || this.operationStatus === 'idle') {
              this.operationStatus = 'working';
          }
      }

      if (this.operationStatus !== oldStatus) {
          console.log(`[Extractor] machine at ${this.x},${this.y} status change: ${oldStatus} -> ${this.operationStatus} (Timer: ${this.blockStabilityTimer.toFixed(2)})`);
      }

    // 2. Check Power Status
    const powerFactor = this.hasPowerSource ? this.powerSatisfaction : 0;
    const oldActive = this.active;

    // ACTIVE flag logic with slightly different hysteresis (stays true if waiting for block threshold)
    if (this.operationStatus === 'working' && powerFactor > 0) {
         this.accumTime += delta * powerFactor;
         this.active = true;
    } else {
         // Machine only stops animating if it's truly blocked (timer passed) or no power/res
         this.active = (this.operationStatus === 'working' && powerFactor > 0);
    }

    if (this.active !== oldActive) {
        console.log(`[Extractor] machine at ${this.x},${this.y} active flag change: ${oldActive} -> ${this.active} (Factor: ${powerFactor.toFixed(3)}, Status: ${this.operationStatus})`);
    }
  
      // Check output only if ready AND we have resources
      if (this.accumTime >= interval && hasResources) {
          if (this.tryOutput(world)) {
              if (tile instanceof ResourceTile) {
                 tile.deplete(1);
              }
              this.accumTime -= interval;
          }
      }
  }

  // --- Trait Properties ---

  public get extractionRate(): number {
    return (this.getConfig() as ExtractorConfigType)?.extractionRate ?? 1.0;
  }

  public get io() {
    return (this.getConfig() as ExtractorConfigType).io;
  }

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as ExtractorConfigType).powerConfig;
  }

  // --- IExtractable ---
  public getExtractionRate(): number {
    return this.extractionRate * this.speedMultiplier;
  }

  public getExtractionInterval(): number {
    return 1.0 / this.getExtractionRate();
  }

  // --- IPowered ---
  public getPowerDemand(): number {
    if (!this.powerConfig || this.operationStatus === 'no_resources' || this.operationStatus === 'blocked') return 0;
    return this.powerConfig.rate;
  }

  public getPowerGeneration(): number {
    return 0;
  }

  public updatePowerStatus(satisfaction: number, hasSource: boolean, gridId: number): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;

    if (this.powerStatus === 'active') {
        if (satisfaction < 0.95) this.powerStatus = 'warn';
    } else {
        if (satisfaction >= 0.99) this.powerStatus = 'active';
    }

    if (this.powerConfig) {
        this.currentPowerDraw = this.getPowerDemand();
        this.currentPowerSatisfied = this.currentPowerDraw * satisfaction;
    }
  }

  // --- IIOBuilding ---
  public canInput(): boolean {
    return false;
  }

  public canOutput(world: IWorld): boolean {
    return this.checkOutputClear(world);
  }

  public tryOutput(world: IWorld): boolean {
    return this.tryOutputResource(world);
  }

  private checkOutputClear(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === 'north') ty -= 1;
    else if (this.direction === 'south') ty += 1;
    else if (this.direction === 'east') tx += 1;
    else if (this.direction === 'west') tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (!target) return false;

    if (target instanceof Conveyor) {
         // Conveyor has space if currentItem is null
         return !target.currentItem;
    } else if (target instanceof Chest) {
         // Chest has space if not full
         return !target.isFull();
    }
    
    return false;
  }

  public upgradeSpeed(): void {
      this.speedMultiplier += 0.5;
  }

  public autoOrient(world: IWorld): void {
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

  private tryOutputResource(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === 'north') ty -= 1;
    else if (this.direction === 'south') ty += 1;
    else if (this.direction === 'east') tx += 1;
    else if (this.direction === 'west') tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (target && target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = 'stone';
        // Generate unique ID for visual persistence
        target.itemId = Math.floor(Math.random() * 1000000); 
        target.transportProgress = 0;
        return true;
      }
    } else if (target && target instanceof Chest) {
        // Return result of addItem (true if added, false if full)
        return target.addItem('stone');
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
