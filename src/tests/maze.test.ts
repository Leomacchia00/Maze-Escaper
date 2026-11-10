import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMaze, bfs, mazeSizeForLevel, canMove, TOP, RIGHT, BOTTOM, LEFT } from "../maze.js";

test("tutte le celle sono raggiungibili (labirinto connesso)", () => {
  for (const n of [11, 17, 25]) {
    const maze = generateMaze(n);
    const dist = bfs(maze, 0);
    let reachable = 0;
    for (const d of dist) if (d >= 0) reachable++;
    assert.equal(reachable, n * n, `labirinto ${n}x${n} connesso`);
  }
});

test("mazeSizeForLevel: formula e tetto a 41", () => {
  assert.equal(mazeSizeForLevel(1), 11);
  assert.equal(mazeSizeForLevel(5), 19);
  assert.equal(mazeSizeForLevel(20), 41);
});

test("canMove rispetta i muri del labirinto", () => {
  const maze = generateMaze(11);
  for (let i = 0; i < 11 * 11; i++) {
    for (const dir of [TOP, RIGHT, BOTTOM, LEFT]) {
      if (canMove(maze, i, dir)) {
        assert.ok(true);
      }
    }
  }
});
