import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createIngotModel, updateIngotVisuals } from "../ResourceModelBuilder";

export class IronIngot extends GameResource {
  public readonly id = "iron_ingot";
  public readonly name = "Iron Ingot";

  public createModel(): THREE.Group {
    return createIngotModel(0xc0c0c0); // Silver/Bright Gray
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateIngotVisuals(group, seed);
  }
}
