import { Dungeon } from "./dungeon.js";
import { Cam, cameraFor, seenMask, visibleRange, CellRange, darknessForLevel } from "./camera.js";
import { RunState } from "./game.js";
import { Enemy } from "./enemies.js";

function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface Biome {
  name: string;
  floorA: string;
  floorB: string;
  wallTop: string;
  wallSide: string;
  accent: string;
  fog: string;
  wallCol: number;
}

export const BIOMES: Biome[] = [
  {
    name: "Prato Incantato",
    floorA: "#eaf6d8",
    floorB: "#d9eec2",
    wallTop: "#7ed957",
    wallSide: "#3f9e3f",
    accent: "#f5b70a",
    fog: "#eaf6d8",
    wallCol: 0,
  },
  {
    name: "Caverne Profonde",
    floorA: "#e7e0d2",
    floorB: "#d8cfbd",
    wallTop: "#b08d5f",
    wallSide: "#7a5c38",
    accent: "#e0a83c",
    fog: "#efe9dc",
    wallCol: 2,
  },
  {
    name: "Galassia",
    floorA: "#e4e1f5",
    floorB: "#d3cfee",
    wallTop: "#a78bfa",
    wallSide: "#6d5bd0",
    accent: "#f472b6",
    fog: "#e4e1f5",
    wallCol: 4,
  },
];

export function biomeForLevel(level: number): Biome {
  const tier = Math.min(BIOMES.length - 1, Math.floor((level - 1) / 5));
  return BIOMES[tier];
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  age: number;
}

export interface Fx {
  shake: number;
  popups: Popup[];
}

const atlas = new Image();
atlas.src = "assets/tiles.png";
const playerSheet = new Image();
playerSheet.src = "assets/player.png";

function atlasReady(): boolean {
  return atlas.complete && atlas.naturalWidth > 0;
}

function biomeIndex(b: Biome): number {
  const i = BIOMES.indexOf(b);
  return i < 0 ? 0 : i;
}

function drawFloor(
  ctx: CanvasRenderingContext2D, g: Cam, b: Biome, x: number, y: number
): void {
  const sx = g.ox + x * g.tw;
  const sy = g.oy + y * g.tw;
  if (atlasReady()) {
    const bi = biomeIndex(b);
    const col = (x + y) % 2 === 0 ? bi * 2 : bi * 2 + 1;
    ctx.drawImage(atlas, col * 48, 0, 48, 48, sx, sy, g.tw, g.tw);
  } else {
    ctx.fillStyle = (x + y) % 2 === 0 ? b.floorA : b.floorB;
    ctx.fillRect(sx, sy, g.tw + 0.5, g.tw + 0.5);
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D, g: Cam, b: Biome, x: number, y: number
): void {
  const sx = g.ox + x * g.tw;
  const sy = g.oy + y * g.tw;
  if (atlasReady()) {
    ctx.drawImage(atlas, b.wallCol * 48, 48, 48, 48, sx, sy - g.rise, g.tw + 0.5, g.tw - g.frontH + g.rise);
    ctx.drawImage(atlas, (b.wallCol + 1) * 48, 48, 48, 48, sx, sy + g.tw - g.frontH, g.tw + 0.5, g.frontH);
  } else {
    ctx.fillStyle = b.wallTop;
    ctx.fillRect(sx, sy - g.rise, g.tw + 0.5, g.tw - g.frontH + g.rise);
    ctx.fillStyle = b.wallSide;
    ctx.fillRect(sx, sy + g.tw - g.frontH, g.tw + 0.5, g.frontH);
  }
}

function drawExit(
  ctx: CanvasRenderingContext2D, g: Cam, d: Dungeon, b: Biome
): void {
  const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
  const cx = g.ox + (d.exit.x + 0.5) * g.tw;
  const cy = g.oy + (d.exit.y + 0.5) * g.tw;
  ctx.save();
  ctx.globalAlpha = 0.35 * pulse;
  ctx.fillStyle = b.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, g.tw * 0.36 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = b.accent;
  ctx.lineWidth = Math.max(2, g.tw * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, g.tw * 0.28 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  if (atlasReady()) {
    const s = g.tw * 0.9;
    ctx.drawImage(atlas, 2 * 48, 2 * 48, 48, 48, cx - s / 2, cy - s / 2, s, s);
  }
  ctx.restore();
}

const CHEST_COLS: Record<string, number> = { legno: 6, oro: 7, ornata: 8 };

function drawChest(
  ctx: CanvasRenderingContext2D, g: Cam, x: number, y: number, kind: string
): void {
  const cx = g.ox + (x + 0.5) * g.tw;
  const cy = g.oy + (y + 0.5) * g.tw;
  const col = CHEST_COLS[kind] ?? 6;
  const s = g.tw * 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + g.tw * 0.3, s * 0.32, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (atlasReady()) {
    ctx.drawImage(atlas, col * 48, 48, 48, 48, cx - s / 2, cy - s * 0.62, s, s);
  } else {
    ctx.fillStyle = "#c98d4e";
    ctx.fillRect(cx - s * 0.3, cy - s * 0.45, s * 0.6, s * 0.5);
  }
}

let lastPx = -1;
let lastPy = -1;
let walkT = 0;

function drawPlayer(
  ctx: CanvasRenderingContext2D, g: Cam, state: RunState
): void {
  const cx = g.ox + state.px * g.tw;
  const cy = g.oy + state.py * g.tw;
  const r = g.tw * 0.26;
  const moved = Math.abs(state.px - lastPx) > 1e-6 || Math.abs(state.py - lastPy) > 1e-6;
  if (moved) walkT += 0.2;
  lastPx = state.px;
  lastPy = state.py;
  const frame = moved ? Math.floor(walkT) % 2 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.75, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (playerSheet.complete && playerSheet.naturalWidth > 0) {
    const col = state.facingX < 0 ? 1 : state.facingX > 0 ? 2 : state.facingY < 0 ? 3 : 0;
    const w = g.tw * 0.95;
    ctx.drawImage(
      playerSheet,
      col * 48, frame * 48, 48, 48,
      cx - w / 2, cy - w * 0.9, w, w
    );
    return;
  }
  const bob = Math.sin(Date.now() / 140) * g.tw * 0.03;
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 1.05 + bob, r, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const eyeDx = state.facingX * r * 0.18;
  const eyeDy = state.facingY * r * 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx - r * 0.32 + eyeDx, cy - r * 1.2 + bob + eyeDy, r * 0.22, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.34 + eyeDx, cy - r * 1.2 + bob + eyeDy, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c4a6e";
  ctx.beginPath();
  ctx.arc(cx - r * 0.3 + eyeDx * 1.7, cy - r * 1.2 + bob + eyeDy * 1.7, r * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.34 + eyeDx * 1.7, cy - r * 1.2 + bob + eyeDy * 1.7, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.closePath();
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  seen: Uint8Array,
  b: Biome,
  width: number
): void {
  const mapSize = Math.min(150, width * 0.28);
  const pad = 12;
  const mx = width - mapSize - pad;
  const my = pad;
  const s = mapSize / state.dungeon.size;
  ctx.save();
  ctx.globalAlpha = 0.92;
  roundRectPath(ctx, mx, my, mapSize, mapSize, 10);
  ctx.fillStyle = "#fdfdf7";
  ctx.fill();
  ctx.strokeStyle = "rgba(53,64,42,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(53,64,42,0.08)";
  ctx.fillRect(mx + 1, my + 1, mapSize - 2, mapSize - 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = b.wallTop;
  for (let y = 0; y < state.dungeon.size; y++) {
    for (let x = 0; x < state.dungeon.size; x++) {
      const i = y * state.dungeon.size + x;
      if (state.visited[i] === 1 && state.dungeon.solid[i] === 0) {
        ctx.fillRect(mx + x * s, my + y * s, s + 0.5, s + 0.5);
      }
    }
  }
  const ex = state.dungeon.exit.x;
  const ey = state.dungeon.exit.y;
  if (seen[ey * state.dungeon.size + ex] === 1) {
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.arc(mx + (ex + 0.5) * s, my + (ey + 0.5) * s, Math.max(2.5, s * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#35402a";
  ctx.beginPath();
  ctx.arc(mx + state.px * s, my + state.py * s, Math.max(2.5, s * 0.6), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const PICKUP_COLS: Record<string, number> = { coin: 1, gem: 3 };

function drawPickups(
  ctx: CanvasRenderingContext2D,
  g: Cam,
  state: RunState,
  range: CellRange
): void {
  const t = Date.now();
  for (const p of state.pickups) {
    if (p.taken) continue;
    if (p.x < range.x0 || p.x > range.x1 || p.y < range.y0 || p.y > range.y1) continue;
    const bob = Math.sin(t / 300 + p.x * 3.7) * g.tw * 0.06;
    const s = g.tw * 0.68;
    const col = PICKUP_COLS[p.kind] ?? 1;
    const cx = g.ox + p.x * g.tw;
    const cy = g.oy + p.y * g.tw + bob;
    ctx.drawImage(atlas, col * 48, 96, 48, 48, cx - s / 2, cy - s / 2, s, s);
  }
}

const ENEMY_COLORS: Record<string, string> = {
  slug: "#8bc34a",
  bat: "#7c5cbf",
  wisp: "#67e8f9",
  brute: "#e0604a",
};

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  g: Cam,
  enemies: Enemy[],
  range: CellRange
): void {
  const t = Date.now();
  for (const e of enemies) {
    if (e.x < range.x0 || e.x > range.x1 || e.y < range.y0 || e.y > range.y1) continue;
    const cx = g.ox + e.x * g.tw;
    const cy = g.oy + e.y * g.tw;
    const wob = Math.sin(t / 200 + e.x * 5) * g.tw * 0.04;
    const r = g.tw * (e.kind === "brute" ? 0.36 : e.kind === "slug" ? 0.3 : 0.24);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ENEMY_COLORS[e.kind] ?? "#f87171";
    ctx.beginPath();
    ctx.ellipse(cx, cy + wob, r, r * (e.kind === "slug" ? 0.7 : 0.9), 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.hp < e.maxHp) {
      const bw = r * 1.6;
      const bx = cx - bw / 2;
      const by = cy - r * 1.5;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = "#f87171";
      ctx.fillRect(bx, by, (bw * e.hp) / e.maxHp, 4);
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy + wob - r * 0.2, r * 0.18, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy + wob - r * 0.2, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy + wob - r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy + wob - r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTorches(
  ctx: CanvasRenderingContext2D,
  g: Cam,
  d: Dungeon,
  range: CellRange
): void {
  const t = Date.now();
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (d.solid[y * d.size + x] !== 1) continue;
      if (hash2(x, y, 777) > 0.25) continue;
      const cx = g.ox + (x + 0.5) * g.tw;
      const cy = g.oy + (y + 0.85) * g.tw;
      const flicker = 0.75 + 0.25 * Math.sin(t / 120 + x * 2.7 + y * 1.3);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.tw * 0.9);
      glow.addColorStop(0, `rgba(255,200,90,${0.3 * flicker})`);
      glow.addColorStop(1, "rgba(255,200,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - g.tw, cy - g.tw, g.tw * 2, g.tw * 2);
      const s = g.tw * 0.6;
      ctx.drawImage(atlas, 0, 96, 48, 48, cx - s / 2, cy - s / 2, s, s);
    }
  }
}

let darkCanvas: HTMLCanvasElement | null = null;

function applyDarkness(
  ctx: CanvasRenderingContext2D,
  g: Cam,
  d: Dungeon,
  state: RunState,
  dark: number,
  range: CellRange
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (!darkCanvas) darkCanvas = document.createElement("canvas");
  if (darkCanvas.width !== w || darkCanvas.height !== h) {
    darkCanvas.width = w;
    darkCanvas.height = h;
  }
  const octx = darkCanvas.getContext("2d");
  if (!octx) return;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, w, h);
  octx.fillStyle = `rgba(10, 12, 28, ${dark})`;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = "destination-out";
  const cut = (wx: number, wy: number, rCells: number, strength: number): void => {
    const cx = g.ox + wx * g.tw;
    const cy = g.oy + wy * g.tw;
    const r = rCells * g.tw;
    const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(0,0,0,${Math.min(1, strength)})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    octx.fillStyle = grad;
    octx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  cut(state.px, state.py, 2.6, 1);
  const pulse = 0.9 + 0.1 * Math.sin(Date.now() / 300);
  cut(d.exit.x + 0.5, d.exit.y + 0.5, 1.8 * pulse, 0.9);
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (d.solid[y * d.size + x] !== 1) continue;
      if (hash2(x, y, 777) > 0.25) continue;
      const flicker = 0.8 + 0.2 * Math.sin(Date.now() / 120 + x * 2.7 + y * 1.3);
      cut(x + 0.5, y + 0.5, 1.8 * flicker, 0.95);
    }
  }
  octx.globalCompositeOperation = "source-over";
  ctx.drawImage(darkCanvas, 0, 0);
}

export function drawRun(
  canvas: HTMLCanvasElement,
  state: RunState,
  fx: Fx = { shake: 0, popups: [] }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const b = biomeForLevel(state.level);
  const d = state.dungeon;
  const n = d.size;
  const g = cameraFor(state.px, state.py, n, canvas.width, canvas.height);
  const seen = seenMask(state.visited, n);
  const range: CellRange = visibleRange(g, canvas.width, canvas.height);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (fx.shake > 0) {
    const m = fx.shake * fx.shake * 10;
    ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#fdf8ec");
  grad.addColorStop(1, b.fog);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (d.solid[y * n + x] === 1) drawWall(ctx, g, b, x, y);
      else drawFloor(ctx, g, b, x, y);
    }
  }

  if (seen[d.exit.y * n + d.exit.x] === 1) drawExit(ctx, g, d, b);

  for (const c of state.chests) {
    if (!c.opened && seen[c.y * n + c.x] === 1) drawChest(ctx, g, c.x, c.y, c.kind);
  }

  drawPickups(ctx, g, state, range);
  drawEnemies(ctx, g, state.enemies, range);
  drawPlayer(ctx, g, state);
  drawTorches(ctx, g, d, range);

  applyDarkness(ctx, g, d, state, darknessForLevel(state.level), range);

  drawPopups(ctx, g, fx);
  ctx.restore();

  drawMiniMap(ctx, state, seen, b, canvas.width);
}

function drawPopups(ctx: CanvasRenderingContext2D, g: Cam, fx: Fx): void {
  for (const p of fx.popups) {
    const alpha = Math.max(0, 1 - p.age / 1.2);
    const rise = p.age * g.tw * 0.6;
    const cx = g.ox + p.x * g.tw;
    const cy = g.oy + p.y * g.tw - g.tw * 0.7 - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.max(12, g.tw * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, cx, cy);
    ctx.fillStyle = "#e0a10c";
    ctx.fillText(p.text, cx, cy);
    ctx.restore();
  }
}
