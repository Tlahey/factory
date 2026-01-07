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
    extractionRate: 60, // items per minute
    powerConfig: {
        type: 'consumer',
        rate: 20
    },
    upgrades: [

    ]
};
