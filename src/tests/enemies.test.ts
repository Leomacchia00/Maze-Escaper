import { test } from "node:test";
import assert from "assert/strict";
import { spawnEnemies, moveEnemies, enemyCountForLevel, ENEMY_HP, ENEMY_BOUNTY, Enemy } from "../enemies.js";
import { generateDungeon } from "../dungeon.js";
import { mulberry32 } from "../rng.js";

const d = generateDungeon(21, 4, mulberry32(42));

test("enemyCountForLevel: cresce col livello ma resta sotto 12", () => {
  assert.ok(enemyCountForLevel(1) >= 2);
  assert.ok(enemyCountForLevel(20) <= 12);
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

test("varietà: brute esiste con HP e bounty alti", () => {
  assert.equal(ENEMY_HP.brute, 6);
  assert.equal(ENEMY_BOUNTY.brute, 6);
  assert.ok(ENEMY_HP.brute > ENEMY_HP.slug, "il tank ha piu' HP dello slug");
});

test("moveEnemies: chase verso il giocatore quando vicino", () => {
  let target: { x: number; y: number } | null = null;
  for (let y = 1; y < d.size - 1 && !target; y++) {
    for (let x = 1; x < d.size - 3; x++) {
      if (!isSolidCell(d, x + 0.5, y + 0.5) && !isSolidCell(d, x + 2.5, y + 0.5)) {
        target = { x, y };
        break;
      }
    }
  }
  assert.ok(target, "trovata coppia di celle libere affiancate");
  const bat: Enemy = { x: target.x + 0.5, y: target.y + 0.5, dx: 0, dy: 1, speed: 2.2, kind: "bat", hp: 1, maxHp: 1, chasing: false };
  const moved = moveEnemies([bat], d, 0.2, target.x + 2.5, target.y + 0.5);
  assert.ok(moved[0].x > bat.x, "il bat insegue verso destra");
  assert.equal(moved[0].chasing, true);
});

test("moveEnemies: lontano dal giocatore resta in patrol", () => {
  const es = spawnEnemies(d, d.entrance, 2, mulberry32(3), 1);
  const moved = moveEnemies(es, d, 0.2, -50, -50);
  for (const e of moved) assert.equal(e.chasing, false);
});
