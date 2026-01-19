# Documentation: Procedural Grass Shader (Ghibli Style)

This document explains the implementation of the custom "Ghibli-style" Procedural Grass Shader used in the game.

## Overview

The shader generates a stylized, painterly terrain using a multi-layered approach. Instead of a simple noise texture, it composites several procedural patterns (Grain, Clouds, Light, Earth) to create a rich, organic surface that feels like a hand-painted background. It includes support for dynamic wind shadows and received shadows from game objects (buildings).

## 1. Implementation Details

### Files

- **Shader Definition**: `src/game/visuals/GrassShader.ts`
- **Terrain Generation**: `src/game/visuals/TerrainBatcher.ts`
- **Main Loop Integration**: `src/game/GameApp.ts`

### Layering Architecture

The visual look is constructed by stacking 5 distinct layers:

1.  **Base Layer**: A solid vibrant green (`uColorBase`).
2.  **Grain Layer (Brush Strokes)**: A high-frequency noise applied directly to the base to simulate texture or brush strokes, mixing slightly lighter and darker variants of the base color.
3.  **Cloud Layer (Wind)**: A moving low-frequency noise that mixes in the `uColorDark` (shadow) color. This simulates large clouds drifting across the landscape.
4.  **Light Layer**: A static, medium-frequency noise that adds subtle touches of `uColorLight` (sunlight/highlights) to break up uniformity.
5.  **Earth Layer**: A procedurally placed earth texture (`uColorEarth`) that appears in patches. It uses distorted UVs to create organic, non-circular edges.

### Shadow System

The shader implements a custom shadow lookup (`getCustomShadow`) to correctly receive shadows from the Three.js Directional Light (Sun) projected by buildings and machines, blending them harmoniously with the stylized colors (multiplying the final color by 0.6).

## 2. Integration Guide

### Creating the Material

To use the grass shader, use the factory function. You can override specific colors if needed.

```typescript
import { createGrassShaderMaterial } from "./visuals/GrassShader";

const grassMaterial = createGrassShaderMaterial({
  uColorBase: new THREE.Color("#7baa5e"), // Main Green
  uColorDark: new THREE.Color("#5e8c45"), // Cloud Shadow
  uColorLight: new THREE.Color("#a6c875"), // Light Highlight
  uColorEarth: new THREE.Color("#c7b0a4"), // Earth
  uWindSpeed: 0.15,
});
```

### Animation

The `uTime` uniform must be updated every frame in the main loop to animate the cloud layer.

## 3. Tuning Parameters (Uniforms)

| Uniform          | Type    | Default    | Description                            |
| :--------------- | :------ | :--------- | :------------------------------------- |
| `uColorBase`     | `Color` | `#7baa5e`  | The primary color of the grass.        |
| `uColorLight`    | `Color` | `#a6c875`  | Lighter green for static highlights.   |
| `uColorDark`     | `Color` | `#5e8c45`  | Darker green for moving cloud shadows. |
| `uColorEarth`    | `Color` | `#c7b0a4`  | Color of the earth/sand patches.       |
| `uWindSpeed`     | `Float` | `0.15`     | Speed of the cloud layer movement.     |
| `uWindDirection` | `Vec2`  | `(1, 0.2)` | Direction vector of the wind.          |

## 4. GLSL Logic (Simplified)

```glsl
void main() {
  // 1. Base
  vec3 finalColor = uColorBase;

  // 2. Grain (Texture)
  float grainFactor = smoothstep(-0.4, 0.4, snoise(pos * 20.0));
  finalColor = mix(finalColor * 0.92, finalColor * 1.08, grainFactor);

  // 3. Clouds (Wind Animation)
  float cloudNoise = snoise(pos * 0.05 + windOffset);
  finalColor = mix(finalColor, uColorDark, smoothstep(0.0, 0.6, cloudNoise));

  // 4. Light Highlights
  float lightNoise = snoise(pos * 0.08);
  finalColor = mix(finalColor, uColorLight, smoothstep(0.3, 0.7, lightNoise) * 0.5);

  // 5. Earth Patches
  float earthNoise = snoise(pos * 0.25);
  finalColor = mix(finalColor, uColorEarth, smoothstep(0.65, 0.85, earthNoise));

  // 6. Shadows
  finalColor = mix(finalColor * 0.6, finalColor, getCustomShadow());

  gl_FragColor = vec4(finalColor, 1.0);
}
```
