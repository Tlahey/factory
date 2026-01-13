export type Locale = "en" | "fr";

class LocalizationManager {
  private static instance: LocalizationManager;
  private locale: Locale = "en";
  private missingKeys: Set<string> = new Set();
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

  public async setLocale(locale: Locale): Promise<void> {
    if (this.locale === locale) return;
    this.locale = locale;
    await this.loadTranslations(locale);
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

  /**
   * Logs all missing keys gathered since startup
   */
  public logMissingKeys() {
    if (this.missingKeys.size === 0) {
      console.log("🌐 [Localization] No missing keys detected.");
    } else {
      console.warn(
        `🌐 [Localization] Missing keys for locale "${this.locale}":`,
        Array.from(this.missingKeys).sort(),
      );
    }
  }

  public async loadTranslations(locale: Locale) {
    try {
      let data;
      if (locale === "en") {
        data = await import("../data/locales/en.json");
      } else if (locale === "fr") {
        data = await import("../data/locales/fr.json");
      }

      if (data) {
        this.translations = data.default || data;
        console.log(`🌐 [Localization] Loaded "${locale}" translations.`);
        this.notifyListeners();
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
        if (!this.missingKeys.has(key)) {
          this.missingKeys.add(key);
          console.warn(
            `🌐 [Localization] Key not found: "${key}" (locale: ${this.locale})`,
          );
        }
        return key;
      }
    }

    if (typeof value !== "string") {
      if (!this.missingKeys.has(key)) {
        this.missingKeys.add(key);
        console.warn(
          `🌐 [Localization] Key is not a string: "${key}" (locale: ${this.locale})`,
        );
      }
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
