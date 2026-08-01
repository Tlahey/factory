import * as THREE from "three";
import { createLogisticsDeck } from "../../visuals/helpers/LogisticsDeckModel";

/** Orange accent: three belts in, one out. */
export function createConveyorMergerModel(): THREE.Group {
  return createLogisticsDeck({
    accentColor: 0xffaa00,
    name: "conveyor_merger_model",
  });
}
