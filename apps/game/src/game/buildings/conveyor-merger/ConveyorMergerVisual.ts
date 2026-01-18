import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { ConveyorMerger } from "./ConveyorMerger";
import {
  createItemRockModel,
  updateRockVisuals,
} from "../../environment/rock/RockModel";
// import { Direction } from "../../entities/types";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";
import { createConveyorMergerModel } from "./ConveyorMergerModel";

export class ConveyorMergerVisual implements VisualEntity {
  public mesh: THREE.Group;
  private itemMesh: THREE.Group;
  private lastItemId: number | null = null;
  private ioArrows: THREE.Group;

  constructor(merger: ConveyorMerger) {
    this.mesh = createConveyorMergerModel();
    this.mesh.name = "conveyor_merger";

    // --- IO Arrows ---
    this.ioArrows = createIOArrows(merger);
    this.mesh.add(this.ioArrows);

    // --- Item Representation ---
    this.itemMesh = createItemRockModel();
    this.itemMesh.visible = false;
    this.itemMesh.scale.set(0.6, 0.6, 0.6);
    this.mesh.add(this.itemMesh);
  }

  public update(_delta: number, merger: ConveyorMerger): void {
    // Update IO arrows
    updateIOArrows(this.ioArrows, merger);

    // Left/Right arrows visibility
    // For now they are always visible, but we could check connectivity if merger tracked it per side
    // merger.isInputConnected only tracks if ANY input is connected in the logic current implementation?
    // Actually updateBuildingConnectivity updates isInputConnected.

    if (merger.currentItem) {
      if (this.lastItemId !== merger.itemId) {
        updateRockVisuals(this.itemMesh, merger.itemId || 0);
        this.lastItemId = merger.itemId;
        this.itemMesh.visible = true;
      }

      const progress = merger.transportProgress;
      // Animate movement to the front.
      // Items teleported to center (0.2) then move to -0.4
      // Raise height so it's above the 0.5 body
      this.itemMesh.position.set(0, 0.6, 0.2 - progress * 0.6);
    } else {
      this.itemMesh.visible = false;
      this.lastItemId = null;
    }
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          if (active) {
            if (!child.userData.originalEmissive) {
              child.userData.originalEmissive = mat.emissive.clone();
            }
            mat.emissive.setHex(0xff0000);
            mat.emissiveIntensity = 0.5;
          } else {
            if (child.userData.originalEmissive) {
              mat.emissive.copy(child.userData.originalEmissive);
              mat.emissiveIntensity = 0.1;
            }
          }
        }
      }
    });
  }

  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
