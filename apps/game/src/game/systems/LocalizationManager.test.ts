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
    localization.setLocale("en");
    // Give time for async load (simulated)
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("should return key if translation missing", () => {
    expect(localization.t("missing.key")).toBe("missing.key");
  });

  it("should translate simple keys", async () => {
    // We need to wait for the mocked import to "load"
    // effectively forcing a reload or just ensuring state
    localization.setLocale("en");
    await new Promise((resolve) => setTimeout(resolve, 10));

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
    localization.setLocale("fr");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(localization.t("hello")).toBe("Bonjour");
    expect(localization.t("nested.key")).toBe("Valeur Imbriquée");
  });

  it("should notify subscribers on locale change", async () => {
    const callback = vi.fn();
    const unsubscribe = localization.subscribe(callback);

    localization.setLocale("fr");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });
});
