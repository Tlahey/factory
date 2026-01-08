import { CHEST_CONFIG } from "./chest/ChestConfig";
import { CONVEYOR_CONFIG } from "./conveyor/ConveyorConfig";
import { EXTRACTOR_CONFIG } from "./extractor/ExtractorConfig";
import { HUB_CONFIG } from "./hub/HubConfig";
import { ELECTRIC_POLE_CONFIG } from "./electric-pole/ElectricPoleConfig";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";

export interface PowerConfig {
  type: "consumer" | "producer" | "relay";
  rate: number; // Consumption or Generation
  range?: number; // For poles
}

export interface BuildingUpgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  onUpgrade: (building: BuildingEntity) => void;
  getValue: (building: BuildingEntity) => string;
}

export interface BaseBuildingConfig {
  name: string;
  type: string;
  cost: number;
  hasMenu: boolean;
  description: string; // Fallback or Dev description
  id: string; // Key for i18n (e.g. 'extractor', 'conveyor')
  maxCount?: number;
  width?: number;
  height?: number;
}

// --- Unified Traits (SOLID) ---

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

/**
 * Side relative to building's facing direction
 * - 'front': Direction the building faces
 * - 'back': Opposite of front
 * - 'left': 90° counter-clockwise from front
 * - 'right': 90° clockwise from front
 */
export type IOSide = "front" | "back" | "left" | "right";

export interface IOConfig {
  hasInput: boolean;
  hasOutput: boolean;
  showArrow?: boolean;
  /** Side where input port is located (relative to building direction) */
  inputSide?: IOSide;
  /** Side where output port is located (relative to building direction) */
  outputSide?: IOSide;
}

export interface IIOBuilding {
  io: IOConfig;
  /** Get world position of input port, or null if no input */
  getInputPosition(): { x: number; y: number } | null;
  /** Get world position of output port, or null if no output */
  getOutputPosition(): { x: number; y: number } | null;
  canInput(fromX: number, fromY: number): boolean;
  canOutput(world: IWorld): boolean;
  tryOutput(world: IWorld): boolean;
  isInputConnected?: boolean;
  isOutputConnected?: boolean;
}

export type Direction = "north" | "south" | "east" | "west";

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

export interface IStorage {
  maxSlots: number;
  isFull(): boolean;
  addItem(type: string, amount: number): boolean;
}

export interface ITransportable {
  speed: number;
}

// Specialized Config Types
export type ExtractorConfigType = BaseBuildingConfig &
  ConfigOf<IExtractable> &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type ConveyorConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> &
  ConfigOf<ITransportable>;
export type ChestConfigType = BaseBuildingConfig &
  ConfigOf<IStorage> &
  ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type HubConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type ElectricPoleConfigType = BaseBuildingConfig & ConfigOf<IPowered>;

// Union of all specialized configs
export type BuildingConfig =
  | ExtractorConfigType
  | ConveyorConfigType
  | ChestConfigType
  | HubConfigType
  | ElectricPoleConfigType
  | BaseBuildingConfig; // For simple buildings like 'cable'

export const BUILDINGS: Record<string, BuildingConfig> = {
  extractor: EXTRACTOR_CONFIG,
  conveyor: CONVEYOR_CONFIG,
  chest: CHEST_CONFIG,
  hub: HUB_CONFIG,
  electric_pole: ELECTRIC_POLE_CONFIG,

  cable: {
    id: "cable",
    name: "Cable",
    type: "cable",
    cost: 1,
    hasMenu: false,
    description: "Connects buildings to power.",
  },
};

export const getBuildingConfig = (type: string): BuildingConfig | undefined => {
  return BUILDINGS[type];
};
