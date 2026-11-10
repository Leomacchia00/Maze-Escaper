import { test } from "node:test";
import assert from "assert/strict";
import { createRun, movePlayer, tick, pickupChests, payout, baseAirForLevel, } from "../game.js";
import { isSolid } from "../dungeon.js";
const LEVEL = 1;
const SEED = 42;
test("createRun: stato iniziale con aria piena e status ready", () => {
    const s = createRun(LEVEL, SEED);
    assert.equal(s.status, "ready");
    assert.equal(s.air, s.baseAir);
    assert.equal(s.coins, 0);
    assert.equal(s.chestOpenCount, 0);
    assert.ok(s.chests.length >= 3);
});
test("spawn sull'ingresso, al centro della cella", () => {
    const s = createRun(LEVEL, SEED);
    assert.equal(s.px, s.dungeon.entrance.x + 0.5);
    assert.equal(s.py, s.dungeon.entrance.y + 0.5);
});
test("movimento libero: la posizione cambia in modo continuo", () => {
    const s = createRun(LEVEL, SEED);
    const moved = movePlayer(s, 1, 0, 0.1);
    assert.ok(moved.px > s.px);
    assert.ok(Math.abs(moved.px - (s.px + 0.45)) < 0.01);
});
test("le mura bloccano il movimento", () => {
    const s = createRun(LEVEL, SEED);
    let cur = s;
    for (let i = 0; i < 60; i++)
        cur = movePlayer(cur, -1, 0, 0.1);
    const cellX = Math.floor(cur.px);
    const cellY = Math.floor(cur.py);
    assert.ok(cur.px >= 1, `il giocatore ha attraversato il muro: px=${cur.px}`);
    assert.ok(!isSolid(cur.dungeon, cellX, cellY));
});
test("ready passa a running al primo movimento", () => {
    let s = createRun(LEVEL, SEED);
    assert.equal(s.status, "ready");
    s = movePlayer(s, 1, 0, 0.1);
    assert.equal(s.status, "running");
});
test("tick consuma aria solo quando la run è in corso", () => {
    let s = createRun(LEVEL, SEED);
    const readyTick = tick(s, 1);
    assert.equal(readyTick.air, s.air);
    s = movePlayer(s, 1, 0, 0.1);
    const running = tick(s, 1);
    assert.ok(running.air < s.air);
});
test("aria a zero: sconfitta", () => {
    let s = createRun(LEVEL, SEED);
    s = { ...s, status: "running", air: 0.5 };
    s = tick(s, 1);
    assert.equal(s.status, "lost");
    assert.equal(s.air, 0);
});
test("nuove celle visitate restituiscono aria (fino al cap)", () => {
    let s = createRun(LEVEL, SEED);
    s = movePlayer(s, 1, 0, 0.1);
    const afterMove = s.air;
    assert.ok(afterMove <= s.baseAir);
    s = { ...s, air: s.baseAir };
    const capped = movePlayer(s, 0, 1, 0.1);
    assert.ok(capped.air <= s.baseAir);
});
test("le skill d'aria aumentano l'aria di base", () => {
    const plain = createRun(LEVEL, SEED);
    const skilled = createRun(LEVEL, SEED, { air1: true, air2: true });
    assert.ok(skilled.baseAir > plain.baseAir);
    assert.ok(Math.abs(skilled.baseAir / plain.baseAir - 1.45) < 0.02);
});
test("le skill fortuna moltiplicano le monete delle casse", () => {
    const s = createRun(LEVEL, SEED, { luck3: true });
    assert.ok(s.coinMult > 1.3);
});
test("baseAir cresce col livello", () => {
    assert.ok(baseAirForLevel(2) > baseAirForLevel(1));
    assert.ok(baseAirForLevel(5) > baseAirForLevel(2));
});
test("vittoria raggiungendo l'uscita", () => {
    const s = createRun(LEVEL, SEED);
    const atExit = {
        ...s,
        px: s.dungeon.exit.x + 0.5,
        py: s.dungeon.exit.y + 0.5,
        status: "running",
    };
    const moved = movePlayer(atExit, 0.01, 0, 0.016);
    assert.equal(moved.status, "won");
});
test("pickup: aprire una cassa aggiunge monete e conta", () => {
    const s = createRun(LEVEL, SEED);
    const chest = s.chests[0];
    const atChest = {
        ...s,
        px: chest.x,
        py: chest.y,
        status: "running",
    };
    const picked = pickupChests(atChest);
    assert.equal(picked.chestOpenCount, 1);
    assert.equal(picked.coins, chest.coins);
    assert.equal(picked.chests[0].opened, true);
});
test("payout: alla sconfitta il bottino si dimezza", () => {
    const s = {
        ...createRun(LEVEL, SEED),
        status: "lost",
        coins: 21,
        treasures: ["a", "b", "c"],
        donations: ["WWF"],
    };
    const got = payout(s);
    assert.equal(got.coins, 10);
    assert.equal(got.treasures.length, 1);
    assert.equal(got.donations.length, 0);
});
test("payout: alla vittoria il bottino è intero", () => {
    const s = {
        ...createRun(LEVEL, SEED),
        status: "won",
        coins: 21,
        treasures: ["a"],
        donations: ["WWF"],
    };
    const got = payout(s);
    assert.equal(got.coins, 21);
    assert.equal(got.treasures.length, 1);
    assert.equal(got.donations.length, 1);
});
