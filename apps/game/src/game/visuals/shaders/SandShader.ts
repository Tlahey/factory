import * as THREE from "three";
import {
  CloudParsGLSL,
  CloudUniforms,
  SimplexNoiseGLSL,
  getShaderUniforms,
} from "./ShaderUtils";

/**
 * Sand ground material — shoreline tile, blends into grass at its edges.
 *
 * Same `MeshStandardMaterial` + `onBeforeCompile` approach as `GrassShader.ts`
 * (see that file for the rationale). The dune height-field that used to drive
 * a hand-rolled specular hack now perturbs the real geometric normal, so
 * highlights come from THREE's own GGX lighting/env-map reflection instead of
 * a fake `NdotH` sparkle.
 */

export interface SandShaderOptions {
  colorBase?: THREE.Color;
  colorDark?: THREE.Color;
  colorGrass?: THREE.Color;
  grainScale?: number;
  reliefStrength?: number;
  windSpeed?: number;
  windDirection?: THREE.Vector2;
  colorCloud?: THREE.Color;
  worldWidth?: number;
  worldHeight?: number;
}

const DEFAULTS = {
  colorBase: new THREE.Color("#e8d9a0"),
  colorDark: new THREE.Color("#c9b87a"),
  colorGrass: new THREE.Color("#7baa5e"),
  grainScale: 3.0,
  reliefStrength: 0.15,
  windSpeed: CloudUniforms.uWindSpeed.value as number,
  windDirection: (CloudUniforms.uWindDirection.value as THREE.Vector2).clone(),
  colorCloud: new THREE.Color("#b09560"),
  worldWidth: 50,
  worldHeight: 50,
};

export function createSandShaderMaterial(
  options: SandShaderOptions = {},
): THREE.MeshStandardMaterial {
  const values = { ...DEFAULTS, ...options };

  const material = new THREE.MeshStandardMaterial({
    color: values.colorBase,
    roughness: 0.8,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uColorBase = { value: values.colorBase };
    shader.uniforms.uColorDark = { value: values.colorDark };
    shader.uniforms.uColorGrass = { value: values.colorGrass };
    shader.uniforms.uColorCloud = { value: values.colorCloud };
    shader.uniforms.uGrainScale = { value: values.grainScale };
    shader.uniforms.uReliefStrength = { value: values.reliefStrength };
    shader.uniforms.uWindSpeed = { value: values.windSpeed };
    shader.uniforms.uWindDirection = { value: values.windDirection };

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
        uniform vec3 uColorDark;
        uniform vec3 uColorGrass;
        uniform vec3 uColorCloud;
        uniform float uGrainScale;
        uniform float uReliefStrength;
        uniform float uWindSpeed;
        uniform vec2 uWindDirection;

        ${SimplexNoiseGLSL}
        ${CloudParsGLSL}

        float sandHash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float getSandHeight(vec2 pos) {
            float dunes = snoise(pos * 0.08) * 0.5;
            float grain = sandHash(pos * uGrainScale * 10.0) * 0.05;
            float fineGrain = sandHash(pos * uGrainScale * 30.0) * 0.02;
            return dunes + grain + fineGrain;
        }

        vec3 perturbDuneNormal( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
            vec3 vSigmaX = dFdx( surf_pos );
            vec3 vSigmaY = dFdy( surf_pos );
            vec3 vN = surf_norm;
            vec3 R1 = cross( vSigmaY, vN );
            vec3 R2 = cross( vN, vSigmaX );
            float fDet = dot( vSigmaX, R1 ) * faceDirection;
            vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
            return normalize( abs( fDet ) * surf_norm - vGrad );
        }
        #include <common>
        `,
      )
      .replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        {
          vec2 worldXZ = vGroundWorldPosition.xz;
          float worldY = vGroundWorldPosition.y;

          // Sand tone (dune shading approximated from the height field).
          float H = getSandHeight(worldXZ);
          vec3 sandColor = mix(uColorBase, uColorDark, smoothstep(-0.2, 0.2, H) * 0.5 + 0.25);

          // Fake grass on the flat lip of the slope, fading to sand downhill.
          float heightTop = 0.1;
          float heightBottom = -0.3;
          float sandFactor = 1.0 - smoothstep(heightBottom, heightTop, worldY);
          float noiseSlope = snoise(worldXZ * 0.3) * 0.15;
          sandFactor = clamp(sandFactor + noiseSlope, 0.0, 1.0);

          vec3 grassColorTextured = uColorGrass;
          float grassNoise = snoise(worldXZ * 0.1 + 50.0);
          grassColorTextured += vec3(grassNoise * 0.05);
          float grassGrain = sandHash(worldXZ * 5.0) * 0.05;
          grassColorTextured -= vec3(grassGrain);

          vec3 groundColor = mix(grassColorTextured, sandColor, sandFactor);

          float cloudMixFactor = getCloudFactor(worldXZ, uTime);
          vec3 cloudShadowColor = mix(uColorGrass * 0.77, uColorCloud, sandFactor);
          groundColor = mix(groundColor, cloudShadowColor, cloudMixFactor * 0.6);

          diffuseColor.rgb = groundColor;
        }
        `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor, 0.55, 0.95);
        `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `
        #include <normal_fragment_maps>
        {
          vec2 worldXZ = vGroundWorldPosition.xz;
          float epsilon = 0.01;
          float H = getSandHeight(worldXZ);
          float Hx = getSandHeight(worldXZ + vec2(epsilon, 0.0));
          float Hy = getSandHeight(worldXZ + vec2(0.0, epsilon));
          vec2 dHdxy = vec2(Hx - H, Hy - H) * (10.0 / epsilon) * uReliefStrength;
          normal = perturbDuneNormal( -vViewPosition, normal, dHdxy, faceDirection );
        }
        `,
      );

    material.userData.shader = shader;
  };

  return material;
}

export class SandShaderController {
  public material: THREE.MeshStandardMaterial;

  constructor(options: SandShaderOptions = {}) {
    this.material = createSandShaderMaterial(options);
  }

  public update(elapsedTime: number): void {
    const uniforms = getShaderUniforms(this.material);
    if (uniforms?.uTime) {
      uniforms.uTime.value = elapsedTime;
    }
  }

  public dispose(): void {
    this.material.dispose();
  }
}
