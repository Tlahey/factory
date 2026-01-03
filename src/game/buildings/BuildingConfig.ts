import { BuildingEntity } from '../entities/BuildingEntity';
import { CHEST_CONFIG } from './chest/ChestConfig';
import { CONVEYOR_CONFIG } from './conveyor/ConveyorConfig';
import { EXTRACTOR_CONFIG } from './extractor/ExtractorConfig';
import { HUB_CONFIG } from './hub/HubConfig';
import { ELECTRIC_POLE_CONFIG } from './electric-pole/ElectricPoleConfig';


export interface BuildingUpgrade {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    costMultiplier: number;
    onUpgrade: (building: any) => void;
    getValue: (building: any) => string;
}

export interface BuildingConfig {
    name: string;
    type: string;
    cost: number; // Placeholder
    hasMenu: boolean;
    description: string;
    maxCount?: number;
    width?: number;
    height?: number;
    upgrades?: BuildingUpgrade[];
}

export const BUILDINGS: Record<string, BuildingConfig> = {
    'extractor': EXTRACTOR_CONFIG,
    'conveyor': CONVEYOR_CONFIG,
    'chest': CHEST_CONFIG,
    'hub': HUB_CONFIG,
    'electric_pole': ELECTRIC_POLE_CONFIG,

    'cable': {
        name: 'Cable',
        type: 'cable',
        cost: 1,
        hasMenu: false,
        description: 'Connects buildings to power.'
    }
};

export const getBuildingConfig = (type: string): BuildingConfig | undefined => {
    return BUILDINGS[type];
};
