import * as THREE from 'three';
import { VisualEntity } from './VisualEntity';
import { Conveyor } from '../buildings/conveyor/Conveyor';
import { createConveyorTexture } from '../buildings/conveyor/ConveyorTexture';
import { createConveyorModel } from '../buildings/conveyor/ConveyorGeometry';
import { createItemRockModel, updateRockVisuals } from '../environment/rock/RockModel';

export class ConveyorVisual implements VisualEntity {
  public mesh: THREE.Object3D;
  private beltMaterial: THREE.MeshLambertMaterial | null = null;
  private itemContainer: THREE.Group; // Wrapper for Transform/Scale correction
  private itemMesh: THREE.Group;
  private lastItemId: number | null = null;

  private type: 'straight' | 'left' | 'right';

  constructor(conveyor: Conveyor, type: 'straight' | 'left' | 'right', outDir: string, isResolved: boolean) {
      this.type = type;
      const texture = createConveyorTexture();
      this.mesh = createConveyorModel(type, texture);
      this.mesh.name = 'conveyor';

      // Setup Belt Material
      const belt = this.mesh.getObjectByName('belt');
      if (belt && belt instanceof THREE.Mesh) {
          if (isResolved) {
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
      if (type === 'right') {
          this.itemContainer.scale.set(-1, 1, 1);
      } else {
          this.itemContainer.scale.set(1, 1, 1);
      }
      
      // Initial Rotation/Scale based on props
      this.setOrientation(type, outDir);
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

  public update(delta: number, conveyor: Conveyor): void {
      // 1. Animate Belt
      if (this.beltMaterial && this.beltMaterial.map) {
          this.beltMaterial.map.offset.y -= delta * 0.5;
      }

      // 2. Update Item
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

  public dispose(): void {
      // Dispose textures/materials
      if (this.beltMaterial && this.beltMaterial.map) {
          this.beltMaterial.map.dispose();
      }
  }
}
