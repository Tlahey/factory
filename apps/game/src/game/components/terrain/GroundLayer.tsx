/* eslint-disable react-hooks/immutability */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SandShaderController } from "../../visuals/shaders/SandShader";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../../constants";

interface GroundLayerProps {
  grassMesh?: THREE.Mesh | null;
  sandMesh?: THREE.Mesh | null;
}

export function GroundLayer({ grassMesh, sandMesh }: GroundLayerProps) {
  const sandControllerRef = useRef<SandShaderController | null>(null);
  const grassMatRef = useRef<THREE.Material | null>(null);

  // Init Materials / Controllers
  useEffect(() => {
    // Grass Material (Create only if needed)
    // If grassMesh already has material passed entirely, we might just need to update it.
    // But usually createBatchedTerrain uses a passed material.
    // Here we can maintain a reference or re-assign.

    // Sand Controller
    if (!sandControllerRef.current) {
      sandControllerRef.current = new SandShaderController({
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
      });
    }

    if (sandMesh) {
      sandMesh.material = sandControllerRef.current.material;
      // Also need to initialize scale/uniforms?
      // SandShaderController handles uniforms.
    }

    return () => {
      sandControllerRef.current?.dispose();
    };
  }, [sandMesh]);

  // Handle Grass Material separate lifecycle if needed
  // Assuming grassMesh provided has valid material,
  // but uTime needs update. We'll store ref to it.
  // Handle Grass Material separate lifecycle if needed
  useEffect(() => {
    if (grassMesh && !grassMatRef.current) {
      grassMatRef.current = grassMesh.material as THREE.Material;
    }
  }, [grassMesh]);

  useFrame(({ clock }, delta) => {
    const elapsedTime = clock.getElapsedTime();

    // Update Grass
    if (grassMesh && grassMesh.material) {
      const mat = grassMesh.material as THREE.ShaderMaterial;
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value = elapsedTime;
      }
    }

    // Update Sand
    sandControllerRef.current?.update(delta);
    if (
      sandControllerRef.current &&
      sandControllerRef.current.material.uniforms.uTime
    ) {
      sandControllerRef.current.material.uniforms.uTime.value = elapsedTime;
    }
  });

  return (
    <group>
      {grassMesh && <primitive object={grassMesh} receiveShadow />}
      {sandMesh && <primitive object={sandMesh} receiveShadow />}
    </group>
  );
}
