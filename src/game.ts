import { Maze, generateMaze, mazeSizeForLevel, TOP, RIGHT, BOTTOM, LEFT, canMove, neighborIndex } from "./maze.js";
import { extraTimeMultiplier, timerSpeedFactor, fogBonus, hasCompass } from "./skills.js";

export type Direction = 1 | 2 | 4 | 8;

export type RunStatus = "ready" | "running" | "paused" | "won" | "lost";

export interface RunState {
  level: number;
  maze: Maze;
  player: number;
  visited: Uint8Array;
  visitedCount: number;
  baseTime: number;
  timeLeft: number;
  status: RunStatus;
  moves: number;
  timerFactor: number;
  compass: boolean;
  fogBonus: number;
}

export const VISIT_BONUS_SECONDS = 0.2;

export function fogRadiusForLevel(level: number): number {
  if (level >= 8) return 2;
  if (level >= 4) return 3;
  return Infinity;
}

export function fogRadius(state: RunState): number {
  const base = fogRadiusForLevel(state.level);
  return base === Infinity ? Infinity : base + state.fogBonus;
}

export function createRun(
  level: number,
  rng: () => number = Math.random,
  skills: Record<string, number> = {}
): RunState {
  const n = mazeSizeForLevel(level);
  const maze = generateMaze(n, rng);
  const visited = new Uint8Array(n * n);
  visited[maze.entrance] = 1;
  const baseTime = n * 2.5 * extraTimeMultiplier(skills);
  return {
    level,
    maze,
    player: maze.entrance,
    visited,
    visitedCount: 1,
    baseTime,
    timeLeft: baseTime,
    status: "ready",
    moves: 0,
    timerFactor: timerSpeedFactor(skills),
    compass: hasCompass(skills),
    fogBonus: fogBonus(skills),
  };
}

export function tick(state: RunState, dtSeconds: number): RunState {
  if (state.status !== "running") return state;
  const timeLeft = state.timeLeft - dtSeconds * state.timerFactor;
  if (timeLeft <= 0) {
    return { ...state, timeLeft: 0, status: "lost" };
  }
  return { ...state, timeLeft };
}

export function tryMove(state: RunState, dir: Direction): RunState {
  if (state.status !== "ready" && state.status !== "running") return state;
  if (!canMove(state.maze, state.player, dir)) return state;

  const next = neighborIndex(state.maze.n, state.player, dir);
  let timeLeft = state.timeLeft;
  let visitedCount = state.visitedCount;
  let visited = state.visited;
  if (!visited[next]) {
    visited = visited.slice();
    visited[next] = 1;
    visitedCount += 1;
    timeLeft += VISIT_BONUS_SECONDS;
  }

  const status: RunStatus = next === state.maze.exit ? "won" : "running";
  return {
    ...state,
    player: next,
    visited,
    visitedCount,
    timeLeft,
    status,
    moves: state.moves + 1,
  };
}

export function pause(state: RunState): RunState {
  if (state.status !== "running" && state.status !== "ready") return state;
  return { ...state, status: "paused" };
}

export function resume(state: RunState): RunState {
  if (state.status !== "paused") return state;
  return { ...state, status: state.moves === 0 ? "ready" : "running" };
}

export function computeScore(timeLeft: number, n: number, visitedCount: number): number {
  const timePoints = Math.max(0, timeLeft) * 10;
  const sizePoints = n * n;
  const efficiencyBonus = Math.max(0, (n * n - visitedCount) * 5);
  return Math.round(timePoints + sizePoints + efficiencyBonus);
}

export function isVictory(state: RunState): boolean {
  return state.status === "won";
}

export { TOP, RIGHT, BOTTOM, LEFT };
