import * as THREE from "three";
import { CloudParsGLSL, CloudUniforms, SimplexNoiseGLSL } from "./ShaderUtils";

/**
 * Sand Shader - Version Dégradé Fixé
 * * Correctif : La transition est maintenant calculée avec une zone "tampon" plus large
 * pour garantir que le passage du sable à l'herbe est progressif (flou).
 */
export const SandShader = {
  uniforms: {
    uTime: { value: 0 },

    // --- COULEURS ---
    uColorBase: { value: new THREE.Color("#e8d9a0") }, // Sable
    uColorDark: { value: new THREE.Color("#c9b87a") }, // Sable mouillé
    uColorGrass: { value: new THREE.Color("#7baa5e") }, // Herbe

    // --- REGLAGES TEXTURE ---
    uGrainScale: { value: 3.0 },
    uReliefStrength: { value: 0.15 },
    uSparkleIntensity: { value: 0.5 },

    // --- NUAGES (intégrés) ---
    ...CloudUniforms,
    // NOTE: uColorCloud is defined in CloudUniforms?
    // Actually my shared CloudUniforms (Step 218) ONLY has uWindSpeed/Direction.
    // So I need to keep uColorCloud here if it's specific to Sand.
    // Wait, I didn't add uCloudColor to CloudUniforms in Step 218.
    // I specifically commented: "We might need separate colors per shader"
    // So I should keep uColorCloud here.
    uColorCloud: { value: new THREE.Color("#dbbb80") }, // Sable ombragé (Plus doux)

    // --- REGLAGES TRANSITION ---
    // uEdgeSize : À quelle distance du bord commence le sable ?
    uEdgeSize: { value: 1.0 },

    // uTransitionRange : La largeur du flou (plus c'est grand, plus le dégradé est long)
    uTransitionRange: { value: 0.1 },

    uWorldSize: { value: new THREE.Vector2(50, 50) },
  },

  vertexShader: /* glsl */ `
    #include <common>
    #include <shadowmap_pars_vertex>
    #include <fog_pars_vertex>

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      vNormal = normalize(transformedNormal);
      #include <begin_vertex>
      #include <project_vertex>
      vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
      vWorldPosition = worldPosition.xyz;
      vViewPosition = - mvPosition.xyz; 
      #include <shadowmap_vertex>
      #include <fog_vertex>
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorDark;
    uniform vec3 uColorGrass;
    
    uniform float uGrainScale;
    uniform float uReliefStrength;
    uniform float uSparkleIntensity;
    
    uniform float uEdgeSize;
    uniform float uTransitionRange;
    uniform vec2 uWorldSize;

    // Cloud uniforms
    // uWindSpeed/Direction come from CloudParsGLSL
    uniform vec3 uColorCloud;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <fog_pars_fragment>
    
    // --- SHARED UTILS ---
    ${SimplexNoiseGLSL}
    ${CloudParsGLSL}

    // --- BRUIT (LOCAL) ---
    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }
    // REMOVED: texture/permute functions (now in SimplexNoiseGLSL)
    
    // Helper local wrapper if needed or just use snoise directly
    
    float getSandHeight(vec2 pos) {
        float dunes = snoise(pos * 0.08) * 0.5;
        float grain = hash(pos * uGrainScale * 10.0) * 0.05;
        float fineGrain = hash(pos * uGrainScale * 30.0) * 0.02;
        return dunes + grain + fineGrain;
    }

    vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
        vec3 vSigmaX = dFdx( surf_pos );
        vec3 vSigmaY = dFdy( surf_pos );
        vec3 vN = surf_norm;
        vec3 R1 = cross( vSigmaY, vN );
        vec3 R2 = cross( vN, vSigmaX );
        float fDet = dot( vSigmaX, R1 );
        fDet *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );
        vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
        return normalize( abs( fDet ) * surf_norm - vGrad );
    }

    void main() {
      vec2 worldXZ = vWorldPosition.xz;
      
      // 1. RELIEF
      float epsilon = 0.01;
      float H = getSandHeight(worldXZ);
      float Hx = getSandHeight(worldXZ + vec2(epsilon, 0.0));
      float Hy = getSandHeight(worldXZ + vec2(0.0, epsilon));
      vec2 dHdxy = vec2(Hx - H, Hy - H) * (10.0 / epsilon) * uReliefStrength;
      
      vec3 normal = normalize( vNormal );
      normal = perturbNormalArb( -vViewPosition, normal, dHdxy, 1.0 );

      // 2. COULEUR SABLE
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diffuse = max(dot(normal, lightDir), 0.0);
      float mixFactor = smoothstep(-0.2, 0.2, H) * diffuse + 0.5;
      vec3 surfaceColor = mix(uColorBase, uColorDark, mixFactor);

      // Paillettes
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfVector = normalize(lightDir + viewDir);
      float NdotH = dot(normal, halfVector);
      float sparkleNoise = hash(worldXZ * 20.0 + uTime * 0.1); 
      float spec = pow(max(NdotH, 0.0), 100.0) * sparkleNoise;
      surfaceColor += vec3(1.0, 0.9, 0.8) * spec * uSparkleIntensity;

      // ==========================================================
      // 3. TRANSITION SABLE -> HERBE (DÉGRADÉ DOUX)
      // ==========================================================
      
      float worldY = vWorldPosition.y;

      // On définit une plage de hauteur pour la transition (Resserrée pour moins de vert)
      float heightTop = 0.1;    // Le vert reste uniquement sur le plat (Y >= 0)
      float heightBottom = -0.3;  // Le sable apparait très vite dès que ça descend

      // Facteur Sable : 0.0 en haut (Top), 1.0 en bas (Bottom)
      float sandFactor = 1.0 - smoothstep(heightBottom, heightTop, worldY);
      
      // Ajout de bruit sur la transition pour "casser" la ligne
      float noiseSlope = snoise(vWorldPosition.xz * 0.3) * 0.15;
      sandFactor = clamp(sandFactor + noiseSlope, 0.0, 1.0);

      // --- AMÉLIORATION DE L'HERBE (TEXTURE) ---
      vec3 grassColorTextured = uColorGrass;
      
      // Bruit basse fréquence pour les variations de teinte (comme le shader d'herbe)
      float grassNoise = snoise(vWorldPosition.xz * 0.1 + 50.0);
      // Variation : Un peu plus clair/sombre
      grassColorTextured += vec3(grassNoise * 0.05); 
      
      // Bruit haute fréquence pour le "grain"
      float grassGrain = hash(vWorldPosition.xz * 5.0) * 0.05;
      grassColorTextured -= vec3(grassGrain);

      vec3 finalColor = mix(grassColorTextured, surfaceColor, sandFactor);

      // --- NUAGES (Ombres intégrées - Shared Logic) ---
      float cloudMixFactor = getCloudFactor(vWorldPosition.xz, uTime);

      // Ombre cloud sur le sable utilise uColorCloud, sur l'herbe utilise uColorGrass assombrie
      // Note: uColorGrass * 0.77 approxime uColorDark de GrassShader (#5e8c45 vs #7baa5e)
      vec3 cloudShadowColor = mix(uColorGrass * 0.77, uColorCloud, sandFactor);
      
      finalColor = mix(finalColor, cloudShadowColor, cloudMixFactor);

      #include <fog_fragment>

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export interface SandShaderOptions {
  colorBase?: THREE.Color;
  colorDark?: THREE.Color;
  colorGrass?: THREE.Color;

  grainScale?: number;
  reliefStrength?: number;
  sparkleIntensity?: number;

  windSpeed?: number;
  windDirection?: THREE.Vector2;
  colorCloud?: THREE.Color;

  edgeSize?: number; // Distance du bord où le sable est pur
  transitionRange?: number; // Largeur du dégradé (flou)
  worldWidth?: number;
  worldHeight?: number;
}

export function createSandShaderMaterial(
  options: SandShaderOptions = {},
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.clone(SandShader.uniforms);
  const mergedUniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    THREE.UniformsLib.fog,
    uniforms,
  ]);

  if (options.colorBase) mergedUniforms.uColorBase.value = options.colorBase;
  if (options.colorDark) mergedUniforms.uColorDark.value = options.colorDark;
  if (options.colorGrass) mergedUniforms.uColorGrass.value = options.colorGrass;
  if (options.grainScale !== undefined)
    mergedUniforms.uGrainScale.value = options.grainScale;
  if (options.reliefStrength !== undefined)
    mergedUniforms.uReliefStrength.value = options.reliefStrength;
  if (options.sparkleIntensity !== undefined)
    mergedUniforms.uSparkleIntensity.value = options.sparkleIntensity;

  if (options.windSpeed !== undefined)
    mergedUniforms.uWindSpeed.value = options.windSpeed;
  if (options.windDirection)
    mergedUniforms.uWindDirection.value = options.windDirection;
  if (options.colorCloud) mergedUniforms.uColorCloud.value = options.colorCloud;

  if (options.edgeSize !== undefined)
    mergedUniforms.uEdgeSize.value = options.edgeSize;
  if (options.transitionRange !== undefined)
    mergedUniforms.uTransitionRange.value = options.transitionRange;

  if (options.worldWidth !== undefined || options.worldHeight !== undefined) {
    const w = options.worldWidth || 50;
    const h = options.worldHeight || 50;
    mergedUniforms.uWorldSize.value.set(w, h);
  }

  return new THREE.ShaderMaterial({
    uniforms: mergedUniforms,
    vertexShader: SandShader.vertexShader,
    fragmentShader: SandShader.fragmentShader,
    lights: true,
    fog: true,
  });
}

export class SandShaderController {
  public material: THREE.ShaderMaterial;

  constructor(options: SandShaderOptions = {}) {
    this.material = createSandShaderMaterial(options);
  }

  public update(deltaTime: number): void {
    if (this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  public setWorldBounds(width: number, height: number): void {
    if (this.material.uniforms.uWorldSize) {
      this.material.uniforms.uWorldSize.value.set(width, height);
    }
  }

  public dispose(): void {
    this.material.dispose();
  }
}
