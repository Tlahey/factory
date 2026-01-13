import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { Battery } from "./Battery";
import { createBatteryModel } from "./BatteryModel";

export class BatteryVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private indicator: THREE.Mesh | null = null;

  constructor(_battery: Battery) {
    this.mesh = createBatteryModel();
    this.mesh.name = "battery";

    // Find indicator
    this.indicator = this.mesh.getObjectByName(
      "charge_indicator",
    ) as THREE.Mesh;

    // IO Arrows - Disabled for battery
    // this.ioArrows = createIOArrows(battery);
    // this.mesh.add(this.ioArrows);
  }

  public update(_delta: number, entity?: Battery): void {
    if (!entity) return;

    // Update charge indicator scale and color based on charge level
    if (this.indicator) {
      const pct = entity.currentCharge / entity.capacity;
      // Model uses height * 0.4 for strip height, scale.y represents percentage of max
      const maxBarHeight = 0.9 * 0.4 * 0.9; // stripH * 0.9 from model
      this.indicator.scale.setY(Math.max(0.01, pct * maxBarHeight));

      const mat = this.indicator.material as THREE.MeshLambertMaterial;
      // Color based on charge percentage and enabled state
      if (entity.isEnabled) {
        if (pct < 0.2) {
          mat.color.setHex(0xff0000); // Red - low
          mat.emissive.setHex(0xff0000);
        } else if (pct < 0.5) {
          mat.color.setHex(0xffaa00); // Orange - medium
          mat.emissive.setHex(0xffaa00);
        } else {
          mat.color.setHex(0x00ff00); // Green - good
          mat.emissive.setHex(0x00ff00);
        }
        mat.emissiveIntensity = 0.3;
      } else {
        mat.color.setHex(0x555555); // Grey - disabled
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  public setHighlight(active: boolean): void {
    // Standard highlight logic
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== "charge_indicator") {
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
