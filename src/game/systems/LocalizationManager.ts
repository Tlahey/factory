export type Locale = "en" | "fr";

class LocalizationManager {
  private static instance: LocalizationManager;
  private locale: Locale = "en";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private translations: Record<string, any> = {};
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Load default locale
    this.loadTranslations("en");
  }

  public static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager();
    }
    return LocalizationManager.instance;
  }

  public setLocale(locale: Locale) {
    if (this.locale === locale) return;
    this.locale = locale;
    this.loadTranslations(locale);
    this.notifyListeners();
  }

  public getLocale(): Locale {
    return this.locale;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  private async loadTranslations(locale: Locale) {
    try {
      // Dynamic import for code splitting and easy expansion
      // Note: In Next.js/Webpack, dynamic imports with template strings need to be statically analyzable to some extent.
      // We'll use a switch/map for now to be safe and explicit.
      let data;
      if (locale === "en") {
        data = await import("../data/locales/en.json");
      } else if (locale === "fr") {
        data = await import("../data/locales/fr.json");
      }

      if (data) {
        this.translations = data.default || data;
        this.notifyListeners(); // Notify again after load finishes
      }
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:`, error);
    }
  }

  public t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = this.translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (params) {
      return Object.entries(params).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }, value);
    }

    return value;
  }
}

export const localization = LocalizationManager.getInstance();
