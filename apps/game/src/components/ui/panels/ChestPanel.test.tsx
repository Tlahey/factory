import { describe, it, expect, vi } from "vitest";
import { ChestPanel } from "./ChestPanel";

// Mock dependencies
vi.mock("../ModelPreview", () => ({ default: () => null }));
vi.mock("lucide-react", () => ({
  X: () => null,
  Box: () => null,
  Zap: () => null,
  ArrowUp: () => null,
}));

describe("ChestPanel", () => {
  it("should be defined", () => {
    expect(ChestPanel).toBeDefined();
    expect(typeof ChestPanel).toBe("function");
  });
});
