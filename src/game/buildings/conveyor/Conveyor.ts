import { Tile } from "../../core/Tile";
import { BuildingEntity, Direction4 } from "../../entities/BuildingEntity";
import {
  getDirectionOffset,
  getOppositeDirection,
  determineFlowInputDirection,
  calculateTurnType,
} from "./ConveyorLogicSystem";
import { IWorld } from "../../entities/types";
import { Chest } from "../chest/Chest";
import {
  IIOBuilding,
  ConveyorConfigType,
  PowerConfig,
} from "../BuildingConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

interface Candidate {
  direction: "north" | "south" | "east" | "west";
  priority: number;
}

export class Conveyor extends BuildingEntity implements IIOBuilding {
  constructor(x: number, y: number, direction: Direction4 = "north") {
    super(x, y, "conveyor", direction);
  }

  public currentItem: string | null = null;
  public itemId: number | null = null; // Unique ID for tracking mesh
  public transportProgress: number = 0;
  public isResolved: boolean = false; // True only if connected to a valid destination (chest)
  public visualType: "straight" | "left" | "right" = "straight";
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;

  public get transportSpeed(): number {
    return ((this.getConfig() as ConveyorConfigType).speed ?? 60) / 60; // tiles per second
  }

  public tick(delta: number, world?: IWorld): void {
    if (world) {
      this.updateVisualState(world);
      updateBuildingConnectivity(this, world);
    }

    if (!this.currentItem || !this.isResolved) return;

    this.transportProgress += this.transportSpeed * delta;

    if (this.transportProgress >= 1) {
      if (world) this.moveItem(world);
    }
  }

  private moveItem(world: IWorld): void {
    // Determine target coordinates based on direction
    let tx = this.x;
    let ty = this.y;

    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const targetBuilding = world.getBuilding(tx, ty);

    if (targetBuilding) {
      if (targetBuilding instanceof Conveyor && !targetBuilding.currentItem) {
        // Push only to resolved conveyors
        if (targetBuilding.isResolved) {
          targetBuilding.currentItem = this.currentItem;
          targetBuilding.itemId = this.itemId;
          // Preserve overflow time for smooth transition
          targetBuilding.transportProgress = this.transportProgress - 1;
          this.currentItem = null;
          this.itemId = null;
          this.transportProgress = 0;
        }
      } else if (targetBuilding instanceof Chest) {
        if (targetBuilding.addItem(this.currentItem!)) {
          this.currentItem = null;
          this.itemId = null;
          this.transportProgress = 0;
        }
      }
    }

    // Clamp progress
    if (this.transportProgress > 1) this.transportProgress = 1;
  }

  // --- Traits Implementation ---

  public get io() {
    return (this.getConfig() as ConveyorConfigType).io;
  }

  public get powerConfig(): PowerConfig | undefined {
    return undefined;
  }

  // --- IIOBuilding ---
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    // Conveyor input is from the back (opposite of direction)
    const oppositeDir = getOppositeDirection(this.direction);
    const offset = getDirectionOffset(oppositeDir);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    // Conveyor output is in its direction (front)
    const offset = getDirectionOffset(this.direction);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public canInput(fromX: number, fromY: number): boolean {
    const dx = fromX - this.x;
    const dy = fromY - this.y;

    // Check if neighbor is adjacent
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

    // Conveyor accepts input from any side EXCEPT the front (output direction)
    const outputOffset = getDirectionOffset(this.direction);
    if (dx === outputOffset.dx && dy === outputOffset.dy) return false;

    // Structural check only: return true even if full.
    // Logic for item transfer handles the 'full' state separately.
    return true;
  }

  public canOutput(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;
    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (!target) return false;

    if (target instanceof Conveyor) {
      return target.isResolved && !target.currentItem;
    }

    if (
      "canInput" in target &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (target as any).canInput === "function"
    ) {
      return (target as unknown as IIOBuilding).canInput(this.x, this.y);
    }

    return false;
  }

  public tryOutput(world: IWorld): boolean {
    this.moveItem(world);
    return this.currentItem === null; // Success if item moved
  }

  public autoOrient(_world: IWorld): void {
    // Deprecated: Orientation is now handled globally by World.updateConveyorNetwork()
  }

  public getColor(): number {
    return 0xaaaaaa; // Light Gray
  }

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isStone() && !tile.isWater();
  }

  /**
   * Auto-orient this conveyor to connect to adjacent buildings
   * Called once at placement time
   *
   * Priority:
   * 1. Chest - point toward it (it's a destination)
   * 2. Resolved conveyor - point toward it (continue flow)
   * 3. Extractor - point in same direction IF we're in its output path
   */
  public autoOrientToNeighbor(world: IWorld): void {
    // Priorities (Lower is better)
    const PRIO_CHEST = 1; // Definite destination
    const PRIO_CONVEYOR_OUT = 2; // Valid conveyor target
    const PRIO_CONVEYOR_IN = 3; // Continuing a flow from neighbor
    const PRIO_EXTRACTOR_IN = 4; // Starting a flow from extractor

    const directions: Array<"north" | "south" | "east" | "west"> = [
      "north",
      "south",
      "east",
      "west",
    ];
    let bestCandidate: Candidate | null = null;

    // Phase 1: Look for OUTPUTS
    for (const checkDir of directions) {
      const offset = getDirectionOffset(checkDir);
      const neighbor = world.getBuilding(
        this.x + offset.dx,
        this.y + offset.dy,
      );

      if (!neighbor) continue;
      const neighborType = neighbor.getType();

      // 1. Chest Target
      if (neighborType === "chest") {
        const candidate: Candidate = {
          direction: checkDir,
          priority: PRIO_CHEST,
        };
        this.updateBestCandidate(
          candidate,
          bestCandidate,
          (c) => (bestCandidate = c),
        );
      }

      // 2. Conveyor Target (ANY conveyor is a potential output)
      else if (neighborType === "conveyor") {
        const neighborDir = neighbor.direction;
        const dirToUs = getOppositeDirection(checkDir);

        // ANY conveyor is a valid output target.
        // Even if it currently points at us (wrong direction), we should point toward it.
        // The propagation will fix its direction afterward.
        let priority = PRIO_CONVEYOR_OUT;

        // Prefer resolved conveyors (connected to chest)
        if ((neighbor as Conveyor).isResolved) {
          priority -= 0.6; // 1.4 - Better than unresolved (2), worse than Chest (1)
        }

        // CRITICAL FIX: If neighbor points AT us, it is an INPUT. Do not output to it.
        // This prevents head-to-head locking (-> <-).
        if (neighborDir === dirToUs) {
          priority += 0.5;
        }

        const candidate: Candidate = {
          direction: checkDir,
          priority: priority,
        };
        this.updateBestCandidate(
          candidate,
          bestCandidate,
          (c) => (bestCandidate = c),
        );
      }
    }

    // Phase 2: Look for INPUTS (Who is feeding us?)
    for (const checkDir of directions) {
      const offset = getDirectionOffset(checkDir);
      const neighbor = world.getBuilding(
        this.x + offset.dx,
        this.y + offset.dy,
      );

      if (!neighbor) continue;
      const neighborType = neighbor.getType();

      // 3. Conveyor Input (Neighbor points AT us)
      if (neighborType === "conveyor") {
        const neighborDir = neighbor.direction;
        const dirToUs = getOppositeDirection(checkDir);

        if (neighborDir === dirToUs) {
          // It points at us! Flow suggests we continue this direction.
          // Example: A(East) -> Me. Neighbor is West. Points East.
          // Suggests I point East.
          const suggestedDir = neighborDir;
          const candidate: Candidate = {
            direction: suggestedDir,
            priority: PRIO_CONVEYOR_IN,
          };
          this.updateBestCandidate(
            candidate,
            bestCandidate,
            (c) => (bestCandidate = c),
          );
        }
      }

      // 4. Extractor Input
      else if (neighborType === "extractor") {
        const extractorDir = neighbor.direction;
        const dirToUs = getOppositeDirection(checkDir);

        if (extractorDir === dirToUs) {
          // It points at us! We should continue in the same direction as its output.
          // PRIORITY 4 (Lowest): Only use this if no Output target found.
          // This ensures we prefer pointing toward the NEXT conveyor over aligning with extractor.
          const candidate: Candidate = {
            direction: extractorDir,
            priority: PRIO_EXTRACTOR_IN,
          };
          this.updateBestCandidate(
            candidate,
            bestCandidate,
            (c) => (bestCandidate = c),
          );
        }
      }
    }

    if (bestCandidate) {
      const finalCand = bestCandidate as Candidate;
      const oldDirection = this.direction;
      this.direction = finalCand.direction;

      // PROPAGATION: If we changed direction, notify neighbors so they can react
      // This creates a chain reaction ensuring flow consistency from source to destination
      if (this.direction !== oldDirection) {
        try {
          const directionsInProp: Array<"north" | "south" | "east" | "west"> = [
            "north",
            "south",
            "east",
            "west",
          ];

          for (const dir of directionsInProp) {
            const offset = getDirectionOffset(dir);
            const neighbor = world.getBuilding(
              this.x + offset.dx,
              this.y + offset.dy,
            );

            // Only propagate to conveyors to avoid infinite loops with other checks
            if (neighbor && neighbor instanceof Conveyor) {
              neighbor.autoOrientToNeighbor(world);
            }
          }
        } catch (_e) {
          // Ignore propagation errors
        }
      }
    }
  }

  private updateBestCandidate(
    candidate: Candidate,
    currentBest: Candidate | null,
    setBest: (c: Candidate) => void,
  ) {
    if (!currentBest || candidate.priority < currentBest.priority) {
      setBest(candidate);
    } else if (candidate.priority === currentBest.priority) {
      if (candidate.direction === this.direction) setBest(candidate);
    }
  }

  public updateVisualState(world: IWorld): void {
    const flowIn = determineFlowInputDirection(
      this.x,
      this.y,
      this.direction,
      world,
    );
    let type: "straight" | "left" | "right" = "straight";

    if (flowIn) {
      type = calculateTurnType(flowIn, this.direction) as
        | "straight"
        | "left"
        | "right";
    }
    this.visualType = type;
  }
}
