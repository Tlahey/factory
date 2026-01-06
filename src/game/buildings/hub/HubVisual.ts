import { Hub } from './Hub';
import { createHubModel } from './HubModel';
import { SimpleVisual } from '../../visuals/SimpleVisual';

export class HubVisual extends SimpleVisual {
    constructor(hub: Hub) {
        super(createHubModel());
    }
}
