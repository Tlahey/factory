import * as THREE from "three";

export type ConveyorType = "straight" | "left" | "right";
export type ConveyorDir = "north" | "south" | "east" | "west";

export class ConveyorUtils {
  /**
   * Calculates the world position of an item on a conveyor.
   * @param x World X coordinate of conveyor
   * @param y World Z coordinate of conveyor (Game uses Y as Z logic often, but here we mean grid Y)
   * @param direction Output direction of the conveyor
   * @param type Geometry type (straight, left, right)
   * @param progress 0 to 1
   */
  public static getItemPosition(
    x: number,
    y: number,
    direction: ConveyorDir,
    type: ConveyorType,
    progress: number,
  ): THREE.Vector3 {
    // World Offset (Center of tile)
    const cx = x;
    const cz = y;

    // Height (Sit on belt at 0.11)
    const h = 0.11;

    if (type === "straight") {
      // Linear interpolation from Input to Output
      // North: z moves from 0.5 to -0.5
      // South: z moves from -0.5 to 0.5
      // East: x moves from -0.5 to 0.5
      // West: x moves from 0.5 to -0.5

      let lx = 0;
      let lz = 0;

      // Note: Standard progress 0 is ENTRY, 1 is EXIT.
      // Entry edge depends on direction.

      switch (direction) {
        case "north":
          lz = 0.5 - progress;
          break; // Enter at Z=0.5, Exit Z=-0.5
        case "south":
          lz = -0.5 + progress;
          break; // Enter Z=-0.5, Exit Z=0.5
        case "east":
          lx = -0.5 + progress;
          break; // Enter X=-0.5
        case "west":
          lx = 0.5 - progress;
          break; // Enter X=0.5
      }

      return new THREE.Vector3(cx + lx, h, cz + lz);
    } else {
      // CURVED
      // We need to map linear progress 0..1 to an Angle on the Arc.
      // Math depends on incoming direction + turn type.

      // Simplified Logic:
      // 1. Identify Center of Rotation logic relative to tile center.
      // Left Turn: Center is shifted -0.5 on Local X, +0.5 on Local Z (relative to entry face?)
      // Actually let's use the Arc definition from ConveyorGeometry.

      // Standard Left Turn (Geometry definition):
      // Center: (-0.5, 0.5)
      // Start (Entry): (0.0, 0.5) -- Wait, geometry arc is different.

      // Geometry Arc (Left):
      // Center: (-0.5, 0.5) relative to tile center? No, local space.
      // Tile Local Space: -0.5 to 0.5.
      // Standard Left Turn: Enters from Bottom (-Z? No), Exits Right (+X).
      // Let's visualize 'North' output Left turn.
      // Output North. Input must be East.
      // Path: East -> North.
      // Pivot is at (0.5, 0.5) relative to tile center?
      // Entrance: (0.5, 0) relative to pivot?

      // Let's abstract this.
      // A turn is a quarter circle of radius 0.5.
      // Pivot is at one of the 4 corners of the tile.

      // Determine Pivot Corner (dx, dz from center)
      let pdx = 0;
      let pdz = 0;

      // Clockwise = Right, CCW = Left
      // We need 4 cases for Direction (Output) + 2 types.

      // Helpers
      const isLeft = type === "left";

      // Map based on Output Direction
      if (direction === "north") {
        // Output North (-Z)
        if (isLeft) {
          // Input West -> North (Left Turn)
          // Pivot: (-0.5, -0.5) [Top-Left]
          // Start West (-0.5, 0) -> Angle PI/2
          // End North (0, -0.5) -> Angle 0
          pdx = -0.5;
          pdz = -0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            Math.PI / 2,
            0,
            progress,
          );
        } else {
          // Input East -> North (Right Turn)
          // Pivot: (0.5, -0.5) [Top-Right]
          // Start East (0.5, 0) -> Angle PI/2
          // End North (0, -0.5) -> Angle PI
          pdx = 0.5;
          pdz = -0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            Math.PI / 2,
            Math.PI,
            progress,
          );
        }
      } else if (direction === "south") {
        // Output South (+Z)
        if (isLeft) {
          // Input East -> South (Left Turn)
          // Pivot: (0.5, 0.5) [Bottom-Right]
          // Start East (0.5, 0) -> Angle -PI/2
          // End South (0, 0.5) -> Angle -PI
          pdx = 0.5;
          pdz = 0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            -Math.PI / 2,
            -Math.PI,
            progress,
          );
        } else {
          // Input West -> South (Right Turn)
          // Pivot: (-0.5, 0.5) [Bottom-Left]
          // Start West (-0.5, 0) -> Angle -PI/2
          // End South (0, 0.5) -> Angle 0
          pdx = -0.5;
          pdz = 0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            -Math.PI / 2,
            0,
            progress,
          );
        }
      } else if (direction === "east") {
        // Output East (+X)
        if (isLeft) {
          // Input North -> East (Left Turn)
          // Pivot: (0.5, -0.5) [Top-Right]
          // Start North (0, -0.5) -> Angle PI
          // End East (0.5, 0) -> Angle PI/2
          pdx = 0.5;
          pdz = -0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            Math.PI,
            Math.PI / 2,
            progress,
          );
        } else {
          // Input South -> East (Right Turn)
          // Pivot: (0.5, 0.5) [Bottom-Right]
          // Start South (0, 0.5) -> Angle PI
          // End East (0.5, 0) -> Angle 1.5PI (3PI/2)
          pdx = 0.5;
          pdz = 0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            Math.PI,
            1.5 * Math.PI,
            progress,
          );
        }
      } else if (direction === "west") {
        // Output West (-X)
        if (isLeft) {
          // Input South -> West (Left Turn)
          // Pivot: (-0.5, 0.5) [Bottom-Left]
          // Start South (0, 0.5) -> Angle 0
          // End West (-0.5, 0) -> Angle -PI/2
          pdx = -0.5;
          pdz = 0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            0,
            -Math.PI / 2,
            progress,
          );
        } else {
          // Input North -> West (Right Turn)
          // Pivot: (-0.5, -0.5) [Top-Left]
          // Start North (0, -0.5) -> Angle 0
          // End West (-0.5, 0) -> Angle PI/2
          pdx = -0.5;
          pdz = -0.5;
          return ConveyorUtils.getArcPos(
            cx,
            cz,
            h,
            pdx,
            pdz,
            0,
            Math.PI / 2,
            progress,
          );
        }
      }
    }

    return new THREE.Vector3(cx, h, cz);
  }

  private static getArcPos(
    cx: number,
    cz: number,
    y: number,
    pdx: number,
    pdz: number,
    startAng: number,
    endAng: number,
    t: number,
  ): THREE.Vector3 {
    const angle = startAng + (endAng - startAng) * t;
    const radius = 0.5;
    // Global Pivot pos
    const px = cx + pdx;
    const pz = cz + pdz;

    const lx = Math.cos(angle) * radius;
    const lz = Math.sin(angle) * radius;

    return new THREE.Vector3(px + lx, y, pz + lz);
  }
  public static getItemRotation(
    direction: ConveyorDir,
    type: ConveyorType,
    progress: number,
  ): number {
    if (type === "straight") {
      switch (direction) {
        case "north":
          return Math.PI; // Face North (-Z) -> Wait, atan2(0, -1) = PI. Logic check: dx=0, dz=-1. atan2(0,-1)=PI.
        // Standard Model usually faces +Z. Rot Y rotates it.
        // If I want to face North (-Z):
        // If model Forward is +Z. I need Rot PI.
        // Let's rely on standard Math.atan2(dx, dz).
        // North: dx=0, dz=-1. atan2(0, -1) = PI. (180 deg).
        // South: dx=0, dz=1. atan2(0, 1) = 0.
        // East: dx=1, dz=0. atan2(1, 0) = PI/2.
        // West: dx=-1, dz=0. atan2(-1, 0) = -PI/2.

        case "north":
          return Math.PI;
        case "south":
          return 0;
        case "east":
          return Math.PI / 2;
        case "west":
          return -Math.PI / 2;
      }
      return 0;
    } else {
      // Map based on Output Direction to find Start/End Angles
      const isLeft = type === "left";
      let startAng = 0;
      let endAng = 0;

      if (direction === "north") {
        // Output North
        if (isLeft) {
          // West -> North (Left)
          startAng = Math.PI / 2;
          endAng = 0;
        } else {
          // East -> North (Right)
          startAng = Math.PI / 2;
          endAng = Math.PI;
        }
      } else if (direction === "south") {
        // Output South
        if (isLeft) {
          // East -> South (Left)
          startAng = -Math.PI / 2;
          endAng = -Math.PI;
        } else {
          // West -> South (Right)
          startAng = -Math.PI / 2;
          endAng = 0;
        }
      } else if (direction === "east") {
        // Output East
        if (isLeft) {
          // North -> East (Left)
          startAng = Math.PI;
          endAng = Math.PI / 2;
        } else {
          // South -> East (Right)
          startAng = Math.PI;
          endAng = 1.5 * Math.PI;
        }
      } else if (direction === "west") {
        // Output West
        if (isLeft) {
          // South -> West (Left)
          startAng = 0;
          endAng = -Math.PI / 2;
        } else {
          // North -> West (Right)
          startAng = 0;
          endAng = Math.PI / 2;
        }
      }

      const t = progress;
      const currentAngle = startAng + (endAng - startAng) * t;

      // Check sweep direction
      const delta = endAng - startAng;

      // Derivative of Circle (radius r):
      // x = r * cos(a), z = r * sin(a)
      // dx/da = -r * sin(a)
      // dz/da = r * cos(a)
      // Tangent Vector T = (dx/dt, dz/dt) = (dx/da * da/dt, dz/da * da/dt)
      // da/dt = constant (delta).
      // T = (-sin(a) * delta, cos(a) * delta)

      const dx = -Math.sin(currentAngle) * delta;
      const dz = Math.cos(currentAngle) * delta;

      return Math.atan2(dx, dz);
    }
  }
}
