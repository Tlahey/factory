import { describe, test, expect, beforeEach } from 'vitest';
import { World } from './World';

describe('Cable Deletion on Building Removal', () => {
    let world: World;

    beforeEach(() => {
        world = new World();
    });

    test('should delete cables when a building is removed', () => {
        // 1. Place two electric poles
        const x1 = 10, y1 = 10;
        const x2 = 15, y2 = 10;
        
        world.placeBuilding(x1, y1, 'electric_pole');
        world.placeBuilding(x2, y2, 'electric_pole');

        // 2. Add a cable between them
        world.addCable(x1, y1, x2, y2);
        expect(world.cables.length).toBe(1);

        // 3. Remove one pole
        world.removeBuilding(x1, y1);

        // 4. Cable should be automatically removed because it's linked to the deleted building
        expect(world.cables.length).toBe(0);
    });

    test('should delete cables connected to any tile of a multi-tile building', () => {
        // Hub is 2x2. Tiles: (10,10), (11,10), (10,11), (11,11)
        const hx = 10, hy = 10;
        world.placeBuilding(hx, hy, 'hub');

        // Place a pole nearby
        const px = 15, py = 10;
        world.placeBuilding(px, py, 'electric_pole');

        // Connect cable to one of the Hub's tiles (not the origin)
        world.addCable(hx + 1, hy + 1, px, py);
        expect(world.cables.length).toBe(1);

        // Remove the Hub (via its origin)
        world.removeBuilding(hx, hy);

        // Cable should be removed
        expect(world.cables.length).toBe(0);
    });
});
