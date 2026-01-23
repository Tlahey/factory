import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createOreModel, updateOreVisuals } from "../ResourceModelBuilder";

export class IronOre extends GameResource {
  public readonly id = "iron_ore";
  public readonly name = "Iron Ore";

  public createModel(): THREE.Group {
    return createOreModel(0x555555); // Dark Gray
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateOreVisuals(group, seed);
  }
}
