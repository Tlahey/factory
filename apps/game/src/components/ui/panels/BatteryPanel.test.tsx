import { describe, it, expect, vi } from "vitest";
import { BatteryPanel } from "./BatteryPanel";

// Mock dependencies
vi.mock("lucide-react", () => ({
  X: () => null,
  Box: () => null,
  Zap: () => null,
  ArrowUp: () => null,
}));

describe("BatteryPanel", () => {
  it("should be defined", () => {
    expect(BatteryPanel).toBeDefined();
  });
});
