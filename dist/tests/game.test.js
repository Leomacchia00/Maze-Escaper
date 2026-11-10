import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, movePlayer, tick, baseAirForLevel } from "../game.js";
test("la run parte in stato ready con aria piena", () => {
    const run = createRun(1);
    assert.equal(run.status, "ready");
    assert.equal(run.air, run.baseAir);
    assert.ok(run.air > 0);
});
test("il movimento cambia la posizione del giocatore", () => {
    const run = createRun(1);
    const moved = movePlayer(run, 1, 0, 0.5);
    assert.ok(moved.px > run.px || moved.py !== run.py || moved.px !== run.px);
});
test("lo stato ready diventa running al primo movimento", () => {
    const run = createRun(1);
    const moved = movePlayer(run, 1, 0, 0.016);
    assert.equal(moved.status, "running");
});
test("tick consuma l'aria solo quando la run è attiva", () => {
    const run = createRun(1);
    const after = tick(run, 1);
    assert.equal(after.air, run.air);
    const running = { ...run, status: "running" };
    const drained = tick(running, 1);
    assert.ok(drained.air < running.air);
});
test("aria a zero significa sconfitta", () => {
    const run = createRun(1);
    const zero = { ...run, air: 0.01, status: "running" };
    const lost = tick(zero, 1);
    assert.equal(lost.status, "lost");
});
test("baseAirForLevel cresce con il livello", () => {
    assert.ok(baseAirForLevel(3) > baseAirForLevel(1));
});
