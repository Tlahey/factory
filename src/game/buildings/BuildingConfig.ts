import { CHEST_CONFIG } from './chest/ChestConfig';
import { CONVEYOR_CONFIG } from './conveyor/ConveyorConfig';
import { EXTRACTOR_CONFIG } from './extractor/ExtractorConfig';
import { HUB_CONFIG } from './hub/HubConfig';
import { ELECTRIC_POLE_CONFIG } from './electric-pole/ElectricPoleConfig';
import { BuildingEntity } from '../entities/BuildingEntity';
import { IWorld } from '../entities/types';

export interface PowerConfig {
  type: 'consumer' | 'producer' | 'relay';
  rate: number; // Consumption or Generation
  range?: number; // For poles
}


export interface BuildingUpgrade {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    costMultiplier: number;
    onUpgrade: (building: BuildingEntity) => void;
    getValue: (building: BuildingEntity) => string;
}

export interface BaseBuildingConfig {
    name: string;
    type: string;
    cost: number;
    hasMenu: boolean;
    description: string;
    maxCount?: number;
    width?: number;
    height?: number;
}

// --- Unified Traits (SOLID) ---

/**
 * Utility to extract only data properties (non-functions) from a trait interface.
 * This allows us to use one interface for both the behavioral implementation (class) 
 * and the static configuration definition.
 */
export type ConfigOf<T> = {
    [K in keyof T as T[K] extends ((...args: any[]) => any) ? never : K]: T[K]
};

export interface IExtractable {
    extractionRate: number;
    getExtractionRate(): number;
    getExtractionInterval(): number;
}

export interface IPowered {
    powerConfig: PowerConfig;
    getPowerDemand(): number;
    getPowerGeneration(): number;
    updatePowerStatus(satisfaction: number, hasSource: boolean, gridId: number): void;
}

export interface IIOBuilding {
    io: {
        hasInput: boolean;
        hasOutput: boolean;
        showArrow?: boolean;
    };
    canInput(fromX: number, fromY: number): boolean;
    canOutput(world: IWorld): boolean;
    tryOutput(world: IWorld): boolean;
}

export interface IStorage {
    maxSlots: number;
    isFull(): boolean;
    addItem(type: string, amount: number): boolean;
}

// Specialized Config Types
export type ExtractorConfigType = BaseBuildingConfig & ConfigOf<IExtractable> & ConfigOf<IPowered> & ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type ConveyorConfigType = BaseBuildingConfig & ConfigOf<IIOBuilding>;
export type ChestConfigType = BaseBuildingConfig & ConfigOf<IStorage> & ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type HubConfigType = BaseBuildingConfig & ConfigOf<IPowered> & ConfigOf<IIOBuilding> & { upgrades: BuildingUpgrade[] };
export type ElectricPoleConfigType = BaseBuildingConfig & ConfigOf<IPowered>;

// Union of all specialized configs
export type BuildingConfig = 
    | ExtractorConfigType 
    | ConveyorConfigType 
    | ChestConfigType 
    | HubConfigType 
    | ElectricPoleConfigType
    | BaseBuildingConfig; // For simple buildings like 'cable'

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
