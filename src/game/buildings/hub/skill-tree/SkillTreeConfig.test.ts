import { describe, it, expect } from "vitest";
import {
  SKILL_TREE,
  getSkillNode,
  getSkillNodesForBuilding,
  getBuildingUnlockNode,
} from "./SkillTreeConfig";

describe("SkillTreeConfig", () => {
  describe("SKILL_TREE", () => {
    it("should have a root node", () => {
      const root = SKILL_TREE.find((n) => n.id === "root");
      expect(root).toBeDefined();
      expect(root?.requires).toHaveLength(0);
    });

    it("all nodes except root should have requirements", () => {
      const nonRootNodes = SKILL_TREE.filter((n) => n.id !== "root");
      for (const node of nonRootNodes) {
        expect(node.requires.length).toBeGreaterThan(0);
      }
    });

    it("all required nodes should exist", () => {
      for (const node of SKILL_TREE) {
        for (const reqId of node.requires) {
          const reqNode = getSkillNode(reqId);
          expect(reqNode).toBeDefined();
        }
      }
    });

    it("should have unique node IDs", () => {
      const ids = SKILL_TREE.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getSkillNode", () => {
    it("should return node for valid ID", () => {
      const node = getSkillNode("extractor_1");
      expect(node).toBeDefined();
      expect(node?.buildingId).toBe("extractor");
      expect(node?.level).toBe(1);
    });

    it("should return undefined for invalid ID", () => {
      const node = getSkillNode("nonexistent");
      expect(node).toBeUndefined();
    });
  });

  describe("getSkillNodesForBuilding", () => {
    it("should return nodes sorted by level", () => {
      const nodes = getSkillNodesForBuilding("extractor");
      expect(nodes.length).toBeGreaterThan(0);

      // Check sorting
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i].level).toBeGreaterThanOrEqual(nodes[i - 1].level);
      }
    });

    it("should include unlock node", () => {
      const nodes = getSkillNodesForBuilding("extractor");
      const unlockNode = nodes.find((n) => n.type === "unlock");
      expect(unlockNode).toBeDefined();
    });
  });

  describe("getBuildingUnlockNode", () => {
    it("should return unlock node for building", () => {
      const node = getBuildingUnlockNode("extractor");
      expect(node).toBeDefined();
      expect(node?.type).toBe("unlock");
      expect(node?.level).toBe(0);
    });

    it("should return undefined for hub (no unlock node, always available)", () => {
      // Hub uses root as unlock effectively
      const node = getBuildingUnlockNode("cable");
      expect(node).toBeUndefined();
    });
  });
});
