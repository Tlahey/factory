import { GameResource } from "./GameResource";

class ResourceRegistry {
  private resources = new Map<string, GameResource>();

  public register(resource: GameResource): void {
    this.resources.set(resource.id, resource);
  }

  public get(id: string): GameResource | undefined {
    return this.resources.get(id);
  }

  public getAll(): GameResource[] {
    return Array.from(this.resources.values());
  }

  public isResource(id: string | null): boolean {
    if (!id) return false;
    return this.resources.has(id);
  }
}

export const resourceRegistry = new ResourceRegistry();
