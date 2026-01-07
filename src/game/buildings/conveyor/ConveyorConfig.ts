import type { ConveyorConfigType } from '../BuildingConfig';

export const CONVEYOR_CONFIG: ConveyorConfigType = {
    name: 'Conveyor Belt',
    type: 'conveyor',
    cost: 2,
    hasMenu: false,
    description: 'Transports items.',
    io: {
        hasInput: true,
        hasOutput: true,
        showArrow: false
    }
};
