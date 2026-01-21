import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { BiomassPlant } from "./BiomassPlant";
import { createIOArrows, updateIOArrows } from "../../visuals/IOArrowHelper";
import { createBiomassPlantModel } from "./BiomassPlantModel";
import { SmokeParticleSystem } from "./SmokeParticleSystem";

export class BiomassPlantVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private fireGlow: THREE.Mesh | null = null;
  private statusLight: THREE.Mesh | null = null;
  private breakerSwitch: THREE.Mesh | null = null;
  private smokeSystem: SmokeParticleSystem;
  private ioArrows: THREE.Group;
  private woodLogs: THREE.Mesh[] = [];

  // Smoke spawn timer
  private smokeTimer: number = 0;
  private readonly SMOKE_INTERVAL = 0.15; // Spawn smoke every 150ms

  constructor(plant: BiomassPlant) {
    this.mesh = createBiomassPlantModel();
    this.mesh.name = "biomass_plant";

    // Find references
    this.fireGlow = this.mesh.getObjectByName("fire_glow") as THREE.Mesh;
    this.statusLight = this.mesh.getObjectByName("status_light") as THREE.Mesh;
    this.breakerSwitch = this.mesh.getObjectByName(
      "breaker_switch",
    ) as THREE.Mesh;

    // Find wood logs
    for (let i = 0; i < 3; i++) {
      const log = this.mesh.getObjectByName(`wood_log_${i}`) as THREE.Mesh;
      if (log) this.woodLogs.push(log);
    }

    // Create smoke particle system attached to this building's mesh
    this.smokeSystem = new SmokeParticleSystem(this.mesh);

    // IO Arrows
    this.ioArrows = createIOArrows(plant);
    this.mesh.add(this.ioArrows);
  }

  public update(delta: number, entity: BiomassPlant): void {
    const time = performance.now() / 1000;

    // Update IO Arrows
    updateIOArrows(this.ioArrows, entity);

    // Update Status Light
    if (this.statusLight) {
      const lightMat = this.statusLight.material as THREE.MeshBasicMaterial;
      if (!entity.isEnabled) {
        lightMat.color.setHex(0x888888); // Grey when off
      } else if (entity.isBurning) {
        lightMat.color.setHex(0x00ff00); // Green when burning
      } else {
        lightMat.color.setHex(0xffaa00); // Orange when enabled but no fuel
      }
    }

    // Update Breaker Switch color
    if (this.breakerSwitch) {
      const switchMat = this.breakerSwitch
        .material as THREE.MeshStandardMaterial;
      if (entity.isEnabled) {
        switchMat.color.setHex(0x00cc00); // Green when on
        switchMat.emissive.setHex(0x004400);
      } else {
        switchMat.color.setHex(0xcc0000); // Red when off
        switchMat.emissive.setHex(0x440000);
      }
    }

    // Update Fire Glow
    if (this.fireGlow) {
      const fireMat = this.fireGlow.material as THREE.MeshStandardMaterial;
      if (entity.isEnabled && entity.isBurning) {
        // Flicker effect
        const flicker =
          0.8 + Math.sin(time * 10) * 0.2 + Math.sin(time * 17) * 0.1;
        fireMat.emissiveIntensity = 1.5 * flicker;
        fireMat.opacity = 1.0;

        // Spawn smoke particles from chimney at regular intervals
        this.smokeTimer += delta;
        if (this.smokeTimer >= this.SMOKE_INTERVAL) {
          this.smokeTimer = 0;
          // Chimney top is at local position (0.2, 2.25, -0.2)
          this.smokeSystem.spawn(0.2, 2.3, -0.2);
        }
      } else {
        fireMat.emissiveIntensity = 0.1;
        fireMat.opacity = 0.3;
        this.smokeTimer = 0; // Reset timer when not burning
      }
    }

    // Update smoke particles
    this.smokeSystem.update(delta);

    // Update Wood Logs visibility based on fuel amount
    const fuelRatio = entity.fuelAmount / entity.getFuelCapacity();
    this.woodLogs.forEach((log, index) => {
      const threshold = (index + 1) / (this.woodLogs.length + 1);
      log.visible = fuelRatio >= threshold;
    });
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child !== this.statusLight &&
        child !== this.fireGlow
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (!mat || !mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0xaaaaaa);
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
    this.smokeSystem.dispose();
  }
}
