import { ElectricPole } from './ElectricPole';
import { createElectricPoleModel } from './ElectricPoleModel';
import { SimpleVisual } from '../../visuals/SimpleVisual';

export class ElectricPoleVisual extends SimpleVisual {
    constructor(pole: ElectricPole) {
        super(createElectricPoleModel());
    }
}
