import { describe, it, expect, vi, beforeEach } from "vitest";
import { logChanged, clearLogCache } from "./DebugLog";

describe("DebugLog Utility", () => {
  beforeEach(() => {
    clearLogCache();
    vi.restoreAllMocks();
  });

  it("should log a message only when it changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // First log
    logChanged("TestTag", "ID1", "Hello");
    expect(consoleSpy).toHaveBeenCalledWith("[TestTag] ID1 -> Hello");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    // Second log with same content - should NOT log again
    logChanged("TestTag", "ID1", "Hello");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    // Third log with different content - SHOULD log
    logChanged("TestTag", "ID1", "World");
    expect(consoleSpy).toHaveBeenCalledWith("[TestTag] ID1 -> World");
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it("should handle different identifiers separately", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logChanged("Tag", "ID1", "Msg");
    logChanged("Tag", "ID2", "Msg");

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith("[Tag] ID1 -> Msg");
    expect(consoleSpy).toHaveBeenCalledWith("[Tag] ID2 -> Msg");
  });

  it("should clear cache correctly", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logChanged("Tag", "ID1", "Hello");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    clearLogCache();

    // After clear, same message should log again
    logChanged("Tag", "ID1", "Hello");
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});
