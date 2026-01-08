import { ElectricPole } from "./ElectricPole";
import { createElectricPoleModel } from "./ElectricPoleModel";
import { SimpleVisual } from "../../visuals/SimpleVisual";

export class ElectricPoleVisual extends SimpleVisual {
  constructor(_pole: ElectricPole) {
    super(createElectricPoleModel());
  }
}
