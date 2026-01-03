import { BuildingConfig } from '../BuildingConfig';
import { Extractor } from './Extractor';

export const EXTRACTOR_CONFIG: BuildingConfig = {
    type: 'extractor',
    displayName: 'Extractor',
    hasMenu: true,
    upgrades: [
        {
            id: 'speed',
            name: 'Overclock Speed',
            description: 'Increase extraction speed by 50%.',
            baseCost: 50,
            costMultiplier: 1.5,
            onUpgrade: (b: Extractor) => b.upgradeSpeed(),
            getValue: (b: Extractor) => (b.speedMultiplier * 60).toFixed(0) + ' items/min'
        }
    ]
};
