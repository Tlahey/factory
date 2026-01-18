import { describe, test, expect, vi, beforeEach } from "vitest";
import { PlacementVisuals } from "./PlacementVisuals";
import * as THREE from "three";

// Mock THREE
vi.mock("three", async () => {
  const actual = (await vi.importActual("three")) as any;
  return {
    ...actual,
    Group: class {
      children: any[] = [];
      name: string = "";
      visible: boolean = true;
      position = { set: vi.fn() };
      rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
      scale = { set: vi.fn() };
      add(obj: any) {
        this.children.push(obj);
        obj.parent = this;
      }
      remove(obj: any) {
        this.children = this.children.filter((c) => c !== obj);
      }
      traverse(callback: (obj: any) => void) {
        callback(this);
        this.children.forEach((c) => {
          if (c.traverse) c.traverse(callback);
          else callback(c);
        });
      }
      getObjectByName(name: string) {
        return this.children.find((c) => c.name === name);
      }
    },
    Mesh: class {
      children: any[] = [];
      name: string = "";
      visible: boolean = true;
      material: any;
      geometry: any;
      position = { set: vi.fn() };
      rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
      scale = { set: vi.fn() };
      constructor(geo?: any, mat?: any) {
        this.geometry = geo;
        this.material = mat;
      }
      add(obj: any) {
        this.children.push(obj);
        obj.parent = this;
      }
      remove(obj: any) {
        this.children = this.children.filter((c) => c !== obj);
      }
      getObjectByName(name: string): any {
        if (this.name === name) return this;
        return this.children.find((c) => c.name === name);
      }
      traverse(callback: (obj: any) => void) {
        callback(this);
        this.children.forEach((c) => {
          if (c.traverse) c.traverse(callback);
          else callback(c);
        });
      }
    },
    MeshStandardMaterial: class {
      color = { setHex: vi.fn() };
      side: number;
      constructor(params: any) {
        this.side = params.side;
        // Don't overwrite color with param if it's just a number/hex, keep the mock object
        // Actual Three.js material color is a Color object
        this.color = { setHex: vi.fn() };
        if (params.color) {
          // In real three.js, this would set the color value. Here we just keep the mock.
        }
        Object.assign(this, params);
        // Ensure color is reset to the mock object if Object.assign overwrote it with a number
        if (typeof this.color === "number") {
          this.color = { setHex: vi.fn() };
        }
      }
      dispose() {}
    },
    LineBasicMaterial: class {
      color = { setHex: vi.fn() };
      constructor(params: any) {
        Object.assign(this, params);
        // Fix: Restore mock color object if overwritten
        if (typeof this.color === "number") {
          this.color = { setHex: vi.fn() };
        }
      }
    },
    LineSegments: class {
      visible: boolean = true;
      position = { set: vi.fn() };
      rotation = { y: 0 };
      scale = { set: vi.fn() };
      material: any = { color: { setHex: vi.fn() } };
      constructor(_geo: any, mat: any) {
        this.material = mat;
      }
    },
    Scene: class {
      add = vi.fn();
      remove = vi.fn();
    },
    DoubleSide: 2,
    FrontSide: 0,
    BackSide: 1,
  };
});

describe("PlacementVisuals", () => {
  let scene: any;
  let visuals: PlacementVisuals;

  beforeEach(() => {
    scene = new (THREE.Scene as any)();
    visuals = new PlacementVisuals(scene);
  });

  test("Initial state should have invisible cursor", () => {
    // Access private property logic for testing or check scene.add calls
    expect(scene.add).toHaveBeenCalled(); // Cursor added
    const cursor = (visuals as any).cursorMesh;
    expect(cursor.visible).toBe(false);
  });

  test("update with x < 0 should hide everything", () => {
    visuals.update(-1, -1);
    const cursor = (visuals as any).cursorMesh;
    expect(cursor.visible).toBe(false);
  });

  test("update with valid coordinates should show cursor", () => {
    visuals.update(10, 10);
    const cursor = (visuals as any).cursorMesh;
    expect(cursor.visible).toBe(true);
    expect(cursor.position.set).toHaveBeenCalledWith(10, 0.5, 10);
  });

  test("update with ghostType should create ghost mesh", () => {
    visuals.update(5, 5, true, "furnace", "north");
    const ghost = (visuals as any).ghostMesh;
    expect(ghost).toBeDefined();
    expect(scene.add).toHaveBeenCalledWith(ghost);
    expect(ghost.visible).toBe(true);
  });

  test("Ghost material should use FrontSide (Fix for 'bar' effect)", () => {
    visuals.update(5, 5, true, "furnace", "north");
    const ghost = (visuals as any).ghostMesh;

    // Simulate traversal finding a child mesh
    let materialSide;
    ghost.traverse((child: any) => {
      if (child.material) {
        materialSide = child.material.side;
      }
    });

    expect(materialSide).toBe(THREE.FrontSide);
    expect(materialSide).not.toBe(THREE.DoubleSide);
  });

  test("Reappearing ghost should set visible = true after being hidden", () => {
    // 1. Create ghost
    visuals.update(5, 5, true, "furnace", "north");
    const ghost = (visuals as any).ghostMesh;
    expect(ghost.visible).toBe(true);

    // 2. Hide by moving off-grid
    visuals.update(-1, -1);
    expect(ghost.visible).toBe(false);

    // 3. Move back on-grid (same type)
    visuals.update(5, 6, true, "furnace", "north");
    expect(ghost.visible).toBe(true); // This confirms the fix
  });

  test("Different ghost type should recreate mesh", () => {
    visuals.update(5, 5, true, "furnace", "north");
    const ghost1 = (visuals as any).ghostMesh;

    visuals.update(5, 5, true, "extractor", "north");
    const ghost2 = (visuals as any).ghostMesh;

    expect(ghost1).not.toBe(ghost2);
    expect(scene.remove).toHaveBeenCalledWith(ghost1);
    expect(scene.add).toHaveBeenCalledWith(ghost2);
  });
});
