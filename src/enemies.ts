import { Rng, pick } from "./rng.js";
import { Dungeon, isSolid } from "./dungeon.js";

export type EnemyKind = "slug" | "bat" | "wisp";

export interface Enemy {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  kind: EnemyKind;
}

const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function enemyCountForLevel(level: number): number {
  return Math.min(10, 2 + Math.floor(level / 2));
}

function kindForLevel(level: number, rng: Rng): EnemyKind {
  if (level <= 5) return rng() < 0.7 ? "slug" : "bat";
  if (level <= 10) return rng() < 0.5 ? "bat" : "slug";
  return rng() < 0.5 ? "wisp" : "bat";
}

export function spawnEnemies(
  d: Dungeon,
  entrance: { x: number; y: number },
  count: number,
  rng: Rng
): Enemy[] {
  const free: Array<[number, number]> = [];
  for (let y = 1; y < d.size - 1; y++) {
    for (let x = 1; x < d.size - 1; x++) {
      if (isSolid(d, x, y)) continue;
      if (Math.hypot(x - entrance.x, y - entrance.y) < 4) continue;
      free.push([x, y]);
    }
  }
  const enemies: Enemy[] = [];
  for (let i = 0; i < Math.min(count, free.length); i++) {
    const [cx, cy] = free[i];
    const dir = pick(rng, DIRS);
    enemies.push({
      x: cx + 0.5,
      y: cy + 0.5,
      dx: dir[0],
      dy: dir[1],
      speed: 1.2 + rng() * 1.0,
      kind: kindForLevel(Math.floor(rng() * 1000), rng),
    });
  }
  return enemies;
}

function cellFree(d: Dungeon, x: number, y: number): boolean {
  return !isSolid(d, Math.floor(x), Math.floor(y));
}

export function moveEnemies(enemies: Enemy[], d: Dungeon, dt: number, rng: Rng = Math.random): Enemy[] {
  return enemies.map((e) => {
    const nx = e.x + e.dx * e.speed * dt;
    const ny = e.y + e.dy * e.speed * dt;
    if (cellFree(d, nx, ny)) return { ...e, x: nx, y: ny };
    const free = DIRS.filter(([dx, dy]) => cellFree(d, e.x + dx * 0.6, e.y + dy * 0.6));
    if (free.length === 0) return e;
    const dir = pick(rng, free);
    return { ...e, dx: dir[0], dy: dir[1] };
  });
}
