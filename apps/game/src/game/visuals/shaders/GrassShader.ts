import * as THREE from "three";
import { CloudParsGLSL, CloudUniforms, SimplexNoiseGLSL } from "./ShaderUtils";

export const GrassShader = {
  uniforms: {
    uTime: { value: 0 },

    // --- PALETTE "GHIBLI DOUX" ---
    // Note : Base est maintenant la couleur dominante (claire), Dark est l'ombre (nuage)
    uColorBase: { value: new THREE.Color("#7baa5e") }, // Vert moyen lumineux (Sol par défaut)
    uColorLight: { value: new THREE.Color("#a6c875") }, // Vert très clair (Touches de lumière)
    uColorDark: { value: new THREE.Color("#6ea056") }, // Vert foncé (Ombres des nuages - Plus doux)
    uColorEarth: { value: new THREE.Color("#c7b0a4") }, // Terre

    // --- Settings ---
    ...CloudUniforms,
  },

  vertexShader: `
    #include <common>
    #include <shadowmap_pars_vertex>
    #include <fog_pars_vertex>

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <begin_vertex>
      #include <project_vertex>
      
      vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
      vWorldPosition = worldPosition.xyz;
      
      #include <shadowmap_vertex>
      #include <fog_vertex>
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorLight;
    uniform vec3 uColorDark;
    uniform vec3 uColorEarth;
    
    // Cloud uniforms (uWindSpeed, etc) are in CloudParsGLSL
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <fog_pars_fragment>

    // --- SHARED UTILS ---
    ${SimplexNoiseGLSL}
    ${CloudParsGLSL}

    // --- LECTURE MANUELLE DE L'OMBRE ---
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
          float bias = 0.0005; 
          if ( shadowDepth < shadowCoord3.z - bias ) {
            shadow = 0.0;
          }
        }
      #endif
      #endif
      return shadow;
    }

    void main() {
      // --- ECHELLES ---
      float scaleLight = 0.08;   // Taille des zones claires (fixes)
      float scaleEarth = 0.25;   // Taille de la terre
      float scaleGrain = 20.0;   // Grain GROS et VISIBLE (Fausse herbe)

      // 1. Base (Couleur principale)
      vec3 finalColor = uColorBase;

      // 2. Grain "Coups de Pinceau" (Appliqué direct sur la base)
      // On le calcule avant tout le reste pour qu'il texture tout le sol vert.
      float grainNoise = snoise(vWorldPosition.xz * scaleGrain);
      // Contraste fort pour être visible
      float grainFactor = smoothstep(-0.4, 0.4, grainNoise);
      // Mix : On assombrit/éclaircit de +/- 8%
      vec3 grainColor = mix(finalColor * 0.92, finalColor * 1.08, grainFactor);
      finalColor = grainColor;

      // 3. Nuages (Zone Dark qui bouge)
      // Utilisation de la logique partagée
      float cloudFactor = getCloudFactor(vWorldPosition.xz, uTime);
      finalColor = mix(finalColor, uColorDark, cloudFactor);

      // 4. Zones de Lumière (Fixes ou très lentes)
      // Pour ajouter de la richesse et ne pas avoir juste 2 couleurs
      float noiseLight = snoise(vWorldPosition.xz * scaleLight - vec2(50.0));
      // Touches légères
      finalColor = mix(finalColor, uColorLight, smoothstep(0.3, 0.7, noiseLight) * 0.5);

      // 5. Taches de Terre (Par dessus tout, sans grain d'herbe)
      float noiseEarth = snoise(vWorldPosition.xz * scaleEarth + vec2(10.0, 20.0));
      float maskEarth = smoothstep(0.65, 0.85, noiseEarth);
      finalColor = mix(finalColor, uColorEarth, maskEarth);

      // 6. Ombres Portées (Buildings)
      float shadowMask = getCustomShadow(); 
      vec3 shadowColor = finalColor * 0.6; 
      finalColor = mix(shadowColor, finalColor, shadowMask);

      #include <fog_fragment>

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export function createGrassShaderMaterial(
  overrides: Partial<{
    uColorBase: THREE.Color;
    uColorLight: THREE.Color;
    uColorDark: THREE.Color;
    uColorEarth: THREE.Color;
    uWindSpeed: number;
    uWindDirection: THREE.Vector2;
  }> = {},
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    THREE.UniformsLib.fog,
    GrassShader.uniforms,
  ]);

  if (overrides.uColorBase) uniforms.uColorBase.value = overrides.uColorBase;
  if (overrides.uColorLight) uniforms.uColorLight.value = overrides.uColorLight;
  if (overrides.uColorDark) uniforms.uColorDark.value = overrides.uColorDark;
  if (overrides.uColorEarth) uniforms.uColorEarth.value = overrides.uColorEarth;

  if (overrides.uWindSpeed) uniforms.uWindSpeed.value = overrides.uWindSpeed;
  if (overrides.uWindDirection)
    uniforms.uWindDirection.value = overrides.uWindDirection;

  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: GrassShader.vertexShader,
    fragmentShader: GrassShader.fragmentShader,
    lights: true,
    fog: true,
  });
}
