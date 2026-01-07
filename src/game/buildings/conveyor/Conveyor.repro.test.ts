import { describe, test, expect, beforeEach } from 'vitest';
import { Conveyor } from './Conveyor';
import { Chest } from '../chest/Chest';
import { IWorld } from '../../entities/types';

class MockWorld implements IWorld {
    buildings: Map<string, any> = new Map();
    cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

    getBuilding(x: number, y: number) {
        return this.buildings.get(`${x},${y}`);
    }
    addBuilding(b: any) {
        this.buildings.set(`${b.x},${b.y}`, b);
    }
    getTile(_x: number, _y: number): any {
        return { isStone: () => false, isWater: () => false };
    }
    setTile(_x: number, _y: number, _tile: any): void {}
    hasPathTo(_startX: number, _startY: number, _targetType: string, _viaTypes: string[]): boolean {
        return true;
    }
}

describe('Conveyor - Full Chest Reproduction', () => {
    let world: MockWorld;
    let conveyor: Conveyor;
    let chest: Chest;

    beforeEach(() => {
        world = new MockWorld();
        conveyor = new Conveyor(0, 0, 'east'); // Pointing East to (1,0)
        conveyor.isResolved = true; // Conveyor must be resolved to tick
        conveyor.currentItem = 'stone';
        conveyor.itemId = 123;
        conveyor.transportProgress = 0.9;
        
        chest = new Chest(1, 0);
        chest.maxSlots = 1;
        
        world.addBuilding(conveyor);
        world.addBuilding(chest);
    });

    test('item should NOT disappear from conveyor when chest is full', () => {
        // Fill chest
        chest.addItem('stone', 100); 
        expect(chest.isFull()).toBe(true);

        // Tick conveyor past transportProgress 1.0
        conveyor.tick(0.2, world); // Progress should reach 1.1 -> calls moveItem
        
        // Item should still be on conveyor
        expect(conveyor.currentItem).toBe('stone');
        expect(conveyor.transportProgress).toBe(1.0); // Clamped at 1.0 when blocked
    });
});
