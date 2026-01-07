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
    getType(): TileType { return TileType.SAND; } // Sand or whatever, it needs TileType enum
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

describe('Extractor - Container Full Reproduction', () => {
    let world: MockWorld;
    let extractor: Extractor;
    let chest: Chest;
    let tile: MockStoneTile;

    beforeEach(() => {
        world = new MockWorld();
        extractor = new Extractor(0, 0, 'east'); // Pointing East to (1,0)
        extractor.hasPowerSource = true;
        extractor.powerSatisfaction = 1.0;
        
        chest = new Chest(1, 0); // At (1,0)
        chest.maxSlots = 1; // Small for testing
        
        tile = new MockStoneTile(100);
        world.setTile(0, 0, tile);
        world.addBuilding(extractor);
        world.addBuilding(chest);
    });

    test('should NOT deplete resource when chest is full', () => {
        // Fill chest
        chest.addItem('stone', 100); // 1 slot of 100 stone. STACK_SIZE is 100.
        expect(chest.isFull()).toBe(true);
        expect(chest.slots.length).toBe(1);

        // Tick extractor multiple times to reach extraction interval
        // Extractor speed is 1.0, interval 1.0s.
        extractor.tick(0.5, world);
        expect(tile.resourceAmount).toBe(100); // Not ready yet
        
        extractor.tick(0.6, world); // Total 1.1s > 1.0s interval
        
        expect(tile.resourceAmount).toBe(100); // Should STILL be 100 because chest is full
        expect(extractor.operationStatus).toBe('blocked');
    });

    test('should deplete resource when chest has space', () => {
        // Chest is empty
        extractor.tick(1.1, world);
        
        expect(tile.resourceAmount).toBe(99); 
        expect(chest.slots[0].count).toBe(1);
        expect(extractor.operationStatus).toBe('working');
    });
});
