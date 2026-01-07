import { BuildingEntity } from '../../entities/BuildingEntity';
import { Tile } from '../../core/Tile';
import { IPowered, IIOBuilding, HubConfigType, PowerConfig } from '../BuildingConfig';
import { IWorld } from '../../entities/types';

export class Hub extends BuildingEntity implements IPowered, IIOBuilding {
    constructor(x: number, y: number) {
        super(x, y, 'hub');
        this.width = 2;
        this.height = 2;
        this.powerStatus = 'active'; // Always active
    }

    public statsHistory: { time: number, production: number, consumption: number }[] = [];
    private currentFluctuation: number = 0;


    public tick(_delta: number): void {
        this.updateFluctuation();
    }

    private updateFluctuation(): void {
        // Solar Fluctuation logic
        const time = Date.now() / 1000;
        this.currentFluctuation = Math.sin(time * 0.5) * 5 + Math.sin(time * 2) * 2; 
    }

    // --- Traits Implementation ---

    public get powerConfig(): PowerConfig {
        return (this.getConfig() as HubConfigType).powerConfig;
    }

    public get io() {
        return (this.getConfig() as HubConfigType).io;
    }

    // --- IPowered ---
    public getPowerDemand(): number {
        return 0;
    }

    public getPowerGeneration(): number {
        const baseRate = this.powerConfig?.rate ?? 60;
        return Math.max(0, baseRate + this.currentFluctuation);
    }

    public updatePowerStatus(satisfaction: number, hasSource: boolean, gridId: number): void {
        this.powerSatisfaction = satisfaction;
        this.hasPowerSource = hasSource;
        this.currentGridId = gridId;
        // Hub is always active as a producer
        this.powerStatus = 'active';
        this.currentPowerSatisfied = this.getPowerGeneration();
    }

    // --- IIOBuilding ---
    public canInput(): boolean {
        return true; // Hub can receive items
    }

    public canOutput(): boolean {
        return false; // Hub doesn't output automatically for now
    }

    public tryOutput(): boolean {
        return false;
    }

    public getColor(): number {
        return 0xffaa00; // Orange/Gold
    }

    public isValidPlacement(tile: Tile): boolean {
        return !tile.isWater();
    }
}
