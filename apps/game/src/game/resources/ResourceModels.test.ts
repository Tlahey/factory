import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { initializeResources } from "./ResourceInitialization";
import { resourceRegistry } from "./ResourceRegistry";
import { GameResource } from "./GameResource";
import { createOreModel } from "./models/OreModel";
import { createIngotModel } from "./models/IngotModel";
import { createWoodItemModel } from "./wood/WoodModel";
import { createStoneItemModel } from "./stone/StoneModel";

/**
 * ITEM MODEL CONTRACTS
 *
 * Item models are rebuilt every time a belt picks something up and re-posed
 * every frame, so the two things that can quietly break them are size drift
 * (an item that outgrows the belt overlaps its neighbours) and per-frame
 * allocation in `updateVisuals`.
 *
 * The budgets below are the sizes the models shipped with; they are asserted,
 * not derived, so a redesign is free to change the shape but has to keep the
 * item reading at the same scale on the belt.
 *
 * Sizes are `Box3.setFromObject` boxes, which expand under rotation (the box
 * is the transformed corners of the geometry box, not the transformed
 * vertices) — that is why the budgets sit above the authored dimensions.
 */

/** How many item ids to sweep. Item ids grow without bound in a real save. */
const SEEDS = 200;

interface ItemCase {
  id: string;
  /** Largest box the model may reach, on any seed. */
  budget: [number, number, number];
  /** Smallest the largest axis may get: guards against a model collapsing. */
  minExtent: number;
  /** How far the model may dip under the belt surface. */
  maxDip: number;
}

const ITEMS: ItemCase[] = [
  { id: "iron_ore", budget: [0.4, 0.4, 0.4], minExtent: 0.2, maxDip: 0.2 },
  { id: "copper_ore", budget: [0.4, 0.4, 0.4], minExtent: 0.2, maxDip: 0.2 },
  { id: "gold_ore", budget: [0.4, 0.4, 0.4], minExtent: 0.2, maxDip: 0.2 },
  { id: "iron_ingot", budget: [0.43, 0.12, 0.43], minExtent: 0.37, maxDip: 0 },
  {
    id: "copper_ingot",
    budget: [0.43, 0.12, 0.43],
    minExtent: 0.37,
    maxDip: 0,
  },
  { id: "gold_ingot", budget: [0.43, 0.12, 0.43], minExtent: 0.37, maxDip: 0 },
  { id: "wood", budget: [0.25, 0.28, 0.34], minExtent: 0.18, maxDip: 0.06 },
  { id: "stone", budget: [0.6, 0.45, 0.6], minExtent: 0.3, maxDip: 0.15 },
];

function boundsAt(resource: GameResource, model: THREE.Group, seed: number) {
  resource.updateVisuals(model, seed);
  model.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(model);
}

function meshesOf(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  return meshes;
}

function materialsOf(object: THREE.Object3D): THREE.Material[] {
  return meshesOf(object).flatMap((mesh) =>
    Array.isArray(mesh.material) ? mesh.material : [mesh.material],
  );
}

beforeAll(() => {
  initializeResources();
});

describe.each(ITEMS)("$id model", ({ id, budget, minExtent, maxDip }) => {
  const resource = () => resourceRegistry.get(id)!;

  it("stays inside its belt-item budget on every seed", () => {
    const item = resource();
    const model = item.createModel();
    const size = new THREE.Vector3();

    for (let seed = 0; seed < SEEDS; seed++) {
      boundsAt(item, model, seed).getSize(size);

      expect(size.x).toBeLessThanOrEqual(budget[0]);
      expect(size.y).toBeLessThanOrEqual(budget[1]);
      expect(size.z).toBeLessThanOrEqual(budget[2]);
      expect(Math.max(size.x, size.y, size.z)).toBeGreaterThanOrEqual(
        minExtent,
      );
    }
  });

  it("rests on the belt rather than sinking through it", () => {
    const item = resource();
    const model = item.createModel();

    for (let seed = 0; seed < SEEDS; seed++) {
      expect(boundsAt(item, model, seed).min.y).toBeGreaterThanOrEqual(-maxDip);
    }
  });

  it("poses deterministically from the item id", () => {
    // `updateVisuals` runs every frame; a pose that drifted would make items
    // twitch their whole way down the belt.
    const item = resource();
    const model = item.createModel();

    const first = boundsAt(item, model, 42).clone();
    boundsAt(item, model, 7);
    const again = boundsAt(item, model, 42);

    expect(again.min.toArray()).toEqual(first.min.toArray());
    expect(again.max.toArray()).toEqual(first.max.toArray());
  });

  it("never grows the scene graph while posing", () => {
    // Every belt with an item on it calls this each frame: allocating a mesh
    // here would leak one per frame per belt.
    const item = resource();
    const model = item.createModel();
    const before = meshesOf(model).length;

    for (let seed = 0; seed < 10; seed++) item.updateVisuals(model, seed);

    expect(meshesOf(model).length).toBe(before);
    expect(before).toBeGreaterThan(0);
  });

  it("uses PBR materials throughout", () => {
    // MeshLambertMaterial ignores metalness/roughness and the scene env map, so
    // a Lambert item next to a standard building reads as a different game.
    for (const material of materialsOf(resource().createModel())) {
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    }
  });
});

describe("ore chunk", () => {
  it("exposes the node the pose is applied to", () => {
    expect(createOreModel(0xb87333).getObjectByName("ore_mesh")).toBeDefined();
  });

  it.each([0x555555, 0xb87333, 0xffd700])(
    "contrasts its veins against the host rock (%h)",
    (color) => {
      // The chunk is mostly matrix; without a brighter vein the three ores are
      // three identical grey lumps at belt scale — and iron ore, defined as a
      // very dark grey, is the case that breaks first.
      const [matrix, vein] = materialsOf(
        createOreModel(color),
      ) as THREE.MeshStandardMaterial[];

      // sRGB: the space the colours were authored in.
      const matrixHsl = matrix.color.getHSL(
        { h: 0, s: 0, l: 0 },
        THREE.SRGBColorSpace,
      );
      const veinHsl = vein.color.getHSL(
        { h: 0, s: 0, l: 0 },
        THREE.SRGBColorSpace,
      );

      expect(veinHsl.l).toBeGreaterThan(matrixHsl.l + 0.1);
      // Bright, but not blown out to white — the hue is the resource's identity.
      expect(veinHsl.l).toBeLessThan(0.8);
      // The vein is the metal itself; the matrix is rock.
      expect(vein.metalness).toBeGreaterThan(matrix.metalness);
    },
  );
});

describe("ingot", () => {
  it("keeps the authored bar dimensions", () => {
    const model = createIngotModel(0xc0c0c0);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());

    // 0.5 x 0.15 x 0.25 authored, shrunk by the group's 0.75 scale.
    expect(size.x).toBeCloseTo(0.375, 3);
    expect(size.y).toBeCloseTo(0.1125, 3);
    expect(size.z).toBeCloseTo(0.1875, 3);
    expect(bounds.min.y).toBeCloseTo(0, 5);
  });

  it("drafts every side so the bar is wider at its base than at its top", () => {
    const body = meshesOf(createIngotModel(0xc0c0c0))[0];
    const positions = body.geometry.getAttribute("position");
    const bounds = body.geometry.boundingBox!;

    let bottomHalfWidth = 0;
    let topHalfWidth = 0;
    let bottomHalfDepth = 0;
    let topHalfDepth = 0;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const isTop = y > bounds.max.y - 1e-4;
      const isBottom = y < bounds.min.y + 1e-4;
      if (isBottom) {
        bottomHalfWidth = Math.max(
          bottomHalfWidth,
          Math.abs(positions.getX(i)),
        );
        bottomHalfDepth = Math.max(
          bottomHalfDepth,
          Math.abs(positions.getZ(i)),
        );
      } else if (isTop) {
        topHalfWidth = Math.max(topHalfWidth, Math.abs(positions.getX(i)));
        topHalfDepth = Math.max(topHalfDepth, Math.abs(positions.getZ(i)));
      }
    }

    expect(topHalfWidth).toBeLessThan(bottomHalfWidth);
    expect(topHalfDepth).toBeLessThan(bottomHalfDepth);
  });
});

describe("log bundle", () => {
  it("caps each log with end grain instead of bark", () => {
    // CylinderGeometry emits [side, top cap, bottom cap]; the caps are what
    // makes a log read as cut timber rather than as a brown tube.
    for (const log of meshesOf(createWoodItemModel())) {
      const materials = log.material as THREE.MeshStandardMaterial[];

      expect(materials).toHaveLength(3);
      expect(materials[1]).toBe(materials[2]);
      expect(materials[1].color.getHex()).not.toBe(materials[0].color.getHex());
    }
  });

  it("rests the bottom row on the belt and never floats a log", () => {
    const item = resourceRegistry.get("wood")!;
    const model = item.createModel();

    for (let seed = 0; seed < SEEDS; seed++) {
      item.updateVisuals(model, seed);
      const heights = model.children
        .filter((log) => log.visible)
        .map((log) => log.position.y);
      const ground = Math.min(...heights);

      // At least two logs on the ground row...
      expect(heights.filter((y) => y === ground).length).toBeGreaterThanOrEqual(
        2,
      );
      // ...and nothing perched more than one row above them.
      expect(Math.max(...heights)).toBeLessThan(ground * 3);
    }
  });
});

describe("stone pile", () => {
  it("builds without a 2D canvas", () => {
    // The old model baked a 256x256 canvas texture per item, which allocated a
    // canvas on every belt pickup and made the model unbuildable in tests.
    const model = createStoneItemModel();

    for (const material of materialsOf(model) as THREE.MeshStandardMaterial[]) {
      expect(material.map).toBeNull();
    }
  });

  it("shows at least three chunks so the pile never reads as one rock", () => {
    const item = resourceRegistry.get("stone")!;
    const model = item.createModel();

    for (let seed = 0; seed < SEEDS; seed++) {
      item.updateVisuals(model, seed);
      const visible = model.children.filter((chunk) => chunk.visible);

      expect(visible.length).toBeGreaterThanOrEqual(3);
    }
  });
});
