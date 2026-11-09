import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, createRun, tick, movePlayer, PLAYER_RADIUS, pause, resume, fogRadiusForLevel, TOP, RIGHT, BOTTOM, LEFT } from "../game.js";
import { bfs, canMove, neighborIndex } from "../maze.js";
function openDirFrom(maze, i) {
    for (const d of [TOP, RIGHT, BOTTOM, LEFT]) {
        if (canMove(maze, i, d))
            return d;
    }
    throw new Error("no open direction (impossible in a perfect maze)");
}
function vecFor(dir) {
    return {
        ix: dir === RIGHT ? 1 : dir === LEFT ? -1 : 0,
        iy: dir === BOTTOM ? 1 : dir === TOP ? -1 : 0,
    };
}
test("il punteggio corrisponde alla formula: tempo*10 + N*N + bonus efficienza", () => {
    assert.equal(computeScore(10, 11, 121), 10 * 10 + 121 + 0);
    assert.equal(computeScore(0, 11, 121), 121);
    assert.equal(computeScore(5.5, 13, 60), 55 + 169 + (169 - 60) * 5);
    assert.equal(computeScore(12.3, 17, 200), 123 + 289 + (289 - 200) * 5);
    assert.equal(computeScore(-2, 11, 121), 121);
    assert.equal(computeScore(3, 11, 50), 30 + 121 + (121 - 50) * 5);
});
test("scenari di punteggio coerenti con run simulate", () => {
    const total = 11 * 11;
    const visited = 80;
    const timeLeft = 7.25;
    const expected = Math.round(timeLeft * 10 + total + Math.max(0, (total - visited) * 5));
    assert.equal(computeScore(timeLeft, 11, visited), expected);
});
test("il timer parte al primo movimento, non al caricamento", () => {
    const run = createRun(1, () => 0.5);
    assert.equal(run.status, "ready");
    const afterIdle = tick(run, 5);
    assert.equal(afterIdle.timeLeft, run.baseTime);
    const v = vecFor(openDirFrom(run.maze, run.maze.entrance));
    const moved = movePlayer(run, v.ix, v.iy, 1 / 60);
    assert.equal(moved.status, "running");
    const afterTick = tick(moved, 1);
    assert.ok(Math.abs(afterTick.timeLeft - (moved.timeLeft - 1)) < 1e-9);
});
test("prima visita di una cella aggiunge +0.2s", () => {
    const run = createRun(1, () => 0.5);
    const before = run.timeLeft;
    const beforeCount = run.visitedCount;
    const v = vecFor(openDirFrom(run.maze, run.maze.entrance));
    let moved = run;
    for (let f = 0; f < 30 && moved.player === run.maze.entrance; f++) {
        moved = movePlayer(moved, v.ix, v.iy, 1 / 60);
    }
    assert.equal(moved.visitedCount, beforeCount + 1);
    assert.ok(Math.abs(moved.timeLeft - (before + 0.2)) < 1e-9);
});
test("tempo scaduto = sconfitta, uscita raggiunta = vittoria", () => {
    const run = createRun(1, () => 0.5);
    const lost = tick({ ...run, status: "running" }, run.baseTime + 10);
    assert.equal(lost.status, "lost");
    assert.equal(lost.timeLeft, 0);
    const w = createRun(1, () => 0.5);
    const exit = w.maze.exit;
    let wonRun = null;
    for (const d of [TOP, RIGHT, BOTTOM, LEFT]) {
        if (!canMove(w.maze, exit, d))
            continue;
        const neighbor = neighborIndex(w.maze.n, exit, d);
        const beforeExit = {
            ...w,
            player: neighbor,
            px: (neighbor % w.maze.n) + 0.5,
            py: Math.floor(neighbor / w.maze.n) + 0.5,
            status: "running",
        };
        const v = vecFor(d);
        let s = beforeExit;
        for (let f = 0; f < 60 && s.status === "running"; f++) {
            s = movePlayer(s, -v.ix, -v.iy, 1 / 60);
        }
        wonRun = s;
        break;
    }
    assert.ok(wonRun, "exit has an open neighbor (impossible in a perfect maze)");
    assert.equal(wonRun.status, "won", "moving onto exit must win the run");
});
test("fog of war: raggio 3 dal livello 4, raggio 2 dal livello 8, pieno prima", () => {
    assert.equal(fogRadiusForLevel(1), Infinity);
    assert.equal(fogRadiusForLevel(3), Infinity);
    assert.equal(fogRadiusForLevel(4), 3);
    assert.equal(fogRadiusForLevel(7), 3);
    assert.equal(fogRadiusForLevel(8), 2);
    assert.equal(fogRadiusForLevel(15), 2);
});
test("pausa: il labirinto non avanza e si riprende dallo stato giusto", () => {
    const run = createRun(1, () => 0.5);
    const v = vecFor(openDirFrom(run.maze, run.maze.entrance));
    let moved = run;
    for (let f = 0; f < 30 && moved.moves === 0; f++) {
        moved = movePlayer(moved, v.ix, v.iy, 1 / 60);
    }
    const paused = pause(moved);
    assert.equal(paused.status, "paused");
    assert.equal(tick(paused, 10).timeLeft, paused.timeLeft);
    const resumed = resume(paused);
    assert.equal(resumed.status, "running");
});
test("muro blocca il movimento", () => {
    const run = createRun(1, () => 0.5);
    let blockedDir = -1;
    for (const d of [TOP, RIGHT, BOTTOM, LEFT]) {
        if (!canMove(run.maze, run.maze.entrance, d)) {
            blockedDir = d;
            break;
        }
    }
    assert.ok(blockedDir !== -1, "the entrance has at least one border wall");
    const v = vecFor(blockedDir);
    let s = run;
    for (let i = 0; i < 120; i++) {
        s = movePlayer(s, v.ix, v.iy, 1 / 60);
    }
    assert.equal(s.player, run.maze.entrance);
    assert.equal(s.moves, 0);
});
test("movimento libero: la posizione è continua e il timer parte al primo input", () => {
    const run = createRun(1, () => 0.5);
    const dir = openDirFrom(run.maze, run.maze.entrance);
    const ix = dir === RIGHT ? 1 : dir === LEFT ? -1 : 0;
    const iy = dir === BOTTOM ? 1 : dir === TOP ? -1 : 0;
    const idle = movePlayer(run, 0, 0, 0.1);
    assert.equal(idle.status, "ready", "no input keeps the run ready");
    assert.equal(idle.px, run.px);
    const moved = movePlayer(run, ix, iy, 0.1);
    assert.equal(moved.status, "running", "first input starts the run");
    assert.ok(Math.abs(moved.px - run.px) + Math.abs(moved.py - run.py) > 0, "position changed");
    const expected = 4.5 * 0.1;
    const traveled = Math.abs(moved.px - run.px) + Math.abs(moved.py - run.py);
    assert.ok(Math.abs(traveled - expected) < 1e-9, "traveled speed * dt along the open direction");
});
test("movimento libero: i muri bloccano e il giocatore resta nel labirinto", () => {
    const run = createRun(1, () => 0.5);
    const n = run.maze.n;
    let s = run;
    for (let i = 0; i < 600; i++) {
        s = movePlayer(s, -1, -1, 1 / 60);
    }
    assert.ok(s.px >= 0 && s.px <= n, "px inside the grid");
    assert.ok(s.py >= 0 && s.py <= n, "py inside the grid");
    assert.ok(Math.abs(s.px - PLAYER_RADIUS) < 1e-9, "pressed against the left border");
    assert.ok(Math.abs(s.py - PLAYER_RADIUS) < 1e-9, "pressed against the top border");
    assert.equal(s.player, run.maze.entrance, "still in the entrance cell");
});
test("movimento libero: seguire il percorso fino all'uscita vince la run", () => {
    const run = createRun(1, () => 0.5);
    const maze = run.maze;
    const n = maze.n;
    const dist = bfs(maze, maze.entrance);
    const path = [];
    let cur = maze.exit;
    while (cur !== maze.entrance) {
        for (const d of [TOP, RIGHT, BOTTOM, LEFT]) {
            if (!canMove(maze, cur, d))
                continue;
            const next = neighborIndex(n, cur, d);
            if (dist[next] === dist[cur] - 1) {
                path.push(cur);
                cur = next;
                break;
            }
        }
    }
    path.reverse();
    let s = run;
    for (const cell of path) {
        if (s.status !== "running" && s.status !== "ready")
            break;
        const tx = (cell % n) + 0.5;
        const ty = Math.floor(cell / n) + 0.5;
        const dx = tx - s.px;
        const dy = ty - s.py;
        const ix = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
        const iy = ix === 0 ? Math.sign(dy) : 0;
        for (let f = 0; f < 90; f++) {
            s = movePlayer(s, ix, iy, 1 / 60);
            if (Math.abs(s.px - tx) < 0.06 && Math.abs(s.py - ty) < 0.06)
                break;
        }
    }
    assert.equal(s.status, "won", "reaching the exit with free movement must win");
});
test("movimento libero: la prima visita di una cella aggiunge +0.2s", () => {
    const run = createRun(1, () => 0.5);
    const dir = openDirFrom(run.maze, run.maze.entrance);
    const ix = dir === RIGHT ? 1 : dir === LEFT ? -1 : 0;
    const iy = dir === BOTTOM ? 1 : dir === TOP ? -1 : 0;
    let s = run;
    for (let i = 0; i < 30; i++) {
        s = movePlayer(s, ix, iy, 1 / 60);
    }
    assert.ok(s.visitedCount > run.visitedCount, "a new cell was visited");
    assert.ok(Math.abs(s.timeLeft - (run.timeLeft + (s.visitedCount - run.visitedCount) * 0.2)) < 1e-9);
});
