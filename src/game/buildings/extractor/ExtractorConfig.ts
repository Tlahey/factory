import type { ExtractorConfigType } from '../BuildingConfig';
import { Extractor } from './Extractor';

import { BuildingEntity } from '../../entities/BuildingEntity';

export const EXTRACTOR_CONFIG: ExtractorConfigType = {
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
    extractionRate: 1.0,
    powerConfig: {
        type: 'consumer',
        rate: 20
    },
    upgrades: [
        {
            id: 'speed',
            name: 'Overclock Speed',
            description: 'Increase extraction speed by 50%.',
            baseCost: 50,
            costMultiplier: 1.5,
            onUpgrade: (b: BuildingEntity) => (b as Extractor).upgradeSpeed(),
            getValue: (b: BuildingEntity) => {
                const config = b.getConfig();
                const baseRate = (config && 'extractionRate' in config) ? config.extractionRate : 1.0;
                return ((b as Extractor).speedMultiplier * baseRate * 60).toFixed(0) + ' items/min';
            }
        }
    ]
};
