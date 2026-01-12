import * as THREE from "three";

/**
 * SPLINE SEGMENT
 *
 * Represents a single conveyor segment with a CurvePath defining the exact path
 * items follow. Each segment has input and output nodes for graph connectivity.
 */

export type Direction = "north" | "south" | "east" | "west";

export interface SplineNode {
  segment: SplineSegment;
  type: "input" | "output";
  position: THREE.Vector3;
  connectedTo: SplineNode | null;
}

export interface SplineSegmentConfig {
  id: string;
  gridX: number;
  gridY: number;
  direction: Direction;
  type: "straight" | "left" | "right";
  speed?: number;
  capacity?: number;
}

export class SplineSegment {
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public readonly direction: Direction;
  public readonly segmentType: "straight" | "left" | "right";

  public readonly curve: THREE.CurvePath<THREE.Vector3>;
  public readonly inputNode: SplineNode;
  public readonly outputNode: SplineNode;

  public readonly capacity: number;
  public readonly speed: number;

  private curveLength: number;

  constructor(config: SplineSegmentConfig) {
    this.id = config.id;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.direction = config.direction;
    this.segmentType = config.type;
    this.speed = config.speed ?? 1.0; // Units per second
    this.capacity = config.capacity ?? 3; // Max items on segment

    // Create the curve based on type
    this.curve = this.createCurve();
    this.curveLength = this.curve.getLength();

    // Create nodes at curve endpoints
    this.inputNode = {
      segment: this,
      type: "input",
      position: this.curve.getPointAt(0),
      connectedTo: null,
    };

    this.outputNode = {
      segment: this,
      type: "output",
      position: this.curve.getPointAt(1),
      connectedTo: null,
    };
  }

  /**
   * Connect this segment's output to another segment's input
   */
  public connectTo(target: SplineSegment): void {
    this.outputNode.connectedTo = target.inputNode;
    target.inputNode.connectedTo = this.outputNode;
  }

  /**
   * Disconnect this segment's output
   */
  public disconnect(): void {
    if (this.outputNode.connectedTo) {
      this.outputNode.connectedTo.connectedTo = null;
      this.outputNode.connectedTo = null;
    }
    if (this.inputNode.connectedTo) {
      this.inputNode.connectedTo.connectedTo = null;
      this.inputNode.connectedTo = null;
    }
  }

  /**
   * Get world position at progress t (0-1)
   */
  public getPointAt(t: number): THREE.Vector3 {
    return this.curve.getPointAt(Math.max(0, Math.min(1, t)));
  }

  /**
   * Get tangent direction at progress t (0-1)
   */
  public getTangentAt(t: number): THREE.Vector3 {
    return this.curve.getTangentAt(Math.max(0, Math.min(1, t)));
  }

  /**
   * Get the length of this segment's curve
   */
  public getLength(): number {
    return this.curveLength;
  }

  /**
   * Check if this segment has a valid downstream connection
   */
  public hasOutput(): boolean {
    return this.outputNode.connectedTo !== null;
  }

  /**
   * Check if this segment has an upstream connection
   */
  public hasInput(): boolean {
    return this.inputNode.connectedTo !== null;
  }

  /**
   * Get the next segment in the chain (or null)
   */
  public getNextSegment(): SplineSegment | null {
    return this.outputNode.connectedTo?.segment ?? null;
  }

  /**
   * Get the previous segment in the chain (or null)
   */
  public getPreviousSegment(): SplineSegment | null {
    return this.inputNode.connectedTo?.segment ?? null;
  }

  /**
   * Create the THREE.CurvePath based on segment type and direction
   */
  private createCurve(): THREE.CurvePath<THREE.Vector3> {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const worldX = this.gridX;
    const worldZ = this.gridY; // Grid Y maps to world Z
    const y = 0.2; // Height above ground

    if (this.segmentType === "straight") {
      const start = this.getStartPoint(worldX, y, worldZ);
      const end = this.getEndPoint(worldX, y, worldZ);
      path.add(new THREE.LineCurve3(start, end));
    } else {
      // Curved path (left or right turn)
      const points = this.generateCurvePoints(worldX, y, worldZ);
      path.add(new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5));
    }

    return path;
  }

  /**
   * Get start point for straight segment based on direction
   */
  private getStartPoint(x: number, y: number, z: number): THREE.Vector3 {
    const offset = 0.5;
    switch (this.direction) {
      case "north":
        return new THREE.Vector3(x, y, z + offset);
      case "south":
        return new THREE.Vector3(x, y, z - offset);
      case "east":
        return new THREE.Vector3(x - offset, y, z);
      case "west":
        return new THREE.Vector3(x + offset, y, z);
    }
  }

  /**
   * Get end point for straight segment based on direction
   */
  private getEndPoint(x: number, y: number, z: number): THREE.Vector3 {
    const offset = 0.5;
    switch (this.direction) {
      case "north":
        return new THREE.Vector3(x, y, z - offset);
      case "south":
        return new THREE.Vector3(x, y, z + offset);
      case "east":
        return new THREE.Vector3(x + offset, y, z);
      case "west":
        return new THREE.Vector3(x - offset, y, z);
    }
  }

  /**
   * Generate curve points for a 90° turn
   */
  private generateCurvePoints(
    x: number,
    y: number,
    z: number,
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const segments = 8;
    const radius = 0.5;

    // Get turn arc configuration based on output direction and turn type
    const arcConfig = this.getArcConfig(x, z, radius);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle =
        arcConfig.startAngle + (arcConfig.endAngle - arcConfig.startAngle) * t;
      points.push(
        new THREE.Vector3(
          arcConfig.centerX + radius * Math.cos(angle),
          y,
          arcConfig.centerZ + radius * Math.sin(angle),
        ),
      );
    }

    return points;
  }

  /**
   * Get arc configuration for 90° turns
   * Returns center position and start/end angles for the arc
   */
  private getArcConfig(
    x: number,
    z: number,
    radius: number,
  ): {
    centerX: number;
    centerZ: number;
    startAngle: number;
    endAngle: number;
  } {
    const isLeft = this.segmentType === "left";

    // Arc configurations based on output direction
    // For each output direction, defines:
    // - Center offset from grid position
    // - Start angle (where items enter)
    // - End angle (where items exit)
    //
    // Left turns: counter-clockwise arc
    // Right turns: clockwise arc

    switch (this.direction) {
      case "north": {
        if (isLeft) {
          // Input from East, output North (counter-clockwise)
          return {
            centerX: x - radius,
            centerZ: z - radius,
            startAngle: Math.PI / 2, // Coming from bottom-right
            endAngle: 0, // Exiting to right
          };
        } else {
          // Input from West, output North (clockwise)
          return {
            centerX: x + radius,
            centerZ: z - radius,
            startAngle: Math.PI / 2, // Coming from bottom-left
            endAngle: Math.PI, // Exiting to left
          };
        }
      }
      case "south": {
        if (isLeft) {
          // Input from West, output South (counter-clockwise)
          return {
            centerX: x + radius,
            centerZ: z + radius,
            startAngle: -Math.PI / 2, // Coming from top-left
            endAngle: -Math.PI, // Exiting to left
          };
        } else {
          // Input from East, output South (clockwise)
          return {
            centerX: x - radius,
            centerZ: z + radius,
            startAngle: -Math.PI / 2, // Coming from top-right
            endAngle: 0, // Exiting to right
          };
        }
      }
      case "east": {
        if (isLeft) {
          // Input from South, output East (counter-clockwise)
          return {
            centerX: x + radius,
            centerZ: z + radius,
            startAngle: -Math.PI, // Coming from left
            endAngle: -Math.PI / 2, // Exiting to top
          };
        } else {
          // Input from North, output East (clockwise)
          return {
            centerX: x + radius,
            centerZ: z - radius,
            startAngle: Math.PI, // Coming from left
            endAngle: Math.PI / 2, // Exiting to bottom
          };
        }
      }
      case "west": {
        if (isLeft) {
          // Input from North, output West (counter-clockwise)
          return {
            centerX: x - radius,
            centerZ: z - radius,
            startAngle: 0, // Coming from right
            endAngle: Math.PI / 2, // Exiting to bottom
          };
        } else {
          // Input from South, output West (clockwise)
          return {
            centerX: x - radius,
            centerZ: z + radius,
            startAngle: 0, // Coming from right
            endAngle: -Math.PI / 2, // Exiting to top
          };
        }
      }
    }
  }
}
