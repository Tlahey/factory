import type { HubConfigType } from '../BuildingConfig';

export const HUB_CONFIG: HubConfigType = {
    name: 'Central Hub',
    type: 'hub',
    cost: 50,
    hasMenu: true,
    description: 'Generates electricity from solar panels.',
    maxCount: 1,
    width: 2,
    height: 2,
    io: {
        hasInput: false,
        hasOutput: false,
    },
    powerConfig: {
        type: 'producer',
        rate: 60
    },
    upgrades: []
};
