import * as THREE from 'three';
import { World } from '../core/World';
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { useGameStore } from '@/game/state/store';

export class InputSystem {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onWorldChange?: () => void;
  private onHover?: (x: number, y: number, isValid?: boolean, ghostBuilding?: string | null) => void;
  private onCableDrag?: (start: {x: number, y: number} | null, end: {x: number, y: number} | null, isValid: boolean) => void;
  private onDeleteHover?: (target: {type: 'cable' | 'building', id: string, x?: number, y?: number, cable?: any} | null) => void;

  // Camera Controls
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private currentRotation: 'north' | 'south' | 'east' | 'west' = 'north';

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera, world: World, 
              onWorldChange?: () => void, 
              onHover?: (x: number, y: number, isValid?: boolean, ghostBuilding?: string | null) => void,
              onCableDrag?: (start: {x: number, y: number} | null, end: {x: number, y: number} | null, isValid: boolean) => void,
              onDeleteHover?: (target: {type: 'cable' | 'building', id: string, x?: number, y?: number, cable?: any} | null) => void) {
    this.domElement = domElement;
    this.camera = camera;
    this.world = world;
    this.onWorldChange = onWorldChange;
    this.onHover = onHover;
    this.onCableDrag = onCableDrag;
    this.onDeleteHover = onDeleteHover;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Initialize Camera State
    this.cameraTarget = new THREE.Vector3(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    this.radius = 20;
    
    // Target Angles (from Store/Interaction)
    this.targetAzimuth = Math.PI / 4; 
    this.targetElevation = Math.PI / 3;

    // Current Angles (Smoothed)
    this.azimuth = this.targetAzimuth;
    this.elevation = this.targetElevation;

    // Subscribe to Store Changes
    useGameStore.subscribe((state) => {
        // Check for Angle Changes
        if (state.cameraAzimuth !== this.targetAzimuth || state.cameraElevation !== this.targetElevation) {
            this.targetAzimuth = state.cameraAzimuth;
            this.targetElevation = state.cameraElevation;
            // Do NOT snap. Let update() smooth it.
        }
    });
    
    // Initial sync
    const state = useGameStore.getState();
    this.targetAzimuth = state.cameraAzimuth;
    this.targetElevation = state.cameraElevation;
    // Snap initially
    this.azimuth = this.targetAzimuth;
    this.elevation = this.targetElevation;
    
    this.updateCameraTransform();

    this.setupInteractions();
  }

  // Camera State
  private cameraTarget: THREE.Vector3;
  private radius: number;
  
  // Targets
  private targetAzimuth: number;
  private targetElevation: number;
  
  // Current (Smoothed)
  private azimuth: number;
  private elevation: number;
  
  private lastViewMode: '2D' | '3D' = '3D';
  
  // Mouse state
  private mouseDownPosition = { x: 0, y: 0 };
  private isRotating = false;
  
  // Cable State
  private cableStart: { x: number, y: number } | null = null;
  private isDraggingCable = false;

  private setupInteractions() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    // Add key listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.cancelCableDrag();
            // Also clear selection?
            // useGameStore.getState().setSelectedBuilding(null);
        }
        if (e.key === 'v') {
            const current = useGameStore.getState().viewMode;
            useGameStore.getState().setViewMode(current === '3D' ? '2D' : '3D');
        }
        if (e.key === 'r') {
            this.rotateSelection();
        }
        if (e.key === 's') {
            const current = useGameStore.getState().selectedBuilding;
            useGameStore.getState().setSelectedBuilding(current === 'select' ? null : 'select');
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const current = useGameStore.getState().selectedBuilding;
            useGameStore.getState().setSelectedBuilding(current === 'delete' ? null : 'delete');
        }
    });
  }

  private rotateSelection() {
    const clockwise: Record<string, 'north' | 'south' | 'east' | 'west'> = {
      'north': 'east',
      'east': 'south',
      'south': 'west',
      'west': 'north'
    };
    this.currentRotation = clockwise[this.currentRotation];
  }

  public update(dt: number) {
      // Smooth Damping
      // Lambda = 15 gives approx 200ms convergence
      const lambda = 15;
      const t = 1 - Math.exp(-lambda * dt);
      
      this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.targetAzimuth, t);
      this.elevation = THREE.MathUtils.lerp(this.elevation, this.targetElevation, t);
      
      this.updateCameraTransform();
  }

  public setCameraMode(mode: '2D' | '3D') {
      // This sets the PRESETS in the store. 
      // InputSystem reacts via subscription.
      if (mode === '3D') {
           useGameStore.getState().setCameraAngles(Math.PI / 4, Math.PI / 3);
      } else {
           useGameStore.getState().setCameraAngles(0, Math.PI / 2);
      }
  }

  private updateCameraTransform() {
      const y = this.radius * Math.sin(this.elevation);
      const rPlane = this.radius * Math.cos(this.elevation); // Radius projected on plane
      const x = this.cameraTarget.x + rPlane * Math.sin(this.azimuth);
      const z = this.cameraTarget.z + rPlane * Math.cos(this.azimuth);

      this.camera.position.set(x, y, z);
      this.camera.lookAt(this.cameraTarget);
  }

  private onPointerDown(event: PointerEvent) {
    if (event.button === 0) { // Left Click
        this.mouseDownPosition = { x: event.clientX, y: event.clientY };
        
        // Potential Start of Cable Drag?
        const { selectedBuilding } = useGameStore.getState();
        if (selectedBuilding === 'cable') {
            const intersection = this.getIntersection(event);
            if (intersection) {
                const building = this.world.getBuilding(intersection.x, intersection.y);
                if (building && building.powerConfig) {
                    // Start Cable Drag
                    this.cableStart = { x: intersection.x, y: intersection.y };
                    this.isDraggingCable = true;
                    // Do not prevent dragging camera yet, wait for move?
                    // Usually we want to block camera drag if dragging item.
                    return; 
                }
            }
        }

        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        this.isRotating = event.ctrlKey || event.metaKey;

    } else if (event.button === 1) { // Middle Click
        this.isDragging = true;
        this.isRotating = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onPointerMove(event: PointerEvent) {
    // 1. Hover/Drag Visuals
    const intersection = this.getIntersection(event);

    if (this.isDraggingCable && this.cableStart && intersection) {
        // Validation Logic
        const dx = intersection.x - this.cableStart.x;
        const dy = intersection.y - this.cableStart.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const startB = this.world.getBuilding(this.cableStart.x, this.cableStart.y);
        const endB = this.world.getBuilding(intersection.x, intersection.y);

        let isValid = true;
        
        // 1. Distance Check
        const range = startB?.powerConfig?.range || 8; 
        if (dist > range) isValid = false;

        // 2. Hub Limit Check
        if (startB?.getType() === 'hub') {
            // Already checked on start? No, we check connections now.
            // Hub can only have 1 connection.
            // Current Connections + 1 (new) <= 1 ?
            // Actually, we need to check if we are *adding* a connection.
            const currentConns = this.world.getConnectionsCount(this.cableStart.x, this.cableStart.y);
            if (currentConns >= 1) isValid = false;
        }

        // 3. Pole Limit Check
        // Usually checked on *target* too.
        if (endB) {
            if (endB.getType() === 'hub') {
                 // Connecting INTO a hub? Usually Hub is source. 
                 // If connecting two hubs?
                 const endConns = this.world.getConnectionsCount(intersection.x, intersection.y);
                 if (endConns >= 1) isValid = false;
            } else if (endB.getType() === 'electric_pole') {
                 const endConns = this.world.getConnectionsCount(intersection.x, intersection.y);
                 if (endConns >= 3) isValid = false;
            }
        }

        // 4. Source Limit Check (Pole)
        if (startB?.getType() === 'electric_pole') {
             const startConns = this.world.getConnectionsCount(this.cableStart.x, this.cableStart.y);
             if (startConns >= 3) isValid = false;
        }

        // 5. Self Connection
        if (dist === 0) isValid = false;

        if (this.onCableDrag) {
            this.onCableDrag(this.cableStart, {x: intersection.x, y: intersection.y}, isValid);
        }
    } else {
        // Standard Hover
        if (this.onHover) {
             const { selectedBuilding } = useGameStore.getState();
             let isValid = true;
             let ghost = null;

             if (intersection) {
                 if (selectedBuilding === 'delete') {
                     // Check for Building
                     const building = this.world.getBuilding(intersection.x, intersection.y);
                     
                     // Check for Cable (Raycast Logic)
                     const rect = this.domElement.getBoundingClientRect();
                     const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                     const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                     this.raycaster.setFromCamera(new THREE.Vector2(mx, my), this.camera);
                     const target = new THREE.Vector3();
                     const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
                     
                     let hoveredCable: any = null;
                     if (this.raycaster.ray.intersectPlane(plane, target)) {
                         const cables = this.world.cables;
                         const THRESHOLD = 0.5; 
                         for (const c of cables) {
                             const dist = this.distToSegment(target.x, target.z, c.x1, c.y1, c.x2, c.y2);
                             if (dist < THRESHOLD) {
                                 hoveredCable = c;
                                 break;
                             }
                         }
                     }

                     if (this.onDeleteHover) {
                         if (hoveredCable) {
                             this.onDeleteHover({ type: 'cable', id: 'cable', cable: hoveredCable });
                         } else if (building) {
                             this.onDeleteHover({ type: 'building', id: `${building.x},${building.y}`, x: building.x, y: building.y });
                         } else {
                             this.onDeleteHover(null);
                         }
                     }
                     
                     this.onHover(intersection.x, intersection.y, true, 'delete'); 
                 } else if (selectedBuilding && selectedBuilding !== 'select' && selectedBuilding !== 'cable') {
                     isValid = this.world.canPlaceBuilding(intersection.x, intersection.y, selectedBuilding);
                     ghost = selectedBuilding;
                     this.onHover(intersection.x, intersection.y, isValid, ghost);
                 } else {
                      this.onHover(intersection.x, intersection.y, true, null);
                      if (this.onDeleteHover) this.onDeleteHover(null); 
                 }
             } else {
                  this.onHover(-1, -1);
                  if (this.onDeleteHover) this.onDeleteHover(null);
             }
        }
    }



    // 2. Camera Drag Logic (Only if NOT dragging cable)
    if (this.isDragging && !this.isDraggingCable) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;

        if (this.isRotating) {
            // Rotate
            const rotateSpeed = 0.01;
            let newAzimuth = this.targetAzimuth - deltaX * rotateSpeed;
            let newElevation = this.targetElevation + deltaY * rotateSpeed;

            // Clamp Elevation (10 deg to 90 deg)
            const EPS = 0.1;
            newElevation = Math.max(EPS, Math.min(Math.PI / 2 - EPS, newElevation));
            
            useGameStore.getState().setCameraAngles(newAzimuth, newElevation);
        } else {
            // Pan
            const panSpeed = 0.05 * (this.radius / 20); // Scale with zoom
            
            // Forward vector on plane (Azimuth)
            const forwardX = Math.sin(this.azimuth);
            const forwardZ = Math.cos(this.azimuth);
            // Right vector
            const rightX = Math.cos(this.azimuth);
            const rightZ = -Math.sin(this.azimuth);

            const dx = -deltaX * panSpeed;
            const dy = -deltaY * panSpeed;

            this.cameraTarget.x += dx * rightX + dy * forwardX; 
            this.cameraTarget.z += dx * rightZ + dy * forwardZ;
        }

        this.updateCameraTransform();
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onPointerUp(event: PointerEvent) {
    this.isDragging = false;
    
    if (this.isDraggingCable && this.cableStart) {
        // Commit Cable
        const intersection = this.getIntersection(event);
        if (intersection) {
             this.handleCableEnd(intersection.x, intersection.y);
        } else {
             this.cancelCableDrag();
        }
        this.isDraggingCable = false;
        this.cableStart = null;
        return;
    }

    // Check if it was a drag or a click
    const dx = event.clientX - this.mouseDownPosition.x;
    const dy = event.clientY - this.mouseDownPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
        this.handleClick(event);
    }
  }

  private handleCableEnd(endX: number, endY: number) {
      if (!this.cableStart) return;
      const startX = this.cableStart.x;
      const startY = this.cableStart.y;
      
      // Re-validate same conditions as Move
      const dx = endX - startX;
      const dy = endY - startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const startB = this.world.getBuilding(startX, startY);
      const endB = this.world.getBuilding(endX, endY);
      
      let isValid = true;
      if (!startB?.powerConfig || !endB?.powerConfig) isValid = false;
      const range = startB?.powerConfig?.range || 8; 
      if (dist > range) isValid = false;
      if (dist === 0) isValid = false;

      // Hub Limit
      if (startB?.getType() === 'hub') {
          if (this.world.getConnectionsCount(startX, startY) >= 1) isValid = false;
      }
      if (endB?.getType() === 'hub') {
           if (this.world.getConnectionsCount(endX, endY) >= 1) isValid = false;
      }

      // Pole Limit
      if (startB?.getType() === 'electric_pole') {
           if (this.world.getConnectionsCount(startX, startY) >= 3) isValid = false;
      }
      if (endB?.getType() === 'electric_pole') {
           if (this.world.getConnectionsCount(endX, endY) >= 3) isValid = false;
      }

      if (isValid) {
          const added = this.world.addCable(startX, startY, endX, endY);
          if (added) {
              console.log('Cable Added via Drag');
              this.onWorldChange?.();
          }
      } else {
          console.log('Cable Connect Invalid');
      }
      
      // Cleanup
      this.cancelCableDrag();
  }

  private cancelCableDrag() {
      this.cableStart = null;
      this.isDraggingCable = false;
      if (this.onCableDrag) this.onCableDrag(null, null, false);
  }

  private getIntersection(event: PointerEvent): {x: number, y: number} | null {
       // 1. Calculate Mouse/Pointer in Normalized Device Coordinates (-1 to +1)
       const rect = this.domElement.getBoundingClientRect();
       this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
       this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
 
       // 2. Raycast
       this.raycaster.setFromCamera(this.mouse, this.camera);
 
       const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5); // Normal Up
       
       const target = new THREE.Vector3();
       const intersection = this.raycaster.ray.intersectPlane(plane, target);
 
       if (intersection) {
           const gridX = Math.round(target.x);
           const gridY = Math.round(target.z);
           
           if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
               return { x: gridX, y: gridY };
           }
       }
       return null;
  }

  private handleClick(event: PointerEvent) {
      const intersection = this.getIntersection(event);
      if (intersection) {
          this.handleGameAction(intersection.x, intersection.y, event);
      } else {
          // Check if clicked ON a cable (no grid intersection? Unlikely for plane, but maybe outside grid)
          // But our plane is infinite?
          // Actually getIntersection limits to Grid Bounds.
      }
  }
  
  private handleGameAction(gridX: number, gridY: number, originalEvent: PointerEvent) {
      const { selectedBuilding } = useGameStore.getState();

      if (selectedBuilding) {
          if (selectedBuilding === 'delete') {
              const building = this.world.getBuilding(gridX, gridY);
              
              if (building) {
                  this.world.removeBuilding(gridX, gridY);
                  // Fix: Clear selection if the deleted building was selected
                  const currentOpened = useGameStore.getState().openedEntityKey;
                  if (currentOpened === `${gridX},${gridY}`) {
                      useGameStore.getState().setOpenedEntityKey(null);
                  }
                  this.onWorldChange?.();
              } else {
                  // Try to delete Cable
                  // We need precise hit detection for cables, not just grid tile.
                  // Since cables are lines, we need distance from point to line segment.
                  // Raycaster can intersection objects!
                  
                  // Use Three.js Raycaster against CableVisuals? 
                  // But InputSystem doesn't have access to Visuals easily.
                  // Alternative: Iterate World Cables and check distance to click.
                  
                  // Map Grid Click to World Pos?
                  const clickX = gridX;
                  const clickY = gridY;
                  
                  // Simple distance check: is point (clickX, clickY) close to segment (c.x1,y1 -> c.x2,y2)?
                  // Actually gridX, gridY are integers. That's too coarse for cable clicking if they span.
                  // But user clicks on a tile.
                  // Let's use the Raycaster exact intersection point if possible, but getIntersection returns rounded grid.
                  
                  // Let's re-calculate exact world pos
                  const rect = this.domElement.getBoundingClientRect();
                  const mx = ((originalEvent.clientX - rect.left) / rect.width) * 2 - 1;
                  const my = -((originalEvent.clientY - rect.top) / rect.height) * 2 + 1;
                  this.raycaster.setFromCamera(new THREE.Vector2(mx, my), this.camera);
                  const target = new THREE.Vector3();
                  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
                  if (this.raycaster.ray.intersectPlane(plane, target)) {
                      // target.x, target.z
                      const cables = this.world.cables;
                      let deleted = false;
                      const THRESHOLD = 0.5; // distance from line

                      for (const c of cables) {
                          const dist = this.distToSegment(target.x, target.z, c.x1, c.y1, c.x2, c.y2);
                          if (dist < THRESHOLD) {
                              this.world.removeCable(c.x1, c.y1, c.x2, c.y2);
                              deleted = true;
                              break; // Delete one at a time
                          }
                      }
                      if (deleted) this.onWorldChange?.();
                  }
              }
              return;
          }

          if (selectedBuilding === 'select') {
              const building = this.world.getBuilding(gridX, gridY);
              if (building && building.hasInteractionMenu()) {
                  useGameStore.getState().setOpenedEntityKey(`${gridX},${gridY}`);
              } else {
                  useGameStore.getState().setOpenedEntityKey(null);
              }
              return;
          }

          if (selectedBuilding === 'cable') {
              // Now handled by Drag logic mainly.
              // But if user just Clicks, we might want to start drag or feedback?
              // Current logic starts drag on Down.
              return;
          }

          const success = this.world.placeBuilding(gridX, gridY, selectedBuilding, this.currentRotation);
          if (success) {
              
              this.world.autoOrientBuilding(gridX, gridY);
              const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
              for (const [dx, dy] of dirs) {
                  this.world.autoOrientBuilding(gridX + dx, gridY + dy);
              }

              this.onWorldChange?.();
          }
          return;
      }

      const tile = this.world.getTile(gridX, gridY);
      
      const building = this.world.getBuilding(gridX, gridY);
      if (building && building.hasInteractionMenu()) {
           useGameStore.getState().setOpenedEntityKey(`${gridX},${gridY}`);
           return;
      }
      
      if (tile.isStone()) {
           useGameStore.getState().addItem('stone', 1);
      }
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
      const A = x1 - px;
      const B = y1 - py;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -dot / len_sq;

      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      }
      else if (param > 1) {
        xx = x2;
        yy = y2;
      }
      else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = px - xx;
      const dy = py - yy;
      return Math.sqrt(dx * dx + dy * dy);
  }

  private onWheel(event: WheelEvent) {
      event.preventDefault();
      // Zoom
      const zoomSpeed = 0.001;
      const zoomDelta = event.deltaY * zoomSpeed * this.radius;
      
      this.radius = Math.max(5, Math.min(100, this.radius + zoomDelta));
      this.updateCameraTransform();
  }
  public dispose() {
      this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
      this.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
      this.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
      this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
      window.removeEventListener('keydown', (e) => {}); 
  }
}

