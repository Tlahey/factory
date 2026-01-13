import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { Furnace } from "./Furnace";
import { ParticleSystem } from "../../visuals/ParticleSystem";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";
import { createFurnaceModel } from "./FurnaceModel";

export class FurnaceVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private coreMesh: THREE.Mesh | undefined;
  private statusLight: THREE.Mesh;
  private particleSystem: ParticleSystem;
  private ioArrows: THREE.Group;

  constructor(furnace: Furnace, particleSystem: ParticleSystem) {
    // Use shared Factory
    this.mesh = createFurnaceModel();
    this.mesh.name = "furnace";

    // Find references
    this.coreMesh = this.mesh.getObjectByName("core_mesh") as THREE.Mesh;
    this.statusLight = this.mesh.getObjectByName("status_light") as THREE.Mesh;

    this.particleSystem = particleSystem;

    // 4. IO Arrows
    this.ioArrows = createIOArrows(furnace);
    this.mesh.add(this.ioArrows);
  }

  public update(delta: number, entity: Furnace): void {
    const time = performance.now() / 1000;

    // Update IO Arrows
    updateIOArrows(this.ioArrows, entity);

    // Update Status Light
    const statusMat = this.statusLight.material as THREE.MeshBasicMaterial;
    if (entity.active) {
      statusMat.color.setHex(0x00ff00);
    } else if (entity.operationStatus === "no_power") {
      statusMat.color.setHex(0xff0000);
    } else if (entity.operationStatus === "blocked") {
      statusMat.color.setHex(0xffaa00);
    } else {
      // Idle
      statusMat.color.setHex(0x888888);
    }

    // Update Core Glow & Particles
    if (this.coreMesh) {
      const mat = this.coreMesh.material as THREE.MeshStandardMaterial;
      if (entity.active) {
        // Pulse glow
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;
        mat.emissiveIntensity = 1.0 + pulse * 1.0;

        // Spawn smoke/fire particles
        if (Math.random() < 0.1) {
          this.particleSystem.spawn(entity.x, 1.2, entity.y);
        }
      } else {
        mat.emissiveIntensity = 0;
      }
    }
  }

  public setHighlight(active: boolean): void {
    // Reuse logic from ExtractorVisual or implement simple highlighting
    // Highlighting usually changing emissive of base mesh
    this.mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child !== this.statusLight &&
        child !== this.coreMesh
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (!mat || !mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0xaaaaaa); // Highlight color
          mat.emissiveIntensity = 0.3;
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
    // Cleanup
  }
}
