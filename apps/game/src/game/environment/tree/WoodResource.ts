import * as THREE from "three";
import { GameResource } from "../GameResource";
import { createWoodItemModel, updateWoodItemVisuals } from "./TreeModel";

/**
 * Wood resource - harvested from trees.
 * Common resource used in construction and crafting.
 */
export class WoodResource extends GameResource {
  public readonly id = "wood";
  public readonly name = "Wood";

  public createModel(): THREE.Group {
    return createWoodItemModel();
  }

  public updateVisuals(group: THREE.Group, seed: number): void {
    updateWoodItemVisuals(group, seed);
  }
}
