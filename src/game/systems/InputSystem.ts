import * as THREE from 'three';
import { World } from '../core/World';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { useGameStore } from '../state/store';
import { calculateConveyorPath, getSegmentDirection } from '../buildings/conveyor/ConveyorPathHelper';
import { Direction4 } from '../entities/BuildingEntity';

export class InputSystem {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onWorldChange?: () => void;
  private onHover?: (x: number, y: number, isValid?: boolean, ghostBuilding?: string | null) => void;
  private onCableDrag?: (start: {x: number, y: number} | null, end: {x: number, y: number} | null, isValid: boolean) => void;
  private onDeleteHover?: (target: {type: 'cable' | 'building', id: string, x?: number, y?: number, cable?: {x1: number, y1: number, x2: number, y2: number}} | null) => void;
  private onConveyorDrag?: (path: {x: number, y: number, isValid: boolean}[]) => void;

  // Camera Controls
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private currentRotation: Direction4 = 'north';

  // Bound listeners for proper removal
  private boundOnPointerDown = this.onPointerDown.bind(this);
  private boundOnPointerMove = this.onPointerMove.bind(this);
  private boundOnPointerUp = this.onPointerUp.bind(this);
  private boundOnWheel = this.onWheel.bind(this);
  private boundOnKeyDown = this.handleKeyDown.bind(this);

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera, world: World, 
              onWorldChange?: () => void, 
              onHover?: (x: number, y: number, isValid?: boolean, ghostBuilding?: string | null) => void,
              onCableDrag?: (start: {x: number, y: number} | null, end: {x: number, y: number} | null, isValid: boolean) => void,
              onDeleteHover?: (target: {type: 'cable' | 'building', id: string, x?: number, y?: number, cable?: {x1: number, y1: number, x2: number, y2: number}} | null) => void,
              onConveyorDrag?: (path: {x: number, y: number, isValid: boolean}[]) => void) {
    this.domElement = domElement;
    this.camera = camera;
    this.world = world;
    this.onWorldChange = onWorldChange;
    this.onHover = onHover;
    this.onCableDrag = onCableDrag;
    this.onDeleteHover = onDeleteHover;
    this.onConveyorDrag = onConveyorDrag;
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
  
  // Mouse state
  private mouseDownPosition = { x: 0, y: 0 };
  private isRotating = false;
  
  // Cable State
  private cableStart: { x: number, y: number } | null = null;
  private isDraggingCable = false;
  
  // Conveyor Drag State
  private conveyorDragStart: { x: number, y: number } | null = null;
  private isDraggingConveyor = false;

  private setupInteractions() {
    this.domElement.addEventListener('pointerdown', this.boundOnPointerDown);
    this.domElement.addEventListener('pointermove', this.boundOnPointerMove);
    this.domElement.addEventListener('pointerup', this.boundOnPointerUp);
    this.domElement.addEventListener('wheel', this.boundOnWheel, { passive: false });
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        this.cancelCableDrag();
        this.cancelConveyorDrag();
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
  }

  private rotateSelection(clockwise: boolean = true) {
    const clockwiseOrder: Direction4[] = ['north', 'east', 'south', 'west'];
    const currentIndex = clockwiseOrder.indexOf(this.currentRotation);
    if (clockwise) {
      this.currentRotation = clockwiseOrder[(currentIndex + 1) % 4];
    } else {
      this.currentRotation = clockwiseOrder[(currentIndex + 3) % 4]; // -1 mod 4
    }
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
        
        // Potential Start of Conveyor Drag?
        if (selectedBuilding === 'conveyor') {
            const intersection = this.getIntersection(event);
            if (intersection && this.world.canPlaceBuilding(intersection.x, intersection.y, 'conveyor')) {
                // Start Conveyor Drag
                this.conveyorDragStart = { x: intersection.x, y: intersection.y };
                this.isDraggingConveyor = true;
                return;
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

        // 3. Target Limit Check
        // Usually checked on *target* too.
        if (endB) {
            if (endB.getType() === 'hub') {
                 // Hub Limit: 4 connections max (one per tile, maybe? or total?)
                 // User previously said "limit reached for Hub". 
                 // Let's stick to 4 for Hub (2x2), or 1 per tile?
                 // But previously code said ">= 1".
                 // Let's follow strict user request from before if any.
                 // Actually, "Hub can have only 1 connection" is likely too strict if it's main power source.
                 // But let's assume 4 for now to allow multiple lines.
                 // Wait, code I wrote earlier had >= 1.
                 // Let's relax Hub to 4 (it has 4 edge tiles essentially).
                 const endConns = this.world.getConnectionsCount(intersection.x, intersection.y);
                 // But `getConnectionsCount` is per tile.
                 // If I connect to a different tile of the Hub, count is 0.
                 // So per-tile limit of 1 is fine.
                 if (endConns >= 1) isValid = false;
            } else if (endB.getType() === 'electric_pole') {
                 const endConns = this.world.getConnectionsCount(intersection.x, intersection.y);
                 if (endConns >= 3) isValid = false;
            } else if (endB.getType() === 'extractor') {
                 // Extractor Limit: 1 connection total
                 // We need to check ALL tiles? Extractor is 1x1.
                 const endConns = this.world.getConnectionsCount(intersection.x, intersection.y);
                 if (endConns >= 1) isValid = false;
            }
        }

        // 4. Source Limit Check
        if (startB?.getType() === 'electric_pole') {
             const startConns = this.world.getConnectionsCount(this.cableStart.x, this.cableStart.y);
             if (startConns >= 3) isValid = false;
        } else if (startB?.getType() === 'extractor') {
             const startConns = this.world.getConnectionsCount(this.cableStart.x, this.cableStart.y);
             if (startConns >= 1) isValid = false;
        }

        // 5. Self Connection
        if (dist === 0) isValid = false;

        if (this.onCableDrag) {
            this.onCableDrag(this.cableStart, {x: intersection.x, y: intersection.y}, isValid);
        }
    } else if (this.isDraggingConveyor && this.conveyorDragStart && intersection) {
        // Conveyor Drag: Calculate path and validate each position
        const path = calculateConveyorPath(
            this.conveyorDragStart.x,
            this.conveyorDragStart.y,
            intersection.x,
            intersection.y
        );
        
        // Validate each position in the path
        const validatedPath = path.map(pos => ({
            x: pos.x,
            y: pos.y,
            isValid: this.world.canPlaceBuilding(pos.x, pos.y, 'conveyor')
        }));
        
        // Call preview callback
        if (this.onConveyorDrag) {
            this.onConveyorDrag(validatedPath);
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
                     
                     let hoveredCable: {x1: number, y1: number, x2: number, y2: number} | null = null;
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
            const newAzimuth = this.targetAzimuth - deltaX * rotateSpeed;
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
    
    if (this.isDraggingConveyor && this.conveyorDragStart) {
        // Commit Conveyor Path
        const intersection = this.getIntersection(event);
        if (intersection) {
            this.handleConveyorDragEnd(intersection.x, intersection.y);
        } else {
            this.cancelConveyorDrag();
        }
        this.isDraggingConveyor = false;
        this.conveyorDragStart = null;
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

      // Extractor Limit
      if (startB?.getType() === 'extractor') {
           if (this.world.getConnectionsCount(startX, startY) >= 1) isValid = false;
      }
      if (endB?.getType() === 'extractor') {
           if (this.world.getConnectionsCount(endX, endY) >= 1) isValid = false;
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
  
  private cancelConveyorDrag() {
      this.conveyorDragStart = null;
      this.isDraggingConveyor = false;
      if (this.onConveyorDrag) this.onConveyorDrag([]);
  }
  
  private handleConveyorDragEnd(endX: number, endY: number) {
      if (!this.conveyorDragStart) return;
      
      // Calculate path
      const path = calculateConveyorPath(
          this.conveyorDragStart.x,
          this.conveyorDragStart.y,
          endX,
          endY
      );
      
      // Validate and place all conveyors
      let allValid = true;
      for (const pos of path) {
          if (!this.world.canPlaceBuilding(pos.x, pos.y, 'conveyor')) {
              allValid = false;
              break;
          }
      }
      
      if (allValid && path.length > 0) {
          // Place all conveyors with correct direction
          for (let i = 0; i < path.length; i++) {
              const current = path[i];
              const next = i < path.length - 1 ? path[i + 1] : null;
              const prev = i > 0 ? path[i - 1] : null;
              
              // Calculate direction based on next segment, or maintain prev direction if end
              const direction = getSegmentDirection(
                  current.x, current.y, 
                  next ? next.x : null, next ? next.y : null,
                  prev ? prev.x : null, prev ? prev.y : null
              );
              
              this.world.placeBuilding(current.x, current.y, 'conveyor', direction);
          }
          
          // Update conveyor network to orient all conveyors correctly
          this.world.updateConveyorNetwork();
          
          // Notify world changed
          this.onWorldChange?.();
          
          console.log(`Placed ${path.length} conveyors via drag`);
      } else {
          console.log('Conveyor drag placement failed - invalid positions');
      }
      
      // Cleanup
      this.cancelConveyorDrag();
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
      const param = -dot / len_sq;

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
      
      // Check if a building is selected for placement (not select/delete/cable modes)
      const { selectedBuilding } = useGameStore.getState();
      if (selectedBuilding && selectedBuilding !== 'select' && selectedBuilding !== 'delete' && selectedBuilding !== 'cable') {
        // Rotate building ghost instead of zooming
        // deltaY < 0 = scroll up = clockwise
        // deltaY > 0 = scroll down = counter-clockwise
        const clockwise = event.deltaY < 0;
        this.rotateSelection(clockwise);
        return;
      }
      
      // Default: Zoom
      const zoomSpeed = 0.001;
      const zoomDelta = event.deltaY * zoomSpeed * this.radius;
      
      this.radius = Math.max(5, Math.min(100, this.radius + zoomDelta));
      this.updateCameraTransform();
  }
  public dispose() {
      this.domElement.removeEventListener('pointerdown', this.boundOnPointerDown);
      this.domElement.removeEventListener('pointermove', this.boundOnPointerMove);
      this.domElement.removeEventListener('pointerup', this.boundOnPointerUp);
      this.domElement.removeEventListener('wheel', this.boundOnWheel);
      window.removeEventListener('keydown', this.boundOnKeyDown);
  }
}

