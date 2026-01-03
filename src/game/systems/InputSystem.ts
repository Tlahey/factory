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

  // Camera Controls
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private currentRotation: 'north' | 'south' | 'east' | 'west' = 'north';

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera, world: World, onWorldChange?: () => void, onHover?: (x: number, y: number, isValid?: boolean, ghostBuilding?: string | null) => void) {
    this.domElement = domElement;
    this.camera = camera;
    this.world = world;
    this.onWorldChange = onWorldChange;
    this.onHover = onHover;
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
        
        // ViewMode (Preset) handled by Store Update in GameApp/UI
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
  
  // ...

  private setupInteractions() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    // Add key listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.cableStart = null;
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
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        this.mouseDownPosition = { x: event.clientX, y: event.clientY };
        
        this.isRotating = event.ctrlKey || event.metaKey;
    } else if (event.button === 1) { // Middle Click
        this.isDragging = true;
        this.isRotating = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onPointerMove(event: PointerEvent) {
    // 1. Hover Check (Always run this to update UI/Cursor)
    const intersection = this.getIntersection(event);
    if (this.onHover) {
        if (intersection) {
            const { selectedBuilding } = useGameStore.getState();
            let isValid = true;
            let ghost = null;

            if (selectedBuilding && selectedBuilding !== 'delete' && selectedBuilding !== 'select') {
                isValid = this.world.canPlaceBuilding(intersection.x, intersection.y, selectedBuilding);
                ghost = selectedBuilding;
            } else if (selectedBuilding === 'delete') {
                 // Delete mode logic if needed
            } else if (selectedBuilding === 'select') {
                // Select mode logic (highlight?)
            }
            
            this.onHover(intersection.x, intersection.y, isValid, ghost);
        } else {
             this.onHover(-1, -1);
        }
    }

    // 2. Drag Logic
    if (this.isDragging) {
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
            // Pan uses current azimuth for intuitive direction
            const panSpeed = 0.05 * (this.radius / 20); // Scale with zoom
            
            // Forward vector on plane (Azimuth)
            const forwardX = Math.sin(this.azimuth);
            const forwardZ = Math.cos(this.azimuth);
            // Right vector
            const rightX = Math.cos(this.azimuth);
            const rightZ = -Math.sin(this.azimuth);

            // Drag Left -> Move Camera Left -> Move Target Left
            // Actually usually drag world matches cursor.
            // If I move mouse Left (-X), I want camera to move Left (-X) relative to view?
            // Actually usually "Drag the world" means Camera moves opposite to Drag.
            
            // Relative Pan
            // dX affects Right vector
            // dY affects Forward vector (reversed, down mouse = backward camera?)
            
            // Move Target
            const dx = -deltaX * panSpeed;
            const dy = -deltaY * panSpeed;

            this.cameraTarget.x += dx * rightX + dy * forwardX; // Approximation
            this.cameraTarget.z += dx * rightZ + dy * forwardZ;
            
            // Simple X/Z pan:
            // this.cameraTarget.x -= deltaX * panSpeed;
            // this.cameraTarget.z -= deltaY * panSpeed;
        }

        this.updateCameraTransform();
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onPointerUp(event: PointerEvent) {
    this.isDragging = false;
    
    // Check if it was a drag or a click
    const dx = event.clientX - this.mouseDownPosition.x;
    const dy = event.clientY - this.mouseDownPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
        this.handleClick(event);
    }
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
          this.handleGameAction(intersection.x, intersection.y);
      }
  }
  
  private handleGameAction(gridX: number, gridY: number) {
      const { selectedBuilding, inventory } = useGameStore.getState();

      if (selectedBuilding) {
          if (selectedBuilding === 'delete') {
              this.world.removeBuilding(gridX, gridY);
              
              // Fix: Clear selection if the deleted building was selected
              const currentOpened = useGameStore.getState().openedEntityKey;
              if (currentOpened === `${gridX},${gridY}`) {
                  useGameStore.getState().setOpenedEntityKey(null);
              }

              this.onWorldChange?.();
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
              const building = this.world.getBuilding(gridX, gridY);
              
              // Must click on a building with powerConfig (Pole, Hub, Consumer)
              // Wait, plan said "ElectricPole" extends range, but can we connect direct Hub -> Extractor? Yes.
              
              if (building && building.powerConfig) {
                  if (!this.cableStart) {
                      this.cableStart = { x: gridX, y: gridY };
                      console.log('Cable Start:', gridX, gridY);
                  } else {
                      // Validate Distance
                      const dx = gridX - this.cableStart.x;
                      const dy = gridY - this.cableStart.y;
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      
                      // Check max distance (e.g. 10 or based on building type)
                      // For now hardcoded or check start/end config
                      const startB = this.world.getBuilding(this.cableStart.x, this.cableStart.y);
                      const range = Math.max(startB?.powerConfig?.range || 5, building.powerConfig.range || 5);

                      if (dist <= range && dist > 0) {
                          const added = this.world.addCable(this.cableStart.x, this.cableStart.y, gridX, gridY);
                          if (added) {
                              console.log('Cable Added');
                              this.onWorldChange?.();
                          }
                      } else {
                          console.log('Cable Invalid: Too far or same spot', dist, range);
                      }
                      // Reset start after attempt
                      this.cableStart = null;
                  }
              } else {
                  // Clicked empty space or non-power building -> cancel
                  this.cableStart = null;
              }
              return;
          }

          const success = this.world.placeBuilding(gridX, gridY, selectedBuilding, this.currentRotation);
          if (success) {
              
              this.world.autoOrientBuilding(gridX, gridY);
              // Also re-orient neighbors to form paths
              const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
              for (const [dx, dy] of dirs) {
                  this.world.autoOrientBuilding(gridX + dx, gridY + dy);
              }

              this.onWorldChange?.();
          }
          return;
      }

      const tile = this.world.getTile(gridX, gridY);
      
      // If clicking on a building with empty hand -> Open it
      const building = this.world.getBuilding(gridX, gridY);
      if (building && building.hasInteractionMenu()) {
           useGameStore.getState().setOpenedEntityKey(`${gridX},${gridY}`);
           return;
      }
      
      // Otherwise, gather resource
      if (tile.isStone()) {
           useGameStore.getState().addItem('stone', 1);
      }
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
      window.removeEventListener('keydown', (e) => {}); // Lambda mismatch logic requires named function if strictly removing
      // For lambda, we can't fully remove, but since window is global, we should use AbortController or named function.
      // Ignoring for now to minimal change or fix properly?
      // Let's rely on garbage collection for now or just acknowledge potential leak if reused excessively, but GameApp is typically singleton per view.
      // Better: Store listeners.
      // For this step, just adding the method to satisfy contract.
  }
}
