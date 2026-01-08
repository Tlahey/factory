import { describe, test, expect } from "vitest";
import { Extractor } from "./extractor/Extractor";
import { Chest } from "./chest/Chest";
import { Conveyor } from "./conveyor/Conveyor";

describe("IO Position Tests", () => {
  describe("Extractor IO", () => {
    test("output position should be in facing direction", () => {
      const extractor = new Extractor(5, 5, "east");
      const output = extractor.getOutputPosition();

      expect(output).not.toBeNull();
      expect(output!.x).toBe(6);
      expect(output!.y).toBe(5);
    });

    test("has no input position", () => {
      const extractor = new Extractor(5, 5, "north");
      expect(extractor.getInputPosition()).toBeNull();
    });

    test("output changes with direction", () => {
      const extractor = new Extractor(5, 5, "north");
      expect(extractor.getOutputPosition()).toEqual({ x: 5, y: 4 });

      extractor.direction = "south";
      expect(extractor.getOutputPosition()).toEqual({ x: 5, y: 6 });

      extractor.direction = "west";
      expect(extractor.getOutputPosition()).toEqual({ x: 4, y: 5 });
    });
  });

  describe("Chest IO", () => {
    test("input position is on front (facing direction)", () => {
      const chest = new Chest(5, 5, "north");
      const input = chest.getInputPosition();

      expect(input).not.toBeNull();
      expect(input!.x).toBe(5);
      expect(input!.y).toBe(4); // North of chest
    });

    test("output position is on back (opposite of facing)", () => {
      const chest = new Chest(5, 5, "north");
      const output = chest.getOutputPosition();

      expect(output).not.toBeNull();
      expect(output!.x).toBe(5);
      expect(output!.y).toBe(6); // South of chest (opposite of north)
    });

    test("canInput validates position", () => {
      const chest = new Chest(5, 5, "north");

      // From front (north) - valid
      expect(chest.canInput(5, 4)).toBe(true);

      // From sides - invalid
      expect(chest.canInput(4, 5)).toBe(false);
      expect(chest.canInput(6, 5)).toBe(false);

      // From back - invalid
      expect(chest.canInput(5, 6)).toBe(false);
    });

    test("rotation changes IO positions", () => {
      const chest = new Chest(5, 5, "north");

      // Rotate to east
      chest.direction = "east";
      expect(chest.getInputPosition()).toEqual({ x: 6, y: 5 });
      expect(chest.getOutputPosition()).toEqual({ x: 4, y: 5 });

      // Check canInput updates
      expect(chest.canInput(6, 5)).toBe(true);
      expect(chest.canInput(5, 4)).toBe(false); // No longer valid
    });
  });

  describe("Conveyor IO", () => {
    test("input position is from back", () => {
      const conveyor = new Conveyor(5, 5, "north");
      const input = conveyor.getInputPosition();

      expect(input).not.toBeNull();
      expect(input!.x).toBe(5);
      expect(input!.y).toBe(6); // South of conveyor (opposite of north)
    });

    test("output position is in facing direction", () => {
      const conveyor = new Conveyor(5, 5, "north");
      const output = conveyor.getOutputPosition();

      expect(output).not.toBeNull();
      expect(output!.x).toBe(5);
      expect(output!.y).toBe(4); // North of conveyor
    });
  });
});
