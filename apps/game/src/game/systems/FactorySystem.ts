// import { Application, Ticker } from 'pixi.js'; // REMOVED
import { World } from "../core/World";
import { BuildingEntity } from "../entities/BuildingEntity";

export class FactorySystem {
  private world: World;
  private lastTick: number = 0;
  private TICK_RATE = 1000; // 1 second per tick

  constructor(world: World) {
    this.world = world;
  }

  public update(delta: number = 0.016) {
    // Run tick every frame with delta (in seconds)
    this.tick(delta);
  }

  private tick(delta: number) {
    const processedIds = new Set<string>();

    this.world.buildings.forEach((building: BuildingEntity) => {
      if (processedIds.has(building.id)) return;
      processedIds.add(building.id);

      // Logic Tick
      building.tick(delta, this.world);
      // Visual/State smoothing
      building.update(delta);
    });
  }
}
