export abstract class Entity {
  public id: string;
  public x: number;
  public y: number;
  public type: string;

  constructor(x: number, y: number, type: string) {
    this.id = crypto.randomUUID();
    this.x = x;
    this.y = y;
    this.type = type;
  }

  // Called every tick
  public abstract update(delta: number): void;

  // Called for visual rendering updates (if decoupled)
  // or could return renderable data
  public abstract getType(): string;
}
