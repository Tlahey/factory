import * as THREE from "three";
import { CloudParsGLSL, CloudUniforms, SimplexNoiseGLSL } from "./ShaderUtils";

/**
 * Toon Water Shader - Version Opaque & Stylisée
 * * Modifications :
 * - Eau 100% opaque.
 * - Deux couches distinctes de taches (sombres et claires).
 * - Mouvement ondulatoire unifié (pas de croisement).
 * - Bordure d'écume (Shoreline) très marquée.
 * - VITESSES DIFFÉRENCIÉES : Couche sombre lente, couche claire rapide.
 */
export const ToonWaterShader = {
  uniforms: {
    // --- TIME ---
    uTime: { value: 0 },

    // --- PALETTE (Eau Claire "Caraïbes") ---
    uColorBase: { value: new THREE.Color("#4dade1") }, // Base : Bleu clair vibrant
    uColorDarkSpots: { value: new THREE.Color("#2a87bf") }, // Taches sombres : Bleu moyen
    uColorHighlights: { value: new THREE.Color("#ffffff") }, // Taches claires : Blanc bleuté
    uColorFoam: { value: new THREE.Color("#ffffff") }, // Écume : Blanc pur

    // --- VORONOI SETTINGS ---
    uScaleDark: { value: 1.0 }, // Taille des taches sombres
    uScaleLight: { value: 0.8 }, // Taille des taches claires (plus grandes pour éviter les cellules remplies)
    uFlowSpeed: { value: 0.2 }, // Vitesse de défilement de base (augmentée pour voir l'effet)
    uFlowDirection: { value: new THREE.Vector2(0.5, 0.2) }, // Direction du courant

    // --- NUAGES (Shared) ---
    ...CloudUniforms,
    // Couleur d'ombre spécifique à l'eau (Bleu très foncé/Grisé - Plus doux)
    uColorCloud: { value: new THREE.Color("#3d7aa3") },

    // --- DEPTH FOAM SETTINGS ---
    tDepth: { value: null as THREE.Texture | null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000.0 },
    resolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    uFoamDistance: { value: 0.4 }, // Distance RÉDUITE pour une ligne fine
    uFoamCutoff: { value: 0.8 }, // Netteté de la coupure
  },

  vertexShader: /* glsl */ `
    #include <common>
    #include <fog_pars_vertex>

    uniform float uTime;
    
    // Paramètres de vagues simples pour le vertex
    const float WAVE_AMP = 0.15;
    const float WAVE_FREQ = 0.3;
    const float WAVE_SPEED = 0.8;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec4 vScreenPos;

    void main() {
      vUv = uv;

      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      // --- Animation douce des sommets (Houle) ---
      // Moins frénétique, plus "nappe d'eau"
      float wave = sin(worldPos.x * WAVE_FREQ + uTime * WAVE_SPEED) * WAVE_AMP;
      wave += cos(worldPos.z * WAVE_FREQ * 0.7 + uTime * WAVE_SPEED * 0.6) * WAVE_AMP * 0.5;
      
      vec3 displaced = position;
      displaced.y += wave;

      vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      vScreenPos = gl_Position;

      #include <fog_vertex>
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorDarkSpots;
    uniform vec3 uColorHighlights;
    uniform vec3 uColorFoam;
    
    uniform float uScaleDark;
    uniform float uScaleLight;
    uniform float uFlowSpeed;
    uniform vec2 uFlowDirection;

    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec2 resolution;
    uniform float uFoamDistance;
    uniform float uFoamCutoff;
    
    // Cloud Uniforms (Partial from shared)
    uniform vec3 uColorCloud;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec4 vScreenPos;

    #include <common>
    #include <packing>
    #include <fog_pars_fragment>
    
    // --- SHARED UTILS ---
    ${SimplexNoiseGLSL}
    ${CloudParsGLSL}
    
    precision highp float;

    // --- HASH & VORONOI ---
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }

    // Voronoi Cellulaire : retourne vec2(minDist, secondMinDist)
    // Cela permet de calculer les BORDURES des cellules (lignes)
    vec2 voronoi(vec2 p) {
      vec2 n = floor(p);
      vec2 f = fract(p);
      float minDist = 8.0;
      float secondMinDist = 8.0;
      
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 neighbor = vec2(float(i), float(j));
          vec2 cellPoint = hash2(n + neighbor);
          
          // Animation supprimée pour éviter les artefacts de "popping"
          // cellPoint = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * cellPoint);
          
          vec2 diff = neighbor + cellPoint - f;
          float dist = length(diff);
          
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

    // --- DEPTH UTILS ---
    float getLinearDepth(float fragCoordZ) {
      float ndcZ = fragCoordZ * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndcZ * (cameraFar - cameraNear));
    }

    float readDepthTexture(vec2 screenUv) {
      float depthSample = texture2D(tDepth, screenUv).r;
      return getLinearDepth(depthSample);
    }

    void main() {
      // 1. POSITIONNEMENT DYNAMIQUE AVEC VITESSES DIFFÉRENCIÉES
      
      // Flux de base
      vec2 baseFlow = uFlowDirection * uTime * uFlowSpeed;
      
      // Couche Sombre (Fond) : Vitesse LENTE (0.6x)
      vec2 uvDark = vWorldPosition.xz + baseFlow * 0.6;
      
      // Couche Claire (Surface) : Vitesse RAPIDE (1.2x)
      // Cela crée un effet de parallaxe entre le fond et la surface
      vec2 uvLight = vWorldPosition.xz + baseFlow * 1.2;


      // 2. GÉNÉRATION DES MOTIFS (LIGNES ZELDA)
      
      // -- Couche Sombre (Fond - Lente) --
      vec2 vDarkData = voronoi(uvDark * uScaleDark);
      float distToEdgeDark = vDarkData.y - vDarkData.x;
      // Lignes sombres plus épaisses (0.1 -> 0.15)
      float maskDark = 1.0 - smoothstep(0.0, 0.15, distToEdgeDark);

      // -- Couche Claire (Caustiques / Filet - Rapide) --
      vec2 vLightData = voronoi(uvLight * uScaleLight + vec2(42.5, 12.0));
      float distToEdgeLight = vLightData.y - vLightData.x;
      // Lignes claires nettes et fines (sans dégradé) - seuil réduit pour éviter les remplissages
      float maskLight = 1.0 - step(0.05, distToEdgeLight);


      // 3. MÉLANGE DES COULEURS
      vec3 finalColor = uColorBase;

      // Appliquer les lignes sombres (lentes)
      finalColor = mix(finalColor, uColorDarkSpots, maskDark * 0.6); // 0.6 = opacité

      // Appliquer les lignes claires (rapides) par dessus
      finalColor = mix(finalColor, uColorHighlights, maskLight * 0.8); // 0.8 = intensité


      // 4. ÉCUME DE RIVAGE (SHORELINE FOAM)
      float foamFactor = 0.0;
      
      #ifdef USE_DEPTH_FOAM
        if (vScreenPos.w > 0.0) {
          vec2 screenUv = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
          float fragmentDepth = getLinearDepth(gl_FragCoord.z);
          float sceneDepth = readDepthTexture(screenUv);
          
          float depthDiff = sceneDepth - fragmentDepth;
          
          if (depthDiff > 0.0) {
             float shoreRatio = depthDiff / uFoamDistance;
             foamFactor = 1.0 - clamp(shoreRatio, 0.0, 1.0);
             foamFactor = smoothstep(0.0, 1.0, foamFactor);
             foamFactor = pow(foamFactor, 4.0); 

             float waveEdge = sin(uTime * 3.0 + vWorldPosition.x * 2.0 + vWorldPosition.z * 1.5) * 0.2;
             if (foamFactor > 0.01) foamFactor += waveEdge * foamFactor;
          }
        }
      #endif

      // Appliquer l'écume
      finalColor = mix(finalColor, uColorFoam, clamp(foamFactor, 0.0, 1.0));

      // 5. NUAGES (Ombres intégrées - Shared Logic)
      // On applique l'ombre PAR DESSUS tout (même l'écume, car les nuages cachent le soleil pour tout le monde)
      float cloudMixFactor = getCloudFactor(vWorldPosition.xz, uTime);
      
      // On mixe avec la couleur d'ombre définie
      finalColor = mix(finalColor, uColorCloud, cloudMixFactor * 0.8);

      #include <fog_fragment>

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// ... Interface et Factory (Mêmes qu'avant, juste mise à jour des noms d'options) ...

export interface ToonWaterOptions {
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

  windSpeed?: number;
  windDirection?: THREE.Vector2;
  colorCloud?: THREE.Color;
}

export function createToonWaterMaterial(
  options: ToonWaterOptions = {},
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    ToonWaterShader.uniforms,
  ]);

  if (options.colorBase) uniforms.uColorBase.value = options.colorBase;
  if (options.colorDarkSpots)
    uniforms.uColorDarkSpots.value = options.colorDarkSpots;
  if (options.colorHighlights)
    uniforms.uColorHighlights.value = options.colorHighlights;
  if (options.colorFoam) uniforms.uColorFoam.value = options.colorFoam;

  if (options.scaleDark !== undefined)
    uniforms.uScaleDark.value = options.scaleDark;
  if (options.scaleLight !== undefined)
    uniforms.uScaleLight.value = options.scaleLight;
  if (options.flowSpeed !== undefined)
    uniforms.uFlowSpeed.value = options.flowSpeed;
  if (options.flowDirection)
    uniforms.uFlowDirection.value = options.flowDirection;

  if (options.depthTexture !== undefined)
    uniforms.tDepth.value = options.depthTexture;
  if (options.cameraNear !== undefined)
    uniforms.cameraNear.value = options.cameraNear;
  if (options.cameraFar !== undefined)
    uniforms.cameraFar.value = options.cameraFar;
  if (options.resolution) uniforms.resolution.value = options.resolution;
  if (options.foamDistance !== undefined)
    uniforms.uFoamDistance.value = options.foamDistance;

  if (options.windSpeed !== undefined)
    uniforms.uWindSpeed.value = options.windSpeed;
  if (options.windDirection)
    uniforms.uWindDirection.value = options.windDirection;
  if (options.colorCloud) uniforms.uColorCloud.value = options.colorCloud;

  const defines: Record<string, boolean> = {};
  if (options.depthTexture) {
    defines.USE_DEPTH_FOAM = true;
  }

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: ToonWaterShader.vertexShader,
    fragmentShader: ToonWaterShader.fragmentShader,
    defines: defines,
    fog: true,
    transparent: false, // OPAQUE
    side: THREE.FrontSide, // Optimisation
  });

  return material;
}

export class ToonWaterController {
  public material: THREE.ShaderMaterial;

  constructor(options: ToonWaterOptions = {}) {
    this.material = createToonWaterMaterial(options);
  }

  public update(deltaTime: number): void {
    if (this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  public setDepthTexture(texture: THREE.Texture | null): void {
    this.material.uniforms.tDepth.value = texture;
    if (texture) {
      this.material.defines.USE_DEPTH_FOAM = true;
    } else {
      delete this.material.defines.USE_DEPTH_FOAM;
    }
    this.material.needsUpdate = true;
  }

  public updateCamera(camera: THREE.PerspectiveCamera): void {
    this.material.uniforms.cameraNear.value = camera.near;
    this.material.uniforms.cameraFar.value = camera.far;
  }

  public setResolution(width: number, height: number): void {
    this.material.uniforms.resolution.value.set(width, height);
  }

  public dispose(): void {
    this.material.dispose();
  }
}
