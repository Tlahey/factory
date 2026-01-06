import * as THREE from 'three';
import { VisualEntity } from '../../visuals/VisualEntity';
import { Conveyor } from './Conveyor';
import { createConveyorTexture } from './ConveyorTexture';
import { createConveyorModel } from './ConveyorGeometry';
import { createItemRockModel, updateRockVisuals } from '../../environment/rock/RockModel';

export class ConveyorVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private beltMaterial: THREE.MeshLambertMaterial | null = null;
  private itemContainer: THREE.Group; // Wrapper for Transform/Scale correction
  private itemMesh: THREE.Group;
  private lastItemId: number | null = null;
  private lastResolved: boolean = false;

  private type: 'straight' | 'left' | 'right';

  constructor(conveyor: Conveyor) {
      this.type = conveyor.visualType;
      this.lastResolved = conveyor.isResolved;

      const texture = createConveyorTexture();
      this.mesh = createConveyorModel(this.type, texture);
      this.mesh.name = 'conveyor';

      // Setup Belt Material
      const belt = this.mesh.getObjectByName('belt');
      if (belt && belt instanceof THREE.Mesh) {
          if (this.lastResolved) {
              this.beltMaterial = belt.material as THREE.MeshLambertMaterial;
          } else {
              // Static grey if unresolved
              belt.material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
          }
      }

      // Setup Item Container & Mesh
      this.itemContainer = new THREE.Group();
      this.mesh.add(this.itemContainer);

      this.itemMesh = createItemRockModel();
      this.itemMesh.visible = false;
      this.itemContainer.add(this.itemMesh);
      
      // Counter-scale for Right turns to preserve rock shape (Parent is Scale X=-1)
      if (this.type === 'right') {
          this.itemContainer.scale.set(-1, 1, 1);
      } else {
          this.itemContainer.scale.set(1, 1, 1);
      }
      
      // Initial Rotation/Scale based on props
      this.setOrientation(this.type, conveyor.direction);
  }

  private setOrientation(type: 'straight' | 'left' | 'right', outDir: string) {
      const getRot = (dir: string) => {
        switch(dir) {
            case 'north': return 0;
            case 'west': return Math.PI / 2;
            case 'south': return Math.PI;
            case 'east': return -Math.PI / 2;
            default: return 0;
        }
      };

      let rot = getRot(outDir);
      if (type === 'left') rot -= Math.PI / 2;
      else if (type === 'right') {
          this.mesh.scale.set(-1, 1, 1);
          rot += Math.PI / 2;
      }
      this.mesh.rotation.y = rot;
  }

  /**
   * Update the resolved status of the conveyor, changing belt material to enable/disable animation
   */
  public setResolved(isResolved: boolean): void {
      const belt = this.mesh.getObjectByName('belt');
      if (belt && belt instanceof THREE.Mesh) {
          if (isResolved) {
              // Enable animated belt - get the texture from current material or create new one
              if (!this.beltMaterial) {
                  // Belt was previously unresolved, create a new texture
                  const currentMat = belt.material as THREE.MeshLambertMaterial;
                  let texture = currentMat.map; // Try to preserve texture if exists
                  
                  // If no texture exists (e.g., was unresolved grey material), create a new one
                  if (!texture) {
                      texture = createConveyorTexture();
                  }
                  
                  this.beltMaterial = new THREE.MeshLambertMaterial({ 
                      map: texture,
                      side: THREE.DoubleSide 
                  });
                  belt.material = this.beltMaterial;
              }
          } else {
              // Disable animation, set to static grey
              belt.material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
              this.beltMaterial = null;
          }
      }
  }

  public update(delta: number, conveyor: Conveyor): void {
      // 1. Check for State Changes
      if (conveyor.visualType !== this.type) {
          this.updateType(conveyor.visualType, conveyor.direction);
      }
      
      if (conveyor.isResolved !== this.lastResolved) {
          this.setResolved(conveyor.isResolved);
          this.lastResolved = conveyor.isResolved;
      }

      // 2. Animate Belt
      if (this.beltMaterial && this.beltMaterial.map) {
          this.beltMaterial.map.offset.y -= delta * 0.5;
      }

      // 3. Update Item
      if (conveyor.currentItem) {
          if (this.lastItemId !== conveyor.itemId) {
              updateRockVisuals(this.itemMesh, conveyor.itemId || 0); // itemId can be null but usually set if currentItem is set
              this.lastItemId = conveyor.itemId;
              this.itemMesh.visible = true;
          }

          // Position item based on progress
          const progress = conveyor.transportProgress;
          
          if (this.type === 'straight') {
              this.itemContainer.position.set(0, 0.2, 0.5 - progress);
              this.itemContainer.rotation.y = 0;
          } else {
              // Curve Logic (Left Turn Basis)
              const angle = -Math.PI / 2 * progress; // 0 to -90
              const radius = 0.5;
              const cx = -0.5;
              const cz = 0.5;
              
              const x = cx + radius * Math.cos(angle);
              const z = cz + radius * Math.sin(angle);
              
              this.itemContainer.position.set(x, 0.2, z);
              
              // Rotation Logic
              if (this.type === 'right') {
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
          this.itemMesh.visible = false;
          this.lastItemId = null;
      }
  }
  
  /**
   * Check if visual needs to be rebuilt due to type change
   */
  public updateType(newType: 'straight' | 'left' | 'right', outDir: string): void {
      console.log(`Conveyor type changed from ${this.type} to ${newType}, rebuilding mesh`);
      this.type = newType;
      
      // Store current position and rotation
      const pos = this.mesh.position.clone();
      const rot = this.mesh.rotation.clone(); // This might be wrong if we need to re-orient
      const scale = this.mesh.scale.clone();
      
      const parent = this.mesh.parent;
      if (parent) {
          parent.remove(this.mesh);
      }
      
      // Create new mesh with new type
      const texture = createConveyorTexture();
      this.mesh = createConveyorModel(newType, texture);
      this.mesh.name = 'conveyor';
      this.mesh.position.copy(pos);
      // Rotation needs to be recalculated based on dir, not just copied, 
      // because 'straight' and 'left' meshes have different base orientations relative to pivot?
      // Actually `setOrientation` handles it.
      
      // Re-setup belt material
      const belt = this.mesh.getObjectByName('belt');
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
      this.itemContainer.add(this.itemMesh);
      
      // Counter-scale for Right turns
      if (newType === 'right') {
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
              if (active) {
                   if (!child.userData.originalEmissive) {
                       child.userData.originalEmissive = (child.material as THREE.MeshLambertMaterial).emissive?.clone() || new THREE.Color(0,0,0);
                   }
                   (child.material as THREE.MeshLambertMaterial).emissive.setHex(0xff0000);
                   (child.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.5;
              } else {
                   if (child.userData.originalEmissive) {
                       (child.material as THREE.MeshLambertMaterial).emissive.copy(child.userData.originalEmissive);
                       (child.material as THREE.MeshLambertMaterial).emissiveIntensity = 0;
                   }
              }
          }
      });
  }

  public dispose(): void {
      // Dispose textures/materials
      if (this.beltMaterial && this.beltMaterial.map) {
          this.beltMaterial.map.dispose();
      }
  }
}