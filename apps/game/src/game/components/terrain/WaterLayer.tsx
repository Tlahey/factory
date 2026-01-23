/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameContext } from "../../providers/GameProvider";
import { ToonWaterController } from "../../visuals/shaders/ToonWaterShader";
import { WaterfallController } from "../../visuals/shaders/WaterfallShader";
import { createWaterfallMeshes } from "./WaterfallUtils";

interface WaterLayerProps {
  waterMesh?: THREE.Mesh | null;
}

export function WaterLayer({ waterMesh }: WaterLayerProps) {
  const { world } = useGameContext();
  const { gl, scene, camera, size } = useThree();
  const _groupRef = useRef<THREE.Group>(null);
  const waterGroupRef = useRef<THREE.Group>(null);

  // Controllers
  const waterControllerRef = useRef<ToonWaterController | null>(null);
  const waterfallControllerRef = useRef<WaterfallController | null>(null);

  // Depth Target for Foam Effect
  const depthTarget = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height);
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.depthTexture = new THREE.DepthTexture(size.width, size.height);
    target.depthTexture.type = THREE.UnsignedShortType;
    return target;
  }, [size.width, size.height]);

  // Resize Depth Target
  useEffect(() => {
    depthTarget.setSize(size.width, size.height);
    if (waterControllerRef.current) {
      waterControllerRef.current.setResolution(size.width, size.height);
    }
  }, [size, depthTarget]);

  // Setup Water Controllers and Meshes
  // Setup Water Controllers
  const [waterController] = useState(() => new ToonWaterController({}));
  const [waterfallController] = useState(() => new WaterfallController());

  // Sync refs for useFrame
  useEffect(() => {
    waterControllerRef.current = waterController;
    waterfallControllerRef.current = waterfallController;
  }, [waterController, waterfallController]);

  // Create Meshes
  const waterfallMeshes = useMemo(() => {
    // Create waterfalls
    return createWaterfallMeshes(world, waterfallController.material);
  }, [world, waterfallController]);

  // Sync material
  useEffect(() => {
    if (waterMesh) {
      waterMesh.material = waterController.material;
    }
  }, [waterMesh, waterController]);

  // Cleanup
  // Cleanup
  useEffect(() => {
    return () => {
      waterController.dispose();
      waterfallController.dispose();
      depthTarget.dispose();
    };
  }, [waterController, waterfallController, depthTarget]);

  // Frame Loop: Animation & Depth Pass
  useFrame(({ clock }, delta) => {
    const elapsedTime = clock.getElapsedTime();

    // --- DEPTH PASS FOR FOAM ---
    if (waterGroupRef.current) {
      // 1. Hide Water
      waterGroupRef.current.visible = false;

      // 2. Render Scene to Depth Target
      gl.setRenderTarget(depthTarget);
      // Note: We render the whole scene. This captures rocks, terrain, factories.
      gl.render(scene, camera);
      gl.setRenderTarget(null);

      // 3. Show Water
      waterGroupRef.current.visible = true;

      // 4. Update Water Uniforms
      if (waterControllerRef.current) {
        waterControllerRef.current.setDepthTexture(depthTarget.depthTexture);
      }
    }

    // Update Animations
    waterControllerRef.current?.update(delta);
    if (
      waterControllerRef.current &&
      waterControllerRef.current.material.uniforms.uTime
    ) {
      waterControllerRef.current.material.uniforms.uTime.value = elapsedTime;
      waterControllerRef.current.updateCamera(
        camera as THREE.PerspectiveCamera,
      );
    }

    waterfallControllerRef.current?.update(delta);
    if (
      waterfallControllerRef.current &&
      waterfallControllerRef.current.material.uniforms.uTime
    ) {
      waterfallControllerRef.current.material.uniforms.uTime.value =
        elapsedTime;
    }
  });

  return (
    <group ref={waterGroupRef}>
      {waterMesh && <primitive object={waterMesh} />}
      {waterfallMeshes.map((wf, idx) => (
        <primitive key={`waterfall-${idx}`} object={wf} />
      ))}
    </group>
  );
}
