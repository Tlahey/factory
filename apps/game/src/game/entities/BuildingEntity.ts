import { Entity } from "./Entity";
import { Tile } from "../core/Tile";
import {
  getBuildingConfig,
  BuildingConfig,
  PowerConfig,
} from "../buildings/BuildingConfig";
import { Direction, IWorld } from "./types";

export abstract class BuildingEntity extends Entity {
  public buildingType: string;
  public direction: Direction = "north";

  public width: number = 1;
  public height: number = 1;

  public abstract get powerConfig(): PowerConfig | undefined;

  public powerStatus: "active" | "warn" | "idle" = "idle"; // 'warn' = no power

  // Real-time tracking for UI
  public currentPowerDraw: number = 0;
  public currentPowerSatisfied: number = 0;
  public powerSatisfaction: number = 1.0; // 0..1 factor
  public visualSatisfaction: number = 1.0; // Smoothed for UI
  public currentGridId: number = -1;
  public hasPowerSource: boolean = false; // Connected to at least one producer?
  public operationStatus:
    | "working"
    | "blocked"
    | "no_resources"
    | "no_power"
    | "idle" = "idle";

  public hasDemand: boolean = true; // By default true, can be toggled by logic (e.g. idle/blocked)

  constructor(
    x: number,
    y: number,
    buildingType: string,
    direction: Direction = "north",
  ) {
    super(x, y, "building");
    this.buildingType = buildingType;
    this.direction = direction;

    const config = this.getConfig();
    if (config) {
      const isRotated = direction === "east" || direction === "west";
      this.width = isRotated ? (config.height ?? 1) : (config.width ?? 1);
      this.height = isRotated ? (config.width ?? 1) : (config.height ?? 1);
    }
  }

  public rotate(): void {
    const clockwise: Record<Direction, Direction> = {
      north: "east",
      east: "south",
      south: "west",
      west: "north",
    };
    const oldDir = this.direction;
    this.direction = clockwise[this.direction];

    // Swap dimensions if orientation changes (Vertical <-> Horizontal)
    const wasHorizontal = oldDir === "east" || oldDir === "west";
    const isHorizontal = this.direction === "east" || this.direction === "west";

    if (wasHorizontal !== isHorizontal) {
      const tmp = this.width;
      this.width = this.height;
      this.height = tmp;
    }
  }

  public update(delta: number): void {
    // Smooth visual satisfaction
    const target = this.powerSatisfaction;
    this.visualSatisfaction =
      this.visualSatisfaction +
      (target - this.visualSatisfaction) * Math.min(1.0, delta * 5); // 5 is the smoothing speed

    if (this.buildingType === "extractor") {
      // Logic specific to extractor
      // We might want to throttle this so it doesn't run every frame, but every second.
      // For now, let's just log or assume external throttle, OR handle it here with a timer accumulator.
    }
  }

  // Custom method to be called by FactorySystem for "tick" based logic
  public tick(_delta: number, _world?: IWorld): void {
    if (this.buildingType === "extractor") {
      // This should be handled in Extractor.ts override
    }
  }

  public isConnectedTo(
    world: IWorld,
    targetType: string,
    viaTypes: string[] = ["conveyor"],
  ): boolean {
    return world.hasPathTo(this.x, this.y, targetType, viaTypes);
  }

  public getType(): string {
    return this.buildingType;
  }

  public getConfig(): BuildingConfig | undefined {
    return getBuildingConfig(this.buildingType);
  }

  public hasInteractionMenu(): boolean {
    return this.getConfig()?.hasMenu ?? false;
  }

  public abstract getColor(): number;

  public getHeight(): number {
    return 1;
  }

  public abstract isValidPlacement(tile: Tile): boolean;
}
