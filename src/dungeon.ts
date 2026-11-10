import { Rng, randInt } from "./rng.js";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dungeon {
  size: number;
  solid: Uint8Array;
  rooms: Rect[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
}

export function dungeonSizeForLevel(level: number): number {
  return Math.min(41, 15 + (level - 1) * 2);
}

export function roomCountForLevel(level: number): number {
  return Math.min(9, 3 + Math.floor((level - 1) / 2));
}

export function isSolid(d: Dungeon, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= d.size || y >= d.size) return true;
  return d.solid[y * d.size + x] === 1;
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) };
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y
  );
}

function carveCell(d: Dungeon, x: number, y: number): void {
  if (x > 0 && y > 0 && x < d.size - 1 && y < d.size - 1) d.solid[y * d.size + x] = 0;
}

function carveRect(d: Dungeon, r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) carveCell(d, x, y);
  }
}

function carveCorridor(d: Dungeon, ax: number, ay: number, bx: number, by: number): void {
  let x = ax;
  let y = ay;
  while (x !== bx) {
    carveCell(d, x, y);
    x += bx > x ? 1 : -1;
  }
  while (y !== by) {
    carveCell(d, x, y);
    y += by > y ? 1 : -1;
  }
  carveCell(d, x, y);
}

export function bfsDistances(d: Dungeon, sx: number, sy: number): Int32Array {
  const n = d.size;
  const dist = new Int32Array(n * n).fill(-1);
  const queue = new Int32Array(n * n);
  let head = 0;
  let tail = 0;
  const start = sy * n + sx;
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % n;
    const cy = (cur - cx) / n;
    const nd = dist[cur] + 1;
    const steps: Array<[number, number]> = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of steps) {
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const idx = ny * n + nx;
      if (d.solid[idx] === 1 || dist[idx] !== -1) continue;
      dist[idx] = nd;
      queue[tail++] = idx;
    }
  }
  return dist;
}

export function reachableFloorCount(d: Dungeon, sx: number, sy: number): number {
  const dist = bfsDistances(d, sx, sy);
  let count = 0;
  for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) count++;
  return count;
}

export function floorCount(d: Dungeon): number {
  let count = 0;
  for (let i = 0; i < d.solid.length; i++) if (d.solid[i] === 0) count++;
  return count;
}

export function generateDungeon(size: number, roomCount: number, rng: Rng): Dungeon {
  const solid = new Uint8Array(size * size).fill(1);
  const rooms: Rect[] = [];
  const attempts = roomCount * 60;
  for (let i = 0; i < attempts && rooms.length < roomCount; i++) {
    const w = randInt(rng, 3, 6);
    const h = randInt(rng, 3, 6);
    const x = 1 + Math.floor(rng() * (size - w - 2));
    const y = 1 + Math.floor(rng() * (size - h - 2));
    const r: Rect = { x, y, w, h };
    if (rooms.some((o) => overlaps(r, o, 2))) continue;
    rooms.push(r);
  }
  const d: Dungeon = {
    size,
    solid,
    rooms,
    entrance: { x: 1, y: 1 },
    exit: { x: 1, y: 1 },
  };
  for (const r of rooms) carveRect(d, r);
  for (let i = 1; i < rooms.length; i++) {
    const a = rectCenter(rooms[i - 1]);
    const b = rectCenter(rooms[i]);
    carveCorridor(d, a.x, a.y, b.x, b.y);
  }
  if (rooms.length > 2) {
    const extras = Math.max(1, Math.floor(rooms.length / 3));
    for (let i = 0; i < extras; i++) {
      const a = rectCenter(rooms[i % rooms.length]);
      const b = rectCenter(rooms[(i + 2) % rooms.length]);
      carveCorridor(d, a.x, a.y, b.x, b.y);
    }
  }
  const first = rectCenter(rooms[0]);
  d.entrance = first;
  repairConnectivity(d, rooms);
  const dist = bfsDistances(d, first.x, first.y);
  let best = first;
  let bestDist = -1;
  for (const r of rooms) {
    const c = rectCenter(r);
    const dd = dist[c.y * d.size + c.x];
    if (dd > bestDist) {
      bestDist = dd;
      best = c;
    }
  }
  d.exit = best;
  return d;
}

function repairConnectivity(d: Dungeon, rooms: Rect[]): void {
  const centers = rooms.map(rectCenter);
  for (let pass = 0; pass < 4; pass++) {
    const dist = bfsDistances(d, centers[0].x, centers[0].y);
    const unreachable = centers.filter((c) => dist[c.y * d.size + c.x] === -1);
    if (unreachable.length === 0) return;
    for (const c of unreachable) {
      let nearest = centers[0];
      let bestD = Infinity;
      for (const o of centers) {
        const dd = dist[o.y * d.size + o.x];
        if (dd >= 0) {
          const eu = Math.abs(o.x - c.x) + Math.abs(o.y - c.y);
          if (eu < bestD) {
            bestD = eu;
            nearest = o;
          }
        }
      }
      carveCorridor(d, c.x, c.y, nearest.x, nearest.y);
    }
  }
}
