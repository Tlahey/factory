import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { SplineItem } from "./SplineItem";
import { SplineGraph } from "./SplineGraph";
import { ConveyorSplineSystem } from "./ConveyorSplineSystem";
import {
  createStraightSegment,
  createLeftTurnSegment,
  createRightTurnSegment,
  resetSegmentIdCounter,
} from "./config/SplineConfigFactory";

describe("SplineSegment", () => {
  beforeEach(() => {
    resetSegmentIdCounter();
  });

  it("should create a straight segment with correct properties", () => {
    const segment = createStraightSegment(0, 0, "north");

    expect(segment.gridX).toBe(0);
    expect(segment.gridY).toBe(0);
    expect(segment.direction).toBe("north");
    expect(segment.segmentType).toBe("straight");
    expect(segment.speed).toBe(1.0);
    expect(segment.capacity).toBe(3);
  });

  it("should return valid points along the curve", () => {
    const segment = createStraightSegment(0, 0, "north");

    const start = segment.getPointAt(0);
    const mid = segment.getPointAt(0.5);
    const end = segment.getPointAt(1);

    expect(start).toBeInstanceOf(THREE.Vector3);
    expect(mid).toBeInstanceOf(THREE.Vector3);
    expect(end).toBeInstanceOf(THREE.Vector3);

    // North direction: Z should decrease
    expect(end.z).toBeLessThan(start.z);
  });

  it("should return valid tangents along the curve", () => {
    const segment = createStraightSegment(0, 0, "east");

    const tangent = segment.getTangentAt(0.5);

    expect(tangent).toBeInstanceOf(THREE.Vector3);
    // East direction should have positive X tangent
    expect(tangent.x).toBeGreaterThan(0);
  });

  it("should connect and disconnect segments", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");

    seg1.connectTo(seg2);

    expect(seg1.hasOutput()).toBe(true);
    expect(seg2.hasInput()).toBe(true);
    expect(seg1.getNextSegment()).toBe(seg2);
    expect(seg2.getPreviousSegment()).toBe(seg1);

    seg1.disconnect();

    expect(seg1.hasOutput()).toBe(false);
  });

  it("should create left turn segments", () => {
    const segment = createLeftTurnSegment(0, 0, "north");

    expect(segment.segmentType).toBe("left");

    // Curve should have valid length
    expect(segment.getLength()).toBeGreaterThan(0);
  });

  it("should create right turn segments", () => {
    const segment = createRightTurnSegment(0, 0, "south");

    expect(segment.segmentType).toBe("right");

    expect(segment.getLength()).toBeGreaterThan(0);
  });
});

describe("SplineItem", () => {
  beforeEach(() => {
    resetSegmentIdCounter();
  });

  it("should create an item with correct properties", () => {
    const segment = createStraightSegment(0, 0, "north");
    const item = new SplineItem({
      id: 1,
      itemType: "stone",
      segment,
      initialProgress: 0.5,
    });

    expect(item.id).toBe(1);
    expect(item.itemType).toBe("stone");
    expect(item.currentSegment).toBe(segment);
    expect(item.progress).toBe(0.5);
  });

  it("should update visual position correctly", () => {
    const segment = createStraightSegment(0, 0, "north");
    const mesh = new THREE.Object3D();
    const item = new SplineItem({
      id: 1,
      itemType: "stone",
      segment,
      initialProgress: 0.5,
      mesh,
    });

    item.updateVisualPosition();

    const expectedPos = segment.getPointAt(0.5);
    expect(mesh.position.x).toBeCloseTo(expectedPos.x);
    expect(mesh.position.y).toBeCloseTo(expectedPos.y);
    expect(mesh.position.z).toBeCloseTo(expectedPos.z);
  });

  it("should transfer to another segment", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    const item = new SplineItem({
      id: 1,
      itemType: "iron",
      segment: seg1,
    });

    item.transferTo(seg2, 0.1);

    expect(item.currentSegment).toBe(seg2);
    expect(item.progress).toBe(0.1);
  });

  it("should return world position", () => {
    const segment = createStraightSegment(5, 10, "east");
    const item = new SplineItem({
      id: 1,
      itemType: "stone",
      segment,
      initialProgress: 0.5,
    });

    const pos = item.getWorldPosition();
    expect(pos).toBeInstanceOf(THREE.Vector3);
    expect(pos.x).toBeCloseTo(5);
  });
});

describe("SplineGraph", () => {
  let graph: SplineGraph;

  beforeEach(() => {
    resetSegmentIdCounter();
    graph = new SplineGraph();
  });

  it("should add and retrieve segments", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    expect(graph.size()).toBe(1);
    expect(graph.getSegment(segment.id)).toBe(segment);
  });

  it("should find segment by grid position", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(5, 5, "east");
    graph.addSegment(seg1);
    graph.addSegment(seg2);

    expect(graph.getSegmentAt(0, 0)).toBe(seg1);
    expect(graph.getSegmentAt(5, 5)).toBe(seg2);
    expect(graph.getSegmentAt(1, 1)).toBeUndefined();
  });

  it("should connect segments", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    graph.addSegment(seg1);
    graph.addSegment(seg2);

    const result = graph.connect(seg1.id, seg2.id);

    expect(result).toBe(true);
    expect(seg1.getNextSegment()).toBe(seg2);
  });

  it("should get downstream path", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    const seg3 = createStraightSegment(0, -2, "north");

    graph.addSegment(seg1);
    graph.addSegment(seg2);
    graph.addSegment(seg3);

    seg1.connectTo(seg2);
    seg2.connectTo(seg3);

    const path = graph.getDownstreamPath(seg1.id);

    expect(path).toHaveLength(3);
    expect(path[0]).toBe(seg1);
    expect(path[1]).toBe(seg2);
    expect(path[2]).toBe(seg3);
  });

  it("should remove segments and disconnect", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    graph.addSegment(seg1);
    graph.addSegment(seg2);
    seg1.connectTo(seg2);

    graph.removeSegment(seg1.id);

    expect(graph.size()).toBe(1);
    expect(seg2.hasInput()).toBe(false);
  });

  it("should clear all segments", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    graph.addSegment(seg1);
    graph.addSegment(seg2);
    seg1.connectTo(seg2);

    graph.clear();

    expect(graph.size()).toBe(0);
  });
});

describe("ConveyorSplineSystem", () => {
  let graph: SplineGraph;
  let system: ConveyorSplineSystem;

  beforeEach(() => {
    resetSegmentIdCounter();
    graph = new SplineGraph();
    system = new ConveyorSplineSystem(graph);
  });

  it("should add items to the system", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    const item = system.addItem({
      itemType: "stone",
      segment,
    });

    expect(system.getItemCount()).toBe(1);
    expect(system.getItem(item.id)).toBe(item);
  });

  it("should track items on segments", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    system.addItem({ itemType: "stone", segment, initialProgress: 0.2 });
    system.addItem({ itemType: "iron", segment, initialProgress: 0.6 });

    const items = system.getItemsOnSegment(segment);
    expect(items).toHaveLength(2);
  });

  it("should move items during update", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    graph.addSegment(seg1);
    graph.addSegment(seg2);
    seg1.connectTo(seg2);
    graph.markResolved(seg2.id, true);

    const item = system.addItem({
      itemType: "stone",
      segment: seg1,
      initialProgress: 0,
    });

    system.update(0.5); // Move half-way

    expect(item.progress).toBeGreaterThan(0);
  });

  it("should detect collision with item ahead", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    system.addItem({ itemType: "stone", segment, initialProgress: 0.5 });
    const item2 = system.addItem({
      itemType: "iron",
      segment,
      initialProgress: 0.4,
    });

    const blocked = system.checkCollision(item2);
    expect(blocked).toBe(true);
  });

  it("should allow movement when enough spacing", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);
    graph.markResolved(segment.id, true);

    system.addItem({ itemType: "stone", segment, initialProgress: 0.8 });
    const item2 = system.addItem({
      itemType: "iron",
      segment,
      initialProgress: 0.2,
    });

    const blocked = system.checkCollision(item2);
    expect(blocked).toBe(false);
  });

  it("should transition items between segments", () => {
    const seg1 = createStraightSegment(0, 0, "north");
    const seg2 = createStraightSegment(0, -1, "north");
    graph.addSegment(seg1);
    graph.addSegment(seg2);
    seg1.connectTo(seg2);
    graph.markResolved(seg2.id, true);

    const item = system.addItem({
      itemType: "stone",
      segment: seg1,
      initialProgress: 0.99,
    });

    system.update(0.1);

    expect(item.currentSegment).toBe(seg2);
    expect(item.progress).toBeLessThan(0.2);
  });

  it("should remove items correctly", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    const item = system.addItem({ itemType: "stone", segment });

    system.removeItem(item.id);

    expect(system.getItemCount()).toBe(0);
    expect(system.getItemsOnSegment(segment)).toHaveLength(0);
  });

  it("should cleanup items when segment removed", () => {
    const segment = createStraightSegment(0, 0, "north");
    graph.addSegment(segment);

    system.addItem({ itemType: "stone", segment });
    system.addItem({ itemType: "iron", segment });

    system.onSegmentRemoved(segment.id);

    expect(system.getItemCount()).toBe(0);
  });
});
