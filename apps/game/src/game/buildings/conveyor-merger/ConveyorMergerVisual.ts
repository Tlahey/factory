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
    // Custom handling because merger has 3 inputs
    this.ioArrows = new THREE.Group();
    this.ioArrows.name = "io_arrows";

    // We'll create arrows manually using a similar style to IOArrowHelper
    // BUT actually, let's try to reuse the helper for the main one and add others.
    // Instead of complex logic, I'll just use the standard IO arrows for Front/Back
    // and manual ones for Left/Right.

    // Actually, I'll just use the helper and it will take 'back' as input and 'front' as output.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const standardArrows = createIOArrows(merger as any);
    this.ioArrows.add(standardArrows);

    // Add manual arrows for Left/Right
    this.addManualArrow(this.ioArrows, "left", true);
    this.addManualArrow(this.ioArrows, "right", true);

    this.mesh.add(this.ioArrows);

    // --- Item Representation ---
    this.itemMesh = createItemRockModel();
    this.itemMesh.visible = false;
    this.itemMesh.scale.set(0.6, 0.6, 0.6);
    this.mesh.add(this.itemMesh);
  }

  private addManualArrow(
    group: THREE.Group,
    side: "left" | "right",
    isIn: boolean,
  ) {
    // This is a simplification. For now let's just use the helper's createIOArrows if possible?
    // No, I'll just create simple colored planes for now to ensure they are visible.
    const arrowGeom = new THREE.PlaneGeometry(0.3, 0.3);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: isIn ? 0x00ff88 : 0xff4444,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);

    const dist = 0.7;
    if (side === "left") {
      arrow.position.set(-dist, 0.3, 0);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = Math.PI / 2;
    } else {
      arrow.position.set(dist, 0.3, 0);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = -Math.PI / 2;
    }

    group.add(arrow);
  }

  public update(_delta: number, merger: ConveyorMerger): void {
    // Update IO arrows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateIOArrows(this.ioArrows, merger as any);

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
