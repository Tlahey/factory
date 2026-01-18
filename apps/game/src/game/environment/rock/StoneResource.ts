import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createItemRockModel, updateRockVisuals } from "./RockModel";

export class StoneResource extends GameResource {
  public readonly id = "stone";
  public readonly name = "Stone";

  public createModel(): THREE.Group {
    return createItemRockModel();
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateRockVisuals(group, seed);
  }
}
