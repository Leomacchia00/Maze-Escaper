import { Rng, pick } from "./rng.js";
import { Dungeon, isSolid } from "./dungeon.js";

export type EnemyKind = "slug" | "bat" | "wisp" | "brute";

export interface Enemy {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  chasing: boolean;
  flash?: number;
}

export const ENEMY_HP: Record<EnemyKind, number> = {
  slug: 3,
  bat: 1,
  wisp: 2,
  brute: 6,
};

export const ENEMY_BOUNTY: Record<EnemyKind, number> = {
  slug: 3,
  bat: 2,
  wisp: 4,
  brute: 6,
};

export const ENEMY_TRAITS: Record<EnemyKind, { speed: number; chaseRange: number }> = {
  slug: { speed: 1.0, chaseRange: 0 },
  bat: { speed: 2.2, chaseRange: 5 },
  wisp: { speed: 1.5, chaseRange: 6 },
  brute: { speed: 0.8, chaseRange: 3 },
};

const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function enemyCountForLevel(level: number): number {
  return Math.min(12, 2 + Math.floor(level / 2));
}

function kindForLevel(level: number, rng: Rng): EnemyKind {
  if (level <= 5) return rng() < 0.7 ? "slug" : "bat";
  if (level <= 10) {
    const r = rng();
    if (r < 0.15) return "brute";
    return r < 0.55 ? "bat" : "slug";
  }
  const r = rng();
  if (r < 0.2) return "brute";
  return r < 0.55 ? "wisp" : "bat";
}

export function spawnEnemies(
  d: Dungeon,
  entrance: { x: number; y: number },
  count: number,
  rng: Rng,
  level: number = 1
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
    const kind = kindForLevel(level, rng);
    const hp = ENEMY_HP[kind];
    enemies.push({
      x: cx + 0.5,
      y: cy + 0.5,
      dx: dir[0],
      dy: dir[1],
      speed: ENEMY_TRAITS[kind].speed + rng() * 0.4,
      kind,
      hp,
      maxHp: hp,
      chasing: false,
    });
  }
  return enemies;
}

function cellFree(d: Dungeon, x: number, y: number): boolean {
  return !isSolid(d, Math.floor(x), Math.floor(y));
}

function chaseDir(d: Dungeon, e: Enemy, px: number, py: number): [number, number] | null {
  const ddx = px - e.x;
  const ddy = py - e.y;
  const sx = Math.sign(ddx) || 1;
  const sy = Math.sign(ddy) || 1;
  const primary: [number, number] = Math.abs(ddx) >= Math.abs(ddy) ? [sx, 0] : [0, sy];
  const secondary: [number, number] = primary[0] !== 0 ? [0, sy] : [sx, 0];
  for (const dir of [primary, secondary]) {
    if (cellFree(d, e.x + dir[0] * 0.6, e.y + dir[1] * 0.6)) return dir;
  }
  return null;
}

export function moveEnemies(
  enemies: Enemy[],
  d: Dungeon,
  dt: number,
  px: number = -100,
  py: number = -100,
  rng: Rng = Math.random
): Enemy[] {
  return enemies.map((e) => {
    const flash = e.flash && e.flash > 0 ? e.flash - dt : 0;
    const dist = Math.hypot(px - e.x, py - e.y);
    if (dist < ENEMY_TRAITS[e.kind].chaseRange) {
      const dir = chaseDir(d, e, px, py);
      if (dir) {
        const sp = ENEMY_TRAITS[e.kind].speed;
        const nx = e.x + dir[0] * sp * dt;
        const ny = e.y + dir[1] * sp * dt;
        if (cellFree(d, nx, ny)) return { ...e, x: nx, y: ny, dx: dir[0], dy: dir[1], chasing: true, flash };
      }
      return { ...e, chasing: true, flash };
    }
    const nx = e.x + e.dx * e.speed * dt;
    const ny = e.y + e.dy * e.speed * dt;
    if (cellFree(d, nx, ny)) return { ...e, x: nx, y: ny, chasing: false, flash };
    const free = DIRS.filter(([dx, dy]) => cellFree(d, e.x + dx * 0.6, e.y + dy * 0.6));
    if (free.length === 0) return { ...e, chasing: false, flash };
    const dir = pick(rng, free);
    return { ...e, dx: dir[0], dy: dir[1], chasing: false, flash };
  });
}
