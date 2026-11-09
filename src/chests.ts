export type ChestKind = "legno" | "oro" | "ornata";

export interface Chest {
  cell: number;
  kind: ChestKind;
  coins: number;
  treasure: string | null;
  opened: boolean;
}

const TREASURES = [
  "Amuleto del Prato",
  "Anello d'ottone",
  "Campanella d'argento",
  "Gemma grezza",
  "Moneta antica",
];

const COIN_RANGE: Record<ChestKind, [number, number]> = {
  legno: [4, 8],
  oro: [10, 16],
  ornata: [16, 24],
};

export function chestCoins(kind: ChestKind, rand: () => number): number {
  const [min, max] = COIN_RANGE[kind];
  return min + Math.floor(rand() * (max - min + 1));
}

export function makeChest(cell: number, kind: ChestKind, rand: () => number): Chest {
  const coins = chestCoins(kind, rand);
  const treasure =
    kind === "legno"
      ? null
      : TREASURES[Math.floor(rand() * TREASURES.length)];
  return { cell, kind, coins, treasure, opened: false };
}

export function placeChests(
  freeCells: number[],
  entrance: number,
  exit: number,
  count: number,
  rand: () => number
): Chest[] {
  const pool = freeCells.filter((c) => c !== entrance && c !== exit);
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, Math.min(count, shuffled.length));
  return chosen.map((cell) => {
    const r = rand();
    const kind: ChestKind = r < 0.6 ? "legno" : r < 0.85 ? "oro" : "ornata";
    return makeChest(cell, kind, rand);
  });
}

export function openChestAt(state: {
  chests: Chest[];
  lootCoins: number;
  lootTreasures: string[];
  player: number;
}): { chests: Chest[]; lootCoins: number; lootTreasures: string[] } | null {
  const chest = state.chests.find((c) => c.cell === state.player && !c.opened);
  if (!chest) return null;
  const chests = state.chests.map((c) =>
    c.cell === chest.cell ? { ...c, opened: true } : c
  );
  const lootCoins = state.lootCoins + chest.coins;
  const lootTreasures = chest.treasure
    ? [...state.lootTreasures, chest.treasure]
    : state.lootTreasures;
  return { chests, lootCoins, lootTreasures };
}

export function chestCountForCells(cells: number): number {
  return Math.min(8, Math.max(3, Math.round(cells / 45)));
}
