import type { BuildingConfig } from '../BuildingConfig';
import { Chest } from './Chest';

export const CHEST_CONFIG: BuildingConfig = {
    name: 'Chest',
    type: 'chest',
    cost: 5,
    hasMenu: true,
    description: 'Stores items.',
    maxCount: 1,
    upgrades: [
        {
            id: 'capacity',
            name: 'Extra Slot',
            description: 'Add an additional inventory slot to this chest.',
            baseCost: 50,
            costMultiplier: 2,
            onUpgrade: (b: any) => (b as Chest).upgradeCapacity(),
            getValue: (b: any) => (b as Chest).maxSlots + ' slots'
        }
    ]
};
