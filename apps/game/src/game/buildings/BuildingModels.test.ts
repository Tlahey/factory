import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createChestModel } from "./chest/ChestModel";
import { createExtractorModel } from "./extractor/ExtractorModel";
import { createFurnaceModel } from "./furnace/FurnaceModel";
import { createHubModel } from "./hub/HubModel";
import {
  createSawmillModel,
  getSawBlade,
  getSawHead,
} from "./sawmill/SawmillModel";
import { createSolarPanelModel } from "./solar-panel/SolarPanelModel";

/**
 * MODEL CONTRACTS
 *
 * Building models are consumed by three things that can't tell you they broke:
 * the view layer (which looks parts up by name and animates them), the grid
 * (which assumes a model stays inside its own tiles), and the shadow pass.
 *
 * These tests lock those three contracts down. They deliberately assert on
 * *structure*, not on the artistic choices — a model can be redesigned freely
 * as long as it keeps its named parts, its footprint and its shadows.
 */

interface ModelCase {
  name: string;
  create: () => THREE.Object3D;
  /** Footprint in tiles, from the building's config. */
  width: number;
  height: number;
  /** Node names the view layer looks up. */
  requiredNodes: string[];
}

const MODELS: ModelCase[] = [
  {
    name: "chest",
    create: createChestModel,
    width: 1,
    height: 1,
    requiredNodes: [],
  },
  {
    name: "extractor",
    create: createExtractorModel,
    width: 1,
    height: 1,
    requiredNodes: ["drill_container", "drill_mesh"],
  },
  {
    name: "furnace",
    create: createFurnaceModel,
    width: 1,
    height: 2,
    requiredNodes: ["core_mesh", "hammer_pivot", "status_light"],
  },
  {
    name: "hub",
    create: createHubModel,
    width: 2,
    height: 2,
    requiredNodes: ["hub_beacon"],
  },
  {
    name: "sawmill",
    create: createSawmillModel,
    width: 1,
    height: 1,
    requiredNodes: ["saw_head", "saw_blade"],
  },
  {
    name: "solar_panel",
    create: () => createSolarPanelModel(),
    width: 1,
    height: 1,
    requiredNodes: ["solar_cell", "status_light"],
  },
];

function meshesOf(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  return meshes;
}

describe.each(MODELS)(
  "$name model",
  ({ create, width, height, requiredNodes }) => {
    it("exposes every node the view layer animates", () => {
      const model = create();
      for (const nodeName of requiredNodes) {
        expect(model.getObjectByName(nodeName)).toBeDefined();
      }
    });

    it("stays inside its own footprint", () => {
      const model = create();
      const bounds = new THREE.Box3().setFromObject(model);

      // Models are authored centred on the footprint, so a W x H building
      // occupies [-W/2, W/2] x [-H/2, H/2]. Anything past that overlaps the
      // neighbouring tile, where a belt or another building may sit.
      expect(bounds.min.x).toBeGreaterThanOrEqual(-width / 2);
      expect(bounds.max.x).toBeLessThanOrEqual(width / 2);
      expect(bounds.min.z).toBeGreaterThanOrEqual(-height / 2);
      expect(bounds.max.z).toBeLessThanOrEqual(height / 2);
    });

    it("sits on the ground", () => {
      const model = create();
      const bounds = new THREE.Box3().setFromObject(model);

      // A small dip below zero is fine (drill bits, sunken decks); floating is
      // not, and neither is burying half the building.
      expect(bounds.min.y).toBeGreaterThan(-0.2);
      expect(bounds.min.y).toBeLessThan(0.1);
    });

    it("takes part in the shadow pass", () => {
      const meshes = meshesOf(create());

      expect(meshes.length).toBeGreaterThan(0);
      for (const mesh of meshes) {
        expect(mesh.castShadow).toBe(true);
        expect(mesh.receiveShadow).toBe(true);
      }
    });

    it("uses PBR materials throughout", () => {
      const meshes = meshesOf(create());

      for (const mesh of meshes) {
        const material = mesh.material as THREE.Material;
        // MeshLambertMaterial ignores metalness/roughness, so a Lambert part
        // next to a standard one reads as a different art style.
        expect(material).not.toBeInstanceOf(THREE.MeshLambertMaterial);
      }
    });
  },
);

describe("chest orientation", () => {
  it("puts the intake on the front face and the chute on the back", () => {
    // Models face north, and north is -Z: `front` is -Z, `back` is +Z
    // (see getPortLocalPosition). CHEST_CONFIG inputs on front, outputs on back.
    const model = createChestModel();
    const meshes = meshesOf(model);

    const frontDetails = meshes.filter((mesh) => mesh.position.z < -0.4);
    const backDetails = meshes.filter((mesh) => mesh.position.z > 0.4);

    expect(frontDetails.length).toBeGreaterThan(0);
    expect(backDetails.length).toBeGreaterThan(0);
  });
});

describe("furnace orientation", () => {
  it("puts the casting pool on the output half", () => {
    // FURNACE_CONFIG outputs on `front` = -Z, and FurnaceView spawns smoke at
    // `centre + front * 0.5` "above the lava pool" — so the pool has to be on
    // the -Z half or the smoke rises off the wrong end of the building.
    const core = createFurnaceModel().getObjectByName("core_mesh")!;

    expect(core.position.z).toBeLessThan(0);
  });

  it("keeps the charging tower on the input half", () => {
    const model = createFurnaceModel();
    // The tower is the tall part; find the highest mesh that isn't the hammer.
    const tallest = meshesOf(model)
      .filter((mesh) => !mesh.parent?.name.startsWith("hammer"))
      .reduce((best, mesh) =>
        mesh.position.y > best.position.y ? mesh : best,
      );

    expect(tallest.position.z).toBeGreaterThan(0);
  });

  it("rests the hammer in the pose the view idles at", () => {
    const pivot = createFurnaceModel().getObjectByName("hammer_pivot")!;

    expect(pivot.rotation.x).toBeCloseTo(-0.4, 5);
  });

  it("swings the hammer head over the pool", () => {
    const model = createFurnaceModel();
    model.updateMatrixWorld(true);
    const head = new THREE.Box3()
      .setFromObject(model.getObjectByName("hammer_pivot")!)
      .getCenter(new THREE.Vector3());

    // The head must land on the front (pool) half, not over the tower.
    expect(head.z).toBeLessThan(0);
  });

  it("drives the core glow through emissive intensity", () => {
    const core = createFurnaceModel().getObjectByName(
      "core_mesh",
    ) as THREE.Mesh;
    const material = core.material as THREE.MeshStandardMaterial;

    // FurnaceView writes material.emissiveIntensity every frame.
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
  });

  it("keeps the status light readable by colour", () => {
    const light = createFurnaceModel().getObjectByName(
      "status_light",
    ) as THREE.Mesh;

    // FurnaceView compares and sets material.color.getHex().
    expect(light.material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });
});

describe("sawmill carriage", () => {
  it("resolves the parts the view animates", () => {
    const model = createSawmillModel();

    expect(getSawHead(model)).toBeDefined();
    expect(getSawBlade(model)).toBeDefined();
  });

  it("keeps the blade inside the tile across the carriage's full travel", () => {
    // SawmillView drives head.position.x = sin(t) * 0.25.
    const model = createSawmillModel();
    const head = getSawHead(model)!;

    for (const x of [-0.25, 0, 0.25]) {
      head.position.x = x;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);

      expect(bounds.min.x).toBeGreaterThanOrEqual(-0.5);
      expect(bounds.max.x).toBeLessThanOrEqual(0.5);
    }
  });

  it("hangs the blade below the carriage, above the deck", () => {
    const model = createSawmillModel();
    // From the root: Box3 only refreshes the object's own matrix, so querying a
    // nested node without updating its ancestors reads a stale world matrix.
    model.updateMatrixWorld(true);
    const bladeY = new THREE.Box3()
      .setFromObject(getSawBlade(model)!)
      .getCenter(new THREE.Vector3()).y;

    expect(bladeY).toBeGreaterThan(0.1);
    expect(bladeY).toBeLessThan(0.4);
  });
});

describe("extractor drill", () => {
  it("breaks ground at the bottom of its stroke and lifts clear at the top", () => {
    // ExtractorView drives container.position.y = 1.2 + sin(t) * 0.4.
    const model = createExtractorModel();
    const container = model.getObjectByName("drill_container")!;

    container.position.y = 0.8;
    model.updateMatrixWorld(true);
    const lowest = new THREE.Box3().setFromObject(container).min.y;

    container.position.y = 1.6;
    model.updateMatrixWorld(true);
    const highest = new THREE.Box3().setFromObject(container).min.y;

    // Just into the ground, where the debris particles spawn.
    expect(lowest).toBeLessThan(0.05);
    expect(lowest).toBeGreaterThan(-0.2);
    // Fully clear at the top of the stroke.
    expect(highest).toBeGreaterThan(0.5);
  });

  it("drills on the tile centre", () => {
    // The particle system spawns debris at the tile centre, so an off-axis bit
    // chews the ground somewhere the dust never appears.
    const model = createExtractorModel();
    model.updateMatrixWorld(true);
    const center = new THREE.Box3()
      .setFromObject(model.getObjectByName("drill_mesh")!)
      .getCenter(new THREE.Vector3());

    expect(center.x).toBeCloseTo(0, 1);
    expect(center.z).toBeCloseTo(0, 1);
  });
});

describe("solar panel", () => {
  it("shares one material across the cells so the view lights them together", () => {
    const model = createSolarPanelModel();
    const cells = meshesOf(model).filter((mesh) => mesh.name === "solar_cell");

    expect(cells.length).toBeGreaterThan(1);
    const first = cells[0].material;
    for (const cell of cells) {
      expect(cell.material).toBe(first);
    }
    expect(first).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it("patches every standard material with the cloud shader in world mode", () => {
    const meshes = meshesOf(createSolarPanelModel(false));
    const standard = meshes.filter(
      (mesh) => mesh.material instanceof THREE.MeshStandardMaterial,
    );

    expect(standard.length).toBeGreaterThan(0);
    for (const mesh of standard) {
      // SolarPanelView walks the model advancing uTime on patched materials;
      // an unpatched one stays lit while the rest sits under a cloud.
      expect((mesh.material as THREE.Material).onBeforeCompile).not.toBe(
        THREE.Material.prototype.onBeforeCompile,
      );
    }
  });

  it("leaves preview instances unpatched", () => {
    const meshes = meshesOf(createSolarPanelModel(true));

    for (const mesh of meshes) {
      expect((mesh.material as THREE.Material).onBeforeCompile).toBe(
        THREE.Material.prototype.onBeforeCompile,
      );
    }
  });

  it("tilts the array to 30 degrees rather than standing it up", () => {
    const model = createSolarPanelModel();
    const cell = model.getObjectByName("solar_cell")!;
    cell.updateMatrixWorld(true);

    // Face normal of the panel, in world space.
    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(cell.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const tiltFromHorizontal = THREE.MathUtils.radToDeg(
      Math.acos(Math.abs(normal.y)),
    );

    expect(tiltFromHorizontal).toBeCloseTo(30, 0);
  });
});
