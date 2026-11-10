import { test } from "node:test";
import assert from "node:assert/strict";
import { generateDungeon, dungeonSizeForLevel, roomCountForLevel, isSolid, bfsDistances, floorCount, reachableFloorCount, } from "../dungeon.js";
import { mulberry32 } from "../rng.js";
test("dimensione dungeon cresce col livello e ha un tetto", () => {
    assert.equal(dungeonSizeForLevel(1), 15);
    assert.equal(dungeonSizeForLevel(2), 17);
    assert.equal(dungeonSizeForLevel(100), 41);
});
test("roomCount cresce con il livello senza superare 9", () => {
    assert.equal(roomCountForLevel(1), 3);
    assert.equal(roomCountForLevel(20), 9);
});
test("il bordo del dungeon è sempre solido", () => {
    for (const seed of [1, 42, 999]) {
        const d = generateDungeon(15, 3, mulberry32(seed));
        for (let i = 0; i < d.size; i++) {
            assert.ok(isSolid(d, i, 0));
            assert.ok(isSolid(d, i, d.size - 1));
            assert.ok(isSolid(d, 0, i));
            assert.ok(isSolid(d, d.size - 1, i));
        }
    }
});
test("il dungeon generato è deterministico a parità di seed", () => {
    const a = generateDungeon(17, 4, mulberry32(123));
    const b = generateDungeon(17, 4, mulberry32(123));
    assert.deepEqual([...a.solid], [...b.solid]);
    assert.deepEqual(a.rooms, b.rooms);
});
test("l'uscita è raggiungibile dall'ingresso (BFS) per vari seed", () => {
    for (const seed of [1, 7, 42, 123, 99999]) {
        const d = generateDungeon(21, 5, mulberry32(seed));
        const dist = bfsDistances(d, d.entrance.x, d.entrance.y);
        const exitDist = dist[d.exit.y * d.size + d.exit.x];
        assert.ok(exitDist > 0, `uscita non raggiungibile con seed ${seed}`);
    }
    void isSolid;
});
for (const size of [15, 21, 31]) {
    test(`tutte le stanze sono raggiungibili (size ${size})`, () => {
        for (const seed of [5, 77]) {
            const d = generateDungeon(size, 6, mulberry32(seed));
            const reachable = reachableFloorCount(d, d.entrance.x, d.entrance.y);
            assert.equal(reachable, floorCount(d), `celle isolate con seed ${seed}`);
        }
    });
}
test("ingresso e uscita sono su pavimento, non sulle mura", () => {
    const d = generateDungeon(19, 4, mulberry32(314));
    assert.equal(d.solid[d.entrance.y * d.size + d.entrance.x], 0);
    assert.equal(d.solid[d.exit.y * d.size + d.exit.x], 0);
});
test("ingresso e uscita sono celle diverse", () => {
    const d = generateDungeon(25, 6, mulberry32(2718));
    assert.notDeepEqual(d.entrance, d.exit);
});
