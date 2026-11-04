/**
 * Deterministic, discrete-grid Astra simulator for software-in-the-loop tests.
 * This is not a physics engine and never controls physical hardware.
 */
export type AstraHeading = "north" | "east" | "south" | "west";
export type AstraGridCommand = "move-forward" | "move-backward" | "turn-left" | "turn-right" | "stop";

export interface AstraGridPoint { readonly x: number; readonly y: number; }
export interface AstraGridWorld {
  readonly width: number;
  readonly height: number;
  readonly obstacles: readonly AstraGridPoint[];
  readonly robot: AstraGridPoint & { readonly heading: AstraHeading };
}
export interface AstraGridSimulationResult {
  readonly world: AstraGridWorld;
  readonly metrics: {
    readonly stepsExecuted: number;
    readonly distanceTravelled: number;
    readonly collisions: number;
    readonly halted: boolean;
    readonly stopReason: string | null;
  };
}

const HEADINGS: readonly AstraHeading[] = ["north", "east", "south", "west"];
const DELTA: Record<AstraHeading, AstraGridPoint> = {
  north: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: -1 },
  west: { x: -1, y: 0 },
};

function isInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function validateAstraGridWorld(world: AstraGridWorld): string[] {
  const errors: string[] = [];
  if (!world || typeof world !== "object") return ["A simulation world is required."];
  if (!isInteger(world.width) || !isInteger(world.height) || world.width < 1 || world.height < 1 || world.width > 100 || world.height > 100) {
    errors.push("World dimensions must be integers between 1 and 100.");
    return errors;
  }
  const inBounds = (point: AstraGridPoint | null | undefined) =>
    Boolean(point && typeof point === "object" && isInteger(point.x) && isInteger(point.y) &&
      point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height);
  const robotValid = Boolean(world.robot && typeof world.robot === "object");
  if (!robotValid || !inBounds(world.robot)) errors.push("Robot position must be an integer point inside the world.");
  if (robotValid && !HEADINGS.includes(world.robot.heading)) errors.push("Robot heading is invalid.");
  if (!Array.isArray(world.obstacles)) errors.push("World obstacles must be an array.");
  else {
    const seen = new Set<string>();
    for (const obstacle of world.obstacles) {
      if (!inBounds(obstacle)) errors.push("Every obstacle must be an integer point inside the world.");
      else {
        const key = `${obstacle.x},${obstacle.y}`;
        if (seen.has(key)) errors.push("Duplicate obstacle positions are not allowed.");
        seen.add(key);
        if (robotValid && obstacle.x === world.robot.x && obstacle.y === world.robot.y) errors.push("The robot cannot start inside an obstacle.");
      }
    }
  }
  return errors;
}

/**
 * Runs a deterministic command sequence against a bounded occupancy grid.
 * A collision halts the run before the robot enters the blocked cell.
 */
export function runAstraGridSimulation(
  initialWorld: AstraGridWorld,
  commands: readonly AstraGridCommand[],
  options?: { maxSteps?: number },
): AstraGridSimulationResult {
  const errors = validateAstraGridWorld(initialWorld);
  if (errors.length) throw new Error(errors.join(" "));
  if (!Array.isArray(commands)) throw new Error("Simulation commands must be an array.");
  const maxSteps = options?.maxSteps ?? 100;
  if (!isInteger(maxSteps) || maxSteps < 1 || maxSteps > 500) throw new Error("Simulation maxSteps must be an integer between 1 and 500.");
  if (commands.length > maxSteps) throw new Error("Simulation command count exceeds maxSteps.");
  if (commands.some((command) => !["move-forward", "move-backward", "turn-left", "turn-right", "stop"].includes(command))) {
    throw new Error("Simulation contains an unsupported command.");
  }

  let x = initialWorld.robot.x;
  let y = initialWorld.robot.y;
  let heading = initialWorld.robot.heading;
  let stepsExecuted = 0;
  let distanceTravelled = 0;
  let collisions = 0;
  let halted = false;
  let stopReason: string | null = null;
  const obstacles = new Set(initialWorld.obstacles.map((point) => `${point.x},${point.y}`));

  for (const command of commands) {
    if (halted) break;
    stepsExecuted += 1;
    if (command === "stop") {
      halted = true;
      stopReason = "Stop command received.";
      continue;
    }
    if (command === "turn-left" || command === "turn-right") {
      const current = HEADINGS.indexOf(heading);
      const offset = command === "turn-left" ? 3 : 1;
      heading = HEADINGS[(current + offset) % HEADINGS.length];
      continue;
    }

    const direction = DELTA[heading];
    const multiplier = command === "move-forward" ? 1 : -1;
    const nextX = x + direction.x * multiplier;
    const nextY = y + direction.y * multiplier;
    const nextKey = `${nextX},${nextY}`;
    if (nextX < 0 || nextY < 0 || nextX >= initialWorld.width || nextY >= initialWorld.height || obstacles.has(nextKey)) {
      collisions += 1;
      halted = true;
      stopReason = "Collision boundary reached; movement halted before entering the blocked cell.";
      continue;
    }
    x = nextX;
    y = nextY;
    distanceTravelled += 1;
  }

  return {
    world: {
      width: initialWorld.width,
      height: initialWorld.height,
      obstacles: initialWorld.obstacles.map((point) => ({ x: point.x, y: point.y })),
      robot: { x, y, heading },
    },
    metrics: { stepsExecuted, distanceTravelled, collisions, halted, stopReason },
  };
}
