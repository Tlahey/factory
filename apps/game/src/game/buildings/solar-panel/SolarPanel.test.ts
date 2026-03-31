import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SolarPanel } from "./SolarPanel";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import * as NoiseUtils from "../../utils/Noise";

// Mock SkillTreeManager
vi.mock("../hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getStatMultiplier: vi.fn(),
    getStatAdditive: vi.fn(),
  },
}));

// Mock Noise
vi.mock("../../utils/Noise", () => ({
  noise2D: vi.fn(),
}));

describe("SolarPanel", () => {
  beforeEach(() => {
    vi.mocked(skillTreeManager.getStatMultiplier).mockReturnValue(1.0);
    vi.mocked(skillTreeManager.getStatAdditive).mockReturnValue(0);
    vi.mocked(NoiseUtils.noise2D).mockReturnValue(0); // Clear skies by default
    
    // Mock Date.now to control sunlight cycle
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with default stats", () => {
    const panel = new SolarPanel(0, 0);
    expect(panel.powerConfig.rate).toBe(5); // 1x1 rate
    expect(panel.maxConnections).toBe(2);
    expect(panel.sunlightIntensity).toBe(0.1); // Initial
  });

  it("should generate power based on time of day", () => {
    const panel = new SolarPanel(0, 0);
    
    // Time 0: Midnight
    vi.setSystemTime(0);
    panel.tick(1); 
    expect(panel.sunlightIntensity).toBeCloseTo(0);
    expect(panel.getPowerGeneration()).toBeCloseTo(0);

    // Time: 15s (Noon)
    vi.setSystemTime(15000);
    panel.tick(1);
    expect(panel.sunlightIntensity).toBeCloseTo(1);
    expect(panel.getPowerGeneration()).toBeCloseTo(5); // 1x1 max

    // Time: 45s (Night)
    vi.setSystemTime(45000);
    panel.tick(1);
    expect(panel.sunlightIntensity).toBe(0);
    expect(panel.getPowerGeneration()).toBe(0);
  });

  it("should reduce power when cloudy", () => {
    const panel = new SolarPanel(0, 0);
    
    // Noon (Max Sun) but with heavy clouds
    vi.setSystemTime(15000);
    vi.mocked(NoiseUtils.noise2D).mockReturnValue(1.0); // Max clouds

    panel.tick(1);
    
    // Formula: intensity *= (1 - cloud * 0.8) => 1 * (1 - 0.8) = 0.2
    expect(panel.sunlightIntensity).toBeCloseTo(0.2);
    expect(panel.getPowerGeneration()).toBeCloseTo(5 * 0.2);
  });
});
