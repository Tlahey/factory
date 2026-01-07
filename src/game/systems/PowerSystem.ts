
import { World } from '../core/World';
import { BuildingEntity } from '../entities/BuildingEntity';
import { Hub } from '../buildings/hub/Hub';
import { IPowered } from '../buildings/BuildingConfig';

interface PowerGrid {
    id: number;
    producers: (BuildingEntity & IPowered)[];
    consumers: (BuildingEntity & IPowered)[];
    nodes: BuildingEntity[]; // All connected buildings including relays
    batteries: (BuildingEntity & IPowered)[]; 
    totalGen: number;
    totalDemand: number;
    satisfaction: number; // 0..1
}

export class PowerSystem {
    private world: World;
    private grids: PowerGrid[] = [];
    private historyTimer: number = 0;

    constructor(world: World) {
        this.world = world;
    }

    public update(delta: number): void {
        // Re-calculate values every frame to handle dynamic consumption/production changes
        // (e.g. if we add day/night later, or if machines stop working for other reasons)
        this.recalculatePower();

        // Update History every 1 second
        this.historyTimer += delta;
        if (this.historyTimer >= 1.0) {
            this.historyTimer = 0;
            this.updateHistory();
        }
    }

    private updateHistory(): void {
        const now = Date.now();
        this.grids.forEach(grid => {
            // Push history to all producers (Hubs) in this grid
            grid.producers.forEach(p => {
                if (p instanceof Hub) {
                    p.statsHistory.push({
                        time: now,
                        production: grid.totalGen,
                        consumption: grid.totalDemand
                    });
                    
                    // Keep last 60 seconds
                    if (p.statsHistory.length > 60) {
                        p.statsHistory.shift();
                    }
                }
            });
        });
    }

    public recalculatePower(): void {
        this.grids.forEach(grid => {
            grid.totalGen = 0;
            grid.totalDemand = 0;

            // 1. Calculate Generation
            grid.producers.forEach(b => {
                const gen = b.getPowerGeneration();
                grid.totalGen += gen;
                b.currentPowerSatisfied = gen;
                b.currentGridId = grid.id;
            });

            // 2. Calculate Demand
            grid.consumers.forEach(b => {
                const demand = b.getPowerDemand();
                grid.totalDemand += demand;
                b.currentPowerDraw = demand;
                b.currentGridId = grid.id;
            });

            // 3. Balance
            if (grid.totalDemand === 0) {
                grid.satisfaction = 1;
            } else {
                if (grid.totalGen >= grid.totalDemand) {
                    grid.satisfaction = 1;
                } else {
                    grid.satisfaction = Math.max(0, grid.totalGen / grid.totalDemand);
                }
            }

            // 4. Update Status for ALL nodes
            // Tolerance for floating point errors or tiny fluctuations (0.999 instead of 1.0)
            const status = grid.satisfaction >= 0.99 ? 'active' : 'warn';
            const hasSource = grid.producers.length > 0;

            grid.nodes.forEach(b => {
                const satisfaction = grid.satisfaction;
                const hasSource = grid.producers.length > 0;

                if ('updatePowerStatus' in b && typeof (b as any).updatePowerStatus === 'function') {
                    (b as unknown as IPowered).updatePowerStatus(satisfaction, hasSource, grid.id);
                } else {
                   // Fallback for non-IPowered buildings if needed
                   b.hasPowerSource = hasSource;
                   b.powerSatisfaction = satisfaction;
                   b.currentGridId = grid.id;
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
             }
        });

        // 3. Find Connected Components
        const processedBuildings = new Set<BuildingEntity>();

        powerNodes.forEach((startNode, startKey) => {
            if (visited.has(startKey)) return;
            if (processedBuildings.has(startNode)) return; 

            // Start new Grid
            const grid: PowerGrid = {
                id: this.grids.length + 1,
                producers: [],
                consumers: [],
                nodes: [],
                batteries: [],
                totalGen: 0,
                totalDemand: 0,
                satisfaction: 0
            };

            const queue: string[] = [startKey];

            while (queue.length > 0) {
                const currKey = queue.shift()!;
                if (visited.has(currKey)) continue;
                visited.add(currKey);

                const [cx, cy] = currKey.split(',').map(Number);
                const node = this.world.getBuilding(cx, cy);
                
                if (node) {
                    // Check if entire building processed
                    if (!processedBuildings.has(node)) {
                        processedBuildings.add(node);
                        grid.nodes.push(node); // Add to general nodes list

                        if ('getPowerGeneration' in node && 'getPowerDemand' in node) {
                            const pNode = node as unknown as (BuildingEntity & IPowered);
                            if (node.powerConfig?.type === 'producer') grid.producers.push(pNode);
                            else if (node.powerConfig?.type === 'consumer') grid.consumers.push(pNode);
                            else if (node.powerConfig?.type === 'relay') {
                                // Relay just stays in grid.nodes which is already added
                            }
                        }
                        
                        // Add neighbors of ALL tiles of this building
                        for (let dx = 0; dx < (node.width || 1); dx++) {
                            for (let dy = 0; dy < (node.height || 1); dy++) {
                                const tKey = `${node.x + dx},${node.y + dy}`;
                                const tileNeighbors = adj.get(tKey) || [];
                                queue.push(...tileNeighbors);
                                visited.add(tKey); 
                            }
                        }
                    } 
                } else {
                    // Cable point
                    const neighbors = adj.get(currKey) || [];
                    queue.push(...neighbors);
                }
            }

            // Only add grid if it has at least one building
            if (grid.nodes.length > 0) {
                this.grids.push(grid);
            }
        });

        this.recalculatePower();
        console.log(`PowerSystem: Rebuilt ${this.grids.length} grids.`);
    }
}
