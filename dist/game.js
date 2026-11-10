import { generateDungeon, dungeonSizeForLevel, roomCountForLevel, isSolid } from "./dungeon.js";
import { placeChests, chestCountForLevel } from "./chests.js";
import { mulberry32 } from "./rng.js";
import { skillEffects } from "./skills.js";
import { placePickups, pickupCountForLevel } from "./pickups.js";
import { spawnEnemies, enemyCountForLevel } from "./enemies.js";
export const PLAYER_RADIUS = 0.3;
export const RUN_SPEED = 4.5;
export const AIR_PER_CELL = 0.25;
export const MAX_HP = 3;
export function baseAirForLevel(level, airMult = 1) {
    return Math.round(dungeonSizeForLevel(level) * 1.5 * airMult);
}
export function createRun(level, seed, skills = {}) {
    const rng = mulberry32(seed);
    const size = dungeonSizeForLevel(level);
    const roomCount = roomCountForLevel(level);
    const dungeon = generateDungeon(size, roomCount, rng);
    const fx = skillEffects(skills);
    const baseAir = baseAirForLevel(level, fx.airMult);
    const chests = placeChests(dungeon, dungeon.entrance, dungeon.exit, chestCountForLevel(level, roomCount), rng);
    const taken = new Set();
    taken.add(dungeon.entrance.y * size + dungeon.entrance.x);
    taken.add(dungeon.exit.y * size + dungeon.exit.x);
    for (const c of chests)
        taken.add(Math.floor(c.x) + Math.floor(c.y) * size);
    const pickups = placePickups(dungeon, taken, pickupCountForLevel(level), rng);
    const enemies = spawnEnemies(dungeon, dungeon.entrance, enemyCountForLevel(level), rng, level);
    const visited = new Uint8Array(size * size);
    visited[dungeon.entrance.y * size + dungeon.entrance.x] = 1;
    return {
        level,
        dungeon,
        px: dungeon.entrance.x + 0.5,
        py: dungeon.entrance.y + 0.5,
        facingX: 1,
        facingY: 0,
        air: baseAir,
        baseAir,
        hp: MAX_HP,
        maxHp: MAX_HP,
        lostBy: "air",
        status: "ready",
        visited,
        visitedCount: 1,
        chests,
        pickups,
        enemies,
        coins: 0,
        treasures: [],
        donations: [],
        chestOpenCount: 0,
        speedMult: fx.speedMult,
        coinMult: fx.coinMult,
    };
}
function blocked(d, x, y, r) {
    const x0 = Math.floor(x - r);
    const x1 = Math.floor(x + r);
    const y0 = Math.floor(y - r);
    const y1 = Math.floor(y + r);
    for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
            if (!isSolid(d, cx, cy))
                continue;
            const nx = Math.max(cx, Math.min(x, cx + 1));
            const ny = Math.max(cy, Math.min(y, cy + 1));
            const dx = x - nx;
            const dy = y - ny;
            if (dx * dx + dy * dy < r * r)
                return true;
        }
    }
    return false;
}
function slide(d, px, py, dx, dy, r) {
    let nx = px + dx;
    if (blocked(d, nx, py, r))
        nx = px;
    let ny = py + dy;
    if (blocked(d, nx, ny, r))
        ny = py;
    return { x: nx, y: ny };
}
export function movePlayer(state, ix, iy, dt) {
    if (state.status === "won" || state.status === "lost")
        return state;
    const len = Math.hypot(ix, iy);
    if (len === 0)
        return state;
    const dist = RUN_SPEED * state.speedMult * Math.min(dt, 0.1);
    const steps = Math.max(1, Math.ceil(dist / 0.15));
    const sdx = ((ix / len) * dist) / steps;
    const sdy = ((iy / len) * dist) / steps;
    let px = state.px;
    let py = state.py;
    for (let i = 0; i < steps; i++) {
        const res = slide(state.dungeon, px, py, sdx, sdy, PLAYER_RADIUS);
        px = res.x;
        py = res.y;
    }
    const visited = state.visited.slice();
    const cx = Math.floor(px);
    const cy = Math.floor(py);
    const cell = cy * state.dungeon.size + cx;
    let visitedCount = state.visitedCount;
    let air = state.air;
    if (!visited[cell]) {
        visited[cell] = 1;
        visitedCount += 1;
        air = Math.min(air + AIR_PER_CELL, state.baseAir);
    }
    const status = state.status === "ready" && (px !== state.px || py !== state.py) ? "running" : state.status;
    const won = status === "running" && cx === state.dungeon.exit.x && cy === state.dungeon.exit.y;
    return {
        ...state,
        px,
        py,
        facingX: ix !== 0 ? Math.sign(ix) : state.facingX,
        facingY: iy !== 0 ? Math.sign(iy) : state.facingY,
        visited,
        visitedCount,
        air,
        status: won ? "won" : status,
    };
}
export function tick(state, dt) {
    if (state.status !== "running")
        return state;
    const air = state.air - dt;
    if (air <= 0)
        return { ...state, air: 0, lostBy: "air", status: "lost" };
    return { ...state, air };
}
export function pickupChests(state) {
    const cx = Math.floor(state.px);
    const cy = Math.floor(state.py);
    const hit = state.chests.find((c) => !c.opened && Math.floor(c.x) === cx && Math.floor(c.y) === cy);
    if (!hit)
        return state;
    const chests = state.chests.map((c) => (c.id === hit.id ? { ...c, opened: true } : c));
    return {
        ...state,
        chests,
        hp: Math.min(state.maxHp, state.hp + 1),
        coins: state.coins + Math.round(hit.coins * state.coinMult),
        treasures: hit.treasure ? [...state.treasures, hit.treasure] : state.treasures,
        donations: hit.donation ? [...state.donations, hit.donation] : state.donations,
        chestOpenCount: state.chestOpenCount + 1,
    };
}
export function damagePlayer(state, dmg) {
    if (state.status !== "running")
        return state;
    const hp = Math.max(0, state.hp - dmg);
    if (hp <= 0)
        return { ...state, hp: 0, lostBy: "hp", status: "lost" };
    return { ...state, hp };
}
export function healPlayer(state, n) {
    return { ...state, hp: Math.min(state.maxHp, state.hp + n) };
}
export function payout(state) {
    if (state.status === "won") {
        return { coins: state.coins, treasures: state.treasures, donations: state.donations };
    }
    return {
        coins: Math.floor(state.coins / 2),
        treasures: state.treasures.slice(0, Math.floor(state.treasures.length / 2)),
        donations: state.donations.slice(0, Math.floor(state.donations.length / 2)),
    };
}
