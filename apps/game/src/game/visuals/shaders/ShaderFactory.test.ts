import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createGrassShaderMaterial } from "./GrassShader";
import { createSandShaderMaterial } from "./SandShader";
import { createToonWaterMaterial } from "./ToonWaterShader";

describe("Shader Factory Functions", () => {
  describe("createGrassShaderMaterial", () => {
    it("should create a material with lights and fog enabled", () => {
      const material = createGrassShaderMaterial();
      expect(material.lights).toBe(true);
      expect(material.fog).toBe(true);
    });

    it("should correctly set base color uniform", () => {
      const color = new THREE.Color(0xff0000);
      const material = createGrassShaderMaterial({ uColorBase: color });
      expect(material.uniforms.uColorBase.value).toEqual(color);
    });
  });

  describe("createSandShaderMaterial", () => {
    it("should create a material with lights and fog enabled", () => {
      const material = createSandShaderMaterial();
      expect(material.lights).toBe(true);
      expect(material.fog).toBe(true);
    });

    it("should correctly set grain scale", () => {
      const material = createSandShaderMaterial({ grainScale: 5.0 });
      expect(material.uniforms.uGrainScale.value).toBe(5.0);
    });
  });

  describe("createToonWaterMaterial", () => {
    it("should create a material with lights and fog enabled", () => {
      const material = createToonWaterMaterial();
      expect(material.lights).toBe(true);
      expect(material.fog).toBe(true);
    });

    it("should apply USE_DEPTH_FOAM when depth texture is provided", () => {
      const texture = new THREE.Texture();
      const material = createToonWaterMaterial({ depthTexture: texture });
      expect(material.defines.USE_DEPTH_FOAM).toBe(true);
      expect(material.uniforms.tDepth.value).toBe(texture);
    });
  });
});
