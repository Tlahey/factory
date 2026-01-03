import type { BuildingConfig } from '../BuildingConfig';

export const HUB_CONFIG: BuildingConfig = {
    name: 'Central Hub',
    type: 'hub',
    cost: 50,
    hasMenu: true,
    description: 'Generates electricity from solar panels.',
    maxCount: 1,
    width: 2,
    height: 2
};
