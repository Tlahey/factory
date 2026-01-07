import type { ElectricPoleConfigType } from '../BuildingConfig';

export const ELECTRIC_POLE_CONFIG: ElectricPoleConfigType = {
    name: 'Electric Pole',
    type: 'electric_pole',
    cost: 5,
    hasMenu: false,
    description: 'Extends power range.',
    powerConfig: {
        type: 'relay',
        rate: 0,
        range: 8
    }
};
