
import { describe, test, expect, beforeEach } from 'vitest';
import { Conveyor } from './Conveyor';
import { getDirectionOffset, getOppositeDirection } from './ConveyorLogicSystem';

class MockEntity {
    x: number;
    y: number;
    type: string;
    direction: 'north' | 'south' | 'east' | 'west';
    isResolved: boolean = true; 

    constructor(type: string, x: number, y: number, direction: 'north' | 'south' | 'east' | 'west' = 'north') {
        this.type = type;
        this.x = x;
        this.y = y;
        this.direction = direction;
    }
    
    getType() { return this.type; }
}

class MockWorld {
    buildings: Map<string, MockEntity | Conveyor> = new Map();
    cables: {x1: number, y1: number, x2: number, y2: number}[] = [];

    add(b: MockEntity | Conveyor) {
        this.buildings.set(`${b.x},${b.y}`, b);
    }
    
    getBuilding(x: number, y: number) {
        return this.buildings.get(`${x},${y}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTile(_x: number, _y: number): any {
        // Mock Tile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { isStone: () => false, isWater: () => false } as any;
    }

    hasPathTo(_startX: number, _startY: number, _targetType: string, _viaTypes: string[]): boolean {
        return false;
    }

    propagateFlowFromSources() {
        const extractors: MockEntity[] = [];
        this.buildings.forEach(b => { 
            if (b.getType() === 'extractor') extractors.push(b as MockEntity); 
        });
        
        for (const extractor of extractors) {
            const outputOffset = getDirectionOffset(extractor.direction);
            const startX = extractor.x + outputOffset.dx;
            const startY = extractor.y + outputOffset.dy;
            
            const firstConveyor = this.getBuilding(startX, startY);
            if (!firstConveyor || firstConveyor.getType() !== 'conveyor') continue;
            
            const visited = new Set<string>();
            const queue: {x: number, y: number, fromDir: string}[] = [];
            
            queue.push({ x: startX, y: startY, fromDir: getOppositeDirection(extractor.direction) });
            
            while (queue.length > 0) {
                const { x, y, fromDir } = queue.shift()!;
                const key = `${x},${y}`;
                
                if (visited.has(key)) continue;
                visited.add(key);
                
                const conveyor = this.getBuilding(x, y);
                if (!conveyor || conveyor.getType() !== 'conveyor') continue;
                
                const conv = conveyor as Conveyor;
                const forbiddenDir = fromDir; 
                
                if (conv.direction === forbiddenDir) {
                     const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
                    for (const dir of directions) {
                        if (dir === forbiddenDir) continue;
                        const offset = getDirectionOffset(dir);
                        const neighbor = this.getBuilding(x + offset.dx, y + offset.dy);
                        if (neighbor && (neighbor.getType() === 'conveyor' || neighbor.getType() === 'chest')) {
                            conv.direction = dir;
                            break;
                        }
                    }
                }
                
                const outOffset = getDirectionOffset(conv.direction);
                const nextX = x + outOffset.dx;
                const nextY = y + outOffset.dy;
                const nextKey = `${nextX},${nextY}`;
                
                if (!visited.has(nextKey)) {
                    const next = this.getBuilding(nextX, nextY);
                    if (next && next.getType() === 'conveyor') {
                        queue.push({ x: nextX, y: nextY, fromDir: getOppositeDirection(conv.direction) });
                    }
                }
            }
        }
    }
}

describe('Conveyor Orientation & Flow', () => {
    let world: MockWorld;

    beforeEach(() => {
        world = new MockWorld();
    });

    test('Side Loading Priority: Straight conveyor next to Extractor', () => {
        // Setup: Extractor(East) -> C1(North) -> C2(South)
        const ext = new MockEntity('extractor', 0, 10, 'east'); 
        const c1 = new Conveyor(1, 10, 'north'); 
        const c2 = new Conveyor(1, 11, 'south');

        world.add(ext);
        world.add(c1);
        world.add(c2);

        // Run Logic on C1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        c1.autoOrientToNeighbor(world as any);

        if (c1.direction !== 'south') {
             console.log(`DEBUG FAILURE: Expected 'south', got '${c1.direction}'`);
        }
        
        expect(c1.direction).toBe('south');
    });

    test('Flow Propagation: Reversing a Chain', () => {
        const ext = new MockEntity('extractor', 0, 10, 'east');
        const c1 = new Conveyor(1, 10, 'west');
        const c2 = new Conveyor(2, 10, 'west');
        const c3 = new Conveyor(3, 10, 'west');
        const chest = new MockEntity('chest', 4, 10, 'north');

        world.add(ext);
        world.add(c1);
        world.add(c2);
        world.add(c3);
        world.add(chest);

        world.propagateFlowFromSources();

        expect(c1.direction).toBe('east');
        expect(c2.direction).toBe('east');
        expect(c3.direction).toBe('east');
    });
    
    test('Corner Case: Extractor -> Curve', () => {
         const ext = new MockEntity('extractor', 0, 0, 'east');
         const c1 = new Conveyor(1, 0, 'west');
         const c2 = new Conveyor(1, 1, 'north');
         
         world.add(ext);
         world.add(c1);
         world.add(c2);
         
         world.propagateFlowFromSources();
         
         expect(c1.direction).toBe('south');
    });
});
