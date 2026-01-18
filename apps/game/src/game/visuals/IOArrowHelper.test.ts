import { describe, test, expect, vi } from "vitest";
// import * as THREE from 'three';
import {
  createIOArrows,
  updateIOArrows,
  createIOArrowsFromConfig,
} from "./IOArrowHelper";
import { Extractor } from "../buildings/extractor/Extractor";
import { Chest } from "../buildings/chest/Chest";
import { Furnace } from "../buildings/furnace/Furnace";
import { IIOBuilding } from "../buildings/BuildingConfig";
import { BuildingEntity } from "../entities/BuildingEntity";

// Mock THREE to avoid canvas/webgl issues in node environment
vi.mock("three", async () => {
  const actual = (await vi.importActual("three")) as Record<string, unknown>;
  return {
    ...actual,
    Group: class {
      children: {
        name: string;
        position: { z: number; x: number };
        rotation: { y: number };
        visible: boolean;
      }[] = [];
      name: string = "";
      position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      rotation = { x: 0, y: 0, z: 0 };
      add(obj: {
        name: string;
        position: { z: number; x: number };
        rotation: { y: number };
        visible: boolean;
      }) {
        this.children.push(obj);
      }
      getObjectByName(name: string) {
        return this.children.find((c) => c.name === name);
      }
    },
    Mesh: class {
      rotation = { x: 0, y: 0, z: 0 };
      position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      name: string = "";
      visible: boolean = true;
      constructor() {}
    },
    MeshBasicMaterial: class {},
    ConeGeometry: class {},
    CylinderGeometry: class {},
    Scene: class {
      add() {}
      remove() {}
    },
    Color: class {},
  };
});

describe("IOArrowHelper", () => {
  test("Extractor has output arrow only", () => {
    // Extractor config: hasOutput=true, outputSide='front' (default)
    const extractor = new Extractor(0, 0, "north");
    const group = createIOArrows(extractor as BuildingEntity & IIOBuilding);

    expect(group).not.toBeNull();
    expect(group.children.length).toBe(1);

    const arrow = group.children[0];
    expect(arrow.name).toBe("output_arrow_front");

    // Front (North) means output arrow should point North?
    // Wait, output arrow points AWAY from building.
    // If side is front (North), arrow should be at North edge.
    // And rotation should align with North (PI).

    // With simpler logic: outputDir = 'north' (relative)
    // pos z should be negative (North)
    expect(arrow.position.z).toBeLessThan(0);
  });

  test("Chest has input and output arrows", () => {
    // Chest config: inputSide='front', outputSide='back'
    // Actually Chest defaults:
    // - Input Front (from old code comments: "inputSide: 'front'")
    // - Output Back ("outputSide: 'back'")
    // BUT we need to check ChestConfig to be sure or just assume default test logic is correct about specific sides

    // In ChestConfig.ts (not seen here but derived from assumed logic):
    // inputSide: 'front', outputSide: 'back' (from the previous test logic which passed before naming change)

    const chest = new Chest(0, 0, "north");
    const group = createIOArrows(chest as BuildingEntity & IIOBuilding);

    expect(group.children.length).toBe(2);

    const inputArrow = group.getObjectByName("input_arrow_front");
    const outputArrow = group.getObjectByName("output_arrow_back");

    expect(inputArrow).toBeDefined();
    expect(outputArrow).toBeDefined();

    // Input on front (North relative)
    expect(inputArrow!.position.z).toBeLessThan(0);

    // Output on back (South relative)
    expect(outputArrow!.position.z).toBeGreaterThan(0);
  });

  test("Furnace arrows respect dimensions (1x2)", () => {
    // Furnace: Input Back (South), Output Front (North).
    // Height = 2.
    // Center-based positioning: distance = height / 2 + margin = 1.0 + 0.2 = 1.2
    // Input (Back) -> +Z direction -> Z = 1.2
    // Output (Front) -> -Z direction -> Z = -1.2

    const furnace = new Furnace(0, 0, "north");
    // Verify dimensions (initialized in BuildingEntity constructor)
    expect(furnace.width).toBe(1);
    expect(furnace.height).toBe(2);

    const group = createIOArrows(furnace as BuildingEntity & IIOBuilding);

    // Check with new naming conventions
    const inputArrow = group.getObjectByName("input_arrow_back");
    const outputArrow = group.getObjectByName("output_arrow_front");

    expect(inputArrow).toBeDefined();
    expect(outputArrow).toBeDefined();

    // Input (Back) -> +Z approx 1.2
    expect(inputArrow!.position.z).toBeCloseTo(1.2, 1);

    // Output (Front) -> -Z approx -1.2
    expect(outputArrow!.position.z).toBeCloseTo(-1.2, 1);
  });

  test("Arrows are created relative to North regardless of building rotation", () => {
    // This confirms our fix: independent of building direction,
    // arrows generally stay in same "local" spots relative to the prefab

    const northExtractor = new Extractor(0, 0, "north");
    const groupNorth = createIOArrows(
      northExtractor as BuildingEntity & IIOBuilding,
    );
    const arrowNorth = groupNorth.children[0];

    const eastExtractor = new Extractor(0, 0, "east");
    const groupEast = createIOArrows(
      eastExtractor as BuildingEntity & IIOBuilding,
    );
    // Extractor has only output on front
    const arrowEast = groupEast.children[0];

    // Positions should be identical because the helper now ignores building direction
    // and assumes parent mesh rotation handles the rest
    expect(arrowNorth.position.x).toBe(arrowEast.position.x);
    expect(arrowNorth.position.z).toBe(arrowEast.position.z);
    expect(arrowNorth.rotation.y).toBe(arrowEast.rotation.y);
  });

  test("Arrow visibility follows connectivity", () => {
    const extractor = new Extractor(0, 0, "north");
    const group = createIOArrows(extractor as BuildingEntity & IIOBuilding);
    const arrow = group.getObjectByName("output_arrow_front") as unknown as {
      visible: boolean;
    };

    // Default: visible
    expect(arrow).toBeDefined();
    expect(arrow.visible).toBe(true);

    // Connected: hidden
    const ioExt = extractor as BuildingEntity & IIOBuilding;
    ioExt.isOutputConnected = true;
    ioExt.connectedOutputSides = ["front"];
    updateIOArrows(group, ioExt);
    expect(arrow.visible).toBe(false);

    // Disconnected: visible
    ioExt.isOutputConnected = false;
    ioExt.connectedOutputSides = [];
    updateIOArrows(group, ioExt);
    expect(arrow.visible).toBe(true);
  });

  test("createIOArrowsFromConfig works without entity", () => {
    const ioConfig = {
      hasInput: true,
      hasOutput: true,
      inputSide: "back" as const,
      outputSide: "front" as const,
      showArrow: true,
    };
    const group = createIOArrowsFromConfig(ioConfig, 1, 1);
    expect(group.children.length).toBe(2);

    const input = group.getObjectByName("input_arrow_back");
    expect(input).toBeDefined();
    // Static creation defaults to visible
    expect((input as unknown as { visible: boolean }).visible).toBe(true);
  });
});
