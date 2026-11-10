export interface Cam {
  size: number;
  tw: number;
  frontH: number;
  rise: number;
  ox: number;
  oy: number;
}

export const VISIBLE_TILES = 11;

export function darknessForLevel(level: number): number {
  return Math.min(0.92, 0.45 + (level - 1) * 0.06);
}

export const RISE_RATIO = 0.3;
export const FRONT_RATIO = 0.42;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function cameraFor(
  px: number,
  py: number,
  size: number,
  width: number,
  height: number,
  visibleTiles: number = VISIBLE_TILES
): Cam {
  const tw = Math.min(width, height) / visibleTiles;
  const rise = tw * RISE_RATIO;
  const world = size * tw;
  const wantX = width / 2 - px * tw;
  const wantY = height / 2 - py * tw;
  let ox: number;
  let oy: number;
  if (world <= width) {
    ox = (width - world) / 2;
  } else {
    ox = clamp(wantX, width - world, 0);
  }
  if (world + rise <= height) {
    oy = (height - world + rise) / 2;
  } else {
    oy = clamp(wantY, height - world, rise);
  }
  return { size, tw, frontH: tw * FRONT_RATIO, rise, ox, oy };
}

export interface CellRange {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function visibleRange(cam: Cam, width: number, height: number, margin = 1): CellRange {
  const n = cam.size;
  const x0 = clamp(Math.floor(-cam.ox / cam.tw) - margin, 0, n - 1);
  const x1 = clamp(Math.floor((width - cam.ox) / cam.tw) + margin, 0, n - 1);
  const y0 = clamp(Math.floor((0 - cam.oy + cam.rise) / cam.tw) - margin, 0, n - 1);
  const y1 = clamp(Math.floor((height - cam.oy + cam.rise) / cam.tw) + margin, 0, n - 1);
  return { x0, y0, x1, y1 };
}

export function seenMask(visited: Uint8Array, size: number): Uint8Array {
  const seen = new Uint8Array(size * size);
  for (let i = 0; i < visited.length; i++) {
    if (!visited[i]) continue;
    seen[i] = 1;
    const x = i % size;
    const y = (i - x) / size;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        seen[ny * size + nx] = 1;
      }
    }
  }
  return seen;
}
