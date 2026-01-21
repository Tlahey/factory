import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { Sawmill } from "./Sawmill";
import { createSawmillModel, getSawBlade, getSawHead } from "./SawmillModel";
import { ParticleSystem } from "../../visuals/ParticleSystem";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";

export class SawmillVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private sawBlade: THREE.Object3D | undefined;
  private sawHead: THREE.Object3D | undefined;
  private statusLight: THREE.Mesh;
  private particleSystem: ParticleSystem;
  private ioArrows: THREE.Group;
  private lastDirection: string;

  constructor(sawmill: Sawmill, particleSystem: ParticleSystem) {
    this.mesh = createSawmillModel();
    this.mesh.name = "sawmill";
    this.lastDirection = sawmill.direction;

    this.sawBlade = getSawBlade(this.mesh as THREE.Group);
    this.sawHead = getSawHead(this.mesh as THREE.Group);
    this.particleSystem = particleSystem;

    // Status Light
    const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.statusLight = new THREE.Mesh(lightGeo, lightMat);
    // Lower position for status light since model is lower
    this.statusLight.position.set(0.35, 0.4, 0.35);
    this.mesh.add(this.statusLight);

    // IO Arrows
    this.ioArrows = createIOArrows(sawmill);
    this.mesh.add(this.ioArrows);
  }

  public update(delta: number, entity: Sawmill): void {
    const time = performance.now() / 1000;

    // Update IO arrows
    updateIOArrows(this.ioArrows, entity);
    this.lastDirection = entity.direction;

    // Update Status Light
    const statusMat = this.statusLight?.material as THREE.MeshBasicMaterial;
    if (!statusMat || !statusMat.color) {
      return;
    }

    // Status color logic
    if (!entity.hasPowerSource) {
      statusMat.color.setHex(0xff0000); // Red - No power
      this.statusLight.scale.setScalar(1.0);
    } else if (entity.powerStatus === "warn" && entity.active) {
      statusMat.color.setHex(0xffaa00); // Orange - Low power
      this.statusLight.scale.setScalar(1.0 + Math.sin(time * 5) * 0.15);
    } else if (!entity.active) {
      statusMat.color.setHex(0xffaa00); // Orange - Idle
      this.statusLight.scale.setScalar(1.0);
    } else {
      statusMat.color.setHex(0x00ff00); // Green - Active
      this.statusLight.scale.setScalar(1.0 + Math.sin(time * 10) * 0.2);
    }

    if (!entity.active) return;

    // 1. Rotate saw blade (on its own axis)
    if (this.sawBlade) {
      const speed = 20 * (entity.visualSatisfaction || 1);
      // It was rotated math.PI/2 on X so local Z rotation spins it
      this.sawBlade.rotation.y += delta * speed;
    }

    // 2. Horizontal movement of the saw head (Back/Forth sawing motion)
    if (this.sawHead) {
      // Oscillate on X axis between -0.2 and 0.2
      const oscillation = Math.sin(time * 2) * 0.25;
      this.sawHead.position.x = oscillation;
    }

    // Spawn sawdust particles
    if (Math.random() < 0.4) {
      // Sawdust comes from the blade position
      const headX = this.sawHead ? this.sawHead.position.x : 0;
      this.particleSystem.spawn(
        entity.x + headX + (Math.random() - 0.5) * 0.2,
        0.2, // Lower emission height
        entity.y + (Math.random() - 0.5) * 0.2,
      );
    }
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== this.statusLight) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (!mat || !mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0x8b4513);
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
