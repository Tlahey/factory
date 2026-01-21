"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Image from "next/image";
import { createExtractorModel } from "@/game/buildings/extractor/ExtractorModel";
import { createConveyorModel } from "@/game/buildings/conveyor/ConveyorGeometry";
import { createChestModel } from "@/game/buildings/chest/ChestModel";
import { createConveyorTexture } from "@/game/buildings/conveyor/ConveyorTexture";
import {
  createItemModel,
  updateItemVisuals,
} from "@/game/environment/ResourceRegistryHelper";
import { createHubModel } from "@/game/buildings/hub/HubModel";
import { createBatteryModel } from "@/game/buildings/battery/BatteryModel";
import { createFurnaceModel } from "@/game/buildings/furnace/FurnaceModel";
import { createConveyorMergerModel } from "@/game/buildings/conveyor-merger/ConveyorMergerModel";
import { createConveyorSplitterModel } from "@/game/buildings/conveyor-splitter/ConveyorSplitterModel";
import { createSawmillModel } from "@/game/buildings/sawmill/SawmillModel";
import { createBiomassPlantModel } from "@/game/buildings/biomass-plant/BiomassPlantModel";

// Singleton Renderer to prevent Context Loss (Limit ~16 contexts involved)
import { getBuildingConfig, BuildingId } from "@/game/buildings/BuildingConfig";

// Singleton Renderer to prevent Context Loss (Limit ~16 contexts involved)
// Use globalThis to survive Hot Module Reloading
const GLOBAL_RENDERER_KEY = "__THREE_SHARED_RENDERER__";
const GLOBAL_CACHE_KEY = "__PREVIEW_IMAGE_CACHE__";

function getSharedCache(): Map<string, string> {
  const g = globalThis as unknown as Record<string, Map<string, string>>;
  if (!g[GLOBAL_CACHE_KEY]) {
    g[GLOBAL_CACHE_KEY] = new Map();
  }
  return g[GLOBAL_CACHE_KEY];
}

function getSharedRenderer(): THREE.WebGLRenderer {
  const g = globalThis as unknown as Record<string, THREE.WebGLRenderer>;
  if (!g[GLOBAL_RENDERER_KEY]) {
    g[GLOBAL_RENDERER_KEY] = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    g[GLOBAL_RENDERER_KEY].setPixelRatio(window.devicePixelRatio);
  }
  return g[GLOBAL_RENDERER_KEY];
}

interface ModelPreviewProps {
  type: "building" | "item";
  id: string;
  width?: number;
  height?: number;
  isHovered?: boolean;
  rotationSpeed?: number;
  static?: boolean;
  seed?: number; // For item variety
}

export default function ModelPreview({
  type,
  id,
  width = 64,
  height = 64,
  isHovered = false,
  rotationSpeed = 0.01,
  static: isStatic = false,
  seed = 0,
}: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(() => {
    if (isStatic && id) {
      const cache = getSharedCache();
      const cacheKey = `${type}:${id}:${width}:${height}:${seed}`;
      return cache.get(cacheKey) || null;
    }
    return null;
  });

  // Check for override image in config
  const config =
    type === "building" ? getBuildingConfig(id as BuildingId) : null;
  const previewImage = config?.previewImage;

  // NOTE: Early return above is safe because it only depends on props that don't change hook order?
  // NO, it's NOT safe if we use hooks below. React hooks must be called unconditionally.
  // We must move the early return logic inside the render or below hooks.
  // Actually, we can just use `if (!id) return` inside the effect, and conditionally render the UI.

  // Refactoring to ensure hooks are called:

  // For Dynamic
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const frameIdRef = useRef<number>(0);

  // Should we show the image?
  const showImage = !!previewImage;

  useEffect(() => {
    if (!id) return;

    // Helper to Setup Scene
    const setupScene = () => {
      const scene = new THREE.Scene();

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Main Top Light
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(5, 10, 5);
      scene.add(dirLight);

      // Front Diagonal Light (Rim/Key highlight)
      const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
      frontLight.position.set(2, 2, 10); // Points toward the front-face
      scene.add(frontLight);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(2, 2, 2);
      camera.lookAt(0, 0.4, 0);

      let model: THREE.Object3D | null = null;
      if (type === "building") {
        if (id === "extractor") {
          model = createExtractorModel();
          model.position.y = -0.4;
        } else if (id === "conveyor") {
          const texture = createConveyorTexture();
          model = createConveyorModel("straight", texture);
          model.scale.set(1.5, 1.5, 1.5);
          model.position.y = -0.1;
          model.userData.isConveyor = true;
        } else if (id === "chest") {
          model = createChestModel();
          model.scale.set(1.3, 1.3, 1.3);
          model.position.y = -0.4;
        } else if (id === "hub") {
          model = createHubModel();
          // Center the model (2x2, parts around 0.5, 0.5)
          model.position.set(-0.5, -0.4, -0.5);
          model.position.set(-0.5, -0.4, -0.5);
          model.scale.set(0.8, 0.8, 0.8);
        } else if (id === "battery") {
          model = createBatteryModel();
          model.scale.set(1.2, 1.2, 1.2); // Larger scale for better visibility
          model.position.y = -0.3; // Adjust vertical position
        } else if (id === "electric_pole") {
          const geometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
          const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
          model = new THREE.Mesh(geometry, material);
          model.position.y = 0;
        } else if (id === "cable") {
          // Striped Texture
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffaa00";
          ctx.fillRect(0, 0, 64, 64);
          ctx.fillStyle = "#222222";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(32, 0);
          ctx.lineTo(0, 32);
          ctx.fill();
          ctx.moveTo(32, 64);
          ctx.lineTo(64, 64);
          ctx.lineTo(64, 32);
          ctx.fill();
          ctx.moveTo(0, 64);
          ctx.lineTo(32, 64);
          ctx.lineTo(64, 32);
          ctx.lineTo(64, 0);
          ctx.lineTo(32, 0);
          ctx.lineTo(0, 32);
          ctx.fill();

          const tex = new THREE.CanvasTexture(canvas);
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.repeat.set(1, 4);

          // U-Shape
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.4, 0.4, 0),
            new THREE.Vector3(0, -0.2, 0),
            new THREE.Vector3(0.4, 0.4, 0),
          ]);

          const geometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
          const material = new THREE.MeshLambertMaterial({ map: tex });
          model = new THREE.Mesh(geometry, material);
          model.position.y = -0.1;
        } else if (id === "furnace") {
          model = createFurnaceModel();
          model.scale.set(0.75, 0.75, 0.75);
          model.position.y = -0.5;
        } else if (id === "conveyor_merger") {
          model = createConveyorMergerModel();
          model.scale.set(1.2, 1.2, 1.2);
          model.position.y = -0.3;
        } else if (id === "conveyor_splitter") {
          model = createConveyorSplitterModel();
          model.scale.set(1.2, 1.2, 1.2);
          model.position.y = -0.3;
        } else if (id === "sawmill") {
          model = createSawmillModel();
          model.scale.set(1.1, 1.1, 1.1);
          model.position.y = -0.3;
        } else if (id === "biomass_plant") {
          model = createBiomassPlantModel();
          model.scale.set(1.2, 1.2, 1.2);
          model.position.y = -0.4;
        }
      } else if (type === "item") {
        const itemModel = createItemModel(id);
        if (itemModel) {
          model = itemModel;
          updateItemVisuals(id, model as THREE.Group, seed || 0);

          // Scaling adjustment based on resource
          if (id === "stone") {
            model.scale.set(4, 4, 4);
          } else if (id === "wood") {
            model.scale.set(3.5, 3.5, 3.5);
          } else if (id.includes("ore")) {
            model.scale.set(1, 1, 1);
          } else if (id.includes("ingot")) {
            model.scale.set(2.5, 2.5, 2.5);
          }
        } else {
          // Generic fallback for any unknown item
          console.warn(
            `[ModelPreview] No model found for item: ${id}, using generic fallback`,
          );
          const geometry = new THREE.SphereGeometry(0.25, 8, 8);
          const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
          model = new THREE.Mesh(geometry, material);
          model.scale.set(1.5, 1.5, 1.5);
        }
      }

      if (model) {
        model.rotation.y = Math.PI / 8;
        scene.add(model);
      }

      return { scene, camera, model };
    };

    // --- STATIC MODE ---
    if (isStatic) {
      const cache = getSharedCache();
      const cacheKey = `${type}:${id}:${width}:${height}:${seed}`;

      const cached = cache.get(cacheKey);
      if (cached) {
        // Already initialized or set
        return;
      }

      const { scene, camera } = setupScene();
      const renderer = getSharedRenderer();

      // Render to Data URL
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // Ensure transparency
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL();

      // Save to cache
      cache.set(cacheKey, url);

      // Defer state update to avoid "set-state-in-effect"
      Promise.resolve().then(() => {
        setImageSrc(url);
      });

      // Cleanup Scene
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => {
              if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
              m.dispose();
            });
          } else {
            const m = obj.material;
            if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
            m.dispose();
          }
        }
      });
      renderer.clear(); // Clear for next use
      return;
    }

    // --- DYNAMIC MODE ---
    // Only if NOT static (rare cases). We create a dedicated renderer here.
    // We could use shared renderer with requestAnimationFrame but it complicates multiple dynamic views.
    // Assuming dynamic views are FEW (1-2), explicit renderer is fine.

    const container = containerRef.current;
    if (!container) return;

    const { scene, camera, model } = setupScene();
    sceneRef.current = scene;
    cameraRef.current = camera;
    modelRef.current = model || null; // Fix TS

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (
        modelRef.current &&
        rendererRef.current &&
        sceneRef.current &&
        cameraRef.current
      ) {
        const m = modelRef.current;
        if (isHovered) {
          m.rotation.y += rotationSpeed;
        } else {
          const target = Math.PI / 8;
          m.rotation.y += (target - m.rotation.y) * 0.1;
        }
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      if (container) container.innerHTML = "";

      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => {
              if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
              m.dispose();
            });
          } else {
            const m = obj.material;
            if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
            m.dispose();
          }
        }
      });
    };
  }, [type, id, width, height, isStatic, seed, isHovered, rotationSpeed]); // Added isHovered dep for dynamic

  if (showImage && previewImage) {
    return (
      <Image
        src={previewImage}
        width={width}
        height={height}
        className="object-contain pointer-events-none"
        alt={id}
        unoptimized // Allow external/data strings
      />
    );
  }

  if (isStatic) {
    if (imageSrc) {
      return (
        <Image
          src={imageSrc}
          width={width}
          height={height}
          className="object-contain pointer-events-none"
          alt={id}
          unoptimized
        />
      );
    }
    return <div style={{ width, height }} className="bg-transparent" />; // Placeholder
  }

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="pointer-events-none"
    />
  );
}
