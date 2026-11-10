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

function kindForRoll(r: number): ChestKind {
  if (r < 0.6) return "legno";
  if (r < 0.85) return "oro";
  return "ornata";
}

export function makeChest(cell: number, kind: ChestKind, rand: () => number): Chest {
  const [min, max] = COIN_RANGE[kind];
  return {
    cell,
    kind,
    coins: min + Math.floor(rand() * (max - min + 1)),
    treasure: kind === "legno" ? null : TREASURES[Math.floor(rand() * TREASURES.length)],
    opened: false,
  };
}

export function chestCountForCells(cells: number): number {
  return Math.min(8, Math.max(3, Math.round(cells / 45)));
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
  return shuffled.slice(0, Math.min(count, shuffled.length))
    .map((cell) => makeChest(cell, kindForRoll(rand()), rand));
}

export interface ChestPickup {
  chests: Chest[];
  lootCoins: number;
  lootTreasures: string[];
}

export function openChestAt(
  state: { chests: Chest[]; lootCoins: number; lootTreasures: string[]; playerCell: number }
): ChestPickup | null {
  const chest = state.chests.find((c) => c.cell === state.playerCell && !c.opened);
  if (!chest) return null;
  return {
    chests: state.chests.map((c) => (c.cell === chest.cell ? { ...c, opened: true } : c)),
    lootCoins: state.lootCoins + chest.coins,
    lootTreasures: chest.treasure ? [...state.lootTreasures, chest.treasure] : state.lootTreasures,
  };
}
