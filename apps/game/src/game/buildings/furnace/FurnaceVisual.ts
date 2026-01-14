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
      statusMat.color.setHex(0x888888);
    }

    // Update Core Glow
    if (this.coreMesh) {
      const mat = this.coreMesh.material as THREE.MeshStandardMaterial;
      if (entity.active) {
        // Pulse glow
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;
        mat.emissiveIntensity = 1.5 + pulse * 1.5;

        // Spawn smoke particles above lava
        if (Math.random() < 0.1) {
          // Lava is at Z = -1.0 (Front) relative to Pivot
          // We need to apply rotation to find world position
          // Pivot is (entity.x, entity.y)

          // Simple directional offset based on direction
          // North (Front is -Z): y - 1
          // South (Front is +Z): y + 1
          // East (Front is +X): x + 1
          // West (Front is -X): x - 1

          let spawnX = entity.x;
          let spawnY = entity.y; // World Z in 3D terms often maps to Game Y in grid logic?
          // Usually Game Y = 3D Z.

          switch (entity.direction) {
            case "north":
              spawnY += 0.8;
              break; // Building North -> Model South (Pool) -> spawn +Z
            case "south":
              spawnY -= 0.8;
              break; // Building South -> Model North (Pool) -> spawn -Z
            case "east":
              spawnX += 0.8;
              break; // Building East -> Model East (Pool) -> spawn +X
            case "west":
              spawnX -= 0.8;
              break; // Building West -> Model West (Pool) -> spawn -X
          }

          this.particleSystem.spawn(spawnX, 1.2, spawnY);
        }
      } else {
        mat.emissiveIntensity = 0.5; // Always some glow for lava
      }
    }

    // Animate Hammer
    const hammerPivot = this.mesh.getObjectByName("hammer_pivot");
    if (hammerPivot) {
      if (entity.active) {
        // heavy impact animation
        // Cycle: Lift slow, Smash fast
        // const speed = 3.0;
        // const cycle = (time * speed) % (Math.PI * 2);
        // Use sin wave but sharpened for impact?
        // Simple sin for now: +angle is Up, -angle is Down
        // Pivot is high. Arm extends Z+. Head is at Z+.
        // Rotate X axis.
        // Neutral is 0.
        // Lift: Rotation X negative (up).
        // Hit: Rotation X positive (down).

        // Let's say range is -0.5 (up) to 0.2 (down/hit)
        // const wave = Math.sin(time * 5);
        // Sharp hit effect
        const hammerAngle = Math.max(-0.5, Math.sin(time * 8) * 0.5);

        hammerPivot.rotation.x = hammerAngle;
      } else {
        // Resting position (up)
        hammerPivot.rotation.x = -0.4;
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
