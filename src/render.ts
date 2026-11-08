import { RunState } from "./game.js";
import { Maze, TOP, RIGHT, BOTTOM, LEFT, xy } from "./maze.js";

export interface RenderOptions {
  revealAll: boolean;
  fogRadius: number;
}

const COLORS = {
  background: "#070b14",
  grid: "rgba(34, 211, 238, 0.05)",
  wall: "#22d3ee",
  wallGlow: "rgba(34, 211, 238, 0.18)",
  player: "#34d399",
  exit: "#fb923c",
  trail: "rgba(34, 211, 238, 0.14)",
  fog: "4, 8, 18",
};

export function drawRun(canvas: HTMLCanvasElement, state: RunState, options: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const maze = state.maze;
  const size = canvas.width;
  const cell = size / maze.n;
  const now = typeof performance !== "undefined" ? performance.now() : 0;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);
  drawGrid(ctx, size, cell);

  drawTrail(ctx, state, cell);
  drawWalls(ctx, maze, cell);

  if (options.revealAll || visible(state, maze.exit, options.fogRadius)) {
    drawExit(ctx, maze, cell, now);
  }

  if (options.revealAll || visible(state, state.player, options.fogRadius)) {
    drawPlayer(ctx, state, cell, now);
  }

  if (state.compass) {
    drawCompass(ctx, state, size);
  }

  if (!options.revealAll && options.fogRadius !== Infinity) {
    drawFog(ctx, state, options.fogRadius, cell);
  }
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

function drawGrid(ctx: CanvasRenderingContext2D, size: number, cell: number): void {
  ctx.fillStyle = COLORS.grid;
  for (let x = cell; x < size; x += cell) {
    ctx.fillRect(x - 0.5, 0, 1, size);
  }
  for (let y = cell; y < size; y += cell) {
    ctx.fillRect(0, y - 0.5, size, 1);
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, state: RunState, cell: number): void {
  const maze = state.maze;
  ctx.fillStyle = COLORS.trail;
  for (let i = 0; i < maze.n * maze.n; i++) {
    if (!state.visited[i]) continue;
    const { x, y } = xy(maze, i);
    ctx.beginPath();
    roundRectPath(ctx, x * cell + cell * 0.22, y * cell + cell * 0.22, cell * 0.56, cell * 0.56, cell * 0.16);
    ctx.fill();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, maze: Maze, cell: number): void {
  const paths = (): void => {
    ctx.beginPath();
    for (let y = 0; y < maze.n; y++) {
      for (let x = 0; x < maze.n; x++) {
        const i = y * maze.n + x;
        const walls = maze.walls[i];
        const px = x * cell;
        const py = y * cell;
        if (walls & TOP) line(ctx, px, py, px + cell, py);
        if (walls & RIGHT) line(ctx, px + cell, py, px + cell, py + cell);
        if (walls & BOTTOM) line(ctx, px, py + cell, px + cell, py + cell);
        if (walls & LEFT) line(ctx, px, py, px, py + cell);
      }
    }
  };

  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.wallGlow;
  ctx.lineWidth = Math.max(3, cell * 0.22);
  paths();
  ctx.stroke();

  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = Math.max(1.5, cell * 0.09);
  paths();
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function drawExit(ctx: CanvasRenderingContext2D, maze: Maze, cell: number, now: number): void {
  const { x, y } = xy(maze, maze.exit);
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const pulse = 0.75 + 0.25 * Math.sin(now / 300);
  const r = cell * 0.32 * pulse;

  ctx.fillStyle = "rgba(251, 146, 60, 0.18)";
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.exit;
  ctx.beginPath();
  roundRectPath(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.35);
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: RunState, cell: number, now: number): void {
  const maze = state.maze;
  const { x, y } = xy(maze, state.player);
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const r = cell * 0.3 + cell * 0.03 * Math.sin(now / 400);

  ctx.fillStyle = "rgba(52, 211, 153, 0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
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

function drawFog(ctx: CanvasRenderingContext2D, state: RunState, radius: number, cell: number): void {
  const maze = state.maze;
  const n = maze.n;
  const px = state.player % n;
  const py = Math.floor(state.player / n);
  const softEdge = 1.6;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dist = Math.hypot(px - x, py - y);
      const alpha = Math.min(1, Math.max(0, (dist - radius) / softEdge));
      if (alpha <= 0) continue;
      ctx.fillStyle = `rgba(${COLORS.fog}, ${alpha.toFixed(2)})`;
      ctx.fillRect(x * cell - 0.5, y * cell - 0.5, cell + 1, cell + 1);
    }
  }
}

export { COLORS };
