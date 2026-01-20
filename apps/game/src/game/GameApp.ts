import * as THREE from "three";
import { createRockModel } from "./environment/rock/RockModel";
import { createBatchedTerrain } from "./visuals/TerrainBatcher"; // Terrain batcher import
// import { ResourceTile } from './core/ResourceTile';
import { useGameStore } from "./state/store";
import { World } from "./core/World";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { FactorySystem } from "./systems/FactorySystem";
import { PowerSystem } from "./systems/PowerSystem";
import { GuidanceSystem } from "./systems/GuidanceSystem";
import { InputSystem } from "./systems/InputSystem";
import { CableVisual } from "./buildings/electric-pole/CableVisual";
import { WaterfallController } from "./visuals/WaterfallShader";
import { createGrassShaderMaterial } from "./visuals/GrassShader";
import { SandShaderController } from "./visuals/SandShader";
import { InventorySlot } from "./state/store";

import { VisualEntity } from "./visuals/VisualEntity";
import { ParticleSystem } from "./visuals/ParticleSystem";
import { PlacementVisuals } from "./visuals/PlacementVisuals";
import { SelectionIndicator } from "./visuals/SelectionIndicator";
import {
  createBuildingVisual,
  VisualContext,
} from "./buildings/BuildingFactory";
import { ToonWaterController } from "./visuals/ToonWaterShader";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera; // Public for InputSystem
  private container: HTMLElement;
  public world: World;
  private factorySystem: FactorySystem;
  public powerSystem: PowerSystem;
  private guidanceSystem: GuidanceSystem;
  private inputSystem!: InputSystem;
  private isDestroyed = false;

  private visuals: Map<string, VisualEntity> = new Map();
  private particleSystem: ParticleSystem;
  private placementVisuals: PlacementVisuals;
  private selectionIndicator: SelectionIndicator;
  private cableVisuals: CableVisual;

  private toonWaterController: ToonWaterController | null = null;
  private sandShaderController: SandShaderController | null = null;
  private waterfallController: WaterfallController | null = null;

  private clock!: THREE.Clock;

  // FPS Limiting & Tracking
  private readonly TARGET_FPS = 60;
  private readonly FRAME_INTERVAL = 1000 / 60; // ~16.67ms
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private lastFpsUpdate = 0;

  // Performance: Cached rock meshes for O(1) updates
  private rockMeshes: Map<string, THREE.Object3D> = new Map();

  // Performance: Dirty flag for cable updates
  private cablesDirty = true;

  // ... imports

  constructor(container: HTMLElement) {
    this.container = container;
    this.world = new World();
    this.factorySystem = new FactorySystem(this.world);
    this.powerSystem = new PowerSystem(this.world);
    this.guidanceSystem = new GuidanceSystem(this.world);

    // Three.js Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Black Void

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    // Visuals
    this.cableVisuals = new CableVisual(this.scene, this.world);

    // Default Top-Down View
    this.camera.position.set(WORLD_WIDTH / 2, 20, WORLD_HEIGHT / 2);
    this.camera.lookAt(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Setup Depth Target
    this.depthTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
    );
    this.depthTarget.texture.minFilter = THREE.NearestFilter;
    this.depthTarget.texture.magFilter = THREE.NearestFilter;
    this.depthTarget.depthTexture = new THREE.DepthTexture(
      window.innerWidth,
      window.innerHeight,
    );
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;

    // Configure shadow properties
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;

    this.scene.add(dirLight);

    this.particleSystem = new ParticleSystem(this.scene);
    this.placementVisuals = new PlacementVisuals(this.scene);
    this.selectionIndicator = new SelectionIndicator(this.scene);

    this.inputSystem = new InputSystem(
      this.renderer.domElement,
      this.camera,
      this.world,
      () => {
        this.syncBuildings();
        this.powerSystem.rebuildNetworks();
        this.cablesDirty = true; // Mark cables for visual update
      },
      (x, y, isValid, ghostBuilding, rotation, width, height) => {
        this.placementVisuals.update(
          x,
          y,
          isValid ?? true,
          ghostBuilding ?? null,
          rotation ?? "north",
          this.world,
          width ?? 1,
          height ?? 1,
        );
      },
      (start, end, isValid) => {
        if (start && end) {
          this.cableVisuals.showPreview(start, end, isValid, this.world);
          // Show cursor at target
          this.placementVisuals.update(
            end.x,
            end.y,
            isValid,
            null,
            "north",
            this.world,
          );
        } else {
          this.cableVisuals.hidePreview();
          // Hide cursor
          this.placementVisuals.update(
            -1,
            -1,
            false,
            null,
            "north",
            this.world,
          );
        }
      },
      (target) => {
        // Reset all highlights first
        this.visuals.forEach((v) => {
          if (v.setHighlight) v.setHighlight(false);
        });
        this.cableVisuals.highlightCable(null, this.world);

        if (target) {
          if (target.type === "cable" && target.cable) {
            this.cableVisuals.highlightCable(target.cable, this.world);
          } else if (target.type === "building" && target.id) {
            const visual = this.visuals.get(target.id);
            if (visual && visual.setHighlight) {
              visual.setHighlight(true);
            }

            // Tutorial Triggers
            const state = useGameStore.getState();

            // 1. First Selection
            if (!state.seenDialogues.includes("first_selection")) {
              state.showDialogue("first_selection");
            }

            // 2. Power System & Hub Info
            // Tutorial triggers removed (Moved to GuidanceSystem onInteract)
          }
        }
      },
      (path, rotation) => {
        // Conveyor Drag Preview
        if (path.length > 0) {
          this.placementVisuals.updateConveyorDragPreview(path, rotation);
        } else {
          this.placementVisuals.clearConveyorDragPreview();
        }
      },
      (x, y, id) => {
        // Selection Logic
        const state = useGameStore.getState();

        // 1. If in "delete" mode, handle deletion (InputSystem handles hover, but click confirms?)
        // Actually InputSystem handles click for delete separately usually or via this callback?
        // InputSystem.ts has specific onMouseDown logic. This callback is "onSelect".

        // If we clicked a building
        if (id) {
          // Check if it's an electric pole or other selectable building
          // Update store
          state.setOpenedEntityKey(id);
          state.setSelectedBuilding(null); // Deselect placement tool if any

          this.guidanceSystem.onBuildingClicked(id);
        } else {
          // Clicked nothing/ground -> Deselect
          state.setOpenedEntityKey(null);
        }
      },
    );

    const originalPlace = this.world.placeBuilding.bind(this.world);
    this.world.placeBuilding = (
      x,
      y,
      type,
      direction,
      skipValidation = false,
    ) => {
      const res = originalPlace(x, y, type, direction, skipValidation);
      if (res) {
        this.syncBuildings();
        this.powerSystem.rebuildNetworks();

        // Tutorial: Hub Placed
        if (type === "hub") {
          const state = useGameStore.getState();
          if (!state.seenDialogues.includes("hub_placed")) {
            state.showDialogue("hub_placed");
          }
        }

        // Mark cables dirty for visual update
        this.cablesDirty = true;
      }
      return res;
    };

    const originalRemove = this.world.removeBuilding.bind(this.world);
    this.world.removeBuilding = (x, y) => {
      const res = originalRemove(x, y);
      if (res) {
        this.syncBuildings();
        this.powerSystem.rebuildNetworks();
        // Mark cables dirty for visual update
        this.cablesDirty = true;
      }
      return res;
    };

    this.initTerrain();
    this.syncBuildings();
    this.setupResize();

    // Start Loop
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(this.animate.bind(this));

    GameApp.instanceCount++;
    this.instanceId = GameApp.instanceCount;
    console.log(`App: [Instance ${this.instanceId}] Initializing...`);

    // Global Events for Menu
    this.boundTogglePause = ((e: Event) => {
      const customEvent = e as CustomEvent;
      console.log(
        `App: [Instance ${this.instanceId}] Received TogglePause event`,
        customEvent.detail,
      );
      this.togglePause(customEvent.detail);
    }) as EventListener;

    this.boundSave = ((e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const inv = detail?.inventory;
      console.log(
        `App: [Instance ${this.instanceId}] Received Save event. Inv:`,
        inv,
      );
      this.saveGame(inv);
    }) as EventListener;

    this.boundLoad = () => {
      console.log(`App: [Instance ${this.instanceId}] Received Load event`);
      this.loadGame();
    };
    this.boundNew = () => {
      console.log(`App: [Instance ${this.instanceId}] Received New Game event`);
      this.newGame();
    };

    this.boundRebuildPower = () => {
      console.log(
        `App: [Instance ${this.instanceId}] Received Rebuild Power event`,
      );
      this.powerSystem.rebuildNetworks();
    };

    window.addEventListener("GAME_TOGGLE_PAUSE", this.boundTogglePause);
    window.addEventListener("GAME_SAVE", this.boundSave);
    window.addEventListener("GAME_LOAD", this.boundLoad);
    window.addEventListener("GAME_NEW", this.boundNew);
    window.addEventListener("GAME_REBUILD_POWER", this.boundRebuildPower);
    (window as unknown as { game: GameApp }).game = this;

    // Auto-load if save exists (delayed to allow UI listeners to register)
    setTimeout(() => {
      if (this.isDestroyed) return;
      this.loadGame();
    }, 100);
  }

  private static instanceCount = 0;
  private instanceId: number;
  private boundTogglePause: EventListener;
  private boundSave: EventListener;
  private boundLoad: EventListener;
  private boundNew: EventListener;
  private boundRebuildPower: EventListener;

  public newGame(): void {
    console.log(
      `App: [Instance ${this.instanceId}] Starting New Game procedure...`,
    );

    try {
      // 1. Reset World Key Data
      console.log(`App: [Instance ${this.instanceId}] Resetting world data...`);
      this.world.reset();

      // 2. Clear Visuals
      console.log(
        `App: [Instance ${this.instanceId}] Clearing building visuals...`,
      );
      this.visuals.forEach((v) => {
        this.scene.remove(v.mesh);
        v.dispose();
      });
      this.visuals.clear();
      this.cableVisuals.clear(); // Clear cables too

      // 3. Global Store Reset (Inventory, Hotbar, Counts, Skills)
      console.log(`App: [Instance ${this.instanceId}] Resetting game store...`);
      useGameStore.getState().reset();

      // Dispatch event for legacy listeners (optional but safe)
      window.dispatchEvent(new CustomEvent("GAME_RESET_INVENTORY"));

      // 4. Re-init Terrain meshes
      console.log(
        `App: [Instance ${this.instanceId}] Re-initializing terrain...`,
      );
      this.initTerrain();

      // 5. Sync Buildings (should be empty now)
      console.log(`App: [Instance ${this.instanceId}] Syncing buildings...`);
      this.syncBuildings();

      // Trigger Welcome Dialogue
      useGameStore.getState().showDialogue("welcome");

      console.log(
        `App: [Instance ${this.instanceId}] New Game procedure completed!`,
      );
    } catch (err) {
      console.error(`App: [Instance ${this.instanceId}] New Game failed!`, err);
    }
  }

  public destroy() {
    console.log(`App: [Instance ${this.instanceId}] Destroying...`);
    this.isDestroyed = true;
    this.renderer.setAnimationLoop(null);
    if (
      this.container &&
      this.renderer.domElement.parentElement === this.container
    ) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.inputSystem.dispose();
    this.placementVisuals.dispose();
    this.selectionIndicator.dispose();
    this.cableVisuals.dispose(this.scene);

    // Dispose visuals
    this.visuals.forEach((v) => v.dispose());
    this.visuals.clear();

    // Dispose global assets
    if (this.toonWaterController) this.toonWaterController.dispose();
    if (this.sandShaderController) this.sandShaderController.dispose();
    if (this.waterfallController) this.waterfallController.dispose();

    // Remove Listeners
    window.removeEventListener("GAME_TOGGLE_PAUSE", this.boundTogglePause);
    window.removeEventListener("GAME_SAVE", this.boundSave);
    window.removeEventListener("GAME_LOAD", this.boundLoad);
    window.removeEventListener("GAME_NEW", this.boundNew);
    window.removeEventListener("GAME_REBUILD_POWER", this.boundRebuildPower);
    console.log(
      `App: [Instance ${this.instanceId}] Listeners removed and destroyed.`,
    );
  }

  // Removed createCursorMesh and updateCursor

  private terrainGroup: THREE.Group | null = null;
  private environmentGroup: THREE.Group | null = null; // Track waterfalls, etc.
  private waterMesh: THREE.Mesh | null = null; // Track for depth pass toggle
  private depthTarget: THREE.WebGLRenderTarget | null = null;

  private initTerrain() {
    console.log("App: Initializing terrain...");

    // 1. Cleanup existing terrain
    if (this.terrainGroup) {
      console.log("App: Disposing old terrainGroup...");
      this.scene.remove(this.terrainGroup);
      this.terrainGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.terrainGroup = null;
    }

    // 2. Cleanup environment (waterfalls, etc)
    if (this.environmentGroup) {
      console.log("App: Disposing old environmentGroup...");
      this.scene.remove(this.environmentGroup);
      this.environmentGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.environmentGroup = null;
    }

    // 3. Clear rock meshes cache (Performance optimization)
    this.rockMeshes.clear();

    // Materials
    // const grassTexture = createGrassTexture(); // Removed in favor of procedural shader
    const grassMat = createGrassShaderMaterial();

    // Toon Water
    // Initialize controller if not exists (or recreate if needed)
    if (!this.toonWaterController) {
      this.toonWaterController = new ToonWaterController({
        // Optional overrides if needed, defaults are good now
      });
    }
    const waterMat = this.toonWaterController.material;

    // Sand Shader
    if (!this.sandShaderController) {
      this.sandShaderController = new SandShaderController({
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
      });
    }
    const sandMat = this.sandShaderController.material;

    this.terrainGroup = new THREE.Group();

    // --- BATCHED TERRAIN IMPLEMENTATION ---
    // Generate merged meshes for Grass, Sand, and Water to reduce draw calls from ~2500 to ~5
    const { grassMesh, sandMesh, waterMesh, rockPositions } =
      createBatchedTerrain(this.world.grid, grassMat, sandMat, waterMat);

    if (grassMesh) this.terrainGroup.add(grassMesh);
    if (sandMesh) this.terrainGroup.add(sandMesh);
    if (waterMesh) {
      this.terrainGroup.add(waterMesh);
      this.waterMesh = waterMesh; // Save reference
      // Assign depth texture to controller initially
      if (this.toonWaterController && this.depthTarget) {
        this.toonWaterController.setDepthTexture(this.depthTarget.depthTexture);
        this.toonWaterController.updateCamera(this.camera);
        this.toonWaterController.setResolution(
          window.innerWidth,
          window.innerHeight,
        );
      }
    }

    // Add rocks (Not batched yet as they are complex models, but cached)
    rockPositions.forEach((pos) => {
      const rocks = createRockModel();
      rocks.position.set(pos.x, 0, pos.y);
      rocks.name = `rock_${pos.x}_${pos.y}`;
      rocks.userData = { x: pos.x, y: pos.y };

      // Enable shadows
      rocks.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Optimize materials on rocks too if needed
        }
      });

      this.terrainGroup?.add(rocks);
      this.rockMeshes.set(`${pos.x},${pos.y}`, rocks);
    });

    // Waterfall Effect
    if (!this.waterfallController) {
      this.waterfallController = new WaterfallController();
    }
    const waterfallMat = this.waterfallController.material;

    // Create curved waterfall geometry
    // The curve starts horizontal at the top and curves down over ~1 unit, then goes straight down
    const createCurvedWaterfallGeometry = (
      width: number,
      totalHeight: number,
      curveDepth: number,
      segments: number = 12,
    ) => {
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const curveSegments = Math.floor(segments / 2); // Half for curve
      const straightSegments = segments - curveSegments; // Half for straight part
      const straightHeight = totalHeight - curveDepth;

      // Generate vertices along the curve and straight section
      const points: { y: number; z: number }[] = [];

      // Curved section (using sine curve for smooth transition)
      // Starts HORIZONTAL at top, then curves down to VERTICAL
      for (let i = 0; i <= curveSegments; i++) {
        const t = i / curveSegments; // 0 to 1
        const angle = t * (Math.PI / 2); // 0 to 90 degrees
        // sin(angle) goes 0->1: offset increases as we go down
        const z = Math.sin(angle) * curveDepth * 0.5;
        // (1-cos(angle)) goes 0->1: smooth vertical drop, starts horizontal
        const y = -(1 - Math.cos(angle)) * curveDepth;
        points.push({ y, z });
      }

      // Straight section (continues from where curve ended)
      const curveEndY = points[points.length - 1].y;
      const curveEndZ = points[points.length - 1].z;
      for (let i = 1; i <= straightSegments; i++) {
        const t = i / straightSegments;
        const y = curveEndY - t * straightHeight;
        points.push({ y, z: curveEndZ });
      }

      // Create mesh vertices (2 vertices per point - left and right edge)
      const halfWidth = width / 2;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const v = i / (points.length - 1); // UV v coordinate (0 at top, 1 at bottom)

        // Left vertex
        vertices.push(-halfWidth, point.y, point.z);
        uvs.push(0, 1 - v);

        // Right vertex
        vertices.push(halfWidth, point.y, point.z);
        uvs.push(1, 1 - v);
      }

      // Create triangles
      for (let i = 0; i < points.length - 1; i++) {
        const topLeft = i * 2;
        const topRight = i * 2 + 1;
        const bottomLeft = (i + 1) * 2;
        const bottomRight = (i + 1) * 2 + 1;

        // Two triangles per quad
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      return geometry;
    };

    // Create corner geometry to fill gaps at corners
    const createCornerWaterfallGeometry = (
      totalHeight: number,
      curveDepth: number,
      segments: number = 8,
    ) => {
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const curveSegments = Math.floor(segments / 2);
      const straightSegments = segments - curveSegments;
      const straightHeight = totalHeight - curveDepth;

      // Generate the curve profile (SAME formula as main waterfall)
      const profile: { y: number; offset: number }[] = [];

      for (let i = 0; i <= curveSegments; i++) {
        const t = i / curveSegments;
        const angle = t * (Math.PI / 2);
        // Match main waterfall: sin for offset, (1-cos) for y
        const offset = Math.sin(angle) * curveDepth * 0.5;
        const y = -(1 - Math.cos(angle)) * curveDepth;
        profile.push({ y, offset });
      }

      const curveEndY = profile[profile.length - 1].y;
      const curveEndOffset = profile[profile.length - 1].offset;
      for (let i = 1; i <= straightSegments; i++) {
        const t = i / straightSegments;
        const y = curveEndY - t * straightHeight;
        profile.push({ y, offset: curveEndOffset });
      }

      // Create a 90-degree corner fan
      const cornerSegments = 4;
      for (let p = 0; p < profile.length; p++) {
        const { y, offset } = profile[p];
        const v = p / (profile.length - 1);

        for (let c = 0; c <= cornerSegments; c++) {
          const angle = (c / cornerSegments) * (Math.PI / 2); // 0 to 90 degrees
          const x = -Math.cos(angle) * offset;
          const z = -Math.sin(angle) * offset;

          vertices.push(x, y, z);
          uvs.push(c / cornerSegments, 1 - v);
        }
      }

      // Create triangles
      const vertsPerRow = cornerSegments + 1;
      for (let p = 0; p < profile.length - 1; p++) {
        for (let c = 0; c < cornerSegments; c++) {
          const topLeft = p * vertsPerRow + c;
          const topRight = p * vertsPerRow + c + 1;
          const bottomLeft = (p + 1) * vertsPerRow + c;
          const bottomRight = (p + 1) * vertsPerRow + c + 1;

          indices.push(topLeft, bottomLeft, topRight);
          indices.push(topRight, bottomLeft, bottomRight);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      return geometry;
    };

    const waterfallHeight = 3;
    const curveDepth = 1; // How deep the curve extends (1 unit)
    const waterfallGeom = createCurvedWaterfallGeometry(
      1,
      waterfallHeight,
      curveDepth,
      16,
    );
    const cornerGeom = createCornerWaterfallGeometry(
      waterfallHeight,
      curveDepth,
      12,
    );
    const waterfallY = -0.39; // Adjusted to align top with water surface
    this.environmentGroup = new THREE.Group();

    // Track corners to add corner pieces
    const corners: { x: number; y: number; type: string }[] = [];

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const tile = this.world.getTile(x, y);
        if (!tile.isWater()) continue;

        // Check if on any edge
        const isLeft = x === 0;
        const isRight = x === WORLD_WIDTH - 1;
        const isTop = y === 0;
        const isBottom = y === WORLD_HEIGHT - 1;

        if (isLeft || isRight || isTop || isBottom) {
          if (isLeft) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.rotation.y = -Math.PI / 2;
            wf.position.set(x - 0.51, waterfallY, y);
            this.environmentGroup.add(wf);
          }
          if (isRight) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.rotation.y = Math.PI / 2;
            wf.position.set(x + 0.51, waterfallY, y);
            this.environmentGroup.add(wf);
          }
          if (isTop) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.rotation.y = Math.PI;
            wf.position.set(x, waterfallY, y - 0.51);
            this.environmentGroup.add(wf);
          }
          if (isBottom) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.position.set(x, waterfallY, y + 0.51);
            this.environmentGroup.add(wf);
          }

          // Detect corners
          if (isLeft && isTop) corners.push({ x, y, type: "topLeft" });
          if (isRight && isTop) corners.push({ x, y, type: "topRight" });
          if (isLeft && isBottom) corners.push({ x, y, type: "bottomLeft" });
          if (isRight && isBottom) corners.push({ x, y, type: "bottomRight" });
        }
      }
    }

    // Add corner pieces
    for (const corner of corners) {
      const cf = new THREE.Mesh(cornerGeom, waterfallMat);
      cf.position.set(corner.x, waterfallY, corner.y);

      // Rotate based on corner type (+180° to face outward)
      if (corner.type === "topLeft") {
        cf.rotation.y = Math.PI + Math.PI; // 0° effectively (PI + PI = 2PI = 0)
        cf.position.x -= 0.51;
        cf.position.z -= 0.51;
      } else if (corner.type === "topRight") {
        cf.rotation.y = Math.PI / 2 + Math.PI; // 270° = -90°
        cf.position.x += 0.51;
        cf.position.z -= 0.51;
      } else if (corner.type === "bottomLeft") {
        cf.rotation.y = -Math.PI / 2 + Math.PI; // 90°
        cf.position.x -= 0.51;
        cf.position.z += 0.51;
      } else if (corner.type === "bottomRight") {
        cf.rotation.y = 0 + Math.PI; // 180°
        cf.position.x += 0.51;
        cf.position.z += 0.51;
      }

      this.environmentGroup.add(cf);
    }

    this.scene.add(this.environmentGroup);
    this.scene.add(this.terrainGroup);
  }

  private syncBuildings() {
    // 1. Remove buildings that no longer exist or shouldn't have visuals (non-origin)
    for (const key of this.visuals.keys()) {
      const building = this.world.buildings.get(key);
      // If building missing OR this key is not the origin (e.g. part of 2x2 but not top-left), remove visual
      if (!building || key !== `${building.x},${building.y}`) {
        const visual = this.visuals.get(key);
        if (visual) {
          this.scene.remove(visual.mesh);
          visual.dispose();
        }
        this.visuals.delete(key);
      }
    }

    // 2. Add/Update buildings
    const context: VisualContext = { particleSystem: this.particleSystem };

    this.world.buildings.forEach((building, key) => {
      // Only render at the origin tile
      if (key !== `${building.x},${building.y}`) return;

      let visual = this.visuals.get(key);

      // Create Visual if needed
      if (!visual) {
        try {
          visual = createBuildingVisual(building.getType(), building, context);
          this.scene.add(visual.mesh);
          this.visuals.set(key, visual);
        } catch (e) {
          console.warn(`Failed to create visual for ${building.getType()}`, e);
        }
      }

      if (visual) {
        // Common Positioning
        // Center Positioning (calculate current footprint dimensions)
        // BuildingEntity.width/height are already swapped if rotated, so use them directly.
        const finalWidth = building.width;
        const finalHeight = building.height;
        // Centers are at integers. Center of N tiles starting at X is X + (N-1)/2.
        visual.mesh.position.set(
          building.x + (finalWidth - 1) / 2,
          0,
          building.y + (finalHeight - 1) / 2,
        );

        // Apply generic rotation for non-conveyors (ConveyorVisual handles its own)
        if (building.getType() !== "conveyor") {
          if (building.direction === "east")
            visual.mesh.rotation.y = -Math.PI / 2;
          else if (building.direction === "west")
            visual.mesh.rotation.y = Math.PI / 2;
          else if (building.direction === "south")
            visual.mesh.rotation.y = Math.PI;
          else if (building.direction === "north") visual.mesh.rotation.y = 0;
        }
      }
    });

    this.cableVisuals.update(this.world); // Update cables after buildings are synced
  }

  private setupResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect =
        this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight,
      );
      if (this.depthTarget) {
        this.depthTarget.setSize(
          this.container.clientWidth,
          this.container.clientHeight,
        );
      }
    });
  }

  // --- Pause / Save / Load ---

  private _isPaused = false;

  public togglePause(isPaused: boolean) {
    if (isPaused) {
      this.clock.stop();
      this._isPaused = true;
    } else {
      this.clock.start();
      this._isPaused = false;
    }
  }

  public saveGame(inventory?: InventorySlot[]): void {
    const worldData = this.world.serialize();
    const saveData = {
      world: worldData,
      inventory: inventory || [],
      timestamp: Date.now(),
    };
    localStorage.setItem("factory_save", JSON.stringify(saveData));
  }

  public loadGame(): void {
    const saved = localStorage.getItem("factory_save");
    if (!saved) return;

    try {
      const rawData = JSON.parse(saved);
      let worldData, inventoryData: InventorySlot[] | Record<string, number>;

      if (rawData.world) {
        worldData = rawData.world;
        inventoryData = rawData.inventory || [];
      } else {
        worldData = rawData;
        inventoryData = [];
      }

      // Convert old inventory format (Record) to new (InventorySlot[]) if needed
      let finalInventory: InventorySlot[] = [];
      if (Array.isArray(inventoryData)) {
        finalInventory = inventoryData;
      } else if (typeof inventoryData === "object") {
        // Migration from Record<string, number>
        console.log("App: Migrating legacy inventory...");
        finalInventory = Array(10)
          .fill(null)
          .map(() => ({ type: null, count: 0 }));
        let idx = 0;
        for (const [key, val] of Object.entries(inventoryData)) {
          if (idx < 10 && val > 0) {
            finalInventory[idx] = { type: key, count: val as number };
            idx++;
          }
        }
      }

      // 1. Restore World
      this.world.deserialize(worldData);

      // 2. Cleanup Visuals
      this.visuals.forEach((v) => {
        this.scene.remove(v.mesh);
        v.dispose();
      });
      this.visuals.clear();
      this.cableVisuals.clear(); // Clear cables too

      // 3. Sync
      this.initTerrain();
      this.syncBuildings();

      // 4. Restore Inventory
      console.log("App: Dispatching inventory load:", finalInventory);
      window.dispatchEvent(
        new CustomEvent("GAME_LOAD_INVENTORY", { detail: finalInventory }),
      );
    } catch (err: unknown) {
      console.error("App: Load Failed!", err);
    }
  }

  private animate() {
    if (this.isDestroyed) return;

    // FPS Limiting - Skip frame if called too soon
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastFrameTime;

    if (elapsed < this.FRAME_INTERVAL) {
      return; // Skip this frame, wait for next animation loop call
    }

    this.lastFrameTime = currentTime - (elapsed % this.FRAME_INTERVAL);

    // FPS Tracking
    this.frameCount++;
    this.fpsAccumulator += elapsed;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      const currentFPS = Math.round(
        (this.frameCount * 1000) / this.fpsAccumulator,
      );
      useGameStore.getState().setCurrentFPS(currentFPS);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Pause Check
    if (this._isPaused) {
      // Still render but don't update physics/logic
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = this.clock.getDelta();
    this.world.tick(delta);

    // Update Water
    if (this.toonWaterController) {
      this.toonWaterController.update(delta);
    }

    // Update Sand
    if (this.sandShaderController) {
      this.sandShaderController.update(delta);
    }

    // Update Waterfall
    if (this.waterfallController) {
      this.waterfallController.update(delta);
    }

    this.factorySystem.update(delta);
    this.powerSystem.update(delta);
    this.guidanceSystem.update(delta);

    if (this.inputSystem) {
      this.inputSystem.update(delta);
    }

    // Update Selection Indicator
    // ... (Selection Logic omitted from replacement as it follows) ...

    // --- DEPTH PASS FOR WATER FOAM ---
    if (this.depthTarget && this.waterMesh) {
      // 1. Hide water
      this.waterMesh.visible = false;

      // 2. Render to depth target
      this.renderer.setRenderTarget(this.depthTarget);
      this.renderer.render(this.scene, this.camera);

      // 3. Restore
      this.renderer.setRenderTarget(null);
      this.waterMesh.visible = true;
    }

    // Update Selection Indicator
    const openedKey = useGameStore.getState().openedEntityKey;
    if (openedKey) {
      const [sx, sy] = openedKey.split(",").map(Number);
      const b = this.world.getBuilding(sx, sy);
      if (b) {
        // BuildingEntity.width/height are already swapped if rotated
        this.selectionIndicator.update(b.x, b.y, b.width, b.height);
      } else {
        this.selectionIndicator.update(sx, sy);
      }
    } else {
      this.selectionIndicator.update(null, null);
    }

    // Performance: Only sync cables when buildings change
    if (this.cablesDirty && this.cableVisuals) {
      this.cableVisuals.update(this.world);
      this.cablesDirty = false;
    }

    // Update Building Visuals
    this.visuals.forEach((visual, key) => {
      const building = this.world.buildings.get(key);
      if (building) {
        visual.update(delta, building);
      }
    });

    // Update Particles (Note: guidanceSystem was called twice before - fixed!)
    this.particleSystem.update(delta);

    // Performance: Use cached rockMeshes Map instead of expensive scene.traverse()
    this.rockMeshes.forEach((rockMesh, key) => {
      const [x, y] = key.split(",").map(Number);
      const tile = this.world.getTile(x, y);
      if (tile) {
        const targetScale = tile.getVisualScale();
        rockMesh.scale.set(targetScale, targetScale, targetScale);
        rockMesh.visible = tile.isVisualVisible();
      } else {
        rockMesh.visible = false;
      }
    });

    // Update shader uniforms
    if (this.terrainGroup) {
      this.terrainGroup.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.ShaderMaterial &&
          child.material.uniforms.uTime
        ) {
          child.material.uniforms.uTime.value = this.clock.getElapsedTime();
        }
      });
    }

    this.renderer.render(this.scene, this.camera);

    // Collect render stats for debug overlay
    const info = this.renderer.info;
    useGameStore.getState().setRenderStats({
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
    });
  }
}
