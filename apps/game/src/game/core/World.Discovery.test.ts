import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./World";
import { useGameStore } from "../state/store";
import { TileFactory } from "../environment/TileFactory";
import {
  TileType,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  HUB_STARTER_RADIUS,
} from "../constants";

describe("World — fog of war", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    world = new World();
  });

  describe("revealArea", () => {
    it("reveals a circular area clamped to grid bounds", () => {
      const fresh = new World();
      fresh.discovered = Array.from({ length: WORLD_HEIGHT }, () =>
        Array.from({ length: WORLD_WIDTH }, () => false),
      );

      const changed = fresh.revealArea(0, 0, 3);
      expect(changed).toBe(true);
      expect(fresh.discovered[0][0]).toBe(true);
      expect(fresh.discovered[0][3]).toBe(true);
      // Center clamps at the grid edge — nothing beyond bounds should throw
      // or be considered, and far tiles stay unrevealed.
      expect(fresh.discovered[10][10]).toBe(false);
    });

    it("returns false and changes nothing on a second identical call", () => {
      const fresh = new World();
      fresh.discovered = Array.from({ length: WORLD_HEIGHT }, () =>
        Array.from({ length: WORLD_WIDTH }, () => false),
      );

      expect(fresh.revealArea(20, 20, 5)).toBe(true);
      expect(fresh.revealArea(20, 20, 5)).toBe(false);
    });

    it("returns true only for the newly revealed portion of an overlapping reveal", () => {
      const fresh = new World();
      fresh.discovered = Array.from({ length: WORLD_HEIGHT }, () =>
        Array.from({ length: WORLD_WIDTH }, () => false),
      );

      fresh.revealArea(20, 20, 5);
      // Fully contained within the first circle — nothing new.
      expect(fresh.revealArea(20, 20, 2)).toBe(false);
      // Overlapping but extending further — something new.
      expect(fresh.revealArea(20, 20, 10)).toBe(true);
    });
  });

  describe("revealAll", () => {
    it("sets every tile to discovered", () => {
      world.discovered = Array.from({ length: WORLD_HEIGHT }, () =>
        Array.from({ length: WORLD_WIDTH }, () => false),
      );
      world.revealAll();

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
          expect(world.discovered[y][x]).toBe(true);
        }
      }
    });
  });

  describe("fresh world seeding", () => {
    it("reveals a starter radius around the world center but not the corners", () => {
      const cx = WORLD_WIDTH / 2;
      const cy = WORLD_HEIGHT / 2;
      expect(world.discovered[cy][cx]).toBe(true);
      expect(world.discovered[cy][cx + HUB_STARTER_RADIUS - 1]).toBe(true);
      expect(world.discovered[0][0]).toBe(false);
      expect(world.discovered[WORLD_HEIGHT - 1][WORLD_WIDTH - 1]).toBe(false);
    });
  });

  describe("canPlaceBuilding + discovery gate", () => {
    beforeEach(() => {
      useGameStore.setState({
        purchasedCounts: { conveyor: 100 },
      });
    });

    it("rejects an otherwise-valid placement on an undiscovered tile", () => {
      world.setTile(2, 2, TileFactory.createTile(TileType.GRASS));
      expect(world.discovered[2][2]).toBe(false);
      expect(world.canPlaceBuilding(2, 2, "conveyor")).toBe(false);
    });

    it("accepts a valid placement on a discovered tile", () => {
      const cx = WORLD_WIDTH / 2;
      const cy = WORLD_HEIGHT / 2;
      world.setTile(cx, cy, TileFactory.createTile(TileType.GRASS));
      expect(world.discovered[cy][cx]).toBe(true);
      expect(world.canPlaceBuilding(cx, cy, "conveyor")).toBe(true);
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips the discovered grid", () => {
      world.revealArea(5, 5, 2);
      const data = world.serialize();

      const restored = new World();
      restored.deserialize(data);

      expect(restored.discovered[5][5]).toBe(true);
      expect(restored.discovered).toEqual(world.discovered);
    });

    it("defaults every tile to revealed when deserializing a legacy save with no discovered field", () => {
      const data = world.serialize();
      delete (data as any).discovered;

      const restored = new World();
      restored.deserialize(data);

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
          expect(restored.discovered[y][x]).toBe(true);
        }
      }
    });
  });
});
