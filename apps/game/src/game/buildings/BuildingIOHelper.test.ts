import { describe, test, expect, beforeEach } from "vitest";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";
import { updateBuildingConnectivity } from "./BuildingIOHelper";
import { IIOBuilding, IOConfig } from "./BuildingConfig";
import { Direction4 } from "../entities/BuildingEntity";

// Minimal mock implementation of an IO building
class MockBuilding extends BuildingEntity implements IIOBuilding {
  public io: IOConfig;
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;

  constructor(x: number, y: number, direction: Direction4, io: IOConfig) {
    super(x, y, "mock", direction);
    this.io = io;
  }

  getInputPosition() {
    if (!this.io.hasInput) return null;
    return { x: this.x, y: this.y - 1 }; // North for test simplicity
  }

  getOutputPosition() {
    if (!this.io.hasOutput) return null;
    return { x: this.x, y: this.y + 1 }; // South for test simplicity
  }

  canInput() {
    return true;
  }
  canOutput() {
    return true;
  }
  tryOutput() {
    return true;
  }
  getColor() {
    return 0;
  }
  isValidPlacement() {
    return true;
  }
  get powerConfig() {
    return undefined;
  }
}

class MockWorld implements Partial<IWorld> {
  buildings = new Map<string, BuildingEntity | MockBuilding>();
  getBuilding(x: number, y: number) {
    return this.buildings.get(`${x},${y}`);
  }
}

describe("BuildingIOHelper", () => {
  let world: MockWorld;

  beforeEach(() => {
    world = new MockWorld();
  });

  test("connects input when neighbor outputs to our input location", () => {
    const main = new MockBuilding(5, 5, "north", {
      hasInput: true,
      hasOutput: false,
      inputSide: "front",
    });
    const neighbor = new MockBuilding(5, 4, "south", {
      hasInput: false,
      hasOutput: true,
      outputSide: "front",
    });

    // Override positions to match what helper expects
    main.getInputPosition = () => ({ x: 5, y: 4 });
    neighbor.getOutputPosition = () => ({ x: 5, y: 5 });

    world.buildings.set("5,4", neighbor);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(true);
  });

  test("disconnects input when neighbor points elsewhere", () => {
    const main = new MockBuilding(5, 5, "north", {
      hasInput: true,
      hasOutput: false,
    });
    const neighbor = new MockBuilding(5, 4, "north", {
      hasInput: false,
      hasOutput: true,
    });

    main.getInputPosition = () => ({ x: 5, y: 4 });
    neighbor.getOutputPosition = () => ({ x: 5, y: 3 }); // neighbor outputs away from main

    world.buildings.set("5,4", neighbor);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(false);
  });

  test("connects output when neighbor has input at our output location", () => {
    const main = new MockBuilding(5, 5, "north", {
      hasInput: false,
      hasOutput: true,
      outputSide: "front",
    });
    const neighbor = new MockBuilding(5, 4, "south", {
      hasInput: true,
      hasOutput: false,
      inputSide: "front",
    });

    main.getOutputPosition = () => ({ x: 5, y: 4 });
    neighbor.getInputPosition = () => ({ x: 5, y: 5 });

    world.buildings.set("5,4", neighbor);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isOutputConnected).toBe(true);
  });

  test("handles buildings with no IO", () => {
    const main = new MockBuilding(5, 5, "north", {
      hasInput: false,
      hasOutput: false,
    });
    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(false);
    expect(main.isOutputConnected).toBe(false);
  });
});
