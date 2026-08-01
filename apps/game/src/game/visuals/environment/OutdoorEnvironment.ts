import * as THREE from "three";

/**
 * PROCEDURAL OUTDOOR ENVIRONMENT MAP
 *
 * The scene only had an ambient + a directional light and **no environment
 * map**. That is fine for `MeshLambertMaterial`, but a `MeshStandardMaterial`
 * with `metalness > 0` has no diffuse response at all: metal is defined purely
 * by what it reflects. With nothing to reflect, every metallic part in the game
 * — the saw blade (0.9), the solar cells (0.9), the furnace pipes (0.8), the
 * battery terminals (0.8), the merger/splitter deck (0.6) — rendered as dull
 * near-black shapes.
 *
 * This builds a sky/ground gradient with a sun blob, prefilters it through
 * `PMREMGenerator` and hands back a render target usable as `scene.environment`.
 * It is fully procedural: no HDRI download, no extra asset in `public/`.
 */

/** Zenith blue. */
const SKY_COLOR = new THREE.Color(0x7fb2e5);
/** Pale haze where sky meets ground — keeps the horizon reflection soft. */
const HORIZON_COLOR = new THREE.Color(0xdfe7ee);
/** Bounce light off the terrain below. */
const GROUND_COLOR = new THREE.Color(0x50603c);

/**
 * Direction of the sun blob. Matches the `directionalLight` in `Lights.tsx`,
 * which sits at `(W/2 + 20, 40, H/2 + 20)` aiming at the origin, so from the
 * world's point of view the light arrives from roughly this direction.
 */
const SUN_DIRECTION = new THREE.Vector3(0.6, 0.55, 0.6).normalize();

const SPHERE_RADIUS = 40;

/** Sphere with a sky→horizon→ground gradient baked into its vertex colours. */
function createGradientSky(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 20);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    // -1 straight down, +1 straight up.
    const height = position.getY(i) / SPHERE_RADIUS;
    if (height >= 0) {
      // Bias the blend so the haze band stays tight to the horizon.
      color.copy(HORIZON_COLOR).lerp(SKY_COLOR, Math.pow(height, 0.6));
    } else {
      color.copy(HORIZON_COLOR).lerp(GROUND_COLOR, Math.pow(-height, 0.4));
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
    }),
  );
}

/** Bright blob that gives metal a directional highlight to catch. */
function createSun(): THREE.Mesh {
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS * 0.12, 16, 12),
    // Over 1.0 on purpose: this is what makes polished steel read as polished.
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.4, 3.1) }),
  );
  sun.position.copy(SUN_DIRECTION).multiplyScalar(SPHERE_RADIUS * 0.8);
  return sun;
}

/**
 * Renders the procedural environment and returns its prefiltered render target.
 *
 * The caller owns the target: use `target.texture` as `scene.environment` and
 * call `target.dispose()` on teardown.
 */
export function createOutdoorEnvironment(
  renderer: THREE.WebGLRenderer,
): THREE.WebGLRenderTarget {
  const source = new THREE.Scene();
  const sky = createGradientSky();
  const sun = createSun();
  source.add(sky, sun);

  const pmrem = new THREE.PMREMGenerator(renderer);
  // A little blur on the source hides the sphere's facets in rough reflections.
  const target = pmrem.fromScene(source, 0.03);

  for (const mesh of [sky, sun]) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  pmrem.dispose();

  return target;
}
