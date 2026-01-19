import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { Conveyor } from "./Conveyor";
import { createConveyorTexture } from "./ConveyorTexture";
import { createConveyorModel } from "./ConveyorGeometry";
import {
  createItemModel,
  updateItemVisuals,
} from "@/game/environment/ResourceRegistryHelper";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";
import type { IIOBuilding } from "../../buildings/BuildingConfig";
import { disposeObject3D } from "../../visuals/DisposeUtils";

export class ConveyorVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private beltMaterial: THREE.MeshLambertMaterial | null = null;
  private itemContainer: THREE.Group; // Wrapper for Transform/Scale correction
  public type: "straight" | "left" | "right";
  private lastResolved: boolean;
  private itemMesh: THREE.Group | null = null;
  private lastItemId: number | null = null;
  private lastItemType: string | null = null;
  private lastDirection: string;
  private ioArrows: THREE.Group;

  constructor(conveyor: Conveyor) {
    this.type = conveyor.visualType;
    this.lastResolved = conveyor.isResolved;
    this.lastDirection = conveyor.direction;
    // ... rest of constructor unchanged

    const texture = createConveyorTexture();
    this.mesh = createConveyorModel(this.type, texture);
    this.mesh.name = "conveyor";

    // Setup Belt Material - always animated
    const belt = this.mesh.getObjectByName("belt");
    if (belt && belt instanceof THREE.Mesh) {
      this.beltMaterial = belt.material as THREE.MeshLambertMaterial;
    }

    // Setup Item Container (Mesh will be added dynamically)
    this.itemContainer = new THREE.Group();
    this.mesh.add(this.itemContainer);

    // Counter-scale for Right turns to preserve shapes (Parent is Scale X=-1)
    if (this.type === "right") {
      this.itemContainer.scale.set(-1, 1, 1);
    } else {
      this.itemContainer.scale.set(1, 1, 1);
    }

    // Create IO arrows for direction indication
    this.ioArrows = createIOArrows(
      conveyor as unknown as Conveyor & IIOBuilding,
    );
    this.mesh.add(this.ioArrows);

    // Initial Rotation/Scale based on props
    this.setOrientation(this.type, conveyor.direction);
  }

  private setOrientation(type: "straight" | "left" | "right", outDir: string) {
    const getRot = (dir: string) => {
      switch (dir) {
        case "north":
          return 0;
        case "west":
          return Math.PI / 2;
        case "south":
          return Math.PI;
        case "east":
          return -Math.PI / 2;
        default:
          return 0;
      }
    };

    let rot = getRot(outDir);
    if (type === "left") rot -= Math.PI / 2;
    else if (type === "right") {
      this.mesh.scale.set(-1, 1, 1);
      rot += Math.PI / 2;
    }
    this.mesh.rotation.y = rot;
  }

  /**
   * Update the resolved status - visual feedback only (color tint), animation always runs
   */
  public setResolved(isResolved: boolean): void {
    // Animation now always runs. We could add visual feedback here (e.g., color tint)
    // but belt always moves to show direction.
    const belt = this.mesh.getObjectByName("belt");
    if (belt && belt instanceof THREE.Mesh && this.beltMaterial) {
      // Optionally tint unresolved belts slightly darker
      if (isResolved) {
        this.beltMaterial.color.setHex(0xffffff); // Normal
      } else {
        this.beltMaterial.color.setHex(0xcccccc); // Slightly darker when unresolved
      }
    }
  }

  public update(delta: number, conveyor: Conveyor): void {
    // 1. Check for State Changes
    if (
      conveyor.visualType !== this.type ||
      conveyor.direction !== this.lastDirection
    ) {
      if (conveyor.visualType !== this.type) {
        this.updateType(conveyor.visualType, conveyor.direction);
      } else {
        // Just direction changed, re-orient without rebuilding
        this.setOrientation(this.type, conveyor.direction);
      }
      this.lastDirection = conveyor.direction;
    }

    if (conveyor.isResolved !== this.lastResolved) {
      this.setResolved(conveyor.isResolved);
      this.lastResolved = conveyor.isResolved;
    }

    // Update IO arrows visibility based on connections
    updateIOArrows(
      this.ioArrows,
      conveyor as unknown as Conveyor & IIOBuilding,
    );

    // 2. Animate Belt
    if (this.beltMaterial && this.beltMaterial.map) {
      this.beltMaterial.map.offset.y -= delta * 0.5;
    }

    // 3. Update Item
    if (conveyor.currentItem) {
      // If item type changed, swap the mesh
      if (this.lastItemType !== conveyor.currentItem) {
        if (this.itemMesh) {
          this.itemContainer.remove(this.itemMesh);
          // MEMORY LEAK FIX: Dispose old mesh geometry and materials
          disposeObject3D(this.itemMesh);
        }
        this.itemMesh = createItemModel(conveyor.currentItem);
        if (this.itemMesh) {
          this.itemContainer.add(this.itemMesh);
          this.itemMesh.visible = true;
        }
        this.lastItemType = conveyor.currentItem;
        this.lastItemId = null; // Force visual update for the new mesh
      }

      if (this.itemMesh && this.lastItemId !== conveyor.itemId) {
        updateItemVisuals(
          conveyor.currentItem,
          this.itemMesh,
          conveyor.itemId || 0,
        );
        this.lastItemId = conveyor.itemId;
      }

      // Position item based on progress
      const progress = conveyor.transportProgress;

      if (this.type === "straight") {
        this.itemContainer.position.set(0, 0.2, 0.5 - progress);
        this.itemContainer.rotation.y = 0;
      } else {
        // Curve Logic (Left Turn Basis)
        const angle = (-Math.PI / 2) * progress; // 0 to -90
        const radius = 0.5;
        const cx = -0.5;
        const cz = 0.5;

        const x = cx + radius * Math.cos(angle);
        const z = cz + radius * Math.sin(angle);

        this.itemContainer.position.set(x, 0.2, z);

        // Rotation Logic
        if (this.type === "right") {
          // Right Turn: Needs to turn South(0) -> East(-90).
          // Scale(-1) * Rot(t) * Scale(-1) = Rot(-t).
          // We want Global -90. So -t = -90 => t = 90.
          // angle goes 0 -> -90. So t = -angle.
          this.itemContainer.rotation.y = -angle;
        } else {
          // Left Turn: Needs to turn South(0) -> West(+90).
          // Global +90. No scale. t = 90.
          // t = -angle.
          this.itemContainer.rotation.y = -angle;
        }
      }
    } else {
      if (this.itemMesh) {
        this.itemMesh.visible = false;
      }
      this.lastItemType = null;
      this.lastItemId = null;
    }
  }

  /**
   * Check if visual needs to be rebuilt due to type change
   */
  public updateType(
    newType: "straight" | "left" | "right",
    outDir: string,
  ): void {
    console.log(
      `Conveyor type changed from ${this.type} to ${newType}, rebuilding mesh`,
    );
    this.type = newType;
    this.lastDirection = outDir;

    // Store current position and rotation
    const pos = this.mesh.position.clone();

    const parent = this.mesh.parent;
    if (parent) {
      parent.remove(this.mesh);
    }

    // MEMORY LEAK FIX: Dispose old mesh before creating new one
    disposeObject3D(this.mesh);

    // Create new mesh with new type
    const texture = createConveyorTexture();
    this.mesh = createConveyorModel(newType, texture);
    this.mesh.name = "conveyor";
    this.mesh.position.copy(pos);
    // Rotation needs to be recalculated based on dir, not just copied,
    // because 'straight' and 'left' meshes have different base orientations relative to pivot?
    // Actually `setOrientation` handles it.

    // Re-setup belt material
    const belt = this.mesh.getObjectByName("belt");
    if (belt && belt instanceof THREE.Mesh) {
      if (this.lastResolved) {
        this.beltMaterial = belt.material as THREE.MeshLambertMaterial;
      } else {
        belt.material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        this.beltMaterial = null;
      }
    }

    // Re-setup item container
    this.itemContainer = new THREE.Group();
    this.mesh.add(this.itemContainer);
    if (this.itemMesh) {
      this.itemContainer.add(this.itemMesh);
    }

    // Counter-scale for Right turns
    if (newType === "right") {
      this.itemContainer.scale.set(-1, 1, 1);
    } else {
      this.itemContainer.scale.set(1, 1, 1);
    }

    this.setOrientation(newType, outDir);

    // Add new mesh to scene
    if (parent) {
      parent.add(this.mesh);
    }
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshLambertMaterial;
        if (!mat || !mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0xff0000);
          mat.emissiveIntensity = 0.5;
        } else {
          if (child.userData.originalEmissive) {
            mat.emissive.copy(child.userData.originalEmissive);
            mat.emissiveIntensity = 0;
          }
        }
      }
    });
  }

  public dispose(): void {
    // Dispose main mesh and all children
    disposeObject3D(this.mesh);

    // Dispose item mesh if exists
    if (this.itemMesh) {
      disposeObject3D(this.itemMesh);
    }

    // Dispose IO arrows
    if (this.ioArrows) {
      disposeObject3D(this.ioArrows);
    }
  }
}
