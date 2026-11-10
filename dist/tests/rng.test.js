import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32, randInt, pick, shuffle } from "../rng.js";
test("mulberry32 è deterministico a parità di seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++)
        assert.equal(a(), b());
});
test("seed diversi danno sequenze diverse", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    assert.notDeepEqual(seqA, seqB);
});
test("i valori sono sempre in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 10000; i++) {
        const v = rng();
        assert.ok(v >= 0 && v < 1, `valore fuori range: ${v}`);
    }
});
test("primi valori con seed 1 sono stabili (pin di versione)", () => {
    const rng = mulberry32(1);
    assert.equal(Math.floor(rng() * 1e6), 627073);
});
test("randInt rispetta i limiti inclusi", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
        const v = randInt(rng, 2, 5);
        assert.ok(v >= 2 && v <= 5, `randInt fuori range: ${v}`);
    }
});
test("pick restituisce sempre un elemento dell'array", () => {
    const rng = mulberry32(9);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 100; i++)
        assert.ok(arr.includes(pick(rng, arr)));
});
test("shuffle è una permutazione", () => {
    const rng = mulberry32(11);
    const arr = [1, 2, 3, 4, 5, 6];
    const shuffled = shuffle([...arr], rng);
    assert.deepEqual([...shuffled].sort((a, b) => a - b), arr);
});
