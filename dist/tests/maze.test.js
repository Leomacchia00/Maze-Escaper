import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMaze, bfs, mazeSizeForLevel } from "../maze.js";
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
test("100 labirinti generati sono tutti risolvibili (BFS ingresso→uscita)", () => {
    for (let i = 0; i < 100; i++) {
        const level = (i % 15) + 1;
        const n = mazeSizeForLevel(level);
        const maze = generateMaze(n, mulberry32(i + 1));
        const dist = bfs(maze, maze.entrance);
        assert.ok(dist[maze.exit] > 0, `maze ${i} (level ${level}): exit not reachable`);
        assert.equal(dist[maze.exit], Math.max(...dist), `maze ${i}: exit is not the farthest cell`);
        for (let c = 0; c < n * n; c++) {
            assert.ok(dist[c] >= 0, `maze ${i}: cell ${c} unreachable (not a perfect maze)`);
        }
    }
});
test("dimensioni per livello: N = 11 + (livello-1)*2, tetto 41", () => {
    assert.equal(mazeSizeForLevel(1), 11);
    assert.equal(mazeSizeForLevel(2), 13);
    assert.equal(mazeSizeForLevel(4), 17);
    assert.equal(mazeSizeForLevel(15), 39);
    assert.equal(mazeSizeForLevel(16), 41);
    assert.equal(mazeSizeForLevel(99), 41);
});
