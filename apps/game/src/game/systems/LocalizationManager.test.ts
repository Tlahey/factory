import { describe, it, expect, beforeEach, vi } from "vitest";
import { localization } from "./LocalizationManager";

// Mock the dynamic imports
vi.mock("../data/locales/en.json", () => ({
  default: {
    hello: "Hello",
    welcome: "Welcome {{name}}",
    nested: {
      key: "Nested Value",
    },
  },
}));

vi.mock("../data/locales/fr.json", () => ({
  default: {
    hello: "Bonjour",
    welcome: "Bienvenue {{name}}",
    nested: {
      key: "Valeur Imbriquée",
    },
  },
}));

describe("LocalizationManager", () => {
  beforeEach(async () => {
    // Reset to English
    // Force load because setLocale checks if locale is already same and might skip
    // And constructor promise is floating.
    await localization.loadTranslations("en");
    // Also ensure internal locale state is sync
    if (localization.getLocale() !== "en") {
      await localization.setLocale("en");
    }
  });

  it("should return key if translation missing", () => {
    expect(localization.t("missing.key")).toBe("missing.key");
  });

  it("should warn if translation missing", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    localization.t("missing.key.unique");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Key not found: "missing.key.unique"'),
    );
    consoleSpy.mockRestore();
  });

  it("should translate simple keys", async () => {
    // We need to wait for the mocked import to "load"
    // effectively forcing a reload or just ensuring state
    await localization.setLocale("en");

    expect(localization.t("hello")).toBe("Hello");
  });

  it("should handle nested keys", async () => {
    expect(localization.t("nested.key")).toBe("Nested Value");
  });

  it("should interpolate variables", async () => {
    expect(localization.t("welcome", { name: "Player" })).toBe(
      "Welcome Player",
    );
  });

  it("should switch locales", async () => {
    await localization.setLocale("fr");

    expect(localization.t("hello")).toBe("Bonjour");
    expect(localization.t("nested.key")).toBe("Valeur Imbriquée");
  });

  it("should notify subscribers on locale change", async () => {
    const callback = vi.fn();
    const unsubscribe = localization.subscribe(callback);

    await localization.setLocale("fr");

    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });
});
