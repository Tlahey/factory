import { World } from "../core/World";
import { BuildingEntity } from "../entities/BuildingEntity";
import { Hub } from "../buildings/hub/Hub";
import { Battery } from "../buildings/battery/Battery";
import { IPowered } from "../buildings/BuildingConfig";

interface PowerGrid {
  id: number;
  producers: (BuildingEntity & IPowered)[];
  consumers: (BuildingEntity & IPowered)[];
  nodes: BuildingEntity[]; // All connected buildings including relays
  batteries: Battery[];
  totalGen: number;
  totalDemand: number;
  /** Power being consumed by batteries (charging) */
  batteryChargeRate: number;
  /** Power being provided by batteries (discharging) */
  batteryDischargeRate: number;
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
    this.recalculatePower(delta);

    // Update History every 1 second
    this.historyTimer += delta;
    if (this.historyTimer >= 1.0) {
      this.historyTimer = 0;
      this.updateHistory();
    }
  }

  private updateHistory(): void {
    const now = Date.now();
    this.grids.forEach((grid) => {
      // Push history to all producers (Hubs) in this grid
      grid.producers.forEach((p) => {
        if (p instanceof Hub) {
          // Total consumption includes building demand + battery charging
          const totalConsumption = grid.totalDemand + grid.batteryChargeRate;

          p.statsHistory.push({
            time: now,
            production: grid.totalGen,
            consumption: totalConsumption,
          });

          // Keep last 60 seconds
          if (p.statsHistory.length > 60) {
            p.statsHistory.shift();
          }
        }
      });
    });
  }

  public recalculatePower(delta: number = 0): void {
    this.grids.forEach((grid) => {
      grid.totalGen = 0;
      grid.totalDemand = 0;
      grid.batteryChargeRate = 0;
      grid.batteryDischargeRate = 0;

      // 1. Calculate Generation
      grid.producers.forEach((b) => {
        const gen = b.getPowerGeneration();
        grid.totalGen += gen;
        b.currentPowerSatisfied = gen;
        b.currentGridId = grid.id;
      });

      // 2. Calculate Demand
      grid.consumers.forEach((b) => {
        const demand = b.getPowerDemand();
        grid.totalDemand += demand;
        b.currentPowerDraw = demand;
        b.currentGridId = grid.id;
      });

      // 3. Balance with Batteries
      const net = grid.totalGen - grid.totalDemand;

      if (net > 0) {
        // Surplus: Charge batteries
        if (delta > 0 && grid.batteries.length > 0) {
          const surplus = net;
          const activeBatteries = grid.batteries.filter(
            (b) => b.isEnabled && b.currentCharge < b.capacity,
          );

          if (activeBatteries.length > 0) {
            // Distribute surplus evenly among batteries
            const share = surplus / activeBatteries.length;
            let totalChargeRate = 0;

            activeBatteries.forEach((b) => {
              const actualRate = Math.min(share, b.maxChargeRate);
              b.charge(actualRate * delta);
              totalChargeRate += actualRate;
            });

            // Track battery charge rate for display
            grid.batteryChargeRate = totalChargeRate;
          }
        }
        grid.satisfaction = 1;
      } else if (net < 0) {
        // Deficit: Discharge batteries
        const deficit = -net;
        let drawnRate = 0;

        const activeBatteries = grid.batteries.filter(
          (b) => b.isEnabled && b.currentCharge > 0,
        );

        if (activeBatteries.length > 0) {
          let remainingDeficit = deficit;

          for (const b of activeBatteries) {
            if (remainingDeficit <= 0.001) break;

            const maxRatePossible = b.maxDischargeRate;
            const chargeCapRate =
              delta > 0 ? b.currentCharge / delta : Infinity;

            const actualRate = Math.min(
              remainingDeficit,
              maxRatePossible,
              chargeCapRate,
            );

            if (delta > 0) {
              b.discharge(actualRate * delta);
            }

            drawnRate += actualRate;
            remainingDeficit -= actualRate;
          }
        }

        // Track battery discharge rate for display
        grid.batteryDischargeRate = drawnRate;
        const totalAvailable = grid.totalGen + drawnRate;

        if (totalAvailable >= grid.totalDemand - 0.001) {
          grid.satisfaction = 1;
        } else {
          grid.satisfaction = Math.max(0, totalAvailable / grid.totalDemand);
        }
      } else {
        grid.satisfaction = 1;
      }

      // 4. Update Status for ALL nodes
      // Tolerance for floating point errors or tiny fluctuations (0.999 instead of 1.0)
      // const status = grid.satisfaction >= 0.99 ? "active" : "warn";
      // const hasSource = grid.producers.length > 0;

      grid.nodes.forEach((b) => {
        const satisfaction = grid.satisfaction;
        // Has power source if either producers exist OR batteries are discharging power
        const hasSource =
          grid.producers.length > 0 || grid.batteryDischargeRate > 0;

        if (
          "updatePowerStatus" in b &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (b as any).updatePowerStatus === "function"
        ) {
          (b as unknown as IPowered).updatePowerStatus(
            satisfaction,
            hasSource,
            grid.id,
            grid.nodes.length,
          );
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

    this.world.cables.forEach((c) => {
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
        batteryChargeRate: 0,
        batteryDischargeRate: 0,
        satisfaction: 0,
      };

      const queue: string[] = [startKey];

      while (queue.length > 0) {
        const currKey = queue.shift()!;
        if (visited.has(currKey)) continue;
        visited.add(currKey);

        const [cx, cy] = currKey.split(",").map(Number);
        const node = this.world.getBuilding(cx, cy);

        if (node) {
          // Check if entire building processed
          if (!processedBuildings.has(node)) {
            processedBuildings.add(node);

            // If this is a disabled battery, add it to grid but DON'T traverse through it
            // This makes it act as a circuit breaker
            const isDisabledBattery =
              node instanceof Battery && !node.isEnabled;

            grid.nodes.push(node); // Add to general nodes list

            if ("getPowerGeneration" in node && "getPowerDemand" in node) {
              const pNode = node as unknown as BuildingEntity & IPowered;
              if (node.powerConfig?.type === "producer")
                grid.producers.push(pNode);
              else if (node.powerConfig?.type === "consumer")
                grid.consumers.push(pNode);
              else if (node.powerConfig?.type === "relay") {
                // Relay just stays in grid.nodes which is already added
              }
            }

            if (node instanceof Battery) {
              grid.batteries.push(node);
            }

            // Only continue traversal if NOT a disabled battery (breaker is ON or not a battery)
            if (!isDisabledBattery) {
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
