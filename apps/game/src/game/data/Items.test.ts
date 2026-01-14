import { describe, it, expect } from "vitest";
import { RESOURCES, isResource } from "./Items";

describe("Items Data", () => {
  it("should have a non-empty list of resources", () => {
    expect(RESOURCES.length).toBeGreaterThan(0);
  });

  it("should contain critical resources", () => {
    expect(RESOURCES).toContain("iron_ore");
    expect(RESOURCES).toContain("iron_ingot");
    expect(RESOURCES).toContain("stone");
  });

  it("should not contain legacy invalid IDs", () => {
    // "iron" and "copper" (raw) are invalid.
    // "iron_ore" and "copper_ore" are valid.
    expect(RESOURCES).not.toContain("iron");
    expect(RESOURCES).not.toContain("copper");
  });

  it("isResource validator should work", () => {
    expect(isResource("iron_ore")).toBe(true);
    expect(isResource("invalid_item")).toBe(false);
  });
});
