import * as THREE from "three";
import { createLogisticsDeck } from "../../visuals/helpers/LogisticsDeckModel";

/** Blue accent: one belt in, three out. */
export function createConveyorSplitterModel(): THREE.Group {
  return createLogisticsDeck({
    accentColor: 0x00aaff,
    name: "conveyor_splitter_model",
  });
}
