import { BuildingEntity } from "./BuildingEntity";
import { Tile } from "../core/Tile";
import { TileType } from "../constants";

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
  buildingType: string;
}

export interface IWorld {
  getBuilding(x: number, y: number): BuildingEntity | undefined;
  getTile(x: number, y: number): Tile;
  setTile(x: number, y: number, tile: Tile): void;
  hasPathTo(
    startX: number,
    startY: number,
    targetType: string,
    viaTypes: string[],
  ): boolean;
  cables: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface SerializedBuilding {
  x: number;
  y: number;
  type: string;
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
}
