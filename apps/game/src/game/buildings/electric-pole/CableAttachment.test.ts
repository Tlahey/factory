import { describe, it, expect, vi } from "vitest";
import { getCableAttachmentPoint } from "../../visuals/helpers/CableVisualHelper";
import { Hub } from "../hub/Hub";
import { ElectricPole } from "./ElectricPole";
import { Extractor } from "../extractor/Extractor";

// Mock THREE to avoid canvas/webgl issues in node environment
vi.mock("three", async () => {
  const actual = (await vi.importActual("three")) as any;
  return {
    ...actual,
    Vector3: class {
      constructor(
        public x: number,
        public y: number,
        public z: number,
      ) {}
    },
  };
});

describe("Cable Attachment Logic", () => {
  it("should attach to the center of the Hub pole regardless of tile clicked", () => {
    // Hub at 10, 10
    const hub = new Hub(10, 10);

    // Center of Hub (2x2) is at (10.5, 10.5) in World space relative to pivot 10,10
    const expectedX = 10.5;
    const expectedZ = 10.5;

    // Test with Top-Left tile (10,10)
    const p1 = getCableAttachmentPoint(hub, 10, 10);
    expect(p1.x).toBeCloseTo(expectedX);
    expect(p1.z).toBeCloseTo(expectedZ);
    expect(p1.y).toBe(2.5);

    // Test with Bottom-Right tile (11,11)
    const p2 = getCableAttachmentPoint(hub, 11, 11);
    expect(p2.x).toBeCloseTo(expectedX);
    expect(p2.z).toBeCloseTo(expectedZ);
  });

  it("should follow Hub rotation correctly", () => {
    const hub = new Hub(10, 10);

    // North (0 deg)
    hub.direction = "north";
    const pN = getCableAttachmentPoint(hub, 10, 10);
    expect(pN.x).toBeCloseTo(10.5);
    expect(pN.z).toBeCloseTo(10.5);

    // East (-90 deg CW around 10,10)
    // For a 2x2 Hub, the center is (10.5, 10.5). Rotating around the center keeps it at (10.5, 10.5).
    // The "local" offset is 0 for Hub.
    hub.direction = "east";
    const pE = getCableAttachmentPoint(hub, 10, 10);
    expect(pE.x).toBeCloseTo(10.5);
    expect(pE.z).toBeCloseTo(10.5);

    // South (180 deg)
    hub.direction = "south";
    const pS = getCableAttachmentPoint(hub, 10, 10);
    expect(pS.x).toBeCloseTo(10.5);
    expect(pS.z).toBeCloseTo(10.5);

    // West (90 deg CCW)
    hub.direction = "west";
    const pW = getCableAttachmentPoint(hub, 10, 10);
    expect(pW.x).toBeCloseTo(10.5);
    expect(pW.z).toBeCloseTo(10.5);
  });

  it("should be invariant for 1x1 buildings like ElectricPole", () => {
    const pole = new ElectricPole(5, 5);

    pole.direction = "north";
    const pN = getCableAttachmentPoint(pole, 5, 5);
    expect(pN.x).toBe(5);
    expect(pN.z).toBe(5);

    pole.direction = "east";
    const pE = getCableAttachmentPoint(pole, 5, 5);

    expect(pE.x).toBe(pN.x);
    expect(pE.z).toBe(pN.z);
  });

  it("should attach to the center of an Extractor", () => {
    const extractor = new Extractor(20, 20, "north");
    // Center of tile 20,20 is 20
    const p = getCableAttachmentPoint(extractor, 20, 20);
    expect(p.x).toBe(20);
    expect(p.y).toBe(1.5);
    expect(p.z).toBe(20);
  });

  it("should fallback to tile center if no building", () => {
    const p = getCableAttachmentPoint(undefined, 2, 2);
    expect(p.x).toBe(2);
    expect(p.y).toBe(0.5);
    expect(p.z).toBe(2);
  });
});
