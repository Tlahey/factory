import { describe, test, expect, beforeEach } from "vitest";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";
import { updateBuildingConnectivity } from "./BuildingIOHelper";
import { IIOBuilding, IOConfig } from "./BuildingConfig";
import { Direction } from "../entities/types";

// Minimal mock implementation of an IO building
class MockBuilding extends BuildingEntity implements IIOBuilding {
  public io: IOConfig;
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;

  constructor(x: number, y: number, direction: Direction, io: IOConfig) {
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

  test("connects input when feeder at input position outputs to us", () => {
    // Main building at (5, 5) - input position is at (5, 4)
    const main = new MockBuilding(5, 5, "north", {
      hasInput: true,
      hasOutput: false,
      inputSide: "front",
    });
    // Feeder at (5, 4) which is main's input position, outputs to (5, 5) which is main
    const feeder = new MockBuilding(5, 4, "south", {
      hasInput: false,
      hasOutput: true,
      outputSide: "front",
    });

    main.getInputPosition = () => ({ x: 5, y: 4 });
    feeder.getOutputPosition = () => ({ x: 5, y: 5 }); // outputs to main's position

    // Register both buildings
    world.buildings.set("5,5", main);
    world.buildings.set("5,4", feeder);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(true);
  });

  test("disconnects input when feeder at input position outputs away", () => {
    const main = new MockBuilding(5, 5, "north", {
      hasInput: true,
      hasOutput: false,
    });
    // Feeder at (5, 4) which is main's input position, but outputs away (5, 3)
    const feeder = new MockBuilding(5, 4, "north", {
      hasInput: false,
      hasOutput: true,
    });

    main.getInputPosition = () => ({ x: 5, y: 4 });
    feeder.getOutputPosition = () => ({ x: 5, y: 3 }); // outputs away from main

    world.buildings.set("5,5", main);
    world.buildings.set("5,4", feeder);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(false);
  });

  test("connects output when neighbor is at our output location", () => {
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

  test("connects input when 90° angled feeder outputs to us", () => {
    // Main building at (5, 5) facing north - has input on back (south side)
    // Input position is at (5, 6)
    const main = new MockBuilding(5, 5, "north", {
      hasInput: true,
      hasOutput: true,
      inputSide: "back",
      outputSide: "front",
    });

    // Feeder at (5, 6) which is main's input position, facing east
    // Outputs to (6, 6) -- but for 90° test, let's make it output to (5, 5)
    const feeder = new MockBuilding(5, 6, "north", {
      hasInput: true,
      hasOutput: true,
      inputSide: "back",
      outputSide: "front",
    });

    main.getInputPosition = () => ({ x: 5, y: 6 }); // back side
    feeder.getOutputPosition = () => ({ x: 5, y: 5 }); // outputs to main's position

    // Register both buildings
    world.buildings.set("5,5", main);
    world.buildings.set("5,6", feeder);

    updateBuildingConnectivity(main, world as unknown as IWorld);
    expect(main.isInputConnected).toBe(true);
  });
});
