import type { BuildingConfig } from '../BuildingConfig';
import { Extractor } from './Extractor';

export const EXTRACTOR_CONFIG: BuildingConfig = {
    name: 'Extractor',
    type: 'extractor',
    cost: 10,
    hasMenu: true,
    description: 'Extracts resources from the ground. Requires Energy.',
    io: {
        hasInput: false,
        hasOutput: true,
        showArrow: true
    },
    maxCount: 3,
    upgrades: [
        {
            id: 'speed',
            name: 'Overclock Speed',
            description: 'Increase extraction speed by 50%.',
            baseCost: 50,
            costMultiplier: 1.5,
            onUpgrade: (b: any) => (b as Extractor).upgradeSpeed(),
            getValue: (b: any) => ((b as Extractor).speedMultiplier * 60).toFixed(0) + ' items/min'
        }
    ]
};
