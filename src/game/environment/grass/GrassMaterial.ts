import * as THREE from "three";

export function createGrassMaterial() {
  const material = new THREE.MeshLambertMaterial({
    color: 0x4caf50,
    side: THREE.DoubleSide,
  });

  const uniforms = {
    uTime: { value: 0 },
  };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader =
      `
            uniform float uTime;
        ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
            #include <begin_vertex>
            
            // Subtle sway animation
            // position.y is the height (from 0 to 0.2)
            // We want more sway at the top
            float sway = sin(uTime * 2.0 + position.x * 10.0 + position.z * 10.0) * 0.1;
            float strength = pow(position.y / 0.2, 2.0); // Stronger at top
            
            transformed.x += sway * strength;
            transformed.z += sway * strength * 0.5;
            `,
    );
  };

  return { material, uniforms };
}
