import * as THREE from "three";
import { CloudParsGLSL, CloudUniforms } from "./ShaderUtils";

/**
 * Patches a MeshStandardMaterial to include cloud shadows.
 * This injects the cloud logic into the fragment shader before lighting calculations.
 */
export function injectCloudShadows(shader: THREE.Shader): void {
  // Add Uniforms
  shader.uniforms.uTime = CloudUniforms.uTime || { value: 0 };
  shader.uniforms.uWindSpeed = CloudUniforms.uWindSpeed;
  shader.uniforms.uWindDirection = CloudUniforms.uWindDirection;

  // Add Cloud Pars (Vertex/Fragment)
  // We need SimplexNoiseGLSL + CloudParsGLSL
  // SimplexNoise is quite long to inline, but we can import it or minimize it.
  // Actually ShaderUtils exports SimplexNoiseGLSL string.
  
  // We need to inject noise + getCloudFactor at the top of fragment shader
  // But standard material is complex.
  // Easiest is to inject at '#include <common>'
  
  // Note: We need SimplexNoiseGLSL logic. 
  // Let's rely on the fact that we can prepend it.
  
  // We need the FULL logic string because we can't import JS into GLSL string easily here without templating.
  // Let's reconstruct the GLSL block needed.
  
  const cloudLogic = `
    uniform float uTime;
    uniform float uWindSpeed;
    uniform vec2 uWindDirection;
    
    // ... Simplex Noise ...
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    
    float getCloudFactor(vec2 position, float time) {
        float scaleCloud = 0.05;
        vec2 cloudOffset = time * uWindSpeed * uWindDirection;
        float noiseCloud = snoise(position * scaleCloud + cloudOffset);
        return smoothstep(0.0, 0.6, noiseCloud);
    }
  `;

  shader.vertexShader = `
    varying vec3 vWorldPosition;
    ${shader.vertexShader}
  `.replace(
    '#include <worldpos_vertex>',
    `
    #include <worldpos_vertex>
    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `
  );

  shader.fragmentShader = `
    ${cloudLogic}
    varying vec3 vWorldPosition;
    ${shader.fragmentShader}
  `.replace(
    '#include <dithering_fragment>',
    `
    #include <dithering_fragment>
    
    // Apply Cloud Shadow
    float cloudFactor = getCloudFactor(vWorldPosition.xz, uTime);
    // Darken by 50%
    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.5, cloudFactor);
    `
  );
  
  // Save reference for Uniform Updates
  // @ts-ignore
  this.userData.shader = shader;
}
