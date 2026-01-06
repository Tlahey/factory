import { Chest } from './Chest';
import { createChestModel } from './ChestModel';
import { SimpleVisual } from '../../visuals/SimpleVisual';

export class ChestVisual extends SimpleVisual {
    constructor(chest: Chest) {
        super(createChestModel());
    }
}
