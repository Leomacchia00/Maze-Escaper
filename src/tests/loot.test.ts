import { test } from "node:test";
import assert from "node:assert/strict";
import { makeChest, chestCountForCells, placeChests, openChestAt } from "../chests.js";

test("makeChest crea casse chiuse con loot nel range", () => {
  const c = makeChest(5, "oro", Math.random);
  assert.equal(c.opened, false);
  assert.ok(c.coins >= 4 && c.coins <= 24);
});

test("chestCountForCells sta nei limiti 3-8", () => {
  assert.equal(chestCountForCells(121), 3);
  assert.ok(chestCountForCells(1681) <= 8);
});

test("placeChests non mette casse su ingresso o uscita", () => {
  const free = [1, 2, 3, 4, 5];
  const chests = placeChests(free, 0, 24, 3, Math.random);
  for (const c of chests) {
    assert.notEqual(c.cell, 0);
    assert.notEqual(c.cell, 24);
  }
});

test("openChestAt apre solo la cassa sulla cella del giocatore", () => {
  const state = {
    chests: [
      { cell: 5, kind: "legno" as const, coins: 6, treasure: null, opened: false },
      { cell: 9, kind: "oro" as const, coins: 12, treasure: "Gemma", opened: false },
    ],
    lootCoins: 0,
    lootTreasures: [] as string[],
    playerCell: 5,
  };
  const res = openChestAt(state);
  assert.ok(res);
  assert.equal(res.lootCoins, 6);
  assert.equal(res.chests[0].opened, true);
  assert.equal(res.chests[1].opened, false);
});
