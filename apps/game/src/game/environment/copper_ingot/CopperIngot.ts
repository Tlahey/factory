import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createIngotModel, updateIngotVisuals } from "../ResourceModelBuilder";

export class CopperIngot extends GameResource {
  public readonly id = "copper_ingot";
  public readonly name = "Copper Ingot";

  public createModel(): THREE.Group {
    return createIngotModel(0xb87333); // Copper Orange-Brown
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateIngotVisuals(group, seed);
  }
}
