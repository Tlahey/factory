import * as THREE from "three";
import {
  CloudParsGLSL,
  CloudUniforms,
  SimplexNoiseGLSL,
  getShaderUniforms,
} from "./ShaderUtils";

/**
 * Sea material.
 *
 * `MeshStandardMaterial` customised via `onBeforeCompile` (same approach as
 * `GrassShader.ts`/`SandShader.ts`) so the sea picks up real sky/sun
 * reflections from `scene.environment` — the main visual cue that reads as
 * "PBR water" next to the buildings' metal. Low roughness lets those
 * reflections show; the Voronoi pattern that used to paint flat "toon" colour
 * bands now instead modulates roughness, so it reads as glinting sparkle
 * through the lighting model rather than painted lines.
 *
 * The vertex wave displacement and the depth-texture shoreline foam pass
 * (driven by `WaterLayer.tsx`) are unchanged from the previous toon shader.
 *
 * Deliberately stays opaque (no transmission/refraction) — see the plan doc
 * for why that's a follow-up rather than part of this pass.
 */

export interface WaterShaderOptions {
  colorBase?: THREE.Color;
  colorDarkSpots?: THREE.Color;
  colorHighlights?: THREE.Color;
  colorFoam?: THREE.Color;
  scaleDark?: number;
  scaleLight?: number;
  flowSpeed?: number;
  flowDirection?: THREE.Vector2;
  depthTexture?: THREE.Texture | null;
  cameraNear?: number;
  cameraFar?: number;
  resolution?: THREE.Vector2;
  foamDistance?: number;
  worldWidth?: number;
  worldHeight?: number;
  windSpeed?: number;
  windDirection?: THREE.Vector2;
  colorCloud?: THREE.Color;
}

const DEFAULTS = {
  colorBase: new THREE.Color("#3e86b8"),
  colorDarkSpots: new THREE.Color("#2a87bf"),
  colorHighlights: new THREE.Color("#a9d8f2"),
  colorFoam: new THREE.Color("#ffffff"),
  scaleDark: 1.0,
  scaleLight: 0.8,
  flowSpeed: 0.2,
  flowDirection: new THREE.Vector2(0.5, 0.2),
  cameraNear: 0.1,
  cameraFar: 1000.0,
  resolution: new THREE.Vector2(
    typeof window !== "undefined" ? window.innerWidth : 1024,
    typeof window !== "undefined" ? window.innerHeight : 1024,
  ),
  foamDistance: 0.4,
  worldWidth: 50,
  worldHeight: 50,
  windSpeed: CloudUniforms.uWindSpeed.value as number,
  windDirection: (CloudUniforms.uWindDirection.value as THREE.Vector2).clone(),
  colorCloud: new THREE.Color("#3d7aa3"),
};

export function createWaterShaderMaterial(
  options: WaterShaderOptions = {},
): THREE.MeshStandardMaterial {
  const values = { ...DEFAULTS, ...options };

  const material = new THREE.MeshStandardMaterial({
    color: values.colorBase,
    roughness: 0.18,
    metalness: 0.0,
    side: THREE.FrontSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uColorBase = { value: values.colorBase };
    shader.uniforms.uColorDarkSpots = { value: values.colorDarkSpots };
    shader.uniforms.uColorHighlights = { value: values.colorHighlights };
    shader.uniforms.uColorFoam = { value: values.colorFoam };
    shader.uniforms.uColorCloud = { value: values.colorCloud };
    shader.uniforms.uScaleDark = { value: values.scaleDark };
    shader.uniforms.uScaleLight = { value: values.scaleLight };
    shader.uniforms.uFlowSpeed = { value: values.flowSpeed };
    shader.uniforms.uFlowDirection = { value: values.flowDirection };
    shader.uniforms.uWindSpeed = { value: values.windSpeed };
    shader.uniforms.uWindDirection = { value: values.windDirection };
    shader.uniforms.uWorldSize = {
      value: new THREE.Vector2(values.worldWidth, values.worldHeight),
    };
    shader.uniforms.tDepth = { value: values.depthTexture ?? null };
    shader.uniforms.cameraNear = { value: values.cameraNear };
    shader.uniforms.cameraFar = { value: values.cameraFar };
    shader.uniforms.resolution = { value: values.resolution };
    shader.uniforms.uFoamDistance = { value: values.foamDistance };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
        varying vec3 vGroundWorldPosition;
        varying vec4 vScreenPos;
        uniform float uTime;
        uniform vec2 uWorldSize;

        const float WAVE_AMP = 0.15;
        const float WAVE_FREQ = 0.3;
        const float WAVE_SPEED = 0.8;
        #include <common>
        `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        {
          vec4 waveWorldPosition = modelMatrix * vec4( position, 1.0 );

          float wave = sin(waveWorldPosition.x * WAVE_FREQ + uTime * WAVE_SPEED) * WAVE_AMP;
          wave += cos(waveWorldPosition.z * WAVE_FREQ * 0.7 + uTime * WAVE_SPEED * 0.6) * WAVE_AMP * 0.5;

          float distX = min(waveWorldPosition.x, uWorldSize.x - waveWorldPosition.x);
          float distZ = min(waveWorldPosition.z, uWorldSize.y - waveWorldPosition.z);
          float edgeDamp = smoothstep(0.0, 2.0, min(distX, distZ));

          transformed.y += wave * edgeDamp;
        }
        `,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vGroundWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        vScreenPos = gl_Position;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `
        varying vec3 vGroundWorldPosition;
        varying vec4 vScreenPos;

        uniform float uTime;
        uniform vec3 uColorBase;
        uniform vec3 uColorDarkSpots;
        uniform vec3 uColorHighlights;
        uniform vec3 uColorFoam;
        uniform vec3 uColorCloud;
        uniform float uScaleDark;
        uniform float uScaleLight;
        uniform float uFlowSpeed;
        uniform vec2 uFlowDirection;
        uniform float uWindSpeed;
        uniform vec2 uWindDirection;

        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform vec2 resolution;
        uniform float uFoamDistance;

        ${SimplexNoiseGLSL}
        ${CloudParsGLSL}

        vec2 waterHash2(vec2 p) {
          return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
        }

        // Returns (closest cell distance, second-closest) — the gap between
        // them is the Voronoi cell edge, used for the sparkle pattern below.
        vec2 waterVoronoi(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float minDist = 8.0;
          float secondMinDist = 8.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 neighbor = vec2(float(i), float(j));
              vec2 cellPoint = waterHash2(n + neighbor);
              float dist = length(neighbor + cellPoint - f);
              if (dist < minDist) {
                secondMinDist = minDist;
                minDist = dist;
              } else if (dist < secondMinDist) {
                secondMinDist = dist;
              }
            }
          }
          return vec2(minDist, secondMinDist);
        }

        float waterGetLinearDepth(float fragCoordZ) {
          float ndcZ = fragCoordZ * 2.0 - 1.0;
          return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndcZ * (cameraFar - cameraNear));
        }

        float waterReadDepthTexture(vec2 screenUv) {
          return waterGetLinearDepth(texture2D(tDepth, screenUv).r);
        }
        #include <common>
        `,
      )
      .replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        {
          vec3 waterColor = uColorBase;

          float cloudMixFactor = getCloudFactor(vGroundWorldPosition.xz, uTime);
          waterColor = mix(waterColor, uColorCloud, cloudMixFactor * 0.6);

          float foamFactor = 0.0;
          #ifdef USE_DEPTH_FOAM
            if (vScreenPos.w > 0.0) {
              vec2 screenUv = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
              float fragmentDepth = waterGetLinearDepth(gl_FragCoord.z);
              float sceneDepth = waterReadDepthTexture(screenUv);
              float depthDiff = sceneDepth - fragmentDepth;
              if (depthDiff > 0.0) {
                float shoreRatio = depthDiff / uFoamDistance;
                foamFactor = pow(smoothstep(0.0, 1.0, 1.0 - clamp(shoreRatio, 0.0, 1.0)), 4.0);
                float waveEdge = sin(uTime * 3.0 + vGroundWorldPosition.x * 2.0 + vGroundWorldPosition.z * 1.5) * 0.2;
                if (foamFactor > 0.01) foamFactor += waveEdge * foamFactor;
              }
            }
          #endif
          waterColor = mix(waterColor, uColorFoam, clamp(foamFactor, 0.0, 1.0));

          diffuseColor.rgb = waterColor;
        }
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
        #include <roughnessmap_fragment>
        {
          vec2 baseFlow = uFlowDirection * uTime * uFlowSpeed;
          vec2 vDarkData = waterVoronoi((vGroundWorldPosition.xz + baseFlow * 0.6) * uScaleDark);
          float maskDark = 1.0 - smoothstep(0.0, 0.15, vDarkData.y - vDarkData.x);

          vec2 vLightData = waterVoronoi((vGroundWorldPosition.xz + baseFlow * 1.2) * uScaleLight + vec2(42.5, 12.0));
          float maskLight = 1.0 - step(0.05, vLightData.y - vLightData.x);

          roughnessFactor = clamp(roughnessFactor + maskDark * 0.12 - maskLight * 0.15, 0.04, 0.4);
        }
        `,
      );

    material.userData.shader = shader;
    material.defines = material.defines ?? {};
    if (values.depthTexture) {
      material.defines.USE_DEPTH_FOAM = true;
    }
  };

  return material;
}

export class WaterController {
  public material: THREE.MeshStandardMaterial;

  constructor(options: WaterShaderOptions = {}) {
    this.material = createWaterShaderMaterial(options);
  }

  public update(elapsedTime: number): void {
    const uniforms = getShaderUniforms(this.material);
    if (uniforms?.uTime) {
      uniforms.uTime.value = elapsedTime;
    }
  }

  public setDepthTexture(texture: THREE.Texture | null): void {
    const uniforms = getShaderUniforms(this.material);
    if (uniforms?.tDepth) {
      uniforms.tDepth.value = texture;
    }
    const wantsFoam = Boolean(texture);
    if (Boolean(this.material.defines?.USE_DEPTH_FOAM) !== wantsFoam) {
      this.material.defines = this.material.defines ?? {};
      if (wantsFoam) {
        this.material.defines.USE_DEPTH_FOAM = true;
      } else {
        delete this.material.defines.USE_DEPTH_FOAM;
      }
      this.material.needsUpdate = true;
    }
  }

  public updateCamera(camera: THREE.PerspectiveCamera): void {
    const uniforms = getShaderUniforms(this.material);
    if (uniforms?.cameraNear) uniforms.cameraNear.value = camera.near;
    if (uniforms?.cameraFar) uniforms.cameraFar.value = camera.far;
  }

  public setResolution(width: number, height: number): void {
    const uniforms = getShaderUniforms(this.material);
    (uniforms?.resolution?.value as THREE.Vector2 | undefined)?.set(
      width,
      height,
    );
  }

  public dispose(): void {
    this.material.dispose();
  }
}
