import { BuildingEntity } from '../../entities/BuildingEntity';
import { Tile } from '../../core/Tile';

export class Hub extends BuildingEntity {
    constructor(x: number, y: number) {
        super(x, y, 'hub');
        this.width = 2;
        this.height = 2;
        // Initial Power Generation
        this.powerConfig = {
            type: 'producer',
            rate: 50 // Generates 50 units
        };
        this.powerStatus = 'active'; // Always active
    }

    public statsHistory: { time: number, production: number, consumption: number }[] = [];


    public tick(_delta: number): void {
        // Variable power generation (Solar Fluctuation)
        if (this.powerConfig) {
            // Base rate is 50. Fluctuate between 40 and 60 slowly?
            // Or just random noise. User said "valeur de production ne devrait fluctuer" (should NOT fluctuate? or SHOULD?)
            // "la valeur de production ne devrait fluctuer" -> typically means "should NOT fluctuate"? 
            // BUT "Le photo voltaique est assez sensible" -> "Photovoltaic is quite sensitive".
            // The phrasing "sur le graph tu pourrais afficher les données ... Ainsi que le photo voltaique est assez sensible, la valeur de production ne devrait fluctuer"
            // Wait. "ne devrait fluctuer" usually means "should not fluctuate".
            // BUT "sensitive" implies it DOES fluctuate with clouds etc.
            // Maybe there is a typo in user prompt: "la valeur de production *devrait* fluctuer".
            // Context: "Display data on Y axis. And since/as PV is sensitive, value SHOULD fluctuate."
            // If it shouldn't fluctuate, why mention it's sensitive?
            // I will assume it SHOUD fluctuate.
            
            // Let's implement small noise.
            const time = Date.now() / 1000;
            const noise = Math.sin(time * 0.5) * 5 + Math.sin(time * 2) * 2; 
            // 50 +/- ~7
            this.powerConfig.rate = Math.max(0, 50 + noise);
        }
    }

    public getColor(): number {
        return 0xffaa00; // Orange/Gold
    }

    public isValidPlacement(tile: Tile): boolean {
        return !tile.isWater();
    }
}
