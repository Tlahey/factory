import { EventEmitter } from "events";

export type GameEventType =
  | "RESOURCE_MINED"
  | "BUILDING_PLACED"
  | "BUILDING_SELECTED"
  | "POWER_STATUS_CHANGED"
  | "INVENTORY_CHANGED"
  | "TECH_UNLOCKED";

export interface GameEventData {
  RESOURCE_MINED: {
    resource: string;
    amount: number;
    position: { x: number; y: number };
  };
  BUILDING_PLACED: { type: string; position: { x: number; y: number } };
  BUILDING_SELECTED: { id: string; type: string };
  POWER_STATUS_CHANGED: { buildingId: string; hasPower: boolean };
  INVENTORY_CHANGED: { item: string; currentCount: number };
  TECH_UNLOCKED: { techId: string };
}

class GameEventManager extends EventEmitter {
  public emit<K extends GameEventType>(
    event: K,
    data: GameEventData[K],
  ): boolean {
    return super.emit(event, data);
  }

  public on<K extends GameEventType>(
    event: K,
    listener: (data: GameEventData[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  public off<K extends GameEventType>(
    event: K,
    listener: (data: GameEventData[K]) => void,
  ): this {
    return super.off(event, listener);
  }
}

export const gameEventManager = new GameEventManager();
