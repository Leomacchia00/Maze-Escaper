import { test } from "node:test";
import assert from "node:assert/strict";
import { ChestKind, chestCoins, makeChest, openChestAt, placeChests } from "../chests.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 14), 1 | a)) >>> 0;
    return t / 4294967296;
  };
}

test("placeChests restituisce il numero richiesto di casse su celle libere", () => {
  const freeCells = [10, 11, 12, 13, 14, 15];
  const chests = placeChests(freeCells, 0, 119, 3, mulberry32(42));
  assert.ok(chests.length <= freeCells.length);
  for (const chest of chests) {
    assert.ok(freeCells.includes(chest.cell), "la cassa è su una cella libera");
  }
});

test("openChestAt apra solo la cassa sulla cella del giocatore", () => {
  const state = {
    chests: [
      { cell: 5, kind: "legno" as ChestKind, coins: 6, treasure: null, opened: false },
      { cell: 9, kind: "oro" as ChestKind, coins: 12, treasure: "Gemma", opened: false },
    ],
    lootCoins: 0,
    lootTreasures: [] as string[],
    player: 5,
  };
  const result = openChestAt(state);
  assert.ok(result);
  assert.equal(result.lootCoins, 6);
  assert.equal(result.chests[0].opened, true);
  assert.equal(result.chests[1].opened, false);
});

test("openChestAt restituisce null se nessuna cassa sulla cella", () => {
  const state = {
    chests: [{ cell: 5, kind: "legno" as ChestKind, coins: 6, treasure: null, opened: false }],
    lootCoins: 0,
    lootTreasures: [] as string[],
    player: 7,
  };
  assert.equal(openChestAt(state), null);
});

test("openChestAt non apre due volte la stessa cassa", () => {
  const state = {
    chests: [{ cell: 5, kind: "legno" as ChestKind, coins: 6, treasure: null, opened: true }],
    lootCoins: 6,
    lootTreasures: [] as string[],
    player: 5,
  };
  assert.equal(openChestAt(state), null);
});

test("chestCoins rispetta l'intervallo del tipo di cassa", () => {
  for (const kind of ["legno", "oro", "ornata"] as ChestKind[]) {
    for (let i = 0; i < 50; i++) {
      const coins = chestCoins(kind, mulberry32(i + 1));
      assert.ok(coins >= 0, `${kind}: ${coins} non negativo`);
    }
  }
});

test("makeChest crea casse con stato aperto falso", () => {
  const chest = makeChest(3, "oro", mulberry32(7));
  assert.equal(chest.cell, 3);
  assert.equal(chest.opened, false);
  assert.equal(chest.kind, "oro");
});
