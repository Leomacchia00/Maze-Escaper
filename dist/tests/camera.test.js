import test from "node:test";
import assert from "node:assert/strict";
import { cameraFor, visibleRange, seenMask, VISIBLE_TILES } from "../camera.js";
test("il tile dipende dal lato minore e dalle tile visibili", () => {
    const cam = cameraFor(5, 5, 61, 720, 720);
    assert.ok(Math.abs(cam.tw - 720 / VISIBLE_TILES) < 1e-9);
    const cam2 = cameraFor(5, 5, 61, 800, 400, 10);
    assert.ok(Math.abs(cam2.tw - 40) < 1e-9);
});
test("dungeon piccolo: mappa centrata a prescindere dal giocatore", () => {
    const cam = cameraFor(9, 2, 10, 700, 700);
    assert.equal(cam.tw, 50);
    assert.equal(cam.ox, 100);
});
test("clamp a sinistra: vicino al bordo non si mostra fuori mappa", () => {
    const cam = cameraFor(1.5, 30, 61, 720, 720);
    assert.equal(cam.ox, 0);
});
test("clamp a destra: il bordo destro del dungeon tocca il bordo canvas", () => {
    const size = 61;
    const cam = cameraFor(59.5, 30, size, 720, 720);
    const world = size * cam.tw;
    assert.ok(Math.abs(cam.ox + world - 720) < 1e-6);
});
test("clamp in alto: spazio per il rise dei muri", () => {
    const cam = cameraFor(30, 1.2, 61, 720, 720);
    assert.ok(Math.abs(cam.oy - cam.rise) < 1e-6);
});
test("clamp in basso: il fondo del dungeon tocca il fondo canvas", () => {
    const size = 61;
    const cam = cameraFor(30, 59.5, size, 720, 720);
    const world = size * cam.tw;
    assert.ok(Math.abs(cam.oy + world - 720) < 1e-6);
});
test("visibleRange resta dentro i bounds del dungeon", () => {
    const cam = cameraFor(0.5, 60.5, 61, 720, 720);
    const r = visibleRange(cam, 720, 720);
    assert.ok(r.x0 >= 0 && r.x1 <= 60 && r.y0 >= 0 && r.y1 <= 60);
});
test("visibleRange contiene la cella del giocatore", () => {
    const cam = cameraFor(30.5, 30.5, 61, 720, 720);
    const r = visibleRange(cam, 720, 720);
    assert.ok(30 >= r.x0 && 30 <= r.x1);
    assert.ok(30 >= r.y0 && 30 <= r.y1);
});
test("seenMask: visitata + 8 vicini visti, il resto no", () => {
    const size = 5;
    const visited = new Uint8Array(size * size);
    visited[2 * size + 2] = 1;
    const seen = seenMask(visited, size);
    for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
            assert.equal(seen[y * size + x], 1, `(${x},${y}) dovrebbe essere vista`);
        }
    }
    assert.equal(seen[0], 0);
    assert.equal(seen[4 * size + 4], 0);
});
test("seenMask gestisce i bordi della griglia", () => {
    const size = 3;
    const visited = new Uint8Array(size * size);
    visited[0] = 1;
    const seen = seenMask(visited, size);
    assert.equal(seen[0], 1);
    assert.equal(seen[1], 1);
    assert.equal(seen[3], 1);
    assert.equal(seen[4], 1);
    assert.equal(seen[8], 0);
});
