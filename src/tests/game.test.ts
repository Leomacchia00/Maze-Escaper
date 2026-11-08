import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, createRun, tick, tryMove, pause, resume, fogRadiusForLevel, RunState, Direction, TOP, RIGHT, BOTTOM, LEFT } from "../game.js";
import { Maze, generateMaze, canMove, neighborIndex } from "../maze.js";

function openDirFrom(maze: Maze, i: number): Direction {
  for (const d of [TOP, RIGHT, BOTTOM, LEFT] as Direction[]) {
    if (canMove(maze, i, d)) return d;
  }
  throw new Error("no open direction (impossible in a perfect maze)");
}

function dirToward(maze: Maze, from: number, to: number): Direction {
  for (const d of [TOP, RIGHT, BOTTOM, LEFT] as Direction[]) {
    if (canMove(maze, from, d) && neighborIndex(maze.n, from, d) === to) return d;
  }
  throw new Error("cells are not adjacent");
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
  const moved = tryMove(run, openDirFrom(run.maze, run.maze.entrance));
  assert.equal(moved.status, "running");
  const afterTick = tick(moved, 1);
  assert.ok(Math.abs(afterTick.timeLeft - (moved.timeLeft - 1)) < 1e-9);
});

test("prima visita di una cella aggiunge +0.2s", () => {
  const run = createRun(1, () => 0.5);
  const before = run.timeLeft;
  const beforeCount = run.visitedCount;
  const moved = tryMove(run, openDirFrom(run.maze, run.maze.entrance));
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
  let wonRun: RunState | null = null;
  for (const d of [TOP, RIGHT, BOTTOM, LEFT] as Direction[]) {
    if (!canMove(w.maze, exit, d)) continue;
    const neighbor = neighborIndex(w.maze.n, exit, d);
    const beforeExit: RunState = { ...w, player: neighbor, status: "running" };
    wonRun = tryMove(beforeExit, dirToward(w.maze, neighbor, exit));
    break;
  }
  assert.ok(wonRun, "exit has an open neighbor (impossible in a perfect maze)");
  assert.equal(wonRun!.status, "won", "moving onto exit must win the run");
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
  const moved = tryMove(run, openDirFrom(run.maze, run.maze.entrance));
  const paused = pause(moved);
  assert.equal(paused.status, "paused");
  assert.equal(tick(paused, 10).timeLeft, paused.timeLeft);
  const resumed = resume(paused);
  assert.equal(resumed.status, "running");
});

test("muro blocca il movimento", () => {
  const run = createRun(1, () => 0.5);
  const left = tryMove(run, LEFT);
  assert.equal(left.player, run.maze.entrance);
  assert.equal(left.moves, 0);
});
