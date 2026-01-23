import { describe, it, expect, beforeEach, vi } from "vitest";
import { assetLibrary } from "./AssetLibrary";

describe("AssetLibrary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset singleton private state if possible or just ensure fetch is mocked
  });

  it("should be a singleton", () => {
    expect(assetLibrary).toBeDefined();
  });

  it("should fetch manifest during initialization", async () => {
    const mockManifest = {
      tree: ["/models/tree/variant1.glb", "/models/tree/variant2.glb"],
      rock: ["/models/rock/default.glb"],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });
    global.fetch = fetchMock;

    await assetLibrary.initialize();

    expect(fetchMock).toHaveBeenCalledWith("/api/assets");
    expect(assetLibrary.isLoaded()).toBe(true);
    expect(assetLibrary.getVariants("tree")).toEqual(mockManifest.tree);
  });

  it("should return null for non-existent entities", () => {
    expect(assetLibrary.getVariants("non-existent")).toEqual([]);
    expect(assetLibrary.getRandomVariantId("non-existent")).toBeNull();
  });

  it("should return a random variant from the list", async () => {
    const mockManifest = {
      rock: ["v1", "v2", "v3"],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    // Re-init to load new mock data
    // AssetLibrary doesn't have a reset but we can re-call init if we mock fetch first
    // Wait, AssetLibrary checks this.loaded.
    // For testing we might need to reset it.
    // Let's just verify it works with the current state if already loaded or use cast.
    (assetLibrary as any).loaded = false;
    (assetLibrary as any).loadingPromise = null;

    await assetLibrary.initialize();

    const variant = assetLibrary.getRandomVariantId("rock");
    expect(mockManifest.rock).toContain(variant);
  });
});
