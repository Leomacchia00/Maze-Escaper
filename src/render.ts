import { Dungeon } from "./dungeon.js";
import { RunState } from "./game.js";

export interface Biome {
  name: string;
  floorA: string;
  floorB: string;
  wallTop: string;
  wallSide: string;
  accent: string;
  fog: string;
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
  },
  {
    name: "Caverne Profonde",
    floorA: "#e7e0d2",
    floorB: "#d8cfbd",
    wallTop: "#b08d5f",
    wallSide: "#7a5c38",
    accent: "#e0a83c",
    fog: "#efe9dc",
  },
  {
    name: "Galassia",
    floorA: "#e4e1f5",
    floorB: "#d3cfee",
    wallTop: "#a78bfa",
    wallSide: "#6d5bd0",
    accent: "#f472b6",
    fog: "#e4e1f5",
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

interface Geo {
  size: number;
  tw: number;
  th: number;
  wallH: number;
  ox: number;
  oy: number;
}

function geoFor(width: number, height: number, size: number): Geo {
  const tw = (width / (size + 0.5)) * 0.96;
  const th = tw / 2;
  const wallH = tw * 0.7;
  const contentH = size * th + wallH;
  return {
    size,
    tw,
    th,
    wallH,
    ox: width / 2,
    oy: (height - contentH) / 2 + wallH,
  };
}

function shade(hex: string, f: number): string {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((v >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((v >> 8) & 255) * f));
  const b = Math.min(255, Math.round((v & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function poly(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>, color: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

const staticCache = new WeakMap<Dungeon, { canvas: HTMLCanvasElement; width: number; height: number }>();

function getStaticLayer(d: Dungeon, b: Biome, width: number, height: number): HTMLCanvasElement {
  const cached = staticCache.get(d);
  if (cached && cached.width === width && cached.height === height) return cached.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const g = geoFor(width, height, d.size);
  const iso = (wx: number, wy: number, z: number): [number, number] => [
    g.ox + (wx - wy) * (g.tw / 2),
    g.oy + (wx + wy) * (g.th / 2) - z,
  ];
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#fdf8ec");
  grad.addColorStop(1, b.fog);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  interface Item { depth: number; draw: () => void }
  const items: Item[] = [];
  for (let y = 0; y < d.size; y++) {
    for (let x = 0; x < d.size; x++) {
      const solid = d.solid[y * d.size + x] === 1;
      if (solid) {
        const top = iso(x, y, g.wallH);
        const right = iso(x + 1, y, g.wallH);
        const front = iso(x + 1, y + 1, g.wallH);
        const left = iso(x, y + 1, g.wallH);
        const rBot = iso(x + 1, y, 0);
        const fBotR = iso(x + 1, y + 1, 0);
        const lBot = iso(x, y + 1, 0);
        items.push({
          depth: x + y,
          draw: () => {
            poly(ctx, [left, front, fBotR, lBot], shade(b.wallSide, 0.72));
            poly(ctx, [right, front, fBotR, rBot], b.wallSide);
            poly(ctx, [top, right, front, left], b.wallTop);
          },
        });
      } else {
        const top = iso(x, y, 0);
        const right = iso(x + 1, y, 0);
        const front = iso(x + 1, y + 1, 0);
        const left = iso(x, y + 1, 0);
        const color = (x + y) % 2 === 0 ? b.floorA : b.floorB;
        items.push({
          depth: x + y,
          draw: () => poly(ctx, [top, right, front, left], color),
        });
      }
    }
  }
  items.sort((a, c) => a.depth - c.depth);
  for (const it of items) it.draw();
  staticCache.set(d, { canvas, width, height });
  return canvas;
}

function drawExit(
  ctx: CanvasRenderingContext2D, g: Geo, d: Dungeon, b: Biome
): void {
  const ex = d.exit.x + 0.5;
  const ey = d.exit.y + 0.5;
  const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
  const cx = g.ox + (ex - ey) * (g.tw / 2);
  const cy = g.oy + (ex + ey) * (g.th / 2);
  ctx.save();
  ctx.globalAlpha = 0.35 * pulse;
  ctx.fillStyle = b.accent;
  ctx.beginPath();
  ctx.ellipse(cx, cy, g.tw * 0.38 * pulse, g.th * 0.38 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = b.accent;
  ctx.lineWidth = Math.max(2, g.tw * 0.06);
  ctx.beginPath();
  ctx.ellipse(cx, cy, g.tw * 0.3 * pulse, g.th * 0.3 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const CHEST_COLORS: Record<string, { top: string; side: string }> = {
  legno: { top: "#c98d4e", side: "#8b5a2b" },
  oro: { top: "#ffd75e", side: "#e0a10c" },
  ornata: { top: "#c4b0f5", side: "#8b6fe8" },
};

function drawChests(
  ctx: CanvasRenderingContext2D, g: Geo, state: RunState
): void {
  for (const c of state.chests) {
    if (c.opened) continue;
    const cx = c.x;
    const cy = c.y;
    const base = [g.ox + (cx - cy) * (g.tw / 2), g.oy + (cx + cy) * (g.th / 2)];
    const w = g.tw * 0.34;
    const h = w * 0.7;
    const x0 = base[0] - w / 2;
    const colors = CHEST_COLORS[c.kind] || CHEST_COLORS.legno;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(base[0], base[1], w * 0.55, g.th * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.side;
    ctx.fillRect(x0, base[1] - h, w, h);
    ctx.fillStyle = colors.top;
    ctx.fillRect(x0, base[1] - h - w * 0.22, w, w * 0.22);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, base[1] - h, w, h);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D, g: Geo, state: RunState
): void {
  const cx = g.ox + (state.px - state.py) * (g.tw / 2);
  const cy = g.oy + (state.px + state.py) * (g.th / 2);
  const bob = Math.sin(Date.now() / 140) * g.tw * 0.03;
  const r = g.tw * 0.22;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.85, g.th * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 1.1 + bob, r, r * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const fx = state.facingX;
  const fy = state.facingY;
  const eyeDx = ((fx - fy) * g.tw) / 2 * 0.12;
  const eyeDy = ((fx + fy) * g.th) / 2 * 0.12;
  ctx.beginPath();
  ctx.arc(cx - r * 0.32 + eyeDx, cy - r * 1.25 + bob + eyeDy, r * 0.22, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.32 + eyeDx, cy - r * 1.25 + bob + eyeDy, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c4a6e";
  ctx.beginPath();
  ctx.arc(cx - r * 0.3 + eyeDx * 1.6, cy - r * 1.25 + bob + eyeDy * 1.6, r * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.34 + eyeDx * 1.6, cy - r * 1.25 + bob + eyeDy * 1.6, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawPopups(
  ctx: CanvasRenderingContext2D, g: Geo, fx: Fx
): void {
  for (const p of fx.popups) {
    const alpha = Math.max(0, 1 - p.age / 1.2);
    const rise = p.age * g.tw * 0.5;
    const cx = g.ox + (p.x - p.y) * (g.tw / 2);
    const cy = g.oy + (p.x + p.y) * (g.th / 2) - g.tw * 0.5 - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e0a10c";
    ctx.font = `700 ${Math.max(12, g.tw * 0.28)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, cx, cy);
    ctx.fillText(p.text, cx, cy);
    ctx.restore();
  }
}

export function drawRun(
  canvas: HTMLCanvasElement,
  state: RunState,
  fx: Fx = { shake: 0, popups: [] }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const b = biomeForLevel(state.level);
  const g = geoFor(canvas.width, canvas.height, state.dungeon.size);
  ctx.save();
  if (fx.shake > 0) {
    const m = fx.shake * fx.shake * 10;
    ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
  }
  const layer = getStaticLayer(state.dungeon, b, canvas.width, canvas.height);
  ctx.drawImage(layer, 0, 0);
  drawExit(ctx, g, state.dungeon, b);
  drawChests(ctx, g, state);
  drawPlayer(ctx, g, state);
  drawPopups(ctx, g, fx);
  ctx.restore();
}
