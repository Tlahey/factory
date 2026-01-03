import { BuildingEntity } from '../../entities/BuildingEntity';
import { Tile } from '../../core/Tile';

export class Hub extends BuildingEntity {
    constructor(x: number, y: number) {
        super(x, y, 'hub');
        // Initial Power Generation
        this.powerConfig = {
            type: 'producer',
            rate: 50 // Generates 50 units
        };
        this.powerStatus = 'active'; // Always active
    }

    public tick(delta: number): void {
        // Variable power generation (e.g., solar) could happen here
        // For now constant.
    }

    public getColor(): number {
        return 0xffaa00; // Orange/Gold
    }

    public isValidPlacement(tile: Tile): boolean {
        return !tile.isWater();
    }
}
