import { describe, it, expect, vi } from "vitest";
import { UpgradeReminder } from "./UpgradeReminder";

// Mock dependencies
vi.mock("lucide-react", () => ({
  X: () => null,
  Box: () => null,
  Zap: () => null,
  ArrowUp: () => null,
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("UpgradeReminder", () => {
  it("should be defined", () => {
    expect(UpgradeReminder).toBeDefined();
  });
});
