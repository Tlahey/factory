import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { createBatchedTerrain } from "./TerrainBatcher";
import { TileType, WORLD_HEIGHT, WORLD_WIDTH } from "../../constants";
import { Tile } from "../../environment/Tile";

// Mock three for mergeGeometries and others
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn().mockImplementation(() => new THREE.BufferGeometry()),
}));

describe("TerrainBatcher", () => {
  it("should extract nature asset positions from the grid", () => {
    // Create a mock grid based on constants
    const grid: Tile[][] = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const isRockIdx = x === 2 && y === 3;
        const isTreeIdx = x === 5 && y === 7;
        const t = {
          isWater: () => false,
          isSand: () => false,
          isStone: () => isRockIdx,
          isTree: () => isTreeIdx,
          getType: () => TileType.GRASS,
        };
        row.push(t as unknown as Tile);
      }
      grid.push(row);
    }

    // Materials mocks
    const mat = new THREE.MeshLambertMaterial();

    const result = createBatchedTerrain(grid, mat, mat, mat);

    expect(result.natureAssets).toHaveLength(2);

    const rock = result.natureAssets.find((a) => a.type === "rock");
    expect(rock).toEqual({ x: 2, y: 3, type: "rock" });

    const tree = result.natureAssets.find((a) => a.type === "tree");
    expect(tree).toEqual({ x: 5, y: 7, type: "tree" });
  });
});
