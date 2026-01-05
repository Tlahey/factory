/**
 * Unit Tests for Conveyor Auto-Orientation
 * 
 * These tests validate that conveyors correctly auto-orient when placed
 * adjacent to different building types.
 */

import { Conveyor } from './Conveyor';
import { Extractor } from '../extractor/Extractor';
import { Chest } from '../chest/Chest';
import { World } from '../../core/World';

describe('Conveyor Auto-Orientation', () => {
    
    describe('Adjacent to Extractor', () => {
        
        it('should point SOUTH when placed south of extractor pointing SOUTH', () => {
            // Setup: Extractor at (5,4) pointing SOUTH
            const world = createMockWorld();
            const extractor = new Extractor(5, 4, 'south');
            world.addBuilding(extractor);
            
            // Action: Place conveyor at (5,5) - south of extractor
            const conveyor = new Conveyor(5, 5, 'north'); // Default direction
            world.addBuilding(conveyor); // Should trigger autoOrientToNeighbor
            
            // Assert: Conveyor should point SOUTH (same as extractor)
            expect(conveyor.direction).toBe('south');
        });
        
        it('should point EAST when placed east of extractor pointing EAST', () => {
            const world = createMockWorld();
            const extractor = new Extractor(5, 5, 'east');
            world.addBuilding(extractor);
            
            const conveyor = new Conveyor(6, 5, 'north');
            world.addBuilding(conveyor);
            
            expect(conveyor.direction).toBe('east');
        });
        
        it('should NOT orient if placed where extractor does not point', () => {
            // Setup: Extractor at (5,5) pointing SOUTH
            const world = createMockWorld();
            const extractor = new Extractor(5, 5, 'south');
            world.addBuilding(extractor);
            
            // Action: Place conveyor at (4,5) - west of extractor (not in flow path)
            const conveyor = new Conveyor(4, 5, 'north');
            world.addBuilding(conveyor);
            
            // Assert: Conveyor keeps default orientation
            expect(conveyor.direction).toBe('north');
        });
    });
    
    describe('Adjacent to Chest', () => {
        
        it('should point EAST when placed west of chest', () => {
            const world = createMockWorld();
            const chest = new Chest(6, 5, 'north');
            world.addBuilding(chest);
            
            const conveyor = new Conveyor(5, 5, 'south');
            world.addBuilding(conveyor);
            
            expect(conveyor.direction).toBe('east'); // Point toward chest
        });
        
        it('should point NORTH when placed south of chest', () => {
            const world = createMockWorld();
            const chest = new Chest(5, 5, 'north');
            world.addBuilding(chest);
            
            const conveyor = new Conveyor(5, 6, 'east');
            world.addBuilding(conveyor);
            
            expect(conveyor.direction).toBe('north'); // Point toward chest
        });
    });
    
    describe('Adjacent to Resolved Conveyor', () => {
        
        it('should point SOUTH when placed south of resolved conveyor pointing SOUTH', () => {
            const world = createMockWorld();
            
            // Setup resolved conveyor chain
            const conveyor1 = new Conveyor(5, 5, 'south');
            conveyor1.isResolved = true;
            world.addBuilding(conveyor1);
            
            const conveyor2 = new Conveyor(5, 6, 'east');
            world.addBuilding(conveyor2);
            
            expect(conveyor2.direction).toBe('south'); // Continue flow
        });
    });
    
    describe('Priority System', () => {
        
        it('should prioritize chest over conveyor', () => {
            const world = createMockWorld();
            
            // Chest to the east
            const chest = new Chest(6, 5, 'north');
            world.addBuilding(chest);
            
            // Resolved conveyor to the south
            const conveyor1 = new Conveyor(5, 6, 'south');
            conveyor1.isResolved = true;
            world.addBuilding(conveyor1);
            
            // Place new conveyor between them
            const conveyor2 = new Conveyor(5, 5, 'north');
            world.addBuilding(conveyor2);
            
            // Should point toward chest (priority 1) not conveyor (priority 2)
            expect(conveyor2.direction).toBe('east');
        });
        
        it('should prioritize chest over extractor', () => {
            const world = createMockWorld();
            
            const extractor = new Extractor(5, 4, 'south'); // Points to (5,5)
            world.addBuilding(extractor);
            
            const chest = new Chest(6, 5, 'north');
            world.addBuilding(chest);
            
            const conveyor = new Conveyor(5, 5, 'north');
            world.addBuilding(conveyor);
            
            expect(conveyor.direction).toBe('east'); // Toward chest, not south
        });
    });
    
    describe('Edge Cases', () => {
        
        it('should keep manual orientation when no neighbors', () => {
            const world = createMockWorld();
            
            const conveyor = new Conveyor(5, 5, 'west');
            world.addBuilding(conveyor);
            
            expect(conveyor.direction).toBe('west'); // No auto-orientation
        });
        
        it('should handle perpendicular extractor correctly', () => {
            // Extractor pointing east, conveyor to the north of it
            const world = createMockWorld();
            const extractor = new Extractor(5, 5, 'east');
            world.addBuilding(extractor);
            
            const conveyor = new Conveyor(5, 4, 'south'); // North of extractor
            world.addBuilding(conveyor);
            
            // Extractor doesn't point toward conveyor, so no auto-orient
            expect(conveyor.direction).toBe('south');
        });
    });
});

// Helper function to create mock world
function createMockWorld() {
    const world = new World(20, 20);
    
    // Override addBuilding to NOT call updateConveyorNetwork (testing only orientation)
    const originalAdd = world.addBuilding.bind(world);
    world.addBuilding = function(building: any) {
        this.buildings.set(`${building.x},${building.y}`, building);
        if (building instanceof Conveyor) {
            building.autoOrientToNeighbor(this);
        }
        return true;
    };
    
    return world;
}
