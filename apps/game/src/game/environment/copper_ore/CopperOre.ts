import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createOreModel, updateOreVisuals } from "../ResourceModelBuilder";

export class CopperOre extends GameResource {
  public readonly id = "copper_ore";
  public readonly name = "Copper Ore";

  public createModel(): THREE.Group {
    return createOreModel(0xb87333); // Copper Orange-Brown
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateOreVisuals(group, seed);
  }
}
