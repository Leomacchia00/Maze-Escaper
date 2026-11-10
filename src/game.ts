import { Dungeon, generateDungeon, dungeonSizeForLevel, roomCountForLevel, isSolid } from "./dungeon.js";
import { Chest, placeChests, chestCountForLevel } from "./chests.js";
import { Rng, mulberry32 } from "./rng.js";
import { Owned, skillEffects } from "./skills.js";

export type RunStatus = "ready" | "running" | "won" | "lost";

export interface RunState {
  level: number;
  dungeon: Dungeon;
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
  coins: number;
  treasures: string[];
  donations: string[];
  chestOpenCount: number;
  speedMult: number;
  coinMult: number;
}

export const PLAYER_RADIUS = 0.3;
export const RUN_SPEED = 4.5;
export const AIR_PER_CELL = 0.25;

export function baseAirForLevel(level: number, airMult: number = 1): number {
  return Math.round(dungeonSizeForLevel(level) * 1.5 * airMult);
}

export function createRun(level: number, seed: number, skills: Owned = {}): RunState {
  const rng: Rng = mulberry32(seed);
  const size = dungeonSizeForLevel(level);
  const roomCount = roomCountForLevel(level);
  const dungeon = generateDungeon(size, roomCount, rng);
  const fx = skillEffects(skills);
  const baseAir = baseAirForLevel(level, fx.airMult);
  const chests = placeChests(dungeon, dungeon.entrance, dungeon.exit, chestCountForLevel(level, roomCount), rng);
  const visited = new Uint8Array(size * size);
  visited[dungeon.entrance.y * size + dungeon.entrance.x] = 1;
  return {
    level,
    dungeon,
    px: dungeon.entrance.x + 0.5,
    py: dungeon.entrance.y + 0.5,
    facingX: 1,
    facingY: 0,
    air: baseAir,
    baseAir,
    status: "ready",
    visited,
    visitedCount: 1,
    chests,
    coins: 0,
    treasures: [],
    donations: [],
    chestOpenCount: 0,
    speedMult: fx.speedMult,
    coinMult: fx.coinMult,
  };
}

function blocked(d: Dungeon, x: number, y: number, r: number): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r);
  const y1 = Math.floor(y + r);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (!isSolid(d, cx, cy)) continue;
      const nx = Math.max(cx, Math.min(x, cx + 1));
      const ny = Math.max(cy, Math.min(y, cy + 1));
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

function slide(
  d: Dungeon, px: number, py: number, dx: number, dy: number, r: number
): { x: number; y: number } {
  let nx = px + dx;
  if (blocked(d, nx, py, r)) nx = px;
  let ny = py + dy;
  if (blocked(d, nx, ny, r)) ny = py;
  return { x: nx, y: ny };
}

export function movePlayer(state: RunState, ix: number, iy: number, dt: number): RunState {
  if (state.status === "won" || state.status === "lost") return state;
  const len = Math.hypot(ix, iy);
  if (len === 0) return state;
  const dist = RUN_SPEED * state.speedMult * Math.min(dt, 0.1);
  const steps = Math.max(1, Math.ceil(dist / 0.15));
  const sdx = ((ix / len) * dist) / steps;
  const sdy = ((iy / len) * dist) / steps;
  let px = state.px;
  let py = state.py;
  for (let i = 0; i < steps; i++) {
    const res = slide(state.dungeon, px, py, sdx, sdy, PLAYER_RADIUS);
    px = res.x;
    py = res.y;
  }
  const visited = state.visited.slice();
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  const cell = cy * state.dungeon.size + cx;
  let visitedCount = state.visitedCount;
  let air = state.air;
  if (!visited[cell]) {
    visited[cell] = 1;
    visitedCount += 1;
    air = Math.min(air + AIR_PER_CELL, state.baseAir);
  }
  const status: RunStatus =
    state.status === "ready" && (px !== state.px || py !== state.py) ? "running" : state.status;
  const won = status === "running" && cx === state.dungeon.exit.x && cy === state.dungeon.exit.y;
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

export function tick(state: RunState, dt: number): RunState {
  if (state.status !== "running") return state;
  const air = state.air - dt;
  if (air <= 0) return { ...state, air: 0, status: "lost" };
  return { ...state, air };
}

export function pickupChests(state: RunState): RunState {
  const cx = Math.floor(state.px);
  const cy = Math.floor(state.py);
  const hit = state.chests.find((c) => !c.opened && Math.floor(c.x) === cx && Math.floor(c.y) === cy);
  if (!hit) return state;
  const chests = state.chests.map((c) => (c.id === hit.id ? { ...c, opened: true } : c));
  return {
    ...state,
    chests,
    coins: state.coins + Math.round(hit.coins * state.coinMult),
    treasures: hit.treasure ? [...state.treasures, hit.treasure] : state.treasures,
    donations: hit.donation ? [...state.donations, hit.donation] : state.donations,
    chestOpenCount: state.chestOpenCount + 1,
  };
}

export function payout(state: RunState): { coins: number; treasures: string[]; donations: string[] } {
  if (state.status === "won") {
    return { coins: state.coins, treasures: state.treasures, donations: state.donations };
  }
  return {
    coins: Math.floor(state.coins / 2),
    treasures: state.treasures.slice(0, Math.floor(state.treasures.length / 2)),
    donations: state.donations.slice(0, Math.floor(state.donations.length / 2)),
  };
}
