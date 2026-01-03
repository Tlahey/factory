
import { World } from '../core/World';
import { BuildingEntity } from '../entities/BuildingEntity';

interface PowerGrid {
    id: number;
    producers: BuildingEntity[];
    consumers: BuildingEntity[];
    batteries: BuildingEntity[]; // Future proofing
    totalGen: number;
    totalDemand: number;
    satisfaction: number; // 0..1
}

export class PowerSystem {
    private world: World;
    private grids: PowerGrid[] = [];

    constructor(world: World) {
        this.world = world;
    }

    public update(delta: number): void {
        // 1. Rebuild Grids logic (optimally, only when network changes, but for now every N frames or dirty flag)
        // For simplicity in this phase, we might just assume the network is static unless a cable/building is placed.
        // But we need to recalculate *values* every tick (or less often).
        
        // Let's rely on a dirty flag in World or just re-eval periodically.
        // For the MVP, we can re-scan connectivity if we assume small scale. 
        // Better: World tells us when connections change.
        
        this.recalculatePower();
    }

    public recalculatePower(): void {
        // Reset all buildings to 'warn' (no power) if consumer
        // This is expensive to do every frame. We should only do this when topology changes.
        // However, we need to update 'satisfaction' every frame if generation varies (solar).
        
        // For now, let's assume we reconstructed grids.
        
        this.grids.forEach(grid => {
            grid.totalGen = 0;
            grid.totalDemand = 0;

            // 1. Calculate Generation
            grid.producers.forEach(b => {
               if (b.powerConfig) {
                   // Variable generation logic could go here or in Building
                   grid.totalGen += b.powerConfig.rate; 
               }
            });

            // 2. Calculate Demand
            grid.consumers.forEach(b => {
                if (b.powerConfig) {
                    grid.totalDemand += b.powerConfig.rate;
                }
            });

            // 3. Balance
            if (grid.totalDemand === 0) {
                grid.satisfaction = 1;
            } else {
                grid.satisfaction = Math.min(1, grid.totalGen / grid.totalDemand);
            }

            // 4. Update Status
            grid.consumers.forEach(b => {
                // If satisfaction < 1, maybe still work but slow? Or stop?
                // User said: "Si elles ont pas assez l'électricité, elle passent en état "warn" (orange) et ne fonctionnent plus."
                // So strict cutoff? Or usually threshold?
                // "warn" typically means 0 power or low power.
                // Let's say if satisfaction < 1, it's a warning state, but maybe we allow partial?
                // User: "ne fonctionnent plus" -> strict.
                
                if (grid.totalGen >= grid.totalDemand) {
                    b.powerStatus = 'active';
                } else {
                    b.powerStatus = 'warn';
                }
            });
        });
    }

    // This method should be called when cables/buildings change
    public rebuildNetworks(): void {
        this.grids = [];
        const visited = new Set<string>(); // "x,y"
        
        // 1. Build Adjacency Map from Cables
        const adj = new Map<string, string[]>();
        
        this.world.cables.forEach(c => {
             const k1 = `${c.x1},${c.y1}`;
             const k2 = `${c.x2},${c.y2}`;
             
             if (!adj.has(k1)) adj.set(k1, []);
             if (!adj.has(k2)) adj.set(k2, []);
             
             adj.get(k1)!.push(k2);
             adj.get(k2)!.push(k1);
        });

        // 2. Identify all potential power nodes (buildings with powerConfig)
        const powerNodes = new Map<string, BuildingEntity>();
        this.world.buildings.forEach((b, key) => {
             if (b.powerConfig) {
                 powerNodes.set(key, b);
             } else {
                 // Reset status for non-power buildings just in case (though they shouldn't have one)
             }
        });

        // 3. Find Connected Components
        const processedBuildings = new Set<BuildingEntity>();

        powerNodes.forEach((startNode, startKey) => {
            if (visited.has(startKey)) return;
            if (processedBuildings.has(startNode)) return; // Already processed via another key

            // Start new Grid
            const grid: PowerGrid = {
                id: this.grids.length + 1,
                producers: [],
                consumers: [],
                batteries: [],
                totalGen: 0,
                totalDemand: 0,
                satisfaction: 0
            };

            const queue: string[] = [startKey];
            // visited.add(startKey); // Will be added in loop

            while (queue.length > 0) {
                const currKey = queue.shift()!;
                if (visited.has(currKey)) continue;
                visited.add(currKey);

                const node = this.world.getBuilding(parseInt(currKey.split(',')[0]), parseInt(currKey.split(',')[1]));
                
                if (node) {
                    // Check if entire building processed
                    if (!processedBuildings.has(node)) {
                        processedBuildings.add(node);
                        if (node.powerConfig?.type === 'producer') grid.producers.push(node);
                        else if (node.powerConfig?.type === 'consumer') grid.consumers.push(node);
                        
                        // Add ALL tiles of this building to visited/queue logic? 
                        // We must explore neighbors of ALL its tiles.
                        for (let dx = 0; dx < (node.width || 1); dx++) {
                            for (let dy = 0; dy < (node.height || 1); dy++) {
                                const tKey = `${node.x + dx},${node.y + dy}`;
                                // Ensure we process this tile key if we haven't visited it yet (though handled by loop below)
                                // But crucially, we must get 'adj' from it.
                                
                                // Actually, if we just push to queue, the loop top 'visited' check handles it.
                                // We push ALL neighbors of ALL tiles.
                                const tileNeighbors = adj.get(tKey) || [];
                                queue.push(...tileNeighbors);
                                
                                // Also mark this tile as visited to avoid redundant processing?
                                visited.add(tKey); 
                            }
                        }
                    } else {
                        // Already processed, but we might be at a new tile of the same building.
                        // We still need to explore neighbors of THIS tile if not explored?
                        // The block above explores ALL neighbors of ALL tiles once.
                        // So we are good.
                    }
                } else {
                    // Just a node (cable point)
                    const neighbors = adj.get(currKey) || [];
                    queue.push(...neighbors);
                }
            }

            this.grids.push(grid);
        });

        // Recalculate immediately
        this.recalculatePower();
        console.log(`PowerSystem: Rebuilt ${this.grids.length} grids.`);
    }
}
