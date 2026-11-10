import { test } from "node:test";
import assert from "assert/strict";
import { spawnEnemies, moveEnemies, enemyCountForLevel } from "../enemies.js";
import { generateDungeon } from "../dungeon.js";
import { mulberry32 } from "../rng.js";

const d = generateDungeon(21, 4, mulberry32(42));

test("enemyCountForLevel: cresce col livello ma resta sotto 10", () => {
  assert.ok(enemyCountForLevel(1) >= 2);
  assert.ok(enemyCountForLevel(20) <= 10);
  assert.ok(enemyCountForLevel(20) >= enemyCountForLevel(1));
});

test("spawnEnemies: genera il numero richiesto su celle libere", () => {
  const es = spawnEnemies(d, d.entrance, 5, mulberry32(7));
  assert.equal(es.length, 5);
  for (const e of es) {
    assert.ok(!isSolidCell(d, e.x, e.y), "nemico su cella libera");
    assert.ok(Math.hypot(e.x - d.entrance.x, e.y - d.entrance.y) >= 4, "lontano dall'ingresso");
  }
});

test("moveEnemies: i nemici non entrano nei muri", () => {
  const es = spawnEnemies(d, d.entrance, 4, mulberry32(3));
  const moved = moveEnemies(es, d, 0.5);
  for (const e of moved) assert.ok(!isSolidCell(d, e.x, e.y));
});

function isSolidCell(dd: any, x: number, y: number): boolean {
  return (dd as any).solid[Math.floor(y) * dd.size + Math.floor(x)] === 1;
}
