import type { AnyActorRef } from "xstate";
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
import {
  FootprintSize,
  TilePos,
  footprintContains,
  getBaseSize,
  getFootprintCenter,
  getFootprintSizeForConfig,
  getOccupiedTiles,
} from "../buildings/BuildingFootprint";

export abstract class BuildingEntity extends Entity {
  public buildingType: BuildingId;
  public direction: Direction = "north";
  /**
   * XState actor driving this building's logic. Assigned by every subclass
   * constructor, hence the definite assignment: typing it optional would force
   * a null-check on every `building.actor.getSnapshot()` call site.
   */
  public actor!: AnyActorRef;
  public active: boolean = false;

  public width: number = 1;
  public height: number = 1;

  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;
  public connectedInputSides: IOSide[] = [];
  public connectedOutputSides: IOSide[] = [];
  /**
   * Per-port connectivity, keyed `side#index` (see `getPortKey`). A wide
   * building can have one edge tile fed and the other still free, which the
   * side-level flags above cannot express.
   */
  public connectedInputPorts: string[] = [];
  public connectedOutputPorts: string[] = [];

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

    this.syncFootprint();
  }

  /**
   * Re-derive the world-frame footprint from the config and the current
   * direction. Must be called after any direct write to `direction`, otherwise
   * a multi-tile building's dimensions drift out of sync with the tiles the
   * world has it registered on.
   */
  public syncFootprint(): void {
    const size = getFootprintSizeForConfig(this.getConfig(), this.direction);
    this.width = size.width;
    this.height = size.height;
  }

  public rotate(): void {
    const clockwise: Record<Direction, Direction> = {
      north: "east",
      east: "south",
      south: "west",
      west: "north",
    };
    this.direction = clockwise[this.direction];
    this.syncFootprint();
  }

  /** Base (un-rotated) dimensions, as authored in the config. */
  public getBaseSize(): FootprintSize {
    return getBaseSize(this.getConfig());
  }

  /** World-frame dimensions, already rotated. */
  public getFootprintSize(): FootprintSize {
    return { width: this.width, height: this.height };
  }

  /** Every tile this building occupies. */
  public getOccupiedTiles(): TilePos[] {
    return getOccupiedTiles(this.x, this.y, this.getFootprintSize());
  }

  /** Geometric centre of the footprint, in world units (for rendering). */
  public getCenter(): TilePos {
    return getFootprintCenter(this.x, this.y, this.getFootprintSize());
  }

  /** Is (x, y) one of the tiles this building occupies? */
  public occupies(x: number, y: number): boolean {
    return footprintContains(this.x, this.y, this.getFootprintSize(), x, y);
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
          // `isResource()` implies ResourceTile; narrow instead of casting so
          // getResourceType() is type-checked.
          if (tile instanceof ResourceTile) {
            return config.requiredResourceIds.includes(tile.getResourceType());
          }
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
