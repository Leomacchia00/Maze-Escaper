import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SKILLS, skillLevel, skillCost, requirementMet, canBuy, buySkill,
  extraTimeMultiplier, timerSpeedFactor, fogBonus, hasCompass,
  coinsForRun, awardRunCoins,
} from "../skills.js";
import { createRun, tick, fogRadius } from "../game.js";
import { defaultPlayerState, loadPlayerState, savePlayerState, PlayerState } from "../storage.js";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null { return this.map.get(k) ?? null; }
  setItem(k: string, v: string): void { this.map.set(k, v); }
  removeItem(k: string): void { this.map.delete(k); }
}

function playerWith(currency: number, skills: Record<string, number>): PlayerState {
  return { ...defaultPlayerState(), currency, skills };
}

test("definizione nodi: 4 skill, 3 livelli, costi crescenti 20/50/120", () => {
  assert.equal(SKILLS.length, 4);
  for (const node of SKILLS) {
    assert.equal(node.maxLevel, 3);
    assert.deepEqual(node.costs, [20, 50, 120]);
  }
});

test("valuta: vittoria 10 + livello*2, sconfitta 2", () => {
  assert.equal(coinsForRun(true, 1), 12);
  assert.equal(coinsForRun(true, 5), 20);
  assert.equal(coinsForRun(false, 7), 2);
  const p = awardRunCoins(playerWith(0, {}), true, 3);
  assert.equal(p.currency, 16);
});

test("acquisto: deduce il costo e alza il livello", () => {
  let p = playerWith(20, {});
  assert.ok(canBuy(p, "extra-time"));
  p = buySkill(p, "extra-time");
  assert.equal(p.currency, 0);
  assert.equal(skillLevel(p.skills, "extra-time"), 1);

  assert.equal(canBuy(p, "extra-time"), false, "senza monete non si compra");
  assert.equal(buySkill(p, "extra-time"), p, "acquisto impossibile non cambia lo stato");
});

test("prerequisiti: timer lento richiede tempo extra, bussola richiede visione", () => {
  const p = playerWith(1000, {});
  assert.equal(requirementMet(p.skills, "slow-timer"), false);
  assert.equal(canBuy(p, "slow-timer"), false);
  assert.equal(buySkill(p, "slow-timer").currency, 1000, "prerequisito mancante = nessun acquisto");

  const withRoot = buySkill(p, "extra-time");
  assert.equal(requirementMet(withRoot.skills, "slow-timer"), true);
  assert.equal(canBuy(withRoot, "slow-timer"), true);

  assert.equal(canBuy(p, "compass"), false);
  assert.equal(canBuy(buySkill(p, "vision"), "compass"), true);
});

test("livello massimo: costo nullo e acquisto bloccato", () => {
  const p = playerWith(10000, { "extra-time": 3 });
  assert.equal(skillCost(p.skills, "extra-time"), null);
  assert.equal(canBuy(p, "extra-time"), false);
});

test("effetti: tempo extra, timer lento, visione, bussola", () => {
  assert.equal(extraTimeMultiplier({}), 1);
  assert.equal(extraTimeMultiplier({ "extra-time": 2 }), 1.1);
  assert.equal(timerSpeedFactor({}), 1);
  assert.equal(timerSpeedFactor({ "slow-timer": 3 }), 0.85);
  assert.equal(fogBonus({}), 0);
  assert.equal(fogBonus({ vision: 2 }), 2);
  assert.equal(hasCompass({}), false);
  assert.equal(hasCompass({ compass: 1 }), true);
});

test("createRun applica le skill: tempo base e fog estesi", () => {
  const base = createRun(4, () => 0.5);
  assert.ok(Math.abs(base.baseTime - 17 * 2.5) < 1e-9);
  assert.equal(base.timerFactor, 1);
  assert.equal(base.compass, false);
  assert.equal(fogRadius(base), 3);

  const skilled = createRun(4, () => 0.5, { "extra-time": 2, "slow-timer": 1, vision: 1, compass: 1 });
  assert.ok(Math.abs(skilled.baseTime - 17 * 2.5 * 1.1) < 1e-9);
  assert.equal(skilled.timerFactor, 0.95);
  assert.equal(skilled.compass, true);
  assert.equal(fogRadius(skilled), 4);
});

test("tick rispetta il timer lento", () => {
  const run = createRun(1, () => 0.5, { "slow-timer": 2 });
  const running = { ...run, status: "running" as const };
  const after = tick(running, 10);
  assert.ok(Math.abs(after.timeLeft - (run.baseTime - 9)) < 1e-9);
});

test("livello 1 senza fog: la visione non rompe la visibilità piena", () => {
  const run = createRun(1, () => 0.5, { vision: 3 });
  assert.equal(fogRadius(run), Infinity);
});

test("monete e skill sopravvivono al reload", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  let p = loadPlayerState(storage);
  p = { ...p, currency: 50 };
  p = buySkill(p, "vision");
  savePlayerState(p, storage);
  const reloaded = loadPlayerState(storage);
  assert.equal(reloaded.currency, 30);
  assert.equal(skillLevel(reloaded.skills, "vision"), 1);
});
