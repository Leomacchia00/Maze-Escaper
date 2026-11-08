import { SKILLS, canBuy, skillCost, skillLevel } from "./skills.js";
export function queryUI(root = document) {
    return {
        screens: {
            home: requireEl(root, "screen-home"),
            run: requireEl(root, "screen-run"),
            result: requireEl(root, "screen-result"),
            skills: requireEl(root, "screen-skills"),
        },
        homeLevel: requireEl(root, "home-level"),
        homeStats: requireEl(root, "home-stats"),
        homeCurrency: requireEl(root, "home-currency"),
        skillsList: requireEl(root, "skills-list"),
        skillsCurrency: requireEl(root, "skills-currency"),
        btnBackSkills: requireEl(root, "btn-back-skills"),
        btnSkills: requireEl(root, "btn-skills"),
        hudTime: requireEl(root, "hud-time"),
        hudLevel: requireEl(root, "hud-level"),
        pauseOverlay: requireEl(root, "pause-overlay"),
        resultTitle: requireEl(root, "result-title"),
        resultScore: requireEl(root, "result-score"),
        resultRecord: requireEl(root, "result-record"),
        resultMaze: requireEl(root, "result-maze"),
        btnPlay: requireEl(root, "btn-play"),
        btnPause: requireEl(root, "btn-pause"),
        btnRetry: requireEl(root, "btn-retry"),
        btnResultMenu: requireEl(root, "btn-result-menu"),
    };
}
function requireEl(root, id) {
    const el = root.getElementById(id);
    if (!el)
        throw new Error(`missing element #${id}`);
    return el;
}
export function showScreen(ui, id) {
    for (const key of Object.keys(ui.screens)) {
        ui.screens[key].hidden = key !== id;
    }
}
export function renderHome(ui, player) {
    ui.homeLevel.textContent = String(player.level);
    ui.homeStats.textContent = formatStats(player);
    ui.homeCurrency.textContent = `Monete: ${player.currency}`;
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
    const title = createElement("h2");
    title.textContent = `${node.name} — livello ${level}/${node.maxLevel}`;
    const desc = createElement("p");
    desc.textContent = node.description;
    card.append(title, desc);
    if (cost === null) {
        const max = createElement("p");
        max.textContent = "Livello massimo raggiunto";
        card.append(max);
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
export function formatStats(player) {
    const s = player.stats;
    return `Giocate: ${s.played} · Vinte: ${s.won} · Perse: ${s.lost}`;
}
export function formatTime(seconds) {
    const s = Math.max(0, seconds);
    const whole = Math.floor(s);
    const tenths = Math.floor((s - whole) * 10);
    return `${whole}.${tenths}s`;
}
export function renderHud(ui, level, timeLeft) {
    ui.hudLevel.textContent = `Livello ${level}`;
    ui.hudTime.textContent = formatTime(timeLeft);
}
export function setPauseOverlay(ui, paused) {
    ui.pauseOverlay.hidden = !paused;
}
export function renderResult(ui, info) {
    ui.resultTitle.textContent = info.won ? "Vittoria!" : "Tempo scaduto";
    ui.resultScore.textContent =
        info.won && info.score !== null ? `Punteggio: ${info.score}` : "Nessun punteggio";
    ui.resultRecord.textContent = info.isRecord
        ? `Nuovo record per il livello ${info.level}!`
        : info.won
            ? `Prossimo livello: ${info.nextLevel}`
            : `Il labirinto resta visibile per la revisione del percorso.`;
    ui.resultMaze.hidden = info.won;
}
