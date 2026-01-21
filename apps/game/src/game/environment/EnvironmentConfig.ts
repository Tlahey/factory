/**
 * Environment Visual Configuration
 *
 * Centralized configuration for all environment visual elements (Trees, Rocks, etc.)
 * This allows easy tweaking of sizes, shapes, colors, and random variations.
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a range for random value generation
 */
export interface RandomRange {
  min: number;
  max: number;
}

/**
 * Color palette configuration with multiple color options
 */
export interface ColorPalette {
  colors: number[]; // Hex colors
}

/**
 * Base configuration for a resource visual with scale and variation
 */
export interface ResourceVisualConfig {
  /** Base scale multiplier for the entire model */
  baseScale: number;
  /** Random scale variation range (multiplied with baseScale) */
  scaleVariation: RandomRange;
}

/**
 * Tree-specific visual configuration
 */
export interface TreeVisualConfig extends ResourceVisualConfig {
  /** Number of trees per tile (randomly selected within range) */
  treeCountRange: RandomRange;
  /** Spread radius for tree placement within a tile */
  spreadRadius: number;
  /** Trunk dimensions */
  trunk: {
    heightMultiplier: number;
    radiusMultiplier: number;
    segments: number;
  };
  /** Foliage layer configurations (bottom to top) */
  foliageLayers: {
    radiusMultiplier: number;
    heightMultiplier: number;
    yOffsetMultiplier: number;
    segments: number;
  }[];
  /** Foliage color palette */
  foliageColors: ColorPalette;
  /** Trunk color */
  trunkColor: number;
  /** Wind animation settings */
  windAnimation: {
    swayStrengthRange: RandomRange;
    swaySpeedRange: RandomRange;
  };
}

/**
 * Rock/Stone-specific visual configuration
 */
export interface RockVisualConfig extends ResourceVisualConfig {
  /** Number of rock chunks per tile */
  chunkCountRange: RandomRange;
  /** Spread radius for rock placement within a tile */
  spreadRadius: number;
  /** Individual chunk configuration */
  chunk: {
    radiusRange: RandomRange;
    detail: number; // Icosahedron detail level (0 = low-poly)
  };
  /** Scale variation per axis */
  axisScaleVariation: {
    x: RandomRange;
    y: RandomRange;
    z: RandomRange;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a random value within a given range
 */
export function randomInRange(range: RandomRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

/**
 * Generates a random integer within a given range (inclusive)
 */
export function randomIntInRange(range: RandomRange): number {
  return Math.floor(range.min + Math.random() * (range.max - range.min + 1));
}

/**
 * Picks a random color from a palette
 */
export function randomColor(palette: ColorPalette): number {
  return palette.colors[Math.floor(Math.random() * palette.colors.length)];
}

// ============================================================================
// TREE CONFIGURATION
// ============================================================================

export const TREE_VISUAL_CONFIG: TreeVisualConfig = {
  // Base scale: 1.2x original size
  baseScale: 1.2,

  // Individual tree scale varies between 0.7 and 1.3 of base
  scaleVariation: { min: 0.7, max: 1.3 },

  // 1-3 trees per tile
  treeCountRange: { min: 1, max: 3 },

  // Trees spread within 0.6 units of tile center
  spreadRadius: 0.6,

  // Trunk configuration
  trunk: {
    heightMultiplier: 0.35,
    radiusMultiplier: 0.06,
    segments: 6, // Low-poly
  },

  // Foliage layers (bottom to top) - 3 layered cones
  foliageLayers: [
    {
      radiusMultiplier: 0.28,
      heightMultiplier: 0.35,
      yOffsetMultiplier: 0.12, // Above trunk
      segments: 7,
    },
    {
      radiusMultiplier: 0.22,
      heightMultiplier: 0.3,
      yOffsetMultiplier: 0.38,
      segments: 7,
    },
    {
      radiusMultiplier: 0.14,
      heightMultiplier: 0.25,
      yOffsetMultiplier: 0.6,
      segments: 6,
    },
  ],

  // Foliage color options (various greens)
  foliageColors: {
    colors: [
      0x228b22, // Forest Green
      0x2e8b57, // Sea Green
      0x32cd32, // Lime Green
      0x3cb371, // Medium Sea Green
      0x6b8e23, // Olive Drab
    ],
  },

  // Trunk color (woody brown)
  trunkColor: 0x8b5a2b,

  // Wind animation settings (slower, gentler sway)
  windAnimation: {
    swayStrengthRange: { min: 0.04, max: 0.08 }, // Reduced strength
    swaySpeedRange: { min: 0.3, max: 0.5 }, // Much slower speed
  },
};

// ============================================================================
// ROCK CONFIGURATION
// ============================================================================

export const ROCK_VISUAL_CONFIG: RockVisualConfig = {
  // Base scale: 0.8x original size
  baseScale: 0.8,

  // Individual rock scale varies between 0.8 and 1.2 of base
  scaleVariation: { min: 0.8, max: 1.2 },

  // 3-5 rock chunks per tile
  chunkCountRange: { min: 3, max: 5 },

  // Rocks spread within 0.4 units of tile center
  spreadRadius: 0.4,

  // Individual rock chunk configuration
  chunk: {
    radiusRange: { min: 0.2, max: 0.5 },
    detail: 0, // Low-poly icosahedron
  },

  // Axis-specific scale variation for natural shapes
  axisScaleVariation: {
    x: { min: 0.8, max: 1.2 },
    y: { min: 0.5, max: 1.5 }, // More variation vertically (flat vs tall rocks)
    z: { min: 0.8, max: 1.2 },
  },
};

// ============================================================================
// HELPER FUNCTIONS FOR VISUAL GENERATION
// ============================================================================

/**
 * Generates randomized tree visual parameters for a single tree
 */
export function generateTreeVisualParams(
  config: TreeVisualConfig = TREE_VISUAL_CONFIG,
) {
  const scaleMultiplier = randomInRange(config.scaleVariation);
  const scale = config.baseScale * scaleMultiplier;

  return {
    scale,
    foliageColor: randomColor(config.foliageColors),
    trunkColor: config.trunkColor,
    swayStrength: randomInRange(config.windAnimation.swayStrengthRange),
    swaySpeed: randomInRange(config.windAnimation.swaySpeedRange),
    rotation: Math.random() * Math.PI * 2,
  };
}

/**
 * Generates randomized tree position offset within a tile
 */
export function generateTreeOffset(
  treeCount: number,
  config: TreeVisualConfig = TREE_VISUAL_CONFIG,
) {
  if (treeCount <= 1) {
    return { x: 0, z: 0 };
  }
  return {
    x: (Math.random() - 0.5) * config.spreadRadius,
    z: (Math.random() - 0.5) * config.spreadRadius,
  };
}

/**
 * Generates randomized rock visual parameters for a single rock chunk
 */
export function generateRockChunkParams(
  config: RockVisualConfig = ROCK_VISUAL_CONFIG,
) {
  const baseRadius = randomInRange(config.chunk.radiusRange);
  const scaleMultiplier = randomInRange(config.scaleVariation);

  return {
    radius: baseRadius * config.baseScale * scaleMultiplier,
    scaleX: randomInRange(config.axisScaleVariation.x),
    scaleY: randomInRange(config.axisScaleVariation.y),
    scaleZ: randomInRange(config.axisScaleVariation.z),
    rotation: {
      x: Math.random() * Math.PI,
      y: Math.random() * Math.PI,
      z: Math.random() * Math.PI,
    },
    detail: config.chunk.detail,
  };
}

/**
 * Generates randomized rock position offset within a tile
 */
export function generateRockOffset(
  config: RockVisualConfig = ROCK_VISUAL_CONFIG,
) {
  return {
    x: (Math.random() - 0.5) * config.spreadRadius,
    z: (Math.random() - 0.5) * config.spreadRadius,
  };
}

/**
 * Gets the number of rock chunks to generate for a tile
 */
export function getRockChunkCount(
  config: RockVisualConfig = ROCK_VISUAL_CONFIG,
): number {
  return randomIntInRange(config.chunkCountRange);
}
