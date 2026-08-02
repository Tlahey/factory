import { BuildingEntity } from "./BuildingEntity";
import { Tile } from "../environment/Tile";
import { TileType } from "../constants";
import { BuildingId } from "../buildings/BuildingConfig";

export type Direction = "north" | "south" | "east" | "west";
export const DIRECTIONS: Direction[] = ["north", "south", "east", "west"];

export interface IEntity {
  id: string;
  x: number;
  y: number;
}

export interface IResource extends IEntity {
  type: "resource";
  resourceType: string;
  amount: number;
}

export interface IBuilding extends IEntity {
  type: "building";
  buildingType: BuildingId;
}

export interface IWorld {
  /**
   * Incremented every time buildings are added/removed/rotated.
   * Lets per-tick systems (belt turn visuals, IO arrows) skip recomputation
   * when nothing structural changed. Optional so test doubles can omit it —
   * an undefined version simply means "always recompute".
   */
  topologyVersion?: number;
  getBuilding(x: number, y: number): BuildingEntity | undefined;
  getConnectionsCount(x: number, y: number): number;
  getBuildingConnectionsCount(building: BuildingEntity): number;
  getTile(x: number, y: number): Tile;
  setTile(x: number, y: number, tile: Tile): void;
  hasPathTo(
    startX: number,
    startY: number,
    targetType: BuildingId,
    viaTypes: BuildingId[],
  ): boolean;
  cables: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface SerializedBuilding {
  x: number;
  y: number;
  type: BuildingId;
  direction: string;
  currentItem?: string | null;
  itemId?: number | null;
  transportProgress?: number;
  slots?: { type: string; count: number }[];
  maxSlots?: number;
  bonusSlots?: number;
  speedMultiplier?: number;
}

export interface WorldData {
  grid: { type: TileType; resourceAmount: number }[][];
  buildings: SerializedBuilding[];
  cables: { x1: number; y1: number; x2: number; y2: number }[];
  discovered?: boolean[][];
}
