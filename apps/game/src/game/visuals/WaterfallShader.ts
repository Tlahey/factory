import * as THREE from "three";

// --- 1. LE BRUIT (Toujours inclus pour éviter l'erreur) ---
const SimplexNoise3D = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ ); 
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`;

export const ToonWaterfallShader = {
  uniforms: {
    uTime: { value: 0 },
    // Couleurs
    uColorTop: { value: new THREE.Color("#4dade1") }, // Bleu en haut
    uColorBottom: { value: new THREE.Color("#ffffff") }, // Blanc en bas (écume)

    // Paramètres
    uScale: { value: 6.0 }, // Densité
    uSpeed: { value: 2.5 }, // Vitesse de chute
    uTurbulence: { value: 0.3 }, // Force de la déformation (anti-lignes droites)
    uOpacity: { value: 1.0 },

    // Paramètres du FOG / Masque
    uFadeHeight: { value: 0.1 }, // Pourcentage du bas qui disparaît (0.1 = 10%)

    ...THREE.UniformsLib.fog,
  },

  vertexShader: /* glsl */ `
    #include <common>
    #include <fog_pars_vertex>

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      
      // Calculate world position for animation offset in fragment shader
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      // No vertex displacement - keep the mesh flat
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      #include <fog_vertex>
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorTop;
    uniform vec3 uColorBottom;
    
    uniform float uScale;
    uniform float uSpeed;
    uniform float uTurbulence;
    uniform float uOpacity;
    uniform float uFadeHeight;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    #include <common>
    #include <fog_pars_fragment>
    ${SimplexNoise3D}

    // Fonction Voronoi simplifiée pour l'effet "cellules d'eau"
    // Now takes an offset to desync between tiles
    float voronoi(vec2 u, float timeOffset) {
        vec2 n = floor(u);
        vec2 f = fract(u);
        float m = 1.0;
        for(int j=-1; j<=1; j++) {
            for(int i=-1; i<=1; i++) {
                vec2 g = vec2(float(i),float(j));
                // Random sans texture
                vec2 o = fract(sin(vec2(dot(n + g, vec2(127.1, 311.7)), dot(n + g, vec2(269.5, 183.3)))) * 43758.5453);
                // Animation avec offset unique par tuile
                o = 0.5 + 0.5 * sin(uTime + timeOffset + 6.2831 * o);
                vec2 r = g + o - f;
                float d = dot(r,r);
                m = min(m, d);
            }
        }
        return sqrt(m); // Distance euclidienne
    }
    void main() {
        // --- OFFSET POUR DÉSYNCHRONISATION ---
        // Utilise la position pour désynchroniser, mais PAS pour changer la direction
        float tileIndex = floor(vWorldPosition.x + vWorldPosition.z);
        float phaseOffset = mod(tileIndex, 10.0) * 0.3; // Décalage de phase seulement
        float patternOffset = mod(tileIndex * 1.7, 5.0); // Pour varier le pattern Voronoi
        
        // --- 1. COORDONNÉES & TURBULENCE ---
        // Utiliser la position mondiale Y pour l'animation (toujours vers le bas)
        float worldYNormalized = clamp(-vWorldPosition.y / 3.0, 0.0, 1.0); // 0 en haut, 1 en bas
        
        vec2 uv = vUv;
        
        // Turbulence horizontale légère
        float noiseWave = snoise(vec3(vUv.y * 4.0, vUv.x * 10.0, uTime * 0.5 + phaseOffset)); 
        uv.x += noiseWave * uTurbulence * 0.2; 

        // Défilement vertical basé sur position mondiale Y (TOUJOURS vers le bas)
        // On soustrait le temps pour que le pattern descende
        uv.y = worldYNormalized - uTime * uSpeed + phaseOffset; 

        // --- 2. GÉNÉRATION DU MOTIF ---
        vec2 scale = vec2(uScale, uScale * 0.2); 
        float v = voronoi(uv * scale, patternOffset);
        
        // Rendre les lignes plus nettes (effet toon)
        float waterPattern = smoothstep(0.1, 0.25, v);

        // --- 3. COULEUR & DÉGRADÉ VERTICAL ---
        // Basé sur position mondiale pour être cohérent
        float verticalGradient = 1.0 - worldYNormalized; // 1 en haut, 0 en bas
        vec3 finalColor = mix(uColorBottom, uColorTop, verticalGradient);

        // Ajouter le motif de l'eau (plus clair)
        finalColor += (1.0 - waterPattern) * 0.4; 

        // --- 4. MASQUAGE DU BAS ---
        float bottomMask = smoothstep(0.0, uFadeHeight, 1.0 - worldYNormalized);
        
        // Opacité finale
        float globalAlpha = uOpacity * bottomMask;

        // Application
        gl_FragColor = vec4(finalColor, globalAlpha);

        #include <fog_fragment>
    }
  `,
};

// --- Factory Helper ---
export interface ToonWaterfallOptions {
  colorTop?: THREE.Color;
  colorBottom?: THREE.Color;
}

export function createToonWaterfallMaterial(opts: ToonWaterfallOptions = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      ToonWaterfallShader.uniforms,
    ]),
    vertexShader: ToonWaterfallShader.vertexShader,
    fragmentShader: ToonWaterfallShader.fragmentShader,
    transparent: true, // IMPORTANT pour le fog/fade
    side: THREE.DoubleSide,
    fog: true,
  });

  // Application des options
  if (opts.colorTop) mat.uniforms.uColorTop.value = opts.colorTop;
  if (opts.colorBottom) mat.uniforms.uColorBottom.value = opts.colorBottom;

  return mat;
}

export class WaterfallController {
  public material: THREE.ShaderMaterial;

  constructor() {
    this.material = createToonWaterfallMaterial();
  }

  public update(deltaTime: number): void {
    if (this.material.uniforms.uTime) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  public dispose(): void {
    this.material.dispose();
  }
}
