export interface UIRefs {
  screens: { home: HTMLElement; run: HTMLElement; result: HTMLElement };
  hudLevel: HTMLElement;
  hudAir: HTMLElement;
  hudAirFill: HTMLElement;
  hudCoins: HTMLElement;
  hudBiome: HTMLElement;
  homeLevel: HTMLElement;
  homeCoins: HTMLElement;
  homeBest: HTMLElement;
  resultTitle: HTMLElement;
  lootPanel: HTMLElement;
  lootChests: HTMLElement;
  lootTreasures: HTMLElement;
  lootCoins: HTMLElement;
  lootDonations: HTMLElement;
}

export function queryUI(doc: Document): UIRefs {
  const q = (id: string): HTMLElement => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`missing #${id}`);
    return el;
  };
  return {
    screens: {
      home: q("screen-home"),
      run: q("screen-run"),
      result: q("screen-result"),
    },
    hudLevel: q("hud-level"),
    hudAir: q("hud-air"),
    hudAirFill: q("hud-air-fill"),
    hudCoins: q("hud-coins"),
    hudBiome: q("hud-biome"),
    homeLevel: q("home-level"),
    homeCoins: q("home-coins"),
    homeBest: q("home-best"),
    resultTitle: q("result-title"),
    lootPanel: q("loot-panel"),
    lootChests: q("loot-chests"),
    lootTreasures: q("loot-treasures"),
    lootCoins: q("loot-coins"),
    lootDonations: q("loot-donations"),
  };
}
