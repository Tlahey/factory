import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { Chest } from "./Chest";
import { createChestModel } from "./ChestModel";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";

export class ChestVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private ioArrows: THREE.Group;
  private lastDirection: string;

  constructor(chest: Chest) {
    this.mesh = createChestModel();
    this.mesh.name = "chest";
    this.lastDirection = chest.direction;

    // IO Arrows
    this.ioArrows = createIOArrows(chest);
    this.mesh.add(this.ioArrows);
  }

  public update(_delta: number, entity?: Chest): void {
    if (!entity) return;

    // Update IO arrows if direction changed
    if (entity.direction !== this.lastDirection) {
      updateIOArrows(this.ioArrows, entity);
      this.lastDirection = entity.direction;
    }
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
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
    // Dispose geometry/materials if needed
  }
}
