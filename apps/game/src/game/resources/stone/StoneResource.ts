import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createStoneItemModel, updateStoneItemVisuals } from "./StoneModel";

export class StoneResource extends GameResource {
  public readonly id = "stone";
  public readonly name = "Stone";

  public createModel(): THREE.Group {
    return createStoneItemModel();
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateStoneItemVisuals(group, seed);
  }
}
