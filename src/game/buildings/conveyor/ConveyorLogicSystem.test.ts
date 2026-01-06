import { describe, test, expect, beforeEach } from 'vitest';
import {
    calculateTurnType,
    getOppositeDirection,
    getDirectionBetweenPoints,
    getDirectionOffset,
    findOutputDestination,
    determineFlowInputDirection,
    Direction
} from './ConveyorLogicSystem';

class MockEntity {
    x: number;
    y: number;
    type: string;
    direction: Direction;
    isResolved: boolean = true;

    constructor(type: string, x: number, y: number, direction: Direction = 'north') {
        this.type = type;
        this.x = x;
        this.y = y;
        this.direction = direction;
    }

    getType() { return this.type; }
}

class MockWorld {
    buildings: Map<string, MockEntity> = new Map();
    cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

    add(b: MockEntity) {
        this.buildings.set(`${b.x},${b.y}`, b);
    }

    getBuilding(x: number, y: number) {
        return this.buildings.get(`${x},${y}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTile(_x: number, _y: number): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { isStone: () => false, isWater: () => false } as any;
    }

    hasPathTo(_startX: number, _startY: number, _targetType: string, _viaTypes: string[]): boolean {
        return false;
    }
}

describe('ConveyorLogicSystem', () => {
    
    describe('calculateTurnType', () => {
        test('Straight paths', () => {
            expect(calculateTurnType('north', 'north')).toBe('straight');
            expect(calculateTurnType('south', 'south')).toBe('straight');
            expect(calculateTurnType('east', 'east')).toBe('straight');
            expect(calculateTurnType('west', 'west')).toBe('straight');
        });

        test('Left turns', () => {
            expect(calculateTurnType('north', 'west')).toBe('left');
            expect(calculateTurnType('west', 'south')).toBe('left');
            expect(calculateTurnType('south', 'east')).toBe('left');
            expect(calculateTurnType('east', 'north')).toBe('left');
        });

        test('Right turns', () => {
            expect(calculateTurnType('north', 'east')).toBe('right');
            expect(calculateTurnType('east', 'south')).toBe('right');
            expect(calculateTurnType('south', 'west')).toBe('right');
            expect(calculateTurnType('west', 'north')).toBe('right');
        });

        test('Invalid/U-turns fallback to straight', () => {
            expect(calculateTurnType('north', 'south')).toBe('straight');
            expect(calculateTurnType('east', 'west')).toBe('straight');
        });
    });

    describe('getOppositeDirection', () => {
        test('Returns opposites', () => {
            expect(getOppositeDirection('north')).toBe('south');
            expect(getOppositeDirection('south')).toBe('north');
            expect(getOppositeDirection('east')).toBe('west');
            expect(getOppositeDirection('west')).toBe('east');
        });
    });

    describe('getDirectionBetweenPoints', () => {
        test('Orthogonal directions', () => {
            expect(getDirectionBetweenPoints(0, 0, 1, 0)).toBe('east');
            expect(getDirectionBetweenPoints(1, 0, 0, 0)).toBe('west');
            expect(getDirectionBetweenPoints(0, 0, 0, 1)).toBe('south'); // y+ is south in this grid
            expect(getDirectionBetweenPoints(0, 1, 0, 0)).toBe('north');
        });

        test('Diagonal or same returns null', () => {
            expect(getDirectionBetweenPoints(0, 0, 1, 1)).toBeNull();
            expect(getDirectionBetweenPoints(0, 0, 0, 0)).toBeNull();
        });
    });

    describe('getDirectionOffset', () => {
        test('Returns correct offsets', () => {
            expect(getDirectionOffset('north')).toEqual({ dx: 0, dy: -1 });
            expect(getDirectionOffset('south')).toEqual({ dx: 0, dy: 1 });
            expect(getDirectionOffset('east')).toEqual({ dx: 1, dy: 0 });
            expect(getDirectionOffset('west')).toEqual({ dx: -1, dy: 0 });
        });
    });

    describe('findOutputDestination', () => {
        let world: MockWorld;

        beforeEach(() => {
            world = new MockWorld();
        });

        test('Finds chest', () => {
            const chest = new MockEntity('chest', 1, 0, 'north');
            world.add(chest);
            // Conveyor at 0,0. Chest at East.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dir = findOutputDestination(0, 0, null, world as any);
            expect(dir).toBe('east');
        });

        test('Finds conveyor', () => {
            const conv = new MockEntity('conveyor', 0, 1, 'north');
            world.add(conv);
            // Conveyor at 0,0. Conv at South.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dir = findOutputDestination(0, 0, null, world as any);
            expect(dir).toBe('south');
        });

        test('Excludes input direction', () => {
            const chest = new MockEntity('chest', 1, 0, 'north');
            world.add(chest);
            // Test: Chest at East.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dir = findOutputDestination(0, 0, 'west', world as any);
            // forbid 'east' output? No, forbid 'west' input?
            // getOpposite('west') = 'east'.
            // So 'east' is skipped.
            expect(dir).toBeNull();
        });

        // Complex Scenarios: Priority
        test('Priority: Chooses North neighbor over South neighbor', () => {
            // North Neighbor: Chest
            const chest = new MockEntity('chest', 0, -1, 'north');
            world.add(chest);
            
            // South Neighbor: Conveyor
            const conv = new MockEntity('conveyor', 0, 1, 'north');
            world.add(conv);
            
            // We expect North because iteration order is N, S, E, W
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dir = findOutputDestination(0, 0, null, world as any);
            expect(dir).toBe('north');
        });

        test('Priority: Chooses South neighbor over East neighbor', () => {
            // South Neighbor: Chest
            const chest = new MockEntity('chest', 0, 1, 'north');
            world.add(chest);
            
            // East Neighbor: Conveyor
            const conv = new MockEntity('conveyor', 1, 0, 'north');
            world.add(conv);
            
            // Expect South
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dir = findOutputDestination(0, 0, null, world as any);
            expect(dir).toBe('south');
        });
    });

    describe('determineFlowInputDirection', () => {
        let world: MockWorld;

        beforeEach(() => {
            world = new MockWorld();
        });

        test('From Extractor pointing at us', () => {
            // Extractor at 0,0 pointing East. Us at 1,0.
            const ext = new MockEntity('extractor', 0, 0, 'east');
            world.add(ext);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(1, 0, 'east', world as any);
            expect(flow).toBe('east');
        });

        test('From Resolved Conveyor pointing at us', () => {
            // Conv at 0,0 pointing East. Resolved.
            const conv = new MockEntity('conveyor', 0, 0, 'east');
            conv.isResolved = true;
            world.add(conv);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(1, 0, 'east', world as any);
            expect(flow).toBe('east');
        });

        test('Ignores Unresolved Conveyor', () => {
            const conv = new MockEntity('conveyor', 0, 0, 'east');
            conv.isResolved = false;
            world.add(conv);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(1, 0, 'east', world as any);
            expect(flow).toBeNull();
        });

        test('Ignores Conveyor not pointing at us', () => {
            const conv = new MockEntity('conveyor', 0, 0, 'north'); // Points away
            conv.isResolved = true;
            world.add(conv);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(1, 0, 'east', world as any);
            expect(flow).toBeNull();
        });

        // Complex Scenarios: Multiple Inputs
        test('Priority: Multiple inputs pick first found (North)', () => {
            // Extractor North pointing South (at us, 0,0)
            const extN = new MockEntity('extractor', 0, -1, 'south');
            world.add(extN);
            
            // Extractor East pointing West (at us, 0,0)
            const extE = new MockEntity('extractor', 1, 0, 'west');
            world.add(extE);
            
            // North is checked first in array order
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(0, 0, 'south', world as any);
            expect(flow).toBe('south'); // Input direction from North is 'south' (neighbor faces south)
        });

        test('Merging: Input from Side', () => {
            // We are moving South.
            // Conveyor from West pointing East (at us)
            const convW = new MockEntity('conveyor', -1, 0, 'east');
            convW.isResolved = true;
            world.add(convW);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flow = determineFlowInputDirection(0, 0, 'south', world as any);
            expect(flow).toBe('east'); // Input direction is East (neighbor faces East)
        });
    });
});