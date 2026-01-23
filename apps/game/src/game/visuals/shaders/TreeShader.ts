import * as THREE from "three";
import { SimplexNoiseGLSL, CloudParsGLSL, CloudUniforms } from "./ShaderUtils";

/**
 * Tree Shader - Adds wind sway animation and toon shading to trees.
 * The foliage gently sways in the wind while trunk remains mostly stable.
 */
export const TreeShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x228b22) }, // Base color (overridden per material)
    uColorHighlight: { value: new THREE.Color(0x90ee90) }, // Light highlight
    uSwayStrength: { value: 0.08 }, // How much the tree sways
    uSwaySpeed: { value: 1.5 }, // Speed of sway animation
    ...CloudUniforms,
  },

  vertexShader: /* glsl */ `
    #include <common>
    #include <shadowmap_pars_vertex>
    #include <fog_pars_vertex>

    uniform float uTime;
    uniform float uSwayStrength;
    uniform float uSwaySpeed;
    uniform vec2 uWindDirection;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vHeight;

    ${SimplexNoiseGLSL}

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      
      // Height factor - higher parts sway more
      vHeight = position.y;
      float heightFactor = smoothstep(0.0, 0.5, position.y);
      
      // Get initial world position for wind calculation
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      
      // Wind sway based on position and time
      float windNoise = snoise(vec2(
        worldPos.x * 0.5 + uTime * uSwaySpeed * 0.3,
        worldPos.z * 0.5 + uTime * uSwaySpeed * 0.2
      ));
      
      // Secondary faster sway for rustling effect
      float rustleNoise = snoise(vec2(
        worldPos.x * 2.0 + uTime * uSwaySpeed * 1.5,
        worldPos.z * 2.0 + uTime * uSwaySpeed * 1.2
      )) * 0.3;
      
      float totalSway = (windNoise + rustleNoise) * uSwayStrength * heightFactor;
      
      // Apply sway in wind direction
      transformed.x += totalSway * uWindDirection.x;
      transformed.z += totalSway * uWindDirection.y;
      
      // Slight vertical bounce
      transformed.y += abs(windNoise) * uSwayStrength * 0.2 * heightFactor;
      
      #include <project_vertex>
      
      // worldPosition is required by shadowmap_vertex - must be vec4
      vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
      vWorldPosition = worldPosition.xyz;
      
      #include <shadowmap_vertex>
      #include <fog_vertex>
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uColorHighlight;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vHeight;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <fog_pars_fragment>

    ${SimplexNoiseGLSL}
    ${CloudParsGLSL}

    // Manual shadow reading
    float getCustomShadow() {
      float shadow = 1.0;
      #ifdef USE_SHADOWMAP
      #if NUM_DIR_LIGHT_SHADOWS > 0
        vec4 shadowCoord = vDirectionalShadowCoord[0];
        vec3 shadowCoord3 = shadowCoord.xyz / shadowCoord.w;
        if ( shadowCoord3.x >= 0.0 && shadowCoord3.x <= 1.0 && 
             shadowCoord3.y >= 0.0 && shadowCoord3.y <= 1.0 && 
             shadowCoord3.z <= 1.0 ) {
          float shadowDepth = unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], shadowCoord3.xy ) );
          float bias = 0.001; 
          if ( shadowDepth < shadowCoord3.z - bias ) {
            shadow = 0.0;
          }
        }
      #endif
      #endif
      return shadow;
    }

    void main() {
      vec3 finalColor = uColor;
      
      // Simple toon shading based on normal
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float NdotL = dot(vNormal, lightDir);
      
      // 3-step toon gradient
      float toonShade;
      if (NdotL > 0.5) {
        toonShade = 1.0;
      } else if (NdotL > 0.0) {
        toonShade = 0.8;
      } else {
        toonShade = 0.6;
      }
      
      finalColor *= toonShade;
      
      // Add highlight on top areas
      float heightGradient = smoothstep(0.3, 0.8, vHeight);
      finalColor = mix(finalColor, uColorHighlight, heightGradient * 0.3 * toonShade);
      
      // Subtle color variation based on position
      float colorVariation = snoise(vWorldPosition.xz * 5.0) * 0.1;
      finalColor *= (1.0 + colorVariation);
      
      // Cloud shadows
      float cloudFactor = getCloudFactor(vWorldPosition.xz, uTime);
      finalColor = mix(finalColor, finalColor * 0.7, cloudFactor * 0.4);
      
      // Building shadows
      float shadowMask = getCustomShadow();
      finalColor = mix(finalColor * 0.5, finalColor, shadowMask);

      #include <fog_fragment>

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

/**
 * Creates a tree foliage shader material with wind animation
 */
export function createTreeFoliageMaterial(
  color: THREE.ColorRepresentation = 0x228b22,
  options: {
    swayStrength?: number;
    swaySpeed?: number;
  } = {},
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    THREE.UniformsLib.fog,
    TreeShader.uniforms,
  ]);

  uniforms.uColor.value = new THREE.Color(color);

  // Calculate a brighter highlight color
  const baseColor = new THREE.Color(color);
  const highlightColor = baseColor.clone();
  highlightColor.offsetHSL(0.05, 0.1, 0.2);
  uniforms.uColorHighlight.value = highlightColor;

  if (options.swayStrength !== undefined) {
    uniforms.uSwayStrength.value = options.swayStrength;
  }
  if (options.swaySpeed !== undefined) {
    uniforms.uSwaySpeed.value = options.swaySpeed;
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: TreeShader.vertexShader,
    fragmentShader: TreeShader.fragmentShader,
    lights: true,
    fog: true,
  });
}

/**
 * Creates a trunk shader material (less sway, brown tones)
 */
export function createTreeTrunkMaterial(
  color: THREE.ColorRepresentation = 0x8b5a2b,
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    THREE.UniformsLib.fog,
    TreeShader.uniforms,
  ]);

  uniforms.uColor.value = new THREE.Color(color);
  uniforms.uColorHighlight.value = new THREE.Color(color).offsetHSL(
    0,
    -0.1,
    0.1,
  );
  uniforms.uSwayStrength.value = 0.02; // Minimal trunk sway
  uniforms.uSwaySpeed.value = 0.8;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: TreeShader.vertexShader,
    fragmentShader: TreeShader.fragmentShader,
    lights: true,
    fog: true,
  });
}

/**
 * Tree Shader Controller - manages time updates for all tree materials
 */
export class TreeShaderController {
  private materials: THREE.ShaderMaterial[] = [];

  public addMaterial(material: THREE.ShaderMaterial): void {
    this.materials.push(material);
  }

  public update(deltaTime: number): void {
    for (const material of this.materials) {
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value += deltaTime;
      }
    }
  }

  public dispose(): void {
    this.materials = [];
  }
}

// Global controller instance
export const treeShaderController = new TreeShaderController();
