import { test } from "node:test";
import assert from "assert/strict";
import { placePickups, pickupAt, pickupCountForLevel, pickupValue } from "../pickups.js";
import { generateDungeon } from "../dungeon.js";
import { mulberry32 } from "../rng.js";

const d = generateDungeon(21, 4, mulberry32(42));

test("pickupCountForLevel: cresce con il livello, cap 30", () => {
  assert.ok(pickupCountForLevel(1) >= 10);
  assert.ok(pickupCountForLevel(20) <= 30);
});

test("placePickups: solo su celle libere, fuori da taken", () => {
  const taken = new Set<number>([d.entrance.y * d.size + d.entrance.x, d.exit.y * d.size + d.exit.x]);
  const ps = placePickups(d, taken, 10, mulberry32(11));
  assert.equal(ps.length, 10);
  for (const p of ps) {
    const key = Math.floor(p.y) * d.size + Math.floor(p.x);
    assert.ok(!taken.has(key), "pickup non su cella occupata");
  }
});

test("pickupAt: trova il pickup nella cella del giocatore", () => {
  const ps = placePickups(d, new Set(), 5, mulberry32(11));
  const target = ps[0];
  const state = { px: target.x, py: target.y };
  const hit = pickupAt(state, ps);
  assert.ok(hit);
  assert.equal(hit!.id, target.id);
});

test("pickupValue: moneta 1, gemma 5", () => {
  assert.equal(pickupValue("coin"), 1);
  assert.equal(pickupValue("gem"), 5);
});
