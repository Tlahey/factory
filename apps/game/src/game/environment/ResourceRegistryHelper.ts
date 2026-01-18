import * as THREE from "three";
import { resourceRegistry } from "./ResourceRegistry";
import { initializeResources } from "./ResourceInitialization";

// Ensure resources are initialized
let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    initializeResources();
    initialized = true;
  }
}

export function createItemModel(id: string): THREE.Group | null {
  ensureInitialized();
  const resource = resourceRegistry.get(id);
  if (resource) {
    return resource.createModel();
  }
  return null;
}

export function updateItemVisuals(
  id: string,
  group: THREE.Group,
  seed: number,
) {
  ensureInitialized();
  const resource = resourceRegistry.get(id);
  if (resource) {
    resource.updateVisuals(group, seed);
  }
}

export function isResource(id: string | null): boolean {
  ensureInitialized();
  return resourceRegistry.isResource(id);
}
