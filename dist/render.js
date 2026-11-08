import { TOP, RIGHT, BOTTOM, LEFT, xy } from "./maze.js";
const COLORS = {
    background: "#0d1117",
    wall: "#58a6ff",
    player: "#3fb950",
    exit: "#f0883e",
    visited: "#21262d",
    fog: "#010409",
};
export function drawRun(canvas, state, options) {
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const maze = state.maze;
    const size = canvas.width;
    const cell = size / maze.n;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size, size);
    drawMaze(ctx, maze, cell);
    ctx.fillStyle = COLORS.visited;
    for (let i = 0; i < maze.n * maze.n; i++) {
        if (!state.visited[i])
            continue;
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
    if (state.compass) {
        drawCompass(ctx, state, size);
    }
    if (!options.revealAll && options.fogRadius !== Infinity) {
        drawFog(ctx, state, options.fogRadius, cell);
    }
}
function drawCompass(ctx, state, size) {
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
function visible(state, cellIndex, radius) {
    const n = state.maze.n;
    const px = state.player % n;
    const py = Math.floor(state.player / n);
    const cx = cellIndex % n;
    const cy = Math.floor(cellIndex / n);
    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - cy);
    return Math.sqrt(dx * dx + dy * dy) <= radius + 0.5;
}
function drawFog(ctx, state, radius, cell) {
    const maze = state.maze;
    ctx.fillStyle = COLORS.fog;
    for (let y = 0; y < maze.n; y++) {
        for (let x = 0; x < maze.n; x++) {
            if (visible(state, y * maze.n + x, radius))
                continue;
            ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
        }
    }
}
function drawMaze(ctx, maze, cell) {
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    for (let y = 0; y < maze.n; y++) {
        for (let x = 0; x < maze.n; x++) {
            const i = y * maze.n + x;
            const walls = maze.walls[i];
            const px = x * cell;
            const py = y * cell;
            if (walls & TOP)
                line(ctx, px, py, px + cell, py);
            if (walls & RIGHT)
                line(ctx, px + cell, py, px + cell, py + cell);
            if (walls & BOTTOM)
                line(ctx, px, py + cell, px + cell, py + cell);
            if (walls & LEFT)
                line(ctx, px, py, px, py + cell);
        }
    }
    ctx.stroke();
}
function line(ctx, x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
}
function drawExit(ctx, maze, cell) {
    const { x, y } = xy(maze, maze.exit);
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(x * cell + cell * 0.2, y * cell + cell * 0.2, cell * 0.6, cell * 0.6);
}
export { COLORS };
