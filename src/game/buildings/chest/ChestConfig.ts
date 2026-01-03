import { BuildingConfig } from '../BuildingConfig';
import { Chest } from './Chest';

export const CHEST_CONFIG: BuildingConfig = {
    type: 'chest',
    displayName: 'Chest',
    hasMenu: true,
    upgrades: [
        {
            id: 'capacity',
            name: 'Extra Slot',
            description: 'Add an additional inventory slot to this chest.',
            baseCost: 50,
            costMultiplier: 2,
            onUpgrade: (b: Chest) => b.upgradeCapacity(),
            getValue: (b: Chest) => b.maxSlots + ' slots'
        }
    ]
};
