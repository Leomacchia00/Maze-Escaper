import { Maze, generateMaze, mazeSizeForLevel, TOP, RIGHT, BOTTOM, LEFT } from "./maze.js";
import { Chest, placeChests, openChestAt } from "./chests.js";

export type RunStatus = "ready" | "running" | "won" | "lost";

export interface RunState {
  level: number;
  maze: Maze;
  px: number;
  py: number;
  facingX: number;
  facingY: number;
  air: number;
  baseAir: number;
  status: RunStatus;
  visited: Uint8Array;
  visitedCount: number;
  chests: Chest[];
  lootCoins: number;
  lootTreasures: string[];
}

export const PLAYER_RADIUS = 0.3;
export const RUN_SPEED = 4.5;
export const AIR_PER_CELL = 0.25;

export function baseAirForLevel(level: number): number {
  const n = mazeSizeForLevel(level);
  return Math.round(n * 2.2 * 10) / 10;
}

export function createRun(
  level: number,
  rng: () => number = Math.random,
  skills: Record<string, number> = {}
): RunState {
  const n = mazeSizeForLevel(level);
  const maze = generateMaze(n, rng);
  const freeCells: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (i !== maze.entrance && i !== maze.exit) freeCells.push(i);
  }
  const chests = placeChests(freeCells, maze.entrance, maze.exit, chestCountForCells(n * n), rng);
  const baseAir = baseAirForLevel(level);
  const visited = new Uint8Array(n * n);
  visited[maze.entrance] = 1;
  return {
    level,
    maze,
    px: (maze.entrance % n) + 0.5,
    py: Math.floor(maze.entrance / n) + 0.5,
    facingX: 1,
    facingY: 0,
    air: baseAir,
    baseAir,
    status: "ready",
    visited,
    visitedCount: 1,
    chests,
    lootCoins: 0,
    lootTreasures: [],
  };
}

export function movePlayer(state: RunState, ix: number, iy: number, dt: number): RunState {
  if (state.status !== "running" && state.status !== "ready") return state;
  const len = Math.hypot(ix, iy);
  if (len === 0) return state;
  const dist = RUN_SPEED * Math.min(dt, 0.1);
  const steps = Math.max(1, Math.ceil(dist / 0.2));
  const sdx = ((ix / len) * dist) / steps;
  const sdy = ((iy / len) * dist) / steps;
  let px = state.px;
  let py = state.py;
  for (let i = 0; i < steps; i++) {
    const res = slide(state.maze, px, py, sdx, sdy);
    px = res.px;
    py = res.py;
  }
  const visited = state.visited.slice();
  const cell = Math.floor(py) * state.maze.n + Math.floor(px);
  let visitedCount = state.visitedCount;
  if (!visited[cell]) {
    visited[cell] = 1;
    visitedCount += 1;
  }
  let air = state.air;
  if (visitedCount > state.visitedCount) air = Math.min(air + AIR_PER_CELL, state.baseAir);
  const status: RunStatus =
    state.status === "ready" && (px !== state.px || py !== state.py) ? "running" : state.status;
  const won = status === "running" && cell === state.maze.exit;
  return {
    ...state,
    px,
    py,
    facingX: ix !== 0 ? Math.sign(ix) : state.facingX,
    facingY: iy !== 0 ? Math.sign(iy) : state.facingY,
    visited,
    visitedCount,
    air,
    status: won ? "won" : status,
  };
}

function slide(
  maze: Maze, px: number, py: number, dx: number, dy: number, r: number = PLAYER_RADIUS
): { px: number; py: number } {
  let nx = px + dx;
  const row0 = Math.floor(py - r + 1e-6);
  const row1 = Math.floor(py + r - 1e-6);
  if (dx > 0) {
    const col = Math.floor(nx + r);
    for (let row = row0; row <= row1; row++) {
      if (maze.walls[row * maze.n + col] & LEFT) { nx = col - r - 1e-6; break; }
    }
  } else if (dx < 0) {
    const col = Math.floor(nx - r);
    for (let row = row0; row <= row1; row++) {
      if (maze.walls[row * maze.n + col] & RIGHT) { nx = col + 1 + r; break; }
    }
  }
  let ny = py + dy;
  if (dy > 0) {
    const row = Math.floor(ny + r);
    for (let col = Math.floor(px - r + 1e-6); col <= Math.floor(px + r - 1e-6); col++) {
      if (maze.walls[row * maze.n + col] & BOTTOM) { ny = row - r - 1e-6; break; }
    }
  } else if (dy < 0) {
    const row = Math.floor(ny - r);
    for (let col = Math.floor(px - r + 1e-6); col <= Math.floor(px + r - 1e-6); col++) {
      if (maze.walls[row * maze.n + col] & TOP) { ny = row + 1 + r; break; }
    }
  }
  return { px: nx, py: ny };
}

export function tick(state: RunState, dt: number): RunState {
  if (state.status !== "running") return state;
  const air = state.air - dt;
  if (air <= 0) return { ...state, air: 0, status: "lost" };
  return { ...state, air };
}

export function pickupChests(state: RunState): RunState {
  const cell = Math.floor(state.py) * state.maze.n + Math.floor(state.px);
  const hit = state.chests.find((c) => c.cell === cell && !c.opened);
  if (!hit) return state;
  const chests = state.chests.map((c) => (c.cell === cell ? { ...c, opened: true } : c));
  const lootCoins = state.lootCoins + hit.coins;
  const lootTreasures = hit.treasure ? [...state.lootTreasures, hit.treasure] : state.lootTreasures;
  return { ...state, chests, lootCoins, lootTreasures };
}

export function chestCountForCells(cells: number): number {
  return Math.min(8, Math.max(3, Math.round(cells / 45)));
}
