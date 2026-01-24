import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Group, Mesh } from "three";

interface GLTFEntityModelProps {
  url: string;
  onLoaded?: (scene: Group) => void;
  [key: string]: unknown; // Allow passing standard object3d props
}

/**
 * Renders a GLTF model from a URL.
 * Automatically clones the scene so it can be reused multiple times.
 */
export function GLTFEntityModel({
  url,
  onLoaded,
  ...props
}: GLTFEntityModelProps) {
  const { scene } = useGLTF(url);

  // Clone the scene to ensure independent instances (essential for many identical trees)
  const clonedScene = useMemo(() => {
    const s = clone(scene) as Group;
    s.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return s;
  }, [scene]);

  React.useEffect(() => {
    if (onLoaded) onLoaded(clonedScene);
  }, [clonedScene, onLoaded]);

  return <primitive object={clonedScene} {...props} />;
}
