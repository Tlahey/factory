import * as THREE from "three";

/**
 * SHARED BUILDING PALETTE
 *
 * Every building model used to declare its own ad-hoc colours and material
 * type: some were `MeshLambertMaterial` (flat, non-PBR), some were
 * `MeshStandardMaterial` with wildly different roughness, so the scene read as
 * two different art styles glued together.
 *
 * The palette below is anchored on the conveyor, which already had a coherent
 * industrial look (`ConveyorGeometry.ts`): dark metal frame + hazard yellow.
 * All buildings now speak that language.
 *
 * ## Why factories and not shared instances
 *
 * `disposeObject3D()` disposes every material it walks over when a building is
 * removed. Sharing one material instance between buildings would therefore
 * blank out every other building the first time one is demolished. Each
 * function returns a **fresh** material; only the definition is shared.
 *
 * ## Metalness requires an environment map
 *
 * A metallic surface has no diffuse response — it renders black unless it has
 * something to reflect. `SceneEnvironment` installs a procedural env map on the
 * scene; without it, keep `metalness` low. Values here assume it is present.
 */
export const PALETTE = {
  /** Dark industrial metal — main structural frames. Matches the conveyor. */
  frame: 0x4a4e57,
  /** Near-black metal — legs, undersides, recesses. Matches the conveyor. */
  darkMetal: 0x33363d,
  /** Hazard yellow — trim, warning stripes, moving parts. Matches the conveyor. */
  hazard: 0xf2b21c,
  /** Bright bare steel — pistons, blades, pipes. */
  steel: 0x9aa0a8,
  /** Poured concrete — foundation slabs. */
  concrete: 0x6f7478,
  /** Oxidised copper/brass — electrical accents. */
  brass: 0xc08a3a,
  /** Weathered iron oxide — heavy machinery housings. */
  rust: 0x8a4b2a,
  /** Untreated timber — sawmill stock, poles. */
  wood: 0x8b5a2b,
  /** Photovoltaic blue. */
  photovoltaic: 0x14286e,
  /** Molten metal / fire. */
  molten: 0xff5a1f,
} as const;

/** Dark structural metal used for chassis, frames and housings. */
export function createFrameMaterial(
  color: number = PALETTE.frame,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.65,
    roughness: 0.5,
  });
}

/** Near-black metal for legs, recesses and anything meant to read as shadow. */
export function createDarkMetalMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.darkMetal,
    metalness: 0.6,
    roughness: 0.55,
  });
}

/** Hazard yellow paint — matte, so it stays readable against metal. */
export function createHazardMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.hazard,
    metalness: 0.15,
    roughness: 0.6,
  });
}

/** Polished bare steel for pistons, shafts and cutting tools. */
export function createSteelMaterial(
  color: number = PALETTE.steel,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.85,
    roughness: 0.28,
  });
}

/** Rough concrete for foundation slabs. Non-metallic on purpose. */
export function createConcreteMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.concrete,
    metalness: 0.05,
    roughness: 0.95,
  });
}

/** Painted machinery housing — used for the large coloured volumes. */
export function createPaintedMaterial(
  color: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.65,
  });
}

/** Untreated timber. */
export function createWoodMaterial(
  color: number = PALETTE.wood,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.9,
  });
}

/**
 * Self-lit surface driven by `emissiveIntensity`.
 *
 * Prefer this over `MeshBasicMaterial` for anything a view animates: basic
 * materials have no `emissiveIntensity`, which is why the hub's pulse animation
 * was left as a dead `useFrame` body.
 */
export function createEmissiveMaterial(
  color: number,
  intensity = 1.2,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.0,
    roughness: 0.4,
  });
}

/**
 * Status LED.
 *
 * Kept as `MeshBasicMaterial` because the existing views drive these purely by
 * `material.color.setHex(...)` and read them back with `getHex()`.
 */
export function createStatusLightMaterial(
  color = 0xff0000,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/**
 * Marks a mesh (and its descendants) as a full participant in the shadow pass.
 *
 * Half the meshes in the old models set neither flag, so pipes, ports and
 * chimneys floated shadowless over buildings that did cast one.
 */
export function enableShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}
