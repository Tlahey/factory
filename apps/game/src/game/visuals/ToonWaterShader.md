# Toon Water Shader - Wind Waker Style

A stylized procedural water shader for Three.js that creates a cell-like Voronoi pattern similar to the water in **The Legend of Zelda: Wind Waker**.

## Features

| Feature                | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Voronoi Cells**      | Two animated Voronoi layers that create a cellular, scale-like water pattern |
| **Seamless Animation** | Layers move in opposite directions for fluid, non-repetitive motion          |
| **Depth Foam**         | Automatic shoreline foam where water meets other objects (soft particles)    |
| **Wave Animation**     | Vertex-based sinusoidal waves for gentle surface undulation                  |
| **Toon Aesthetic**     | Cel-shaded color palette with distinct deep/shallow/foam zones               |

## Usage

### Basic Usage

```typescript
import { createToonWaterMaterial } from "./ToonWaterShader";

// Create material with default settings
const waterMaterial = createToonWaterMaterial();

// Apply to a plane geometry
const waterMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100, 50, 50),
  waterMaterial,
);
waterMesh.rotation.x = -Math.PI / 2; // Horizontal plane
scene.add(waterMesh);

// Update in render loop
function animate(delta: number) {
  waterMaterial.uniforms.uTime.value += delta;
}
```

### Advanced Usage with Controller

```typescript
import { ToonWaterController } from "./ToonWaterShader";

const waterController = new ToonWaterController({
  colorDeep: new THREE.Color("#21729c"),
  colorShallow: new THREE.Color("#4ba8cc"),
  colorFoam: new THREE.Color("#ffffff"),
  waveAmplitude: 0.1,
  voronoiSpeed: 0.4,
});

const waterMesh = new THREE.Mesh(waterGeometry, waterController.material);
scene.add(waterMesh);

// In render loop
function animate(delta: number) {
  waterController.update(delta);
}
```

### Enabling Depth-Based Foam (Shoreline Effect)

For the shoreline foam effect, you need to provide a depth texture from your scene:

```typescript
// Setup depth render target
const depthTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
);
depthTarget.depthTexture = new THREE.DepthTexture();
depthTarget.depthTexture.format = THREE.DepthFormat;
depthTarget.depthTexture.type = THREE.UnsignedShortType;

// Create water with depth foam
const waterController = new ToonWaterController({
  depthTexture: depthTarget.depthTexture,
  cameraNear: camera.near,
  cameraFar: camera.far,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  foamDistance: 1.5,
  foamIntensity: 1.0,
});

// Render pipeline
function render() {
  // First pass: render scene to depth target (without water)
  waterMesh.visible = false;
  renderer.setRenderTarget(depthTarget);
  renderer.render(scene, camera);

  // Second pass: render full scene with water
  waterMesh.visible = true;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
```

## Uniforms Reference

### Colors

| Uniform         | Type    | Default   | Description                 |
| --------------- | ------- | --------- | --------------------------- |
| `uColorDeep`    | `Color` | `#21729c` | Deep water color            |
| `uColorShallow` | `Color` | `#4ba8cc` | Surface/shallow water color |
| `uColorFoam`    | `Color` | `#ffffff` | Foam and edge highlights    |

### Voronoi Pattern

| Uniform          | Type    | Default | Description                      |
| ---------------- | ------- | ------- | -------------------------------- |
| `uVoronoiScale1` | `float` | `8.0`   | Scale of first Voronoi layer     |
| `uVoronoiScale2` | `float` | `12.0`  | Scale of second Voronoi layer    |
| `uVoronoiSpeed`  | `float` | `0.3`   | Animation speed of cell movement |

### Wave Animation

| Uniform          | Type    | Default | Description                   |
| ---------------- | ------- | ------- | ----------------------------- |
| `uWaveAmplitude` | `float` | `0.08`  | Height of vertex waves        |
| `uWaveFrequency` | `float` | `2.0`   | Frequency of wave oscillation |
| `uWaveSpeed`     | `float` | `1.5`   | Speed of wave animation       |

### Depth Foam (Requires `tDepth` texture)

| Uniform          | Type      | Default        | Description                 |
| ---------------- | --------- | -------------- | --------------------------- |
| `tDepth`         | `Texture` | `null`         | Scene depth texture         |
| `cameraNear`     | `float`   | `0.1`          | Camera near plane           |
| `cameraFar`      | `float`   | `1000.0`       | Camera far plane            |
| `resolution`     | `Vector2` | `(1920, 1080)` | Screen resolution           |
| `uFoamDistance`  | `float`   | `1.0`          | Distance threshold for foam |
| `uFoamIntensity` | `float`   | `1.0`          | Foam brightness multiplier  |

## Shader Techniques

### Voronoi Noise

The shader uses a procedural Voronoi (cellular) noise algorithm:

1. **Cell Generation**: World-space coordinates are divided into cells
2. **Hash Function**: Each cell has a pseudo-random center point
3. **Distance Calculation**: Fragment color is based on distance to nearest cell center
4. **Edge Detection**: Foam lines appear where two cells meet (small edge distance)

### Depth Softening (Soft Particles)

The shoreline foam effect uses depth buffer comparison:

1. **Fragment Depth**: Calculate linear depth of current water fragment
2. **Scene Depth**: Sample depth texture at same screen coordinate
3. **Difference**: If scene depth ≈ fragment depth, we're near a surface
4. **Foam Blend**: Apply foam color with smoothstep transition

### Vertex Waves

Multiple sine waves are combined for organic movement:

```glsl
float wave1 = sin(worldPos.x * freq + time * speed) * amplitude;
float wave2 = sin(worldPos.z * freq * 0.8 + time * speed * 1.3) * amplitude * 0.5;
float wave3 = cos((worldPos.x + worldPos.z) * freq * 0.5 + time * speed * 0.7) * amplitude * 0.3;
```

## Visual Customization

### Calmer Water

```typescript
const calmWater = createToonWaterMaterial({
  waveAmplitude: 0.02,
  voronoiSpeed: 0.1,
});
```

### Stormy Water

```typescript
const stormyWater = createToonWaterMaterial({
  waveAmplitude: 0.3,
  waveSpeed: 3.0,
  voronoiSpeed: 0.8,
  colorDeep: new THREE.Color("#0a4a6a"),
  colorShallow: new THREE.Color("#1a6a8a"),
});
```

### Tropical Lagoon

```typescript
const lagoonWater = createToonWaterMaterial({
  colorDeep: new THREE.Color("#006994"),
  colorShallow: new THREE.Color("#40E0D0"),
  colorFoam: new THREE.Color("#E0FFFF"),
  voronoiScale1: 5.0,
  voronoiScale2: 8.0,
});
```
