import * as THREE from "three";
import { createRockModel } from "./environment/rock/RockModel";
// import { ResourceTile } from './core/ResourceTile';
import { useGameStore } from "./state/store";
import { World } from "./core/World";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { FactorySystem } from "./systems/FactorySystem";
import { PowerSystem } from "./systems/PowerSystem";
import { GuidanceSystem } from "./systems/GuidanceSystem";
import { InputSystem } from "./systems/InputSystem";
import { CableVisual } from "./buildings/electric-pole/CableVisual";
import { getGrassGeometry } from "./environment/grass/GrassGeometry";
import { createGrassMaterial } from "./environment/grass/GrassMaterial";
import { createGrassTexture } from "./environment/grass/GrassTexture";
import {
  createWaterfallTexture,
  createWaterCurrentTexture,
} from "./environment/water/WaterfallTexture";
import { createSandTexture } from "./environment/sand/SandTexture";
import { createBeachTexture } from "./environment/sand/BeachTexture";
import { InventorySlot } from "./state/store";

import { VisualEntity } from "./visuals/VisualEntity";
import { ParticleSystem } from "./visuals/ParticleSystem";
import { PlacementVisuals } from "./visuals/PlacementVisuals";
import { SelectionIndicator } from "./visuals/SelectionIndicator";
import {
  createBuildingVisual,
  VisualContext,
} from "./buildings/BuildingFactory";

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

  private grassUniforms: { [uniform: string]: THREE.IUniform } | null = null;
  private waterfallTexture: THREE.CanvasTexture | null = null;
  private currentTextures: { [key: string]: THREE.CanvasTexture } = {};

  // Grass
  private instancedGrass!: THREE.InstancedMesh;
  private initialGrassMatrices: THREE.Matrix4[] = [];
  private readonly BLADES_PER_TILE = 12;

  private clock!: THREE.Clock;

  // FPS Limiting & Tracking
  private readonly TARGET_FPS = 60;
  private readonly FRAME_INTERVAL = 1000 / 60; // ~16.67ms
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private lastFpsUpdate = 0;

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
      }
      return res;
    };

    const originalRemove = this.world.removeBuilding.bind(this.world);
    this.world.removeBuilding = (x, y) => {
      const res = originalRemove(x, y);
      if (res) {
        this.syncBuildings();
        this.powerSystem.rebuildNetworks();
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
    if (this.waterfallTexture) this.waterfallTexture.dispose();
    Object.values(this.currentTextures).forEach((t) => t.dispose());

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

    // 3. Clear instanced grass
    if (this.instancedGrass) {
      console.log("App: Disposing old grass...");
      this.scene.remove(this.instancedGrass);
      this.instancedGrass.geometry.dispose();
      (this.instancedGrass.material as THREE.Material).dispose();
      this.initialGrassMatrices = [];
    }

    const tileGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Materials
    const grassTexture = createGrassTexture();
    const grassMat = new THREE.MeshLambertMaterial({ map: grassTexture });

    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x0077ff,
      transparent: true,
      opacity: 0.8,
    });

    const sandTexture = createSandTexture();
    const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture });

    const beachTexture = createBeachTexture();
    const beachMat = new THREE.MeshLambertMaterial({ map: beachTexture });

    const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });

    // Current materials
    const currentT = createWaterCurrentTexture();
    this.currentTextures.east = currentT;

    const currentW = currentT.clone();
    currentW.rotation = Math.PI;
    this.currentTextures.west = currentW;

    const currentN = currentT.clone();
    currentN.rotation = -Math.PI / 2;
    this.currentTextures.north = currentN;

    const currentS = currentT.clone();
    currentS.rotation = Math.PI / 2;
    this.currentTextures.south = currentS;

    this.terrainGroup = new THREE.Group();

    // Setup Instanced Grass

    const totalBlades = WORLD_WIDTH * WORLD_HEIGHT * this.BLADES_PER_TILE;
    const grassGeo = getGrassGeometry();
    const { material: grassMaterial, uniforms: grassUniforms } =
      createGrassMaterial();
    this.grassUniforms = grassUniforms;

    this.instancedGrass = new THREE.InstancedMesh(
      grassGeo,
      grassMaterial,
      totalBlades,
    );
    this.instancedGrass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Grass should NOT cast shadows for performance
    this.instancedGrass.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let bladeIdx = 0;

    // Helper to get height based on distance from edge
    const getHeightAt = (x: number, z: number) => {
      const dx = Math.min(x, WORLD_WIDTH - 1 - x);
      const dz = Math.min(z, WORLD_HEIGHT - 1 - z);
      const d = Math.min(dx, dz);
      // Slope between 4.5 and 6.5
      return Math.min(0, Math.max(-0.6, (d - 6.5) * 0.3));
    };

    const getSlopedGeometry = (tx: number, tz: number) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const pos = geo.attributes.position;
      // TOP face vertices
      for (let i = 8; i <= 11; i++) {
        const vx = tx + pos.getX(i);
        const vz = tz + pos.getZ(i);
        const h = getHeightAt(vx, vz);
        pos.setY(i, 0.5 + h);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const tile = this.world.getTile(x, y);
        let mesh: THREE.Mesh;

        const dx = Math.min(x, WORLD_WIDTH - 1 - x);
        const dy = Math.min(y, WORLD_HEIGHT - 1 - y);
        const d = Math.min(dx, dy);

        // Determine face materials with neighbor culling
        const topMat = tile.isSand()
          ? beachMat
          : tile.isWater()
            ? waterMat
            : grassMat;
        const sideMat = tile.isSand()
          ? sandMat
          : tile.isWater()
            ? waterMat
            : grassMat;

        // Face check helper
        const getFaceMat = (
          nx: number,
          ny: number,
          defaultMat: THREE.Material,
        ) => {
          const neighbor = this.world.getTile(nx, ny);
          if (neighbor.isEmpty()) return defaultMat;
          // Hide face if neighbor is not EMPTY (stuck to another element)
          return hiddenMat;
        };

        const materials = [
          getFaceMat(x + 1, y, sideMat), // +X
          getFaceMat(x - 1, y, sideMat), // -X
          topMat, // +Y (Top)
          sideMat, // -Y (Bottom)
          getFaceMat(x, y + 1, sideMat), // +Z
          getFaceMat(x, y - 1, sideMat), // -Z
        ];

        if (tile.isWater()) {
          // 1. Add sand base (seabed)
          const seabedMaterials = [
            getFaceMat(x + 1, y, sandMat), // +X
            getFaceMat(x - 1, y, sandMat), // -X
            sandMat, // +Y (MUST BE VISIBLE THROUGH WATER)
            hiddenMat, // -Y (Bottom)
            getFaceMat(x, y + 1, sandMat), // +Z
            getFaceMat(x, y - 1, sandMat), // -Z
          ];
          const sandMesh = new THREE.Mesh(tileGeometry, seabedMaterials);
          sandMesh.position.set(x, -1.6, y); // Top at -1.1
          sandMesh.receiveShadow = true;
          this.terrainGroup.add(sandMesh);

          // 2. Add water mesh
          const isAtEdge = d < 5;

          if (isAtEdge) {
            const isLeft = x === 0;
            const isRight = x === WORLD_WIDTH - 1;
            const isTop = y === 0;
            const isBottom = y === WORLD_HEIGHT - 1;

            let waterTopMat = waterMat;
            if (isLeft)
              waterTopMat = new THREE.MeshLambertMaterial({
                map: this.currentTextures.west,
                transparent: true,
                opacity: 0.8,
              });
            if (isRight)
              waterTopMat = new THREE.MeshLambertMaterial({
                map: this.currentTextures.east,
                transparent: true,
                opacity: 0.8,
              });
            if (isTop)
              waterTopMat = new THREE.MeshLambertMaterial({
                map: this.currentTextures.north,
                transparent: true,
                opacity: 0.8,
              });
            if (isBottom)
              waterTopMat = new THREE.MeshLambertMaterial({
                map: this.currentTextures.south,
                transparent: true,
                opacity: 0.8,
              });

            const waterMaterials = [
              getFaceMat(x + 1, y, waterMat),
              getFaceMat(x - 1, y, waterMat),
              waterTopMat,
              hiddenMat, // Water bottom is collé to sand
              getFaceMat(x, y + 1, waterMat),
              getFaceMat(x, y - 1, waterMat),
            ];
            mesh = new THREE.Mesh(tileGeometry, waterMaterials);
          } else {
            const waterMaterials = [
              getFaceMat(x + 1, y, waterMat),
              getFaceMat(x - 1, y, waterMat),
              waterMat,
              hiddenMat, // Water bottom is collé to sand
              getFaceMat(x, y + 1, waterMat),
              getFaceMat(x, y - 1, waterMat),
            ];
            mesh = new THREE.Mesh(tileGeometry, waterMaterials);
          }
          mesh.position.set(x, -0.85, y); // Top at -0.6, Bottom at -1.1
          mesh.scale.set(1, 0.5, 1);
        } else if (tile.isSand()) {
          const geo = getSlopedGeometry(x, y);
          // For sloped geometry, material is applied to the geometry faces.
          // getFaceMat already returns hiddenMat if stuck.
          // Bottom face of land should be hidden
          const landMaterials = [...materials];
          landMaterials[3] = hiddenMat; // -Y
          mesh = new THREE.Mesh(geo, landMaterials);
          mesh.position.set(x, -0.5, y);
        } else {
          const landMaterials = [...materials];
          landMaterials[3] = hiddenMat; // -Y
          mesh = new THREE.Mesh(tileGeometry, landMaterials);
          mesh.position.set(x, -0.5, y);
        }

        mesh.receiveShadow = true;
        mesh.userData = { type: "tile", x, y };
        this.terrainGroup.add(mesh);

        // Populate Grass Instances (only on grass)
        if (tile.isGrass() || tile.isStone()) {
          for (let i = 0; i < this.BLADES_PER_TILE; i++) {
            const gx = x + (Math.random() - 0.5) * 0.8;
            const gz = y + (Math.random() - 0.5) * 0.8;
            const h = 0.1 + Math.random() * 0.15;

            dummy.position.set(gx, 0, gz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.set(1, h / 0.2, 1);
            dummy.updateMatrix();

            this.instancedGrass.setMatrixAt(bladeIdx, dummy.matrix);
            this.initialGrassMatrices.push(dummy.matrix.clone());
            bladeIdx++;
          }
        } else {
          // If water/empty, set matrices 0 but track them
          for (let i = 0; i < this.BLADES_PER_TILE; i++) {
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            this.instancedGrass.setMatrixAt(bladeIdx, dummy.matrix);
            this.initialGrassMatrices.push(dummy.matrix.clone());
            bladeIdx++;
          }
        }

        // If stone, add the rock model on top (Rocks still cast shadows for depth)
        if (tile.isStone()) {
          const rocks = createRockModel();
          rocks.position.set(x, 0, y);
          rocks.name = `rock_${x}_${y}`;
          rocks.userData = { x, y };
          rocks.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.terrainGroup.add(rocks);
        }
      }
    }
    this.scene.add(this.instancedGrass);

    // Waterfall Effect
    this.waterfallTexture = createWaterfallTexture();
    const waterfallMat = new THREE.MeshLambertMaterial({
      map: this.waterfallTexture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const waterfallGeom = new THREE.PlaneGeometry(1, 5); // 5 tiles deep
    this.environmentGroup = new THREE.Group();

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
            wf.position.set(x - 0.51, -3.1, y); // Offset to prevent clipping
            this.environmentGroup.add(wf);
          }
          if (isRight) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.rotation.y = Math.PI / 2;
            wf.position.set(x + 0.51, -3.1, y); // Offset to prevent clipping
            this.environmentGroup.add(wf);
          }
          if (isTop) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.rotation.y = Math.PI;
            wf.position.set(x, -3.1, y - 0.51); // Offset to prevent clipping
            this.environmentGroup.add(wf);
          }
          if (isBottom) {
            const wf = new THREE.Mesh(waterfallGeom, waterfallMat);
            wf.position.set(x, -3.1, y + 0.51); // Offset to prevent clipping
            this.environmentGroup.add(wf);
          }
        }
      }
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
    this.updateGrassOcclusion();
  }

  private updateGrassOcclusion() {
    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const building = this.world.getBuilding(x, y);
        const shouldHide = !!building;

        for (let i = 0; i < this.BLADES_PER_TILE; i++) {
          if (idx < this.initialGrassMatrices.length) {
            if (shouldHide) {
              dummy.matrix.copy(this.initialGrassMatrices[idx]);
              dummy.matrix.decompose(
                dummy.position,
                dummy.quaternion,
                dummy.scale,
              );
              dummy.scale.set(0, 0, 0);
              dummy.updateMatrix();
              this.instancedGrass.setMatrixAt(idx, dummy.matrix);
            } else {
              this.instancedGrass.setMatrixAt(
                idx,
                this.initialGrassMatrices[idx],
              );
            }
          }
          idx++;
        }
      }
    }
    this.instancedGrass.instanceMatrix.needsUpdate = true;
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
    this.factorySystem.update(delta);
    this.powerSystem.update(delta);
    this.guidanceSystem.update(delta);

    if (this.inputSystem) {
      this.inputSystem.update(delta);
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

    if (this.grassUniforms) {
      this.grassUniforms.uTime.value = performance.now() / 1000;
    }

    if (this.waterfallTexture) {
      this.waterfallTexture.offset.y += delta * 2;
    }

    Object.values(this.currentTextures).forEach((tex: THREE.CanvasTexture) => {
      tex.offset.x += delta * 1.5;
    });

    // Sync Cables
    if (this.cableVisuals) {
      this.cableVisuals.update(this.world);
    }

    // Update Building Visuals
    this.visuals.forEach((visual, key) => {
      const building = this.world.buildings.get(key);
      if (building) {
        visual.update(delta, building);
      }
    });

    // Update Particles
    this.guidanceSystem.update(delta);
    this.particleSystem.update(delta);

    this.scene.traverse((obj) => {
      if (obj.name && obj.name.startsWith("rock_")) {
        const { x, y } = obj.userData;
        const tile = this.world.getTile(x, y);
        if (tile) {
          const targetScale = tile.getVisualScale();
          obj.scale.set(targetScale, targetScale, targetScale);
          obj.visible = tile.isVisualVisible();
        } else {
          obj.visible = false;
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}
