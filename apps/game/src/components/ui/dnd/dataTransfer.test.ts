import { describe, test, expect } from "vitest";
import {
  readBuildingDragPayload,
  readItemDragPayload,
  writeBuildingDragPayload,
  writeItemDragPayload,
} from "./dataTransfer";

class MockDataTransfer {
  private store = new Map<string, string>();
  effectAllowed = "none";
  dropEffect = "none";

  setData(key: string, value: string) {
    this.store.set(key, value);
  }

  getData(key: string) {
    return this.store.get(key) ?? "";
  }
}

function mockDragEvent() {
  return { dataTransfer: new MockDataTransfer() } as unknown as React.DragEvent;
}

describe("dnd/dataTransfer", () => {
  test("writeItemDragPayload/readItemDragPayload round-trips", () => {
    const e = mockDragEvent();
    writeItemDragPayload(e, {
      source: "inventory",
      index: 2,
      value: "iron_ore",
      count: 5,
    });

    expect(readItemDragPayload(e)).toEqual({
      source: "inventory",
      index: 2,
      value: "iron_ore",
      count: 5,
    });
  });

  test("readItemDragPayload returns null when type is missing", () => {
    const e = mockDragEvent();
    e.dataTransfer.setData("source", "inventory");
    e.dataTransfer.setData("index", "0");
    e.dataTransfer.setData("count", "1");

    expect(readItemDragPayload(e)).toBeNull();
  });

  test("readItemDragPayload returns null when index/count are not numeric", () => {
    const e = mockDragEvent();
    e.dataTransfer.setData("source", "inventory");
    e.dataTransfer.setData("type", "iron_ore");
    e.dataTransfer.setData("index", "not-a-number");
    e.dataTransfer.setData("count", "1");

    expect(readItemDragPayload(e)).toBeNull();
  });

  test("writeBuildingDragPayload/readBuildingDragPayload round-trips", () => {
    const e = mockDragEvent();
    writeBuildingDragPayload(e, {
      source: "hotbar",
      index: 3,
      value: "furnace",
    });

    expect(readBuildingDragPayload(e)).toEqual({
      source: "hotbar",
      index: 3,
      value: "furnace",
    });
  });

  test("readBuildingDragPayload returns null for an unknown buildingId", () => {
    const e = mockDragEvent();
    e.dataTransfer.setData("source", "hotbar");
    e.dataTransfer.setData("index", "0");
    e.dataTransfer.setData("buildingId", "not_a_real_building");

    expect(readBuildingDragPayload(e)).toBeNull();
  });

  test("readBuildingDragPayload defaults index to -1 when absent", () => {
    const e = mockDragEvent();
    e.dataTransfer.setData("source", "building_menu");
    e.dataTransfer.setData("buildingId", "furnace");

    expect(readBuildingDragPayload(e)).toEqual({
      source: "building_menu",
      index: -1,
      value: "furnace",
    });
  });
});
