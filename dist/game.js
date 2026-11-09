import { generateMaze, mazeSizeForLevel, TOP, RIGHT, BOTTOM, LEFT } from "./maze.js";
import { extraTimeMultiplier, timerSpeedFactor, fogBonus, hasCompass } from "./skills.js";
import { placeChests, openChestAt } from "./chests.js";
export const VISIT_BONUS_SECONDS = 0.2;
export function fogRadiusForLevel(level) {
    if (level >= 8)
        return 2;
    if (level >= 4)
        return 3;
    return Infinity;
}
export function fogRadius(state) {
    const base = fogRadiusForLevel(state.level);
    return base === Infinity ? Infinity : base + state.fogBonus;
}
export function createRun(level, rng = Math.random, skills = {}) {
    const n = mazeSizeForLevel(level);
    const maze = generateMaze(n, rng);
    const visited = new Uint8Array(n * n);
    visited[maze.entrance] = 1;
    const baseTime = n * 2.5 * extraTimeMultiplier(skills);
    const freeCells = [];
    for (let i = 0; i < n * n; i++) {
        if (i !== maze.entrance && i !== maze.exit)
            freeCells.push(i);
    }
    const chests = placeChests(freeCells, maze.entrance, maze.exit, chestCountForCells(n * n), rng);
    return {
        level,
        maze,
        player: maze.entrance,
        px: (maze.entrance % n) + 0.5,
        py: Math.floor(maze.entrance / n) + 0.5,
        visited,
        visitedCount: 1,
        baseTime,
        timeLeft: baseTime,
        status: "ready",
        moves: 0,
        chests,
        lootCoins: 0,
        lootTreasures: [],
        timerFactor: timerSpeedFactor(skills),
        compass: hasCompass(skills),
        fogBonus: fogBonus(skills),
        facingX: 1,
        facingY: 0,
    };
}
export function chestCountForCells(cells) {
    return Math.min(8, Math.max(3, Math.round(cells / 45)));
}
export function pickupChests(state) {
    const result = openChestAt(state);
    if (!result)
        return state;
    return { ...state, chests: result.chests, lootCoins: result.lootCoins, lootTreasures: result.lootTreasures };
}
export function tick(state, dtSeconds) {
    if (state.status !== "running")
        return state;
    const timeLeft = state.timeLeft - dtSeconds * state.timerFactor;
    if (timeLeft <= 0) {
        return { ...state, timeLeft: 0, status: "lost" };
    }
    return { ...state, timeLeft };
}
export const PLAYER_RADIUS = 0.3;
export const RUN_SPEED = 4.5;
const EPS = 1e-6;
const MAX_SUBSTEP = 0.2;
export function movePlayer(state, ix, iy, dt) {
    if (state.status !== "running" && state.status !== "ready")
        return state;
    const maze = state.maze;
    const n = maze.n;
    const r = PLAYER_RADIUS;
    const dist = RUN_SPEED * Math.min(Math.max(dt, 0), 0.1);
    const steps = Math.max(1, Math.ceil(dist / MAX_SUBSTEP));
    const sdt = dt / steps;
    let px = state.px;
    let py = state.py;
    let visited = state.visited;
    let visitedCount = state.visitedCount;
    let timeLeft = state.timeLeft;
    let moves = state.moves;
    let status = state.status;
    for (let i = 0; i < steps; i++) {
        if (ix !== 0) {
            const next = px + ix * RUN_SPEED * sdt;
            const r0 = Math.floor(py - r + EPS);
            const r1 = Math.floor(py + r - EPS);
            const cL = Math.floor(next - r + EPS);
            const cR = Math.floor(next + r - EPS);
            let blocked = false;
            for (let ry = r0; ry <= r1 && !blocked; ry++) {
                for (let b = cL + 1; b <= cR; b++) {
                    if (b >= n || maze.walls[ry * n + b] & LEFT) {
                        blocked = true;
                        break;
                    }
                }
            }
            px = blocked ? (ix > 0 ? cR - r : cL + 1 + r) : next;
        }
        if (iy !== 0) {
            const next = py + iy * RUN_SPEED * sdt;
            const c0 = Math.floor(px - r + EPS);
            const c1 = Math.floor(px + r - EPS);
            const rT = Math.floor(next - r + EPS);
            const rB = Math.floor(next + r - EPS);
            let blocked = false;
            for (let cx = c0; cx <= c1 && !blocked; cx++) {
                if (cx >= n) {
                    blocked = true;
                    break;
                }
                for (let b = rT + 1; b <= rB; b++) {
                    if (b >= n || maze.walls[b * n + cx] & TOP) {
                        blocked = true;
                        break;
                    }
                }
            }
            py = blocked ? (iy > 0 ? rB - r : rT + 1 + r) : next;
        }
        const cell = Math.floor(py) * n + Math.floor(px);
        if (!visited[cell]) {
            visited = visited.slice();
            visited[cell] = 1;
            visitedCount += 1;
            timeLeft += VISIT_BONUS_SECONDS;
        }
    }
    const won = status === "running" && Math.floor(py) * n + Math.floor(px) === maze.exit;
    if (state.status === "ready" && (ix !== 0 || iy !== 0))
        status = "running";
    const facingLen = Math.hypot(ix, iy);
    const facing = facingLen > 0 ? { x: ix / facingLen, y: iy / facingLen } : null;
    return {
        ...state,
        px,
        py,
        facingX: facing ? facing.x : state.facingX,
        facingY: facing ? facing.y : state.facingY,
        player: Math.floor(py) * n + Math.floor(px),
        visited,
        visitedCount,
        timeLeft,
        moves: moves + (Math.floor(py) * n + Math.floor(px) === Math.floor(state.py) * n + Math.floor(state.px) ? 0 : 1),
        status: won ? "won" : status,
    };
}
export function pause(state) {
    if (state.status !== "running" && state.status !== "ready")
        return state;
    return { ...state, status: "paused" };
}
export function resume(state) {
    if (state.status !== "paused")
        return state;
    return { ...state, status: state.moves === 0 ? "ready" : "running" };
}
export function computeScoreBreakdown(timeLeft, n, visitedCount) {
    const timePoints = Math.round(Math.max(0, timeLeft) * 10);
    const sizePoints = n * n;
    const efficiency = Math.max(0, (n * n - visitedCount) * 5);
    return { timePoints, sizePoints, efficiency, total: timePoints + sizePoints + efficiency };
}
export function computeScore(timeLeft, n, visitedCount) {
    return computeScoreBreakdown(timeLeft, n, visitedCount).total;
}
export function isVictory(state) {
    return state.status === "won";
}
export { TOP, RIGHT, BOTTOM, LEFT };
