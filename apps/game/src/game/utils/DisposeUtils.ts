import * as THREE from "three";

/**
 * Disposes a Three.js Object3D and all its children recursively.
 * Properly cleans up geometries, materials, and textures.
 */
export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Dispose geometry
      if (child.geometry) {
        child.geometry.dispose();
      }

      // Dispose materials
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

/**
 * Disposes a material and its textures.
 */
export function disposeMaterial(material: THREE.Material): void {
  // Dispose textures
  const mat = material as
    | THREE.MeshStandardMaterial
    | THREE.MeshLambertMaterial;

  if (mat.map) mat.map.dispose();
  if ("normalMap" in mat && mat.normalMap) mat.normalMap.dispose();
  if ("roughnessMap" in mat && mat.roughnessMap) mat.roughnessMap.dispose();
  if ("metalnessMap" in mat && mat.metalnessMap) mat.metalnessMap.dispose();
  if ("emissiveMap" in mat && mat.emissiveMap) mat.emissiveMap.dispose();
  if ("aoMap" in mat && mat.aoMap) mat.aoMap.dispose();
  if ("envMap" in mat && mat.envMap) mat.envMap.dispose();

  material.dispose();
}

/**
 * Simple object pool for reusing Three.js objects.
 * Reduces garbage collection pressure and avoids memory leaks.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  /**
   * Get an object from the pool or create a new one.
   */
  public get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * Return an object to the pool for reuse.
   */
  public release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  /**
   * Get pool size for debugging.
   */
  public size(): number {
    return this.pool.length;
  }

  /**
   * Clear the pool and dispose all objects.
   */
  public clear(disposeFn?: (obj: T) => void): void {
    if (disposeFn) {
      this.pool.forEach(disposeFn);
    }
    this.pool = [];
  }
}
