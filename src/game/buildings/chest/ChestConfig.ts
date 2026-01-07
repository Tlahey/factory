import type { ChestConfigType } from '../BuildingConfig';

import { BuildingEntity } from '../../entities/BuildingEntity';

export const CHEST_CONFIG: ChestConfigType = {
    id: 'chest',
    name: 'Chest',
    type: 'chest',
    cost: 5,
    hasMenu: true,
    description: 'Stores items.',
    io: {
        hasInput: true,
        hasOutput: true,
        showArrow: true,
        inputSide: 'front',  // Input where chest faces
        outputSide: 'back'   // Output opposite to input
    },
    maxCount: 1,
    maxSlots: 5,
    upgrades: [
    ]
};
