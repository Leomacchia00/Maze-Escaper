import { RunState } from "./game.js";
import { Maze, TOP, RIGHT, BOTTOM, LEFT, xy } from "./maze.js";

export interface RenderOptions {
  revealAll: boolean;
  fogRadius: number;
}

const COLORS = {
  background: "#fcfae6",
  grid: "rgba(22, 163, 74, 0.06)",
  hedgeDark: "#14532d",
  hedgeBody: "#15803d",
  hedgeLight: "#4ade80",
  player: "#38bdf8",
  playerOutline: "#0369a1",
  exit: "#facc15",
  danger: "#ba1a1a",
  trail: "rgba(34, 197, 94, 0.20)",
  fog: "252, 250, 230",
};

const CONFETTI = ["#facc15", "#38bdf8", "#f472b6", "#4ade80", "#fb923c"];
const FLOWER_COLORS = ["#f472b6", "#fb923c", "#f87171", "#a78bfa", "#facc15"];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const staticCache = new WeakMap<Maze, HTMLCanvasElement>();

function staticLayer(maze: Maze, size: number): HTMLCanvasElement | null {
  if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
  let off = staticCache.get(maze);
  if (!off || off.width !== size) {
    off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");
    if (ctx) paintStatic(ctx, maze, size);
    staticCache.set(maze, off);
  }
  return off;
}

function drawStatic(ctx: CanvasRenderingContext2D, maze: Maze, size: number): void {
  const off = staticLayer(maze, size);
  if (off) {
    ctx.drawImage(off, 0, 0);
  } else {
    paintStatic(ctx, maze, size);
  }
}

function paintStatic(ctx: CanvasRenderingContext2D, maze: Maze, size: number): void {
  const n = maze.n;
  const cell = size / n;
  const rand = mulberry32(n * 7919 + maze.entrance * 31 + 13);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);

  const segs: number[][] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const w = maze.walls[y * n + x];
      const px = x * cell;
      const py = y * cell;
      if (w & TOP) segs.push([px, py, px + cell, py]);
      if (w & LEFT) segs.push([px, py, px, py + cell]);
      if (y === n - 1 && (w & BOTTOM)) segs.push([px, py + cell, px + cell, py + cell]);
      if (x === n - 1 && (w & RIGHT)) segs.push([px + cell, py, px + cell, py + cell]);
    }
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = COLORS.hedgeBody;
  ctx.lineWidth = Math.max(3, cell * 0.17);
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  ctx.fillStyle = COLORS.hedgeBody;
  for (const [x1, y1, x2, y2] of segs) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.round(len / (cell * 0.3)));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const r = cell * (0.1 + rand() * 0.04);
      ctx.beginPath();
      ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = COLORS.hedgeDark;
  ctx.lineWidth = Math.max(1.5, cell * 0.05);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (i === maze.entrance || i === maze.exit) continue;
      const r = rand();
      if (r < 0.08) drawFlower(ctx, x * cell, y * cell, cell, rand);
      else if (r < 0.2) drawTuft(ctx, x * cell, y * cell, cell, rand);
    }
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, rand: () => number): void {
  const fx = cx + cell * (0.25 + rand() * 0.5);
  const fy = cy + cell * (0.25 + rand() * 0.5);
  const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
  const pr = cell * 0.045;
  ctx.fillStyle = color;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rand() * 0.4;
    ctx.beginPath();
    ctx.arc(fx + Math.cos(a) * cell * 0.09, fy + Math.sin(a) * cell * 0.09, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fefce8";
  ctx.beginPath();
  ctx.arc(fx, fy, cell * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

function drawTuft(ctx: CanvasRenderingContext2D, gx: number, gy: number, cell: number, rand: () => number): void {
  ctx.strokeStyle = "rgba(22, 163, 74, 0.4)";
  ctx.lineWidth = Math.max(1, cell * 0.03);
  ctx.lineCap = "round";
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + k * cell * 0.1, gy - cell * 0.12, gx + k * cell * 0.18, gy - cell * 0.22);
    ctx.stroke();
  }
}

function drawExit(ctx: CanvasRenderingContext2D, maze: Maze, cell: number, now: number): void {
  const { x, y } = xy(maze, maze.exit);
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const pulse = 0.75 + 0.25 * Math.sin(now / 300);

  const glow = ctx.createRadialGradient(cx, cy, cell * 0.05, cx, cy, cell * 0.6);
  if (glow) {
    glow.addColorStop(0, "rgba(250, 204, 21, 0.4)");
    glow.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = Math.max(2, cell * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.3 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = COLORS.hedgeDark;
  ctx.lineWidth = Math.max(1.5, cell * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx, cy + cell * 0.2);
  ctx.lineTo(cx, cy - cell * 0.2);
  ctx.stroke();
  ctx.fillStyle = COLORS.exit;
  ctx.beginPath();
  ctx.moveTo(cx, cy - cell * 0.2);
  ctx.lineTo(cx + cell * 0.22, cy - cell * 0.1);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: RunState, cell: number, now: number): void {
  const cx = state.px * cell;
  const cy = state.py * cell;
  const r = cell * 0.28;
  const fx = state.facingX || 1;
  const fy = state.facingY || 0;

  ctx.fillStyle = "rgba(20, 83, 45, 0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.95, r * 0.75, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = state.status === "won" ? "#a7f3d0" : COLORS.player;
  ctx.strokeStyle = COLORS.playerOutline;
  ctx.lineWidth = Math.max(1.5, cell * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.hedgeDark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * cell * 0.09 + fx * cell * 0.05, cy + fy * cell * 0.05 - cell * 0.02, cell * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWinRing(ctx: CanvasRenderingContext2D, maze: Maze, cell: number, now: number): void {
  const { x, y } = xy(maze, maze.exit);
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const t = (now % 1200) / 1200;
  ctx.strokeStyle = `rgba(52, 211, 153, ${(0.8 * (1 - t)).toFixed(2)})`;
  ctx.lineWidth = Math.max(2, cell * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, cell * (0.4 + t * 0.8), 0, Math.PI * 2);
  ctx.stroke();
}

function drawLostMark(ctx: CanvasRenderingContext2D, state: RunState, cell: number): void {
  const { x, y } = xy(state.maze, state.player);
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const r = cell * 0.42;
  ctx.strokeStyle = COLORS.danger;
  ctx.lineWidth = Math.max(2, cell * 0.1);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
}

function drawCompass(ctx: CanvasRenderingContext2D, state: RunState, size: number): void {
  const maze = state.maze;
  const from = xy(maze, state.player);
  const to = xy(maze, maze.exit);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const margin = size * 0.05;
  const cx = size / 2 + ux * (size / 2 - margin);
  const cy = size / 2 + uy * (size / 2 - margin);
  const r = Math.max(8, size * 0.02);
  ctx.fillStyle = COLORS.exit;
  ctx.beginPath();
  ctx.moveTo(cx + ux * r, cy + uy * r);
  ctx.lineTo(cx - uy * r * 0.6 - ux * r * 0.6, cy + ux * r * 0.6 - uy * r * 0.6);
  ctx.lineTo(cx + uy * r * 0.6 - ux * r * 0.6, cy - ux * r * 0.6 - uy * r * 0.6);
  ctx.closePath();
  ctx.fill();
}

function visible(state: RunState, cellIndex: number, radius: number): boolean {
  const n = state.maze.n;
  const px = state.player % n;
  const py = Math.floor(state.player / n);
  const cx = cellIndex % n;
  const cy = Math.floor(cellIndex / n);
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  return Math.sqrt(dx * dx + dy * dy) <= radius + 0.5;
}

function drawFog(ctx: CanvasRenderingContext2D, state: RunState, radius: number, cell: number, size: number): void {
  const n = state.maze.n;
  const px = (state.player % n + 0.5) * cell;
  const py = (Math.floor(state.player / n) + 0.5) * cell;
  const g = ctx.createRadialGradient(px, py, radius * cell * 0.7, px, py, (radius + 1.6) * cell);
  if (g) {
    g.addColorStop(0, `rgba(${COLORS.fog}, 0)`);
    g.addColorStop(1, `rgba(${COLORS.fog}, 0.92)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, state: RunState, cell: number): void {
  ctx.fillStyle = COLORS.trail;
  for (let i = 0; i < state.maze.n * state.maze.n; i++) {
    if (!state.visited[i]) continue;
    const x = (i % state.maze.n) * cell;
    const y = Math.floor(i / state.maze.n) * cell;
    ctx.beginPath();
    ctx.roundRect(x + cell * 0.22, y + cell * 0.22, cell * 0.56, cell * 0.56, cell * 0.16);
    ctx.fill();
  }
}

function drawConfetti(ctx: CanvasRenderingContext2D, size: number, now: number): void {
  const rand = mulberry32(424242);
  for (let k = 0; k < 42; k++) {
    const rx = rand();
    const speed = 0.02 + rand() * 0.05;
    const phase = rand() * size * 2;
    const y = ((now * speed + phase) % (size + 40)) - 20;
    const x = rx * size + Math.sin(now / 500 + k) * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(now / 400 + k);
    ctx.fillStyle = CONFETTI[k % CONFETTI.length];
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  }
}

export function drawRun(canvas: HTMLCanvasElement, state: RunState, options: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;
  const cell = size / state.maze.n;
  const now = prefersReducedMotion() ? 0 : typeof performance !== "undefined" ? performance.now() : 0;

  drawStatic(ctx, state.maze, size);
  drawTrail(ctx, state, cell);

  if (options.revealAll || visible(state, state.maze.exit, options.fogRadius)) {
    drawExit(ctx, state.maze, cell, now);
  }

  if (options.revealAll || visible(state, state.player, options.fogRadius)) {
    drawPlayer(ctx, state, cell, now);
  }

  if (state.compass) {
    drawCompass(ctx, state, size);
  }

  if (!options.revealAll && options.fogRadius !== Infinity) {
    drawFog(ctx, state, options.fogRadius, cell, size);
  }

  if (state.status === "won") {
    drawWinRing(ctx, state.maze, cell, now);
    drawConfetti(ctx, size, now);
  } else if (state.status === "lost") {
    drawLostMark(ctx, state, cell);
  }
}

export { COLORS };

let reducedMotion: boolean | null = null;

function prefersReducedMotion(): boolean {
  if (reducedMotion === null) {
    reducedMotion =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return reducedMotion;
}
