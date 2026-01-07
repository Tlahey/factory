import type { ChestConfigType } from '../BuildingConfig';
import { Chest } from './Chest';

import { BuildingEntity } from '../../entities/BuildingEntity';

export const CHEST_CONFIG: ChestConfigType = {
    name: 'Chest',
    type: 'chest',
    cost: 5,
    hasMenu: true,
    description: 'Stores items.',
    io: {
        hasInput: true,
        hasOutput: true,
        showArrow: true
    },
    maxCount: 1,
    maxSlots: 5,
    upgrades: [
    ]
};
