import { SKILLS, canBuy, skillCost, skillLevel } from "./skills.js";
export function queryUI(root = document) {
    return {
        screens: {
            home: requireEl(root, "screen-home"),
            run: requireEl(root, "screen-run"),
            result: requireEl(root, "screen-result"),
            skills: requireEl(root, "screen-skills"),
            settings: requireEl(root, "screen-settings"),
        },
        homeLevel: requireEl(root, "home-level"),
        homeCurrency: requireEl(root, "home-currency"),
        statRuns: requireEl(root, "stat-runs"),
        statWins: requireEl(root, "stat-wins"),
        statLosses: requireEl(root, "stat-losses"),
        skillsList: requireEl(root, "skills-list"),
        skillsCurrency: requireEl(root, "skills-currency"),
        btnBackSkills: requireEl(root, "btn-back-skills"),
        btnSkills: requireEl(root, "btn-skills"),
        btnSettings: requireEl(root, "btn-settings"),
        hudTime: requireEl(root, "hud-time"),
        hudLevel: requireEl(root, "hud-level"),
        pauseOverlay: requireEl(root, "pause-overlay"),
        resultTitle: requireEl(root, "result-title"),
        resultScoreValue: requireEl(root, "result-score-value"),
        resultBreakdown: requireEl(root, "result-breakdown"),
        breakdownTime: requireEl(root, "breakdown-time"),
        breakdownSize: requireEl(root, "breakdown-size"),
        breakdownEfficiency: requireEl(root, "breakdown-efficiency"),
        resultRecord: requireEl(root, "result-record"),
        resultLoot: requireEl(root, "result-loot"),
        resultLootChests: requireEl(root, "loot-chests"),
        resultLootCoins: requireEl(root, "loot-coins"),
        resultLootTreasures: requireEl(root, "loot-treasures"),
        resultMaze: requireEl(root, "result-maze"),
        btnPlay: requireEl(root, "btn-play"),
        btnPause: requireEl(root, "btn-pause"),
        btnRetry: requireEl(root, "btn-retry"),
        btnResultMenu: requireEl(root, "btn-result-menu"),
        btnBackRun: requireEl(root, "btn-back-run"),
        btnBackResult: requireEl(root, "btn-back-result"),
        btnBackSettings: requireEl(root, "btn-back-settings"),
        btnResume: requireEl(root, "btn-resume"),
        btnRestartRun: requireEl(root, "btn-restart-run"),
        btnQuitRun: requireEl(root, "btn-quit-run"),
        btnNextLevel: requireEl(root, "btn-next-level"),
        settingVibration: requireEl(root, "setting-vibration"),
        btnResetProgress: requireEl(root, "btn-reset-progress"),
    };
}
function requireEl(root, id) {
    const el = root.getElementById(id);
    if (!el)
        throw new Error(`missing element #${id}`);
    return el;
}
const SCREEN_TITLES = {
    home: "Menu",
    skills: "Skill",
    settings: "Impostazioni",
    run: "Partita",
    result: "Risultato",
};
export function showScreen(ui, id) {
    for (const key of Object.keys(ui.screens)) {
        ui.screens[key].hidden = key !== id;
    }
    const doc = ui.screens[id].ownerDocument;
    if (doc) {
        doc.title = `Maze Escaper — ${SCREEN_TITLES[id]}`;
    }
    const heading = ui.screens[id].querySelector("h1");
    heading?.focus({ preventScroll: true });
}
export function renderHome(ui, player) {
    ui.homeLevel.textContent = String(player.level);
    ui.settingVibration.checked = player.settings.vibration;
    ui.homeCurrency.textContent = String(player.currency);
    ui.statRuns.textContent = String(player.stats.played);
    ui.statWins.textContent = String(player.stats.won);
    ui.statLosses.textContent = String(player.stats.lost);
}
export function formatTime(seconds) {
    const s = Math.max(0, seconds);
    const whole = Math.floor(s);
    const tenths = Math.floor((s - whole) * 10);
    return `${whole}.${tenths}s`;
}
export function renderHud(ui, level, timeLeft, baseTime) {
    ui.hudLevel.textContent = `Livello ${level}`;
    ui.hudTime.textContent = formatTime(timeLeft);
    ui.hudTime.classList.toggle("low", timeLeft < baseTime * 0.25);
}
export function setPauseOverlay(ui, paused) {
    ui.pauseOverlay.hidden = !paused;
}
export function renderResult(ui, info) {
    ui.resultTitle.textContent = info.won ? "Vittoria!" : "Tempo scaduto";
    ui.resultTitle.classList.toggle("win", info.won);
    ui.resultTitle.classList.toggle("loss", !info.won);
    if (info.won && info.breakdown) {
        ui.resultScoreValue.textContent = String(info.breakdown.total);
        ui.resultBreakdown.hidden = false;
        ui.breakdownTime.textContent = `+${info.breakdown.timePoints}`;
        ui.breakdownSize.textContent = `+${info.breakdown.sizePoints}`;
        ui.breakdownEfficiency.textContent = `+${info.breakdown.efficiency}`;
    }
    else {
        ui.resultScoreValue.textContent = "—";
        ui.resultBreakdown.hidden = true;
    }
    if (info.loot) {
        ui.resultLootChests.textContent = String(info.loot.chestsOpened);
        ui.resultLootCoins.textContent = `+${info.loot.coins}`;
        ui.resultLootTreasures.textContent = String(info.loot.treasures);
    }
    if (info.loot) {
        ui.resultLoot.hidden = false;
        ui.resultLootChests.textContent = String(info.loot.chestsOpened);
        ui.resultLootCoins.textContent = `+${info.loot.coins}`;
        ui.resultLootTreasures.textContent = String(info.loot.treasures);
    }
    else {
        ui.resultLoot.hidden = true;
    }
    ui.btnNextLevel.hidden = !info.won;
    ui.btnRetry.classList.toggle("primary", !info.won);
    ui.resultRecord.textContent = info.isRecord
        ? `★ Nuovo record per il livello ${info.level}!`
        : info.won
            ? `Prossimo livello: ${info.nextLevel}`
            : "Il labirinto resta visibile per la revisione del percorso.";
    ui.resultMaze.hidden = info.won;
}
export function renderSettings(ui, player) {
    ui.settingVibration.checked = player.settings.vibration;
}
export function renderSkills(ui, player, onBuy, createElement = (tag) => document.createElement(tag)) {
    ui.skillsCurrency.textContent = `Monete: ${player.currency}`;
    ui.skillsList.replaceChildren();
    for (const node of SKILLS) {
        ui.skillsList.appendChild(skillCard(player, node, onBuy, createElement));
    }
}
function skillCard(player, node, onBuy, createElement) {
    const card = createElement("div");
    card.className = "panel skill-card";
    const level = skillLevel(player.skills, node.id);
    const cost = skillCost(player.skills, node.id);
    const buyable = canBuy(player, node.id);
    const head = createElement("div");
    head.className = "head";
    const title = createElement("h2");
    title.textContent = node.name;
    const dots = createElement("div");
    dots.className = "level-dots";
    for (let i = 0; i < node.maxLevel; i++) {
        const dot = createElement("span");
        dot.className = i < level ? "dot on" : "dot";
        dots.append(dot);
    }
    head.append(title, dots);
    const desc = createElement("p");
    desc.className = "desc";
    desc.textContent = node.description;
    card.append(head, desc);
    if (cost === null) {
        const maxed = createElement("p");
        maxed.className = "maxed";
        maxed.textContent = "✔ Livello massimo";
        card.append(maxed);
    }
    else {
        const btn = createElement("button");
        btn.textContent = `Migliora — ${cost} monete`;
        btn.disabled = !buyable;
        btn.addEventListener("click", () => onBuy(node.id));
        card.append(btn);
    }
    return card;
}
