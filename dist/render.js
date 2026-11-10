import { TOP, RIGHT, BOTTOM, LEFT } from "./maze.js";
export const BIOMES = [
    {
        name: "Prato Incantato",
        floorA: "#eaf7dc",
        floorB: "#dcefcb",
        wallTop: "#3fbf6f",
        wallSide: "#1e7a44",
        accent: "#f5b70a",
        fog: "#eaf7dc",
    },
    {
        name: "Caverne Profonde",
        floorA: "#2c2840",
        floorB: "#231f33",
        wallTop: "#4d4370",
        wallSide: "#2a2547",
        accent: "#7ee3ff",
        fog: "#231f33",
    },
    {
        name: "Galassia",
        floorA: "#191b30",
        floorB: "#12131f",
        wallTop: "#8b5cf6",
        wallSide: "#3d3160",
        accent: "#f472b6",
        fog: "#12131f",
    },
];
export function biomeForLevel(level) {
    const tier = Math.min(BIOMES.length - 1, Math.floor((level - 1) / 5));
    return BIOMES[tier];
}
const staticCache = new WeakMap();
export function drawRun(canvas, state, opts) {
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const size = canvas.width;
    const cell = size / state.maze.n;
    const b = biomeForLevel(state.level);
    ctx.fillStyle = b.floorA;
    ctx.fillRect(0, 0, size, size);
    drawWalls(ctx, state.maze, cell, b);
    drawExit(ctx, state.maze, cell, b.accent);
    drawChests(ctx, state, cell, b);
    drawPlayer(ctx, state, cell, b);
}
function drawWalls(ctx, maze, cell, b) {
    const n = maze.n;
    const h = cell * 0.3;
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const w = maze.walls[row * n + col];
            const x = col * cell;
            const y = row * cell;
            ctx.strokeStyle = b.wallSide;
            ctx.lineWidth = Math.max(3, cell * 0.14);
            ctx.lineCap = "round";
            if (w & TOP) {
                ctx.beginPath();
                ctx.moveTo(x + h * 0.4, y + h * 0.4);
                ctx.lineTo(x + cell - h * 0.4, y + h * 0.4);
                ctx.stroke();
                ctx.strokeStyle = b.wallTop;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + cell, y);
                ctx.stroke();
                ctx.strokeStyle = b.wallSide;
            }
            if (w & LEFT) {
                ctx.beginPath();
                ctx.moveTo(x + h * 0.4, y + h * 0.4);
                ctx.lineTo(x + h * 0.4, y + cell - h * 0.4);
                ctx.stroke();
            }
            if (w & RIGHT && col === n - 1) {
                ctx.beginPath();
                ctx.moveTo(x + cell, y);
                ctx.lineTo(x + cell, y + cell);
                ctx.stroke();
            }
            if (w & BOTTOM && row === n - 1) {
                ctx.beginPath();
                ctx.moveTo(x, y + cell);
                ctx.lineTo(x + cell, y + cell);
                ctx.stroke();
            }
        }
    }
}
function drawExit(ctx, maze, cell, accent) {
    const x = (maze.exit % maze.n) * cell + cell / 2;
    const y = Math.floor(maze.exit / maze.n) * cell + cell / 2;
    const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 300);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, cell * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.32 * pulse, 0, Math.PI * 2);
    ctx.stroke();
}
function drawChests(ctx, state, cell, b) {
    for (const c of state.chests) {
        if (c.opened)
            continue;
        const cx = ((c.cell % state.maze.n) + 0.5) * cell;
        const cy = (Math.floor(c.cell / state.maze.n) + 0.5) * cell;
        const s = cell * 0.4;
        ctx.fillStyle = c.kind === "oro" ? "#f5b70a" : c.kind === "ornata" ? "#a78bfa" : "#8b5a2b";
        ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        ctx.strokeStyle = "#00000030";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
    }
}
function drawPlayer(ctx, state, cell, b) {
    const cx = state.px * cell;
    const cy = state.py * cell;
    const r = cell * 0.28;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.8, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c4a6e";
    const fx = state.facingX * r * 0.35;
    const fy = state.facingY * r * 0.35;
    ctx.beginPath();
    ctx.arc(cx + fx - r * 0.2, cy + fy - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + fx + r * 0.2, cy + fy - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
}
