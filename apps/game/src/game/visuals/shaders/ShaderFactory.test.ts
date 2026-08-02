import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createGrassShaderMaterial } from "./GrassShader";
import { createSandShaderMaterial } from "./SandShader";
import { createWaterShaderMaterial } from "./WaterShader";

/**
 * These materials are `MeshStandardMaterial` customised via `onBeforeCompile`.
 * THREE only invokes `onBeforeCompile` when a real WebGL program compiles
 * (i.e. during an actual render), which isn't available in this happy-dom
 * test environment. So instead of rendering, we invoke `onBeforeCompile`
 * ourselves with a minimal fake `shader` object containing just the
 * `#include <...>` markers the callback targets, and assert on the resulting
 * uniforms/shader source — this exercises the exact same code path THREE
 * would run, without needing a GPU.
 */
function compileFakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: `
      #include <common>
      void main() {
        #include <begin_vertex>
        #include <project_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      void main() {
        #include <color_fragment>
        #include <roughnessmap_fragment>
        #include <normal_fragment_maps>
      }
    `,
  };
}

function runOnBeforeCompile(
  material: THREE.MeshStandardMaterial,
  shader: ReturnType<typeof compileFakeShader>,
) {
  material.onBeforeCompile(
    shader as unknown as THREE.WebGLProgramParametersWithUniforms,
    {} as THREE.WebGLRenderer,
  );
}

describe("Shader Factory Functions", () => {
  describe("createGrassShaderMaterial", () => {
    it("creates a matte MeshStandardMaterial", () => {
      const material = createGrassShaderMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.metalness).toBe(0);
    });

    it("wires the override color into the compiled shader uniforms", () => {
      const color = new THREE.Color(0xff0000);
      const material = createGrassShaderMaterial({ uColorBase: color });
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(shader.uniforms.uColorBase.value).toBe(color);
    });

    it("injects the procedural colour and roughness variation", () => {
      const material = createGrassShaderMaterial();
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(shader.fragmentShader).toContain("diffuseColor.rgb = groundColor");
      expect(shader.fragmentShader).toContain("roughnessFactor = clamp");
    });
  });

  describe("createSandShaderMaterial", () => {
    it("creates a matte MeshStandardMaterial", () => {
      const material = createSandShaderMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.metalness).toBe(0);
    });

    it("wires the grain scale option into the compiled shader uniforms", () => {
      const material = createSandShaderMaterial({ grainScale: 5.0 });
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(shader.uniforms.uGrainScale.value).toBe(5.0);
    });

    it("perturbs the geometric normal from the dune height field", () => {
      const material = createSandShaderMaterial();
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(shader.fragmentShader).toContain("perturbDuneNormal");
    });
  });

  describe("createWaterShaderMaterial", () => {
    it("creates a low-roughness MeshStandardMaterial so env-map reflections show", () => {
      const material = createWaterShaderMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBeLessThan(0.3);
      expect(material.transparent).toBe(false);
    });

    it("enables USE_DEPTH_FOAM and wires the depth texture when provided", () => {
      const texture = new THREE.Texture();
      const material = createWaterShaderMaterial({ depthTexture: texture });
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(material.defines?.USE_DEPTH_FOAM).toBe(true);
      expect(shader.uniforms.tDepth.value).toBe(texture);
    });

    it("does not enable USE_DEPTH_FOAM without a depth texture", () => {
      const material = createWaterShaderMaterial();
      const shader = compileFakeShader();
      runOnBeforeCompile(material, shader);
      expect(material.defines?.USE_DEPTH_FOAM).toBeUndefined();
    });
  });
});
