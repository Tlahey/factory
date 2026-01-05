
import { Conveyor } from './Conveyor'; // Adaptez les imports selon votre structure
import { World } from '../../core/World'; // Fake/Mock needed

// Mock classes for testing
class MockEntity {
    x: number;
    y: number;
    direction: string;
    type: string;
    isResolved: boolean = true;
    
    constructor(type: string, x: number, y: number, direction: string = 'north') {
        this.type = type;
        this.x = x;
        this.y = y;
        this.direction = direction;
    }
    
    getType() { return this.type; }
}

class MockWorld {
    buildings: MockEntity[] = [];
    
    getBuilding(x: number, y: number) {
        return this.buildings.find(b => b.x === x && b.y === y);
    }
    
    add(b: MockEntity) { this.buildings.push(b); }
}

describe('Conveyor Auto-Orientation Logic', () => {
    let world: MockWorld;
    
    beforeEach(() => {
        world = new MockWorld();
    });

    // Helper to run logic (simulate the method we will write)
    function runAutoOrient(conveyor: Conveyor, world: any) {
        conveyor.autoOrientToNeighbor(world);
    }

    test('Scenario: Straight Line Gap Fill', () => {
        // [A (East)] -> [GAP] -> [C (East)]
        const A = new MockEntity('conveyor', 0, 10, 'east');
        const C = new MockEntity('conveyor', 2, 10, 'east');
        world.add(A);
        world.add(C);
        
        // Place B at (1,10). Should point East.
        // Input: A (prio low). Output: C (prio high).
        const B = new Conveyor(1, 10, 'north'); // Initial drag wrong
        runAutoOrient(B, world);
        
        expect(B.direction).toBe('east');
    });

    test('Scenario: Turn Gap Fill', () => {
        // [A (East)] -> [GAP]
        //               [C (South)]
        const A = new MockEntity('conveyor', 1, 10, 'east'); // Left of gap
        const C = new MockEntity('conveyor', 2, 11, 'south'); // Below gap
        world.add(A);
        world.add(C);
        
        // Place B at (2,10).
        // Input: A (West side). Points at B. -> Suggests East.
        // Output: C (South side). Points Away. -> Suggests South.
        // Output Prio > Input Prio. Should pick South.
        
        const B = new Conveyor(2, 10, 'north');
        runAutoOrient(B, world);
        
        expect(B.direction).toBe('south');
    });

    test('Scenario: Extractor Source', () => {
        // [Extractor (East)] -> [GAP]
        const Ext = new MockEntity('extractor', 0, 10, 'east');
        world.add(Ext);
        
        const B = new Conveyor(1, 10, 'north');
        runAutoOrient(B, world);
        
        expect(B.direction).toBe('east');
    });

    test('Scenario: Conflict (Head-to-Head Prevented)', () => {
        // [B (West)]
        // [A (North)] -> [GAP]
        // A wants to feed Gap. B points AT Gap.
        // Gap should NOT point at B (Head-to-head).
        
        const A = new MockEntity('conveyor', 1, 11, 'north'); // Below gap
        const B = new MockEntity('conveyor', 1, 9, 'south'); // Above gap, pointing DOWN at gap
        world.add(A);
        world.add(B);
        
        // Place C at (1,10).
        // Input A (South). Points at C. Suggests North.
        // Input B (North). Points at C. Suggests South.
        // No Output targets available (both point at me).
        // Tie breaker? Or just pick one?
        // Drag was East.
        
        const C = new Conveyor(1, 10, 'east');
        runAutoOrient(C, world);
        
        // Should keep drag direction (East) or pick one input?
        // Logic says: If no output targets, check inputs.
        // A is Input. B is Input.
        // Usually we default to Drag if no clear Output? 
        // Or pick one.
        // Let's assume Drag wins if only inputs exist and conflict.
        
        // Actually, in this grid it's messy. Let's ensure it doesn't point North or South if it creates collision?
        // We only fail to output if they point AT us.
        // So we won't point North (into B). We won't point South (into A).
        // So East is fine.
        expect(C.direction).toBe('east'); 
    });
    
    test('Scenario: Forced Turn', () => {
        // [A (East)] -> [GAP]
        //               [Chest]
        const A = new MockEntity('conveyor', 0, 10, 'east');
        const Chest = new MockEntity('chest', 1, 11, 'any'); // South of B
        world.add(A);
        world.add(Chest);
        
        const B = new Conveyor(1, 10, 'north');
        runAutoOrient(B, world);
        
        expect(B.direction).toBe('south'); // Point at chest
    });
});
