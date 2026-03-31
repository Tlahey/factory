import { BuildingEntity } from "../../entities/BuildingEntity";
import { IPowered, IPowerConnectable, PowerConfig } from "../BuildingConfig";
import { SolarPanelConfigType } from "./SolarPanelConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { IWorld, Direction } from "../../entities/types";
import { noise2D } from "../../utils/Noise";

export class SolarPanel extends BuildingEntity implements IPowered, IPowerConnectable {
  public buildingType: "solar_panel" = "solar_panel";
  public powerConfig: PowerConfig = { type: "producer", rate: 15 };
  public maxConnections = 2;
  
  // State
  public currentOutput = 0;
  public sunlightIntensity = 0.1; // 0 to 1

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "solar_panel", direction);
    this.initStats();
  }

  private initStats() {
    // Config might be undefined during tests if not mocked, but standard flow has it.
    const config = this.getConfig() as SolarPanelConfigType;
    if (config) {
      this.powerConfig = { ...config.powerConfig };
      this.maxConnections = config.maxConnections;
      
      // Apply upgrades
      const rateMult = skillTreeManager.getStatMultiplier("solar_panel", "powerConfig.rate");
      this.powerConfig.rate *= rateMult; // This updates instance copy

      const connAdd = skillTreeManager.getStatAdditive("solar_panel", "maxConnections");
      this.maxConnections += connAdd;
    }
  }

  public tick(_delta: number, _world?: IWorld): void {
    // Simulate Day/Night Cycle
    const cycleDuration = 60000; // 60s
    const time = Date.now();
    const cycleTime = time % cycleDuration;
    const progress = cycleTime / cycleDuration; // 0 to 1
    
    // Simple intensity curve: sin wave clamped to 0..1 (Night is 0)
    const rawSin = Math.sin(progress * Math.PI * 2);
    let intensity = Math.max(0, rawSin);

    // Cloud Simulation Matching ShaderUtils
    // Uniforms: uWindSpeed=0.15, uWindDirection=(1.0, 0.2).normalize() ~ (0.98, 0.19)
    // Scale: 0.05
    // Formula: snoise(pos * 0.05 + time * 0.15 * dir)
    if (intensity > 0) {
        // Constants derived from CloudUniforms
        const windX = 0.98;
        const windY = 0.19;
        const speed = 0.15;
        const scale = 0.05;

        // Time in seconds for the shader formula (Date.now is ms)
        const tSec = time / 1000;

        // Offset
        const offsetX = tSec * speed * windX;
        const offsetY = tSec * speed * windY;

        // Noise Input
        const nx = this.x * scale + offsetX;
        const ny = this.y * scale + offsetY;

        // My noise2D returns 0..1. GLSL snoise is -1..1.
        // To approximate "snoise > 0" (which drives smoothstep(0, 0.6)),
        // we map 0..1 to -1..1 => val * 2 - 1.
        // But simpler: just use 0.5 as threshold for "0".
        const rawNoise = noise2D(nx, ny); // 0..1
        
        // Shader: smoothstep(0.0, 0.6, snoise)
        // Equivalent: smoothstep(0.5, 0.8, rawNoise) (roughly mapping range)
        // If rawNoise > 0.5, we have clouds.
        if (rawNoise > 0.5) {
            // Remap 0.5..1.0 to 0..1 factor
            // factor 0 = edge of cloud, 1 = dense center
            let cloudDensity = (rawNoise - 0.5) * 2; 
            
            // smoothstep logic (0 to 0.6 in shader means 0.6 is full density)
            // Here we just scale it.
            // Let's say clouds block up to 80% light.
            intensity *= (1 - cloudDensity * 0.8);
        }
    }

    this.sunlightIntensity = intensity;

    // Calculate Output
    this.currentOutput = this.getPeakPowerRate() * this.sunlightIntensity;
  }

  public getPowerDemand(): number {
    return 0; // Producer
  }

  public getPowerGeneration(): number {
    return this.currentOutput;
  }

  public updatePowerStatus(
    _satisfaction: number,
    _hasSource: boolean,
    _gridId: number
  ): void {
    // Producers don't consume
    // We could update 'active' status here
  }

  public getPeakPowerRate(): number {
    return this.powerConfig.rate;
  }

  public getColor(): number {
    return 0x111188; // Dark Blue
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    console.log(`[SolarPanel] Serializing ${this.id} at ${this.x},${this.y}`);
    return {
      // No persistent state needed for V1 (time is global)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(_data: any) {
    this.initStats();
  }

  // Force allow placement everywhere for testing/unblocking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public isValidPlacement(_tile: any): boolean {
    return true;
  }
}
