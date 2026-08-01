import { describe, it, expect } from "vitest";
import { Hub } from "./Hub";

describe("Hub XState Machine", () => {
  it("should transition between working and idle depending on isEnabled", () => {
    const hub = new Hub(5, 5);

    expect(hub.actor).toBeDefined();
    let snapshot = hub.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Tick enabled
    hub.tick(1.0);
    snapshot = hub.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Disable hub
    hub.isEnabled = false;
    hub.tick(1.0);
    snapshot = hub.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
  });
});
