import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultPlayerState, loadPlayerState, savePlayerState, recordRunResult } from "../storage.js";
class MemoryStorage {
    constructor() {
        this.map = new Map();
    }
    getItem(k) { return this.map.get(k) ?? null; }
    setItem(k, v) { this.map.set(k, v); }
    removeItem(k) { this.map.delete(k); }
    clear() { this.map.clear(); }
}
test("livello, record e statistiche sopravvivono a un reload (save + load)", () => {
    const storage = new MemoryStorage();
    let player = loadPlayerState(storage);
    assert.equal(player.level, 1);
    assert.deepEqual(player.stats, { played: 0, won: 0, lost: 0 });
    player = recordRunResult(player, 1, true, 500);
    player = recordRunResult(player, 2, false, null);
    savePlayerState(player, storage);
    const reloaded = loadPlayerState(storage);
    assert.equal(reloaded.level, 2);
    assert.equal(reloaded.bestScores[1], 500);
    assert.deepEqual(reloaded.stats, { played: 2, won: 1, lost: 1 });
});
test("record per livello aggiornato solo se superato", () => {
    const storage = new MemoryStorage();
    let player = loadPlayerState(storage);
    player = recordRunResult(player, 1, true, 300);
    player = recordRunResult(player, 1, true, 250);
    assert.equal(player.bestScores[1], 300);
    player = recordRunResult(player, 1, true, 900);
    assert.equal(player.bestScores[1], 900);
});
test("sconfitta non sblocca livelli né record, ma conta nelle statistiche", () => {
    const player = recordRunResult(defaultPlayerState(), 3, false, null);
    assert.equal(player.level, 1);
    assert.deepEqual(player.bestScores, {});
    assert.deepEqual(player.stats, { played: 1, won: 0, lost: 1 });
});
test("stato player estendibile con campi futuri", () => {
    const storage = new MemoryStorage();
    const extended = { ...defaultPlayerState(), currency: 10, skills: [], charityTokens: 0 };
    savePlayerState(extended, storage);
    const reloaded = loadPlayerState(storage);
    assert.equal(reloaded.currency, 10);
    assert.deepEqual(reloaded.skills, []);
    assert.equal(reloaded.charityTokens, 0);
});
test("senza storage (SSR/node) non lancia e restituisce default", () => {
    const player = loadPlayerState(null);
    assert.deepEqual(player, defaultPlayerState());
    assert.doesNotThrow(() => savePlayerState(player, null));
});
