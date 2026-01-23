import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createIngotModel, updateIngotVisuals } from "../ResourceModelBuilder";

export class GoldIngot extends GameResource {
  public readonly id = "gold_ingot";
  public readonly name = "Gold Ingot";

  public createModel(): THREE.Group {
    return createIngotModel(0xffd700); // Gold
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateIngotVisuals(group, seed);
  }
}
