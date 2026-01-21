import { BATTERY_CONFIG, BatteryConfigType } from "./battery/BatteryConfig";
import { FURNACE_CONFIG, FurnaceConfigType } from "./furnace/FurnaceConfig";
import {
  EXTRACTOR_CONFIG,
  ExtractorConfigType,
} from "./extractor/ExtractorConfig";
import { CONVEYOR_CONFIG, ConveyorConfigType } from "./conveyor/ConveyorConfig";
import { CHEST_CONFIG, ChestConfigType } from "./chest/ChestConfig";
import { HUB_CONFIG, HubConfigType } from "./hub/HubConfig";
import {
  ELECTRIC_POLE_CONFIG,
  ElectricPoleConfigType,
} from "./electric-pole/ElectricPoleConfig";
import {
  CONVEYOR_MERGER_CONFIG,
  ConveyorMergerConfigType,
} from "./conveyor-merger/ConveyorMergerConfig";
import {
  CONVEYOR_SPLITTER_CONFIG,
  ConveyorSplitterConfigType,
} from "./conveyor-splitter/ConveyorSplitterConfig";
import { SAWMILL_CONFIG, SawmillConfigType } from "./sawmill/SawmillConfig";
import { IWorld, Direction } from "../entities/types";

// --- CORE TYPES & ENUMS ---

/**
 * Building Categories for Visual Grouping
 */
export type BuildingCategory =
  | "production"
  | "logistics"
  | "storage"
  | "power"
  | "special";

// --- REPOSITORY TYPES ---

/**
 * Registry entry for a building, mapping logic and visual classes.
 * Defined here to avoid circular dependencies when colocating in building folders.
 */
export interface BuildingRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Logic: { new (...args: any[]): any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Visual: { new (...args: any[]): any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createVisual?: (building: any, context: any) => any;
}

/**
 * Side relative to building's facing direction
 * - 'front': Direction the building faces
 * - 'back': Opposite of front
 * - 'left': 90° counter-clockwise from front
 * - 'right': 90° clockwise from front
 */
export type IOSide = "front" | "back" | "left" | "right";

// --- CONFIGURATION SUB-STRUCTURES ---

/**
 * Literal IDs for all building types.
 */
export type BuildingId =
  | "extractor"
  | "conveyor"
  | "chest"
  | "hub"
  | "electric_pole"
  | "battery"
  | "furnace"
  | "conveyor_merger"
  | "conveyor_splitter"
  | "sawmill"
  | "cable";

export interface PowerConfig {
  type: "consumer" | "producer" | "relay";
  rate: number; // Consumption or Generation
  range?: number; // For poles
}

export interface Recipe {
  id: string;
  input: string; // Resource ID (e.g., 'iron_ore')
  output: string; // Resource ID (e.g., 'iron_ingot')
  inputCount: number; // Number of input items consumed per craft
  duration: number; // Seconds
  unlockCost: Record<string, number>; // Cost to unlock this recipe in the HUB
}

/**
 * Effect type for building upgrades
 * - multiplier: Multiplies a stat by the value (e.g., 1.2 = +20%)
 * - additive: Adds the value to a stat (e.g., +2 slots)
 * - unlock: Unlocked a new feature
 */
export interface UpgradeEffect {
  type: "multiplier" | "additive" | "unlock";
  /** The stat being affected, e.g., "extractionRate", "maxSlots", "powerRate" */
  stat: string;
  /** The value of the effect */
  value: number;
}

export interface BuildingUpgrade {
  /** Upgrade level (1, 2, 3, etc.) */
  level: number;
  /** i18n key for the upgrade name */
  name: string;
  /** i18n key for the upgrade description */
  description: string;
  /** Resource costs to unlock this upgrade */
  cost: Record<string, number>;
  /** Effects applied when this upgrade is unlocked */
  effects: UpgradeEffect[];
}

/**
 * Shop configuration for purchasable buildings.
 * Define this if the building can be purchased in the shop.
 */
export interface ShopBuildingConfig {
  /** Base cost to purchase a license in the shop */
  baseCost: Record<string, number>;
  /** Price multiplier per purchase (e.g., 2.0 = double each time) */
  priceMultiplier: number;
  /** Initial count given for free when unlocked (default: 0) */
  initialCount?: number;
}

export interface IOConfig {
  hasInput: boolean;
  hasOutput: boolean;
  showArrow?: boolean;
  /** Side where input port is located (relative to building direction) */
  inputSide?: IOSide;
  /** Side where output port is located (relative to building direction) */
  outputSide?: IOSide;
  /** Valid input sides (overrides inputSide if present) */
  validInputSides?: IOSide[];
  /** Valid output sides (overrides outputSide if present) */
  validOutputSides?: IOSide[];
}

// --- BASE BUILDING CONFIGURATION ---

export interface BaseBuildingConfig {
  name: string;
  type: BuildingId;
  category: BuildingCategory;
  cost: Record<string, number>;
  locked?: boolean;
  hasMenu: boolean;
  description: string; // Fallback or Dev description
  id: BuildingId; // Key for i18n (e.g. 'extractor', 'conveyor')
  maxCount?: number;
  width?: number;
  height?: number;
  /** Shop configuration (if purchasable in shop) */
  shop?: ShopBuildingConfig;
  /** Optional static image for preview (replaces 3D model) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewImage?: any; // StaticImageData or string
}

// --- SOLID TRAIT INTERFACES ---

/**
 * Utility to extract only data properties (non-functions) from a trait interface.
 * This allows us to use one interface for both the behavioral implementation (class)
 * and the static configuration definition.
 */
export type ConfigOf<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};

export interface IExtractable {
  extractionRate: number;
  getExtractionRate(): number;
  getExtractionInterval(): number;
}

export interface IPowered {
  powerConfig: PowerConfig;
  getPowerDemand(): number;
  getPowerGeneration(): number;
  updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
  ): void;
}

export interface IIOBuilding {
  io: IOConfig;
  /** Get world position of input port, or null if no input */
  getInputPosition(): { x: number; y: number } | null;
  /** Get world position of ALL input ports (for buildings like mergers) */
  getInputPositions?(): { x: number; y: number }[];
  /** Get world position of output port, or null if no output */
  getOutputPosition(): { x: number; y: number } | null;
  /** Get world position of ALL output ports (for buildings like splitters) */
  getOutputPositions?(): { x: number; y: number }[];
  canInput(fromX: number, fromY: number): boolean;
  canOutput(world: IWorld): boolean;
  tryOutput(world: IWorld): boolean;
  isInputConnected?: boolean;
  isOutputConnected?: boolean;
  /** Specific connected sides for granular arrow visibility */
  connectedInputSides?: IOSide[];
  connectedOutputSides?: IOSide[];
}

export interface IStorage {
  maxSlots: number;
  isFull(): boolean;
  addItem(type: string, amount: number): boolean;
}

export interface ITransportable {
  speed: number;
}

export interface IUpgradable {
  upgrades: BuildingUpgrade[];
}

/**
 * Interface for buildings that can be connected to the power grid via cables.
 */
export interface IPowerConnectable {
  /** Maximum number of simultaneous cable connections */
  maxConnections: number;
}

export interface IRecipeBuilding {
  recipes: Recipe[];
}

// --- HELPER FUNCTIONS ---

/**
 * Convert a relative IOSide to an absolute world direction based on the building's facing direction.
 *
 * @param side - The relative side ('front', 'back', 'left', 'right')
 * @param buildingDirection - The direction the building is facing
 * @returns The absolute world direction
 */
export function getDirectionFromSide(
  side: IOSide,
  buildingDirection: Direction,
): Direction {
  const clockwiseOrder: Direction[] = ["north", "east", "south", "west"];
  const currentIndex = clockwiseOrder.indexOf(buildingDirection);

  switch (side) {
    case "front":
      return buildingDirection;
    case "back":
      return clockwiseOrder[(currentIndex + 2) % 4];
    case "right":
      return clockwiseOrder[(currentIndex + 1) % 4];
    case "left":
      return clockwiseOrder[(currentIndex + 3) % 4];
  }
}

/**
 * Get the position offset for a given direction
 */
export function getDirectionOffset(dir: Direction): { dx: number; dy: number } {
  const offsets: Record<Direction, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    east: { dx: 1, dy: 0 },
    west: { dx: -1, dy: 0 },
  };
  return offsets[dir];
}

// --- BUILDING REGISTRY ---

// Union of all specialized configs
export type BuildingConfig =
  | ExtractorConfigType
  | ConveyorConfigType
  | ChestConfigType
  | HubConfigType
  | ElectricPoleConfigType
  | BatteryConfigType
  | FurnaceConfigType
  | ConveyorMergerConfigType
  | ConveyorSplitterConfigType
  | SawmillConfigType
  | BaseBuildingConfig; // For simple buildings like 'cable'

export const BUILDINGS: Record<BuildingId, BuildingConfig> = {
  extractor: EXTRACTOR_CONFIG,
  conveyor: CONVEYOR_CONFIG,
  chest: CHEST_CONFIG,
  hub: HUB_CONFIG,
  electric_pole: ELECTRIC_POLE_CONFIG,

  cable: {
    id: "cable",
    name: "Cable",
    type: "cable",
    category: "power",
    cost: { copper_ingot: 1 },
    locked: true,
    hasMenu: false,
    description: "Connects buildings to power.",
  },

  battery: BATTERY_CONFIG,
  furnace: FURNACE_CONFIG,
  conveyor_merger: CONVEYOR_MERGER_CONFIG,
  conveyor_splitter: CONVEYOR_SPLITTER_CONFIG,
  sawmill: SAWMILL_CONFIG,
};

export const getBuildingConfig = (
  type: BuildingId,
): BuildingConfig | undefined => {
  return BUILDINGS[type];
};
