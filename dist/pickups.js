import { shuffle } from "./rng.js";
import { isSolid } from "./dungeon.js";
export const COIN_VALUE = 1;
export const GEM_VALUE = 5;
export function pickupCountForLevel(level) {
    return Math.min(30, 10 + level * 2);
}
export function pickupValue(kind) {
    return kind === "gem" ? GEM_VALUE : COIN_VALUE;
}
export function placePickups(d, taken, count, rng) {
    const free = [];
    for (let y = 1; y < d.size - 1; y++) {
        for (let x = 1; x < d.size - 1; x++) {
            const key = y * d.size + x;
            if (isSolid(d, x, y) || taken.has(key))
                continue;
            free.push([x, y]);
        }
    }
    shuffle(free, rng);
    const pickups = [];
    for (let i = 0; i < Math.min(count, free.length); i++) {
        const [x, y] = free[i];
        const kind = rng() < 0.25 ? "gem" : "coin";
        pickups.push({ id: i, x: x + 0.5, y: y + 0.5, kind, coins: pickupValue(kind), taken: false });
    }
    return pickups;
}
export function pickupAt(state, pickups) {
    const cx = Math.floor(state.px);
    const cy = Math.floor(state.py);
    return pickups.find((p) => !p.taken && Math.floor(p.x) === cx && Math.floor(p.y) === cy) ?? null;
}
