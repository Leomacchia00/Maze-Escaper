import { randInt, pick } from "./rng.js";
import { isSolid } from "./dungeon.js";
export const TREASURES = [
    "Corona d'argento",
    "Gemma luccicante",
    "Anello antico",
    "Perla della luna",
    "Idolo dorato",
];
export const DONATIONS = [
    "WWF",
    "Medici Senza Frontiere",
    "Save the Children",
    "Tree-Nation",
    "Lega Ambiente",
];
export const COIN_RANGE = {
    legno: [4, 8],
    oro: [10, 16],
    ornata: [16, 24],
};
export function rollChestKind(rng) {
    const roll = rng();
    if (roll < 0.6)
        return "legno";
    if (roll < 0.85)
        return "oro";
    return "ornata";
}
export function makeChest(id, x, y, kind, rng) {
    const [min, max] = COIN_RANGE[kind];
    const treasure = kind === "legno" ? null : pick(rng, TREASURES);
    const donation = kind === "ornata" ? pick(rng, DONATIONS) : null;
    return { id, x, y, kind, coins: randInt(rng, min, max), treasure, donation, opened: false };
}
export function chestCountForLevel(level, roomCount) {
    return Math.min(10, Math.max(3, roomCount + Math.floor(level / 3)));
}
function roomFloorCells(d, r, taken) {
    const cells = [];
    for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
            const key = y * d.size + x;
            if (!isSolid(d, x, y) && !taken.has(key))
                cells.push({ x, y });
        }
    }
    return cells;
}
export function placeChests(d, entrance, exit, count, rng) {
    const taken = new Set();
    taken.add(entrance.y * d.size + entrance.x);
    taken.add(exit.y * d.size + exit.x);
    const chests = [];
    const shuffledRooms = [...d.rooms];
    for (let i = shuffledRooms.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = shuffledRooms[i];
        shuffledRooms[i] = shuffledRooms[j];
        shuffledRooms[j] = tmp;
    }
    for (let round = 0; round < 4 && chests.length < count; round++) {
        for (const r of shuffledRooms) {
            if (chests.length >= count)
                break;
            const cells = roomFloorCells(d, r, taken);
            if (cells.length === 0)
                continue;
            const cell = cells[Math.floor(rng() * cells.length)];
            taken.add(cell.y * d.size + cell.x);
            const kind = rollChestKind(rng);
            chests.push(makeChest(chests.length, cell.x + 0.5, cell.y + 0.5, kind, rng));
        }
    }
    return chests;
}
