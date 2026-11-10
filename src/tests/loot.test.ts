import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COIN_RANGE,
  TREASURES,
  DONATIONS,
  makeChest,
  rollChestKind,
  chestCountForLevel,
  placeChests,
} from "../chests.js";
import { generateDungeon } from "../dungeon.js";
import { mulberry32 } from "../rng.js";

test("range monete per tipo di cassa", () => {
  assert.deepEqual(COIN_RANGE.legno, [4, 8]);
  assert.deepEqual(COIN_RANGE.oro, [10, 16]);
  assert.deepEqual(COIN_RANGE.ornata, [16, 24]);
});

test("makeChest: monete nel range del tipo", () => {
  const rng = mulberry32(5);
  for (const kind of ["legno", "oro", "ornata"] as const) {
    for (let i = 0; i < 50; i++) {
      const c = makeChest(i, 1.5, 1.5, kind, rng);
      assert.equal(c.kind, kind);
      assert.ok(c.coins >= COIN_RANGE[kind][0] && c.coins <= COIN_RANGE[kind][1]);
    }
  }
});

test("cassa legno: solo monete; oro: tesoro; ornata: tesoro + donazione", () => {
  const rng = mulberry32(77);
  const legno = makeChest(0, 1.5, 1.5, "legno", rng);
  assert.equal(legno.treasure, null);
  assert.equal(legno.donation, null);
  const oro = makeChest(1, 1.5, 1.5, "oro", rng);
  assert.ok(TREASURES.includes(oro.treasure as never));
  assert.equal(oro.donation, null);
  const ornata = makeChest(2, 1.5, 1.5, "ornata", rng);
  assert.ok(TREASURES.includes(ornata.treasure as never));
  assert.ok(DONATIONS.includes(ornata.donation as never));
});

test("rollChestKind restituisce solo tipi validi", () => {
  const rng = mulberry32(3);
  const valid = new Set(["legno", "oro", "ornata"]);
  for (let i = 0; i < 500; i++) assert.ok(valid.has(rollChestKind(rng)));
});

test("chestCountForLevel: minimo 3, cresce col livello, max 10", () => {
  assert.equal(chestCountForLevel(1, 3), 3);
  assert.ok(chestCountForLevel(9, 9) > chestCountForLevel(1, 3));
  assert.ok(chestCountForLevel(99, 9) <= 10);
});

test("placeChests: numero richiesto (se le stanze bastano)", () => {
  const d = generateDungeon(21, 5, mulberry32(42));
  const chests = placeChests(d, d.entrance, d.exit, 5, mulberry32(1));
  assert.equal(chests.length, 5);
});

test("placeChests: mai su ingresso o uscita", () => {
  for (const seed of [1, 42, 999]) {
    const d = generateDungeon(21, 5, mulberry32(seed));
    const chests = placeChests(d, d.entrance, d.exit, 6, mulberry32(seed));
    const blocked = new Set([
      `${d.entrance.x},${d.entrance.y}`,
      `${d.exit.x},${d.exit.y}`,
    ]);
    for (const c of chests) {
      const key = `${Math.floor(c.x)},${Math.floor(c.y)}`;
      assert.ok(!blocked.has(key), `cassa su ingresso/uscita (seed ${seed}): ${key}`);
    }
  }
});

test("placeChests: celle tutte diverse e dentro le stanze", () => {
  const d = generateDungeon(25, 6, mulberry32(314));
  const chests = placeChests(d, d.entrance, d.exit, 6, mulberry32(314));
  const keys = new Set(chests.map((c) => `${Math.floor(c.x)},${Math.floor(c.y)}`));
  assert.equal(keys.size, chests.length);
  for (const c of chests) {
    const inRoom = d.rooms.some(
      (r) =>
        Math.floor(c.x) >= r.x && Math.floor(c.x) < r.x + r.w &&
        Math.floor(c.y) >= r.y && Math.floor(c.y) < r.y + r.h
    );
    assert.ok(inRoom, `cassa fuori dalle stanze in (${c.x},${c.y})`);
  }
});
