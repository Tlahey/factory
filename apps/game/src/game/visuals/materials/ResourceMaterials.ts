import * as THREE from "three";

/**
 * SHARED ITEM PALETTE
 *
 * Items are rendered at ~0.2 world units on a belt: roughly a dozen pixels.
 * At that size a model is read by its *silhouette and its two-tone contrast*,
 * not by its detail — so every item here is built from a dark body plus one
 * bright accent (host rock + ore vein, bark + end grain, cast metal + stamp).
 *
 * The tones are anchored on `BuildingMaterials`' industrial palette so items
 * don't read as a second art style when they sit on a conveyor.
 *
 * ## Why factories and not shared instances
 *
 * `disposeObject3D()` disposes every material it walks over when a belt item is
 * swapped or a building is removed — and belts swap items constantly. Sharing
 * one instance across models would blank out every other item on the map. Each
 * function returns a **fresh** material; only the definition is shared.
 *
 * ## No shadows on items
 *
 * Item meshes are deliberately left out of the shadow pass. There is one item
 * per occupied belt tile, so a late-game factory has hundreds of them; each
 * shadow-casting mesh is an extra draw call in the shadow map for a
 * two-centimetre object. Buildings cast, items don't.
 */
export const ITEM_PALETTE = {
  /** Host rock the ore is embedded in — dark, so the vein reads bright. */
  oreMatrix: 0x4c4f55,
  /** Weathered granite, lit faces. */
  stoneLight: 0x9b9da1,
  /** Weathered granite, shaded faces — dark enough to break up the pile. */
  stoneDark: 0x63666b,
  /** Rough bark. */
  bark: 0x6b4726,
  /** Freshly sawn end grain — the bright accent on a log pile. */
  endGrain: 0xc79a5b,
} as const;

/**
 * How far an ore's tint is pulled towards the host rock grey.
 *
 * Tuned by eye at preview scale: past ~0.8 the three ores all read as grey
 * pebbles, which costs more than the extra contrast against the veins buys.
 */
const MATRIX_BLEND = 0.72;
/** How much brighter an exposed vein is than the resource's nominal colour. */
const VEIN_GAIN = 1.45;
/** Ceiling on that brightening, so gold doesn't blow out to white. */
const VEIN_MAX_LIGHTNESS = 0.72;

/**
 * The dull rock an ore chunk is mostly made of.
 *
 * Tinted towards the ore's colour rather than pure grey: at belt scale the
 * matrix is most of the silhouette, so a fully neutral one would make iron,
 * copper and gold ore indistinguishable.
 */
export function createOreMatrixMaterial(
  color: number,
): THREE.MeshStandardMaterial {
  const tint = new THREE.Color(color).lerp(
    new THREE.Color(ITEM_PALETTE.oreMatrix),
    MATRIX_BLEND,
  );
  return new THREE.MeshStandardMaterial({
    color: tint,
    metalness: 0.15,
    roughness: 0.9,
    flatShading: true,
  });
}

/**
 * The exposed metal in an ore chunk — the part that carries its identity.
 * Metallic and smooth, so it catches the env map and glints against the matrix.
 *
 * Brightened past the resource's own colour: iron ore is defined as a very dark
 * grey, and a vein at that value disappears into the rock it is sitting in.
 */
export function createOreVeinMaterial(
  color: number,
): THREE.MeshStandardMaterial {
  // Lifted in HSL rather than by scaling RGB: scaling clips the brightest
  // channel first, which would turn gold into flat yellow. Read and written in
  // sRGB — three's working space is linear, where "lightness" is not the
  // quantity an artist means.
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl, THREE.SRGBColorSpace);

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(
      hsl.h,
      hsl.s,
      Math.min(VEIN_MAX_LIGHTNESS, hsl.l * VEIN_GAIN),
      THREE.SRGBColorSpace,
    ),
    metalness: 0.85,
    roughness: 0.35,
    flatShading: true,
  });
}

/** Cast, polished metal for ingots. */
export function createIngotMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.9,
    roughness: 0.25,
  });
}

/**
 * The foundry stamp on an ingot's top face — same alloy, but scuffed, so the
 * mark stays visible instead of mirroring the sky like the polished body.
 */
export function createIngotStampMaterial(
  color: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.75),
    metalness: 0.7,
    roughness: 0.6,
  });
}

/** Rough bark on the curved side of a log. */
export function createBarkMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ITEM_PALETTE.bark,
    metalness: 0.0,
    roughness: 0.95,
    flatShading: true,
  });
}

/** Pale sawn face capping each log. */
export function createEndGrainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ITEM_PALETTE.endGrain,
    metalness: 0.0,
    roughness: 0.8,
  });
}

/** Non-metallic granite for stone chunks. */
export function createStoneMaterial(
  color: number = ITEM_PALETTE.stoneLight,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.02,
    roughness: 0.95,
    flatShading: true,
  });
}
