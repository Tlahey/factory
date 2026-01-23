type AssetManifest = Record<string, string[]>;

class AssetLibrary {
  private static instance: AssetLibrary;
  private manifest: AssetManifest = {};
  private loaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): AssetLibrary {
    if (!AssetLibrary.instance) {
      AssetLibrary.instance = new AssetLibrary();
    }
    return AssetLibrary.instance;
  }

  public async initialize(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = fetch("/api/assets")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch asset manifest");
        return res.json();
      })
      .then((data) => {
        this.manifest = data;
        this.loaded = true;
      })
      .catch((err) => {
        console.error("[AssetLibrary] Initialization failed:", err);
        this.manifest = {};
        this.loaded = true;
      });

    return this.loadingPromise;
  }

  public getVariants(entityId: string): string[] {
    return this.manifest[entityId] || [];
  }

  public getRandomVariantId(entityId: string): string | null {
    const variants = this.getVariants(entityId);
    if (variants.length === 0) return null;
    const randomPath = variants[Math.floor(Math.random() * variants.length)];
    return randomPath;
  }

  public getVariantUrl(
    entityId: string,
    variantId: string | null,
  ): string | null {
    if (!variantId) return null;
    return variantId;
  }

  public isLoaded(): boolean {
    return this.loaded;
  }
}

export const assetLibrary = AssetLibrary.getInstance();
