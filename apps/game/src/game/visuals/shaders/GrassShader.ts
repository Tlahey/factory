import * as THREE from "three";
import { CloudParsGLSL, CloudUniforms, SimplexNoiseGLSL } from "./ShaderUtils";

/**
 * Grass ground material.
 *
 * `MeshStandardMaterial` customised via `onBeforeCompile` so the terrain is
 * lit by the same PBR pipeline (directional light, shadows, `scene.environment`
 * reflections) as the buildings, instead of the old hand-rolled toon shading.
 * The procedural colour variation (grain, light patches, earth spots, cloud
 * shadow) is injected at `#include <color_fragment>`; a matching grain pattern
 * modulates roughness so the surface doesn't read as a flat plastic sheet.
 */

export interface GrassMaterialOverrides {
  uColorBase?: THREE.Color;
  uColorLight?: THREE.Color;
  uColorDark?: THREE.Color;
  uColorEarth?: THREE.Color;
  uWindSpeed?: number;
  uWindDirection?: THREE.Vector2;
}

const DEFAULTS = {
  uColorBase: new THREE.Color("#7baa5e"),
  uColorLight: new THREE.Color("#a6c875"),
  uColorDark: new THREE.Color("#557d42"),
  uColorEarth: new THREE.Color("#c7b0a4"),
  uWindSpeed: CloudUniforms.uWindSpeed.value as number,
  uWindDirection: (CloudUniforms.uWindDirection.value as THREE.Vector2).clone(),
};

export function createGrassShaderMaterial(
  overrides: GrassMaterialOverrides = {},
): THREE.MeshStandardMaterial {
  const values = { ...DEFAULTS, ...overrides };

  const material = new THREE.MeshStandardMaterial({
    color: values.uColorBase,
    roughness: 0.92,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uColorBase = { value: values.uColorBase };
    shader.uniforms.uColorLight = { value: values.uColorLight };
    shader.uniforms.uColorDark = { value: values.uColorDark };
    shader.uniforms.uColorEarth = { value: values.uColorEarth };
    shader.uniforms.uWindSpeed = { value: values.uWindSpeed };
    shader.uniforms.uWindDirection = { value: values.uWindDirection };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `varying vec3 vGroundWorldPosition;\n#include <common>`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vGroundWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `
        varying vec3 vGroundWorldPosition;
        uniform float uTime;
        uniform vec3 uColorBase;
        uniform vec3 uColorLight;
        uniform vec3 uColorDark;
        uniform vec3 uColorEarth;
        uniform float uWindSpeed;
        uniform vec2 uWindDirection;

        ${SimplexNoiseGLSL}
        ${CloudParsGLSL}
        #include <common>
        `,
      )
      .replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        {
          vec2 worldXZ = vGroundWorldPosition.xz;
          vec3 groundColor = uColorBase;

          // Hand-painted "brush stroke" grain, coarse enough to read as texture.
          float grainNoise = snoise(worldXZ * 20.0);
          float grainFactor = smoothstep(-0.4, 0.4, grainNoise);
          groundColor = mix(groundColor * 0.92, groundColor * 1.08, grainFactor);

          // Slow-moving light patches.
          float noiseLight = snoise(worldXZ * 0.08 - vec2(50.0));
          groundColor = mix(groundColor, uColorLight, smoothstep(0.3, 0.7, noiseLight) * 0.5);

          // Bare earth patches.
          float noiseEarth = snoise(worldXZ * 0.25 + vec2(10.0, 20.0));
          float maskEarth = smoothstep(0.65, 0.85, noiseEarth);
          groundColor = mix(groundColor, uColorEarth, maskEarth);

          // Drifting cloud shadow.
          float cloudFactor = getCloudFactor(worldXZ, uTime);
          groundColor = mix(groundColor, uColorDark, cloudFactor * 0.6);

          diffuseColor.rgb = groundColor;
        }
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
        #include <roughnessmap_fragment>
        {
          float roughnessNoise = snoise(vGroundWorldPosition.xz * 20.0 + 5.0);
          roughnessFactor = clamp(roughnessFactor + roughnessNoise * 0.05, 0.6, 1.0);
        }
        `,
      );

    material.userData.shader = shader;
  };

  return material;
}
