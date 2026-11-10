export interface UIRefs {
  screens: { home: HTMLElement; run: HTMLElement; result: HTMLElement };
  hudAir: HTMLElement;
  hudLevel: HTMLElement;
  hudCoins: HTMLElement;
  lootPanel: HTMLElement;
  lootChests: HTMLElement;
  lootTreasures: HTMLElement;
  lootCoins: HTMLElement;
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
    hudAir: q("hud-air"),
    hudLevel: q("hud-level"),
    hudCoins: q("hud-coins"),
    lootPanel: q("loot-panel"),
    lootChests: q("loot-chests"),
    lootTreasures: q("loot-treasures"),
    lootCoins: q("loot-coins"),
  };
}
