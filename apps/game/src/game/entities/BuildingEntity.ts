import { Entity } from "./Entity";
import { Tile } from "../environment/Tile";
import { ResourceTile } from "../environment/ResourceTile";
import {
  getBuildingConfig,
  BuildingConfig,
  PowerConfig,
  BuildingId,
  IOSide,
} from "../buildings/BuildingConfig";
import { Direction, IWorld } from "./types";

export abstract class BuildingEntity extends Entity {
  public buildingType: BuildingId;
  public direction: Direction = "north";

  public width: number = 1;
  public height: number = 1;

  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;
  public connectedInputSides: IOSide[] = [];
  public connectedOutputSides: IOSide[] = [];

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
    buildingType: BuildingId,
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
    targetType: BuildingId,
    viaTypes: BuildingId[] = ["conveyor"],
  ): boolean {
    return world.hasPathTo(this.x, this.y, targetType, viaTypes);
  }

  public getType(): BuildingId {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract serialize(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract deserialize(data: any): void;

  /**
   * Validates if the building can be placed on the given tile.
   * Uses 'placement' property from BuildingConfig.
   */
  public isValidPlacement(tile: Tile): boolean {
    const config = this.getConfig()?.placement;

    // 1. Water Check: Default rule, buildings cannot be on water unless overridden (e.g. pumps, bridges)
    // For now, hard disable.
    if (tile.isWater()) return false;

    // 2. Resource Check
    if (tile.isResource()) {
      // If tile is a resource, we MUST have permission to place there
      if (!config) return false; // Default: No resources allowed

      if (config.canPlaceOnResources) {
        // If specific IDs are required, check them
        if (
          config.requiredResourceIds &&
          config.requiredResourceIds.length > 0
        ) {
          if (tile instanceof ResourceTile) {
            return config.requiredResourceIds.includes(tile.getResourceType());
          }
          // Should be unreachable if isResource() implies ResourceTile
          return false;
        }
        // If no specific IDs required, but allowed on resources -> OK
        return true;
      }
      return false; // Not allowed on resources
    }

    // 3. Non-Resource Tile (Grass, Sand, etc)
    // If we REQUIRE a resource, then this is invalid
    if (config?.requiredResourceIds && config.requiredResourceIds.length > 0) {
      return false;
    }

    // Default: Allowed
    return true;
  }
}
