import { Tile } from "./Tile";

export abstract class ResourceTile extends Tile {
  public initialResourceAmount: number;

  constructor(public resourceAmount: number = 0) {
    super();
    this.initialResourceAmount = resourceAmount;
  }

  public abstract getResourceType(): string;

  public deplete(amount: number): boolean {
    this.resourceAmount = Math.max(0, this.resourceAmount - amount);
    return this.resourceAmount <= 0;
  }

  public isResource(): boolean {
    return true;
  }
}
