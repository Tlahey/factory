import { BuildingEntity } from '../entities/BuildingEntity';

export interface BuildingConfig {
    name: string;
    type: string;
    cost: number; // Placeholder
    hasMenu: boolean;
    description: string;
    maxCount?: number;
    width?: number;
    height?: number;
}

export const BUILDINGS: Record<string, BuildingConfig> = {
    'extractor': {
        name: 'Extractor',
        type: 'extractor',
        cost: 10,
        hasMenu: true,
        description: 'Extracts resources from the ground. Requires Energy.',
        maxCount: 3
    },
    'conveyor': {
        name: 'Conveyor Belt',
        type: 'conveyor',
        cost: 2,
        hasMenu: false,
        description: 'Transports items.'
    },
    'chest': {
        name: 'Chest',
        type: 'chest',
        cost: 5,
        hasMenu: true,
        description: 'Stores items.',
        maxCount: 1
    },
    'hub': {
        name: 'Central Hub',
        type: 'hub',
        cost: 50,
        hasMenu: true,
        description: 'Generates electricity from solar panels.',
        maxCount: 1,
        width: 2,
        height: 2
    },
    'electric_pole': {
        name: 'Electric Pole',
        type: 'electric_pole',
        cost: 5,
        hasMenu: false,
        description: 'Extends power range.'
    },
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
