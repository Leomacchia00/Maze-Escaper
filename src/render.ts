import { RunState } from "./game.js";
import { Maze, TOP, RIGHT, BOTTOM, LEFT, xy } from "./maze.js";

export interface RenderOptions {
  revealAll: boolean;
  fogRadius: number;
}

const COLORS = {
  background: "#0d1117",
  wall: "#58a6ff",
  player: "#3fb950",
  exit: "#f0883e",
  visited: "#21262d",
  fog: "#010409",
};

export function drawRun(canvas: HTMLCanvasElement, state: RunState, options: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const maze = state.maze;
  const size = canvas.width;
  const cell = size / maze.n;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, size, size);

  drawMaze(ctx, maze, cell);

  ctx.fillStyle = COLORS.visited;
  for (let i = 0; i < maze.n * maze.n; i++) {
    if (!state.visited[i]) continue;
    const { x, y } = xy(maze, i);
    ctx.fillRect(x * cell + cell * 0.3, y * cell + cell * 0.3, cell * 0.4, cell * 0.4);
  }

  if (options.revealAll || visible(state, maze.exit, options.fogRadius)) {
    drawExit(ctx, maze, cell);
  }

  if (options.revealAll || visible(state, state.player, options.fogRadius)) {
    const { x, y } = xy(maze, state.player);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
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

function drawFog(ctx: CanvasRenderingContext2D, state: RunState, radius: number, cell: number): void {
  const maze = state.maze;
  ctx.fillStyle = COLORS.fog;
  for (let y = 0; y < maze.n; y++) {
    for (let x = 0; x < maze.n; x++) {
      if (visible(state, y * maze.n + x, radius)) continue;
      ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
    }
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, maze: Maze, cell: number): void {
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = Math.max(1, cell * 0.08);
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
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function drawExit(ctx: CanvasRenderingContext2D, maze: Maze, cell: number): void {
  const { x, y } = xy(maze, maze.exit);
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(x * cell + cell * 0.2, y * cell + cell * 0.2, cell * 0.6, cell * 0.6);
}

export { COLORS };
