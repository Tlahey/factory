import { EXTRACTOR_CONFIG } from './extractor/ExtractorConfig';
import { CHEST_CONFIG } from './chest/ChestConfig';
import { CONVEYOR_CONFIG } from './conveyor/ConveyorConfig';

export interface UpgradeDef {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    costMultiplier: number;
    onUpgrade: (building: any) => void;
    getValue: (building: any) => string | number;
}

export interface BuildingConfig {
    type: string;
    displayName: string;
    hasMenu: boolean;
    upgrades?: UpgradeDef[];
}

export const BUILDING_CONFIGS: Record<string, BuildingConfig> = {
    'extractor': EXTRACTOR_CONFIG,
    'conveyor': CONVEYOR_CONFIG,
    'chest': CHEST_CONFIG
};

export function getBuildingConfig(type: string): BuildingConfig | undefined {
    return BUILDING_CONFIGS[type];
}
