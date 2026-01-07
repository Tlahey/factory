import { describe, test, expect, beforeEach } from 'vitest';
import { Extractor } from './Extractor';
import { Chest } from '../chest/Chest';
import { ResourceTile } from '../../core/ResourceTile';
import { IWorld } from '../../entities/types';
import { TileType } from '../../constants';

class MockStoneTile extends ResourceTile {
    constructor(amount: number) {
        super(amount);
    }
    getResourceType(): string {
        return 'stone';
    }
    getType(): TileType { return TileType.SAND; }
    isStone(): boolean { return true; }
    isWater(): boolean { return false; }
}

class MockWorld implements IWorld {
    buildings: Map<string, any> = new Map();
    tiles: Map<string, any> = new Map();
    cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

    getBuilding(x: number, y: number) {
        return this.buildings.get(`${x},${y}`);
    }
    getTile(x: number, y: number) {
        return this.tiles.get(`${x},${y}`);
    }
    addBuilding(b: any) {
        this.buildings.set(`${b.x},${b.y}`, b);
    }
    setTile(x: number, y: number, t: any) {
        this.tiles.set(`${x},${y}`, t);
    }
    hasPathTo(_startX: number, _startY: number, _targetType: string, _viaTypes: string[]): boolean {
        return true;
    }
}

describe('Extractor - Upgrade Speed', () => {
    let world: MockWorld;
    let extractor: Extractor;
    let chest: Chest;
    let tile: MockStoneTile;

    beforeEach(() => {
        world = new MockWorld();
        extractor = new Extractor(0, 0, 'east');
        extractor.hasPowerSource = true;
        extractor.powerSatisfaction = 1.0;
        
        chest = new Chest(1, 0);
        
        tile = new MockStoneTile(100);
        world.setTile(0, 0, tile);
        world.addBuilding(extractor);
        world.addBuilding(chest);
    });

    test('should extraction rate be 60/min by default (1/s)', () => {
        expect(extractor.getExtractionRate()).toBe(1.0);
    });

    test('should increase extraction rate after upgrade', () => {
        extractor.upgradeSpeed();
        // Default speedMultiplier is 1.0. upgradeSpeed adds 0.5 -> 1.5.
        // baseRate (60) / 60 * 1.5 = 1.5
        expect(extractor.getExtractionRate()).toBe(1.5);
    });

    test('should extraction interval decrease after upgrade', () => {
        const initialInterval = extractor.getExtractionInterval();
        extractor.upgradeSpeed();
        const upgradedInterval = extractor.getExtractionInterval();
        
        expect(initialInterval).toBe(1.0);
        expect(upgradedInterval).toBe(1.0 / 1.5);
        expect(upgradedInterval).toBeLessThan(initialInterval);
    });
});
