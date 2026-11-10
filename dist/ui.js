export function queryUI(doc) {
    const q = (id) => {
        const el = doc.getElementById(id);
        if (!el)
            throw new Error(`missing #${id}`);
        return el;
    };
    return {
        screens: {
            home: q("screen-home"),
            run: q("screen-run"),
            result: q("screen-result"),
            skills: q("screen-skills"),
        },
        skillsCoins: q("skills-coins"),
        skillTree: q("skill-tree"),
        hudLevel: q("hud-level"),
        hudAir: q("hud-air"),
        hudAirFill: q("hud-air-fill"),
        hudCoins: q("hud-coins"),
        hudBiome: q("hud-biome"),
        btnPause: q("btn-pause"),
        pauseOverlay: q("pause-overlay"),
        btnResume: q("btn-resume"),
        btnAbandon: q("btn-abandon"),
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
