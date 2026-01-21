import { TileType } from "../constants";
import { IWorld } from "../entities/types";

export abstract class Tile {
  constructor() {}

  public abstract getType(): TileType;

  // Visual logic delegated to subclasses
  public getVisualScale(): number {
    return 1.0;
  }

  public isVisualVisible(): boolean {
    return false;
  }

  // Logic update, returns a new Tile if it transforms
  public onTick(_x: number, _y: number, _world: IWorld): Tile {
    return this;
  }

  public isEmpty(): boolean {
    return this.getType() === TileType.EMPTY;
  }

  public isWater(): boolean {
    return this.getType() === TileType.WATER;
  }

  public isStone(): boolean {
    return this.getType() === TileType.STONE;
  }

  public isSand(): boolean {
    return this.getType() === TileType.SAND;
  }

  public isGrass(): boolean {
    return this.getType() === TileType.GRASS;
  }

  public isTree(): boolean {
    return this.getType() === TileType.TREE;
  }
}
