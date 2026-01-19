import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { ConveyorSplitter } from "./ConveyorSplitter";
import { createItemRockModel } from "../../environment/rock/RockModel";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";
import { createConveyorSplitterModel } from "./ConveyorSplitterModel";

export class ConveyorSplitterVisual implements VisualEntity {
  public mesh: THREE.Group;
  private itemMesh: THREE.Group;
  private ioArrows: THREE.Group;

  constructor(splitter: ConveyorSplitter) {
    this.mesh = createConveyorSplitterModel();
    this.mesh.name = "conveyor_splitter";

    // --- IO Arrows ---
    this.ioArrows = createIOArrows(splitter);
    this.mesh.add(this.ioArrows);

    // --- Item Representation ---
    this.itemMesh = createItemRockModel();
    this.itemMesh.visible = false;
    this.itemMesh.scale.set(0.6, 0.6, 0.6);
    this.mesh.add(this.itemMesh);
  }

  public update(_delta: number, splitter: ConveyorSplitter): void {
    // Update IO arrows
    updateIOArrows(this.ioArrows, splitter);

    // Item Representation is removed as items are processed instantly inside the splitter
    // (User Request: "tout doit se passer à l'intérieur")
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
            mat.emissive.setHex(0x00aaff);
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
