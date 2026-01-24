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
  waterController?: ToonWaterController | null;
}

export function WaterLayer({ waterMesh, waterController }: WaterLayerProps) {
  const { world } = useGameContext();
  const { gl, scene, camera, size } = useThree();
  const waterGroupRef = useRef<THREE.Group>(null);

  // Controllers
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
  // Setup Water Controllers
  const [waterfallController] = useState(() => new WaterfallController());

  // Sync refs for useFrame
  useEffect(() => {
    waterfallControllerRef.current = waterfallController;
  }, [waterfallController]);

  // Create Meshes
  const waterfallMeshes = useMemo(() => {
    // Create waterfalls
    return createWaterfallMeshes(world, waterfallController.material);
  }, [world, waterfallController]);

  // Sync material
  useEffect(() => {
    if (waterMesh && waterController) {
      waterMesh.material = waterController.material;
    }
  }, [waterMesh, waterController]);

  // Cleanup
  useEffect(() => {
    return () => {
      waterfallController.dispose();
      depthTarget.dispose();
    };
  }, [waterfallController, depthTarget]);

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
      if (waterController) {
        waterController.setDepthTexture(depthTarget.depthTexture);
      }
    }

    // Update Animations
    waterController?.update(delta);
    if (waterController && waterController.material.uniforms.uTime) {
      waterController.material.uniforms.uTime.value = elapsedTime;
      waterController.updateCamera(camera as THREE.PerspectiveCamera);
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
      {waterMesh && <primitive object={waterMesh} receiveShadow />}
      {waterfallMeshes.map((wf, idx) => (
        <primitive key={`waterfall-${idx}`} object={wf} />
      ))}
    </group>
  );
}
