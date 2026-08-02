import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { createIOArrowsFromConfig } from "./IOArrowHelper";

/**
 * Regression test for backlog 029 ("IO arrows must keep their normal color
 * in placement preview"). `PlacementView.tsx`'s ghost-preview tint effect
 * only recolors meshes whose material is a `MeshStandardMaterial`
 * (`child.material instanceof THREE.MeshStandardMaterial`), so arrow meshes
 * staying on `MeshBasicMaterial` is exactly what keeps them immune to the
 * gray/red ghost tint. If arrows ever switched material type, this test
 * would catch the regression before the placement-preview bug reappeared.
 *
 * Deliberately does NOT mock "three" (unlike IOArrowHelper.test.ts), since
 * the whole point is to check real material class identity.
 */
describe("IOArrowHelper — arrow materials stay immune to ghost tinting", () => {
  test("arrow meshes use MeshBasicMaterial, not MeshStandardMaterial", () => {
    const ioConfig = {
      hasInput: true,
      hasOutput: true,
      inputSide: "back" as const,
      outputSide: "front" as const,
      showArrow: true,
    };
    const group = createIOArrowsFromConfig(ioConfig, 1, 1);

    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    // One input arrow + one output arrow, each with a head + shaft mesh.
    expect(meshes.length).toBe(4);
    for (const mesh of meshes) {
      expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
      expect(mesh.material).not.toBeInstanceOf(THREE.MeshStandardMaterial);
    }
  });
});
