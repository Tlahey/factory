import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createOreModel, updateOreVisuals } from "../ResourceModelBuilder";

export class GoldOre extends GameResource {
  public readonly id = "gold_ore";
  public readonly name = "Gold Ore";

  public createModel(): THREE.Group {
    return createOreModel(0xffd700); // Gold
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateOreVisuals(group, seed);
  }
}
