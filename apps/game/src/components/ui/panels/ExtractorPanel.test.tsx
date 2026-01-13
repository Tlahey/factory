import { describe, it, expect, vi } from "vitest";
import { ExtractorPanel, getExtractorStatusInfo } from "./ExtractorPanel";

// Mock dependencies
vi.mock("../ModelPreview", () => ({ default: () => null }));
vi.mock("lucide-react", () => ({
  X: () => null,
  Box: () => null,
  Zap: () => null,
  ArrowUp: () => null,
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ExtractorPanel", () => {
  it("should be defined", () => {
    expect(ExtractorPanel).toBeDefined();
  });

  describe("getExtractorStatusInfo", () => {
    const t = (key: string) => key;

    it("should return NO POWER when no power source", () => {
      const { status, color } = getExtractorStatusInfo(
        false,
        "ok",
        "ok",
        false,
        t,
      );
      expect(status).toBe("common.statuses.no_power");
      expect(color).toContain("bg-red-500");
    });

    it("should return BLOCKED when blocked", () => {
      const { status, color } = getExtractorStatusInfo(
        true,
        "blocked",
        "ok",
        true,
        t,
      );
      expect(status).toBe("common.statuses.blocked");
      expect(color).toContain("bg-orange-500");
    });

    it("should return OPERATIONAL when active", () => {
      const { status, color } = getExtractorStatusInfo(
        true,
        "ok",
        "ok",
        true,
        t,
      );
      expect(status).toBe("common.statuses.operational");
      expect(color).toContain("bg-green-500");
    });
  });
});
