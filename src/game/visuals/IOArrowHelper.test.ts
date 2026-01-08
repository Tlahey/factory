/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi } from "vitest";
// import * as THREE from 'three';
import { createIOArrows, updateIOArrows } from "./IOArrowHelper";
import { Extractor } from "../buildings/extractor/Extractor";
import { Chest } from "../buildings/chest/Chest";
import { IIOBuilding } from "../buildings/BuildingConfig";
import { BuildingEntity } from "../entities/BuildingEntity";

// Mock THREE to avoid canvas/webgl issues in node environment
vi.mock("three", async () => {
  const actual = (await vi.importActual("three")) as any;
  return {
    ...actual,
    Group: class {
      children: any[] = [];
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
      add(obj: any) {
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
    expect(arrow.name).toBe("output_arrow");

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
    const chest = new Chest(0, 0, "north");
    const group = createIOArrows(chest as BuildingEntity & IIOBuilding);

    expect(group.children.length).toBe(2);

    const inputArrow = group.getObjectByName("input_arrow");
    const outputArrow = group.getObjectByName("output_arrow");

    expect(inputArrow).toBeDefined();
    expect(outputArrow).toBeDefined();

    // Input on front (North relative)
    expect(inputArrow!.position.z).toBeLessThan(0);

    // Output on back (South relative)
    expect(outputArrow!.position.z).toBeGreaterThan(0);
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
    const arrowEast = groupEast.children[0];

    // Positions should be identical because the helper now ignores building direction
    // and assumes parent mesh rotation handles the rest
    expect(arrowNorth.position.x).toBe(arrowEast.position.x);
    expect(arrowNorth.position.z).toBe(arrowEast.position.z);
    expect(arrowNorth.rotation.y).toBe(arrowEast.rotation.y);
  });

  test("Arrow visibility follows connectivity", () => {
    const extractor = new Extractor(0, 0, "north");
    const group = createIOArrows(extractor as any);
    const arrow = group.getObjectByName("output_arrow") as any;

    // Default: visible
    expect(arrow.visible).toBe(true);

    // Connected: hidden
    (extractor as any).isOutputConnected = true;
    updateIOArrows(group, extractor as any);
    expect(arrow.visible).toBe(false);

    // Disconnected: visible
    (extractor as any).isOutputConnected = false;
    updateIOArrows(group, extractor as any);
    expect(arrow.visible).toBe(true);
  });
});
