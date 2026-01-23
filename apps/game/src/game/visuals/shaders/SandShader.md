# Sand Shader

## Description

Stylized procedural sand shader with animated effects for the game's desert/beach terrain.

## Features

1. **Granular Texture**: Multi-octave Voronoi and Simplex noise creates a realistic sand grain effect
2. **Animated Dust Particles**: Subtle dust motes that drift slowly across the surface
3. **Dune Waves**: Large-scale color variation simulating natural dune patterns
4. **Wind Gusts**: Occasional moving shadow patterns simulating wind effects
5. **Grass Gradient**: Smooth transition at the sand-grass border to avoid harsh edges
6. **Micro Shimmer**: Tiny sparkles that catch the light like real sand grains
7. **Shadow Support**: Correctly receives shadows from buildings

## Palette

| Color | Hex       | Purpose                          |
| ----- | --------- | -------------------------------- |
| Base  | `#e8d9a0` | Warm sand base color             |
| Light | `#f5ebc7` | Bright highlights                |
| Dark  | `#c9b87a` | Shadowed areas                   |
| Dust  | `#fffbe6` | Animated dust particles          |
| Grass | `#7baa5e` | Blend color for grass transition |

## Configuration Options

| Uniform             | Default | Description                                    |
| ------------------- | ------- | ---------------------------------------------- |
| `uGrainScale`       | 40.0    | Scale of grain pattern (higher = finer grains) |
| `uGrainIntensity`   | 0.12    | How strong the grain color variation is        |
| `uDustSpeed`        | 0.3     | Speed of dust animation                        |
| `uDustScale`        | 8.0     | Scale of dust particles                        |
| `uEdgeFadeDistance` | 2.0     | Distance over which to fade to grass           |

## Usage

```typescript
import { SandShaderController } from "./visuals/SandShader";

// Create controller (usually once in GameApp)
const sandController = new SandShaderController({
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
});

// Use material in mesh
const sandMesh = new THREE.Mesh(geometry, sandController.material);

// Update in animation loop
sandController.update(deltaTime);

// Cleanup
sandController.dispose();
```

## Implementation Notes

- Uses `lights: true` and `fog: true` for consistent scene integration
- Edge gradient uses world position to detect sand-grass boundary
- Dust animation uses multiple noise layers for parallax effect
- Shadow reading is consistent with GrassShader implementation
