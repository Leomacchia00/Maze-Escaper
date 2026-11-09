import { PlayerState } from "./storage.js";
import { SKILLS, SkillNode, canBuy, skillCost, skillLevel } from "./skills.js";
import { ScoreBreakdown } from "./game.js";

export type ScreenId = "home" | "run" | "result" | "skills" | "settings";

export interface ResultInfo {
  won: boolean;
  level: number;
  breakdown: ScoreBreakdown | null;
  isRecord: boolean;
  nextLevel: number;
}

export interface UIElements {
  screens: Record<ScreenId, HTMLElement>;
  homeLevel: HTMLElement;
  homeCurrency: HTMLElement;
  statRuns: HTMLElement;
  statWins: HTMLElement;
  statLosses: HTMLElement;
  skillsList: HTMLElement;
  skillsCurrency: HTMLElement;
  btnBackSkills: HTMLButtonElement;
  btnSkills: HTMLButtonElement;
  btnSettings: HTMLButtonElement;
  hudTime: HTMLElement;
  hudLevel: HTMLElement;
  pauseOverlay: HTMLElement;
  resultTitle: HTMLElement;
  resultScoreValue: HTMLElement;
  resultBreakdown: HTMLElement;
  breakdownTime: HTMLElement;
  breakdownSize: HTMLElement;
  breakdownEfficiency: HTMLElement;
  resultRecord: HTMLElement;
  resultMaze: HTMLCanvasElement;
  btnPlay: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnRetry: HTMLButtonElement;
  btnResultMenu: HTMLButtonElement;
  btnBackRun: HTMLButtonElement;
  btnBackResult: HTMLButtonElement;
  btnBackSettings: HTMLButtonElement;
  btnResume: HTMLButtonElement;
  btnRestartRun: HTMLButtonElement;
  btnQuitRun: HTMLButtonElement;
  btnNextLevel: HTMLButtonElement;
  settingVibration: HTMLInputElement;
  btnResetProgress: HTMLButtonElement;
}

export function queryUI(root: Document = document): UIElements {
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
    btnBackSkills: requireEl(root, "btn-back-skills") as HTMLButtonElement,
    btnSkills: requireEl(root, "btn-skills") as HTMLButtonElement,
    btnSettings: requireEl(root, "btn-settings") as HTMLButtonElement,
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
    resultMaze: requireEl(root, "result-maze") as HTMLCanvasElement,
    btnPlay: requireEl(root, "btn-play") as HTMLButtonElement,
    btnPause: requireEl(root, "btn-pause") as HTMLButtonElement,
    btnRetry: requireEl(root, "btn-retry") as HTMLButtonElement,
    btnResultMenu: requireEl(root, "btn-result-menu") as HTMLButtonElement,
    btnBackRun: requireEl(root, "btn-back-run") as HTMLButtonElement,
    btnBackResult: requireEl(root, "btn-back-result") as HTMLButtonElement,
    btnBackSettings: requireEl(root, "btn-back-settings") as HTMLButtonElement,
    btnResume: requireEl(root, "btn-resume") as HTMLButtonElement,
    btnRestartRun: requireEl(root, "btn-restart-run") as HTMLButtonElement,
    btnQuitRun: requireEl(root, "btn-quit-run") as HTMLButtonElement,
    btnNextLevel: requireEl(root, "btn-next-level") as HTMLButtonElement,
    settingVibration: requireEl(root, "setting-vibration") as HTMLInputElement,
    btnResetProgress: requireEl(root, "btn-reset-progress") as HTMLButtonElement,
  };
}

function requireEl(root: Document, id: string): HTMLElement {
  const el = root.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
}

const SCREEN_TITLES: Record<ScreenId, string> = {
  home: "Menu",
  skills: "Skill",
  settings: "Impostazioni",
  run: "Partita",
  result: "Risultato",
};

export function showScreen(ui: UIElements, id: ScreenId): void {
  for (const key of Object.keys(ui.screens) as ScreenId[]) {
    ui.screens[key].hidden = key !== id;
  }
  const doc = ui.screens[id].ownerDocument as Document | undefined;
  if (doc) {
    doc.title = `Maze Escaper — ${SCREEN_TITLES[id]}`;
  }
  const heading = ui.screens[id].querySelector<HTMLElement>("h1");
  heading?.focus({ preventScroll: true });
}

export function renderHome(ui: UIElements, player: PlayerState): void {
  ui.homeLevel.textContent = String(player.level);
  ui.settingVibration.checked = player.settings.vibration;
  ui.homeCurrency.textContent = String(player.currency);
  ui.statRuns.textContent = String(player.stats.played);
  ui.statWins.textContent = String(player.stats.won);
  ui.statLosses.textContent = String(player.stats.lost);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  const tenths = Math.floor((s - whole) * 10);
  return `${whole}.${tenths}s`;
}

export function renderHud(ui: UIElements, level: number, timeLeft: number, baseTime: number): void {
  ui.hudLevel.textContent = `Livello ${level}`;
  ui.hudTime.textContent = formatTime(timeLeft);
  ui.hudTime.classList.toggle("low", timeLeft < baseTime * 0.25);
}

export function setPauseOverlay(ui: UIElements, paused: boolean): void {
  ui.pauseOverlay.hidden = !paused;
}

export function renderResult(ui: UIElements, info: ResultInfo): void {
  ui.resultTitle.textContent = info.won ? "Vittoria!" : "Tempo scaduto";
  ui.resultTitle.classList.toggle("win", info.won);
  ui.resultTitle.classList.toggle("loss", !info.won);

  if (info.won && info.breakdown) {
    ui.resultScoreValue.textContent = String(info.breakdown.total);
    ui.resultBreakdown.hidden = false;
    ui.breakdownTime.textContent = `+${info.breakdown.timePoints}`;
    ui.breakdownSize.textContent = `+${info.breakdown.sizePoints}`;
    ui.breakdownEfficiency.textContent = `+${info.breakdown.efficiency}`;
  } else {
    ui.resultScoreValue.textContent = "—";
    ui.resultBreakdown.hidden = true;
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

export function renderSettings(ui: UIElements, player: PlayerState): void {
  ui.settingVibration.checked = player.settings.vibration;
}

export function renderSkills(
  ui: UIElements,
  player: PlayerState,
  onBuy: (id: string) => void,
  createElement: (tag: string) => HTMLElement = (tag) => document.createElement(tag)
): void {
  ui.skillsCurrency.textContent = `Monete: ${player.currency}`;
  ui.skillsList.replaceChildren();
  for (const node of SKILLS) {
    ui.skillsList.appendChild(skillCard(player, node, onBuy, createElement));
  }
}

function skillCard(
  player: PlayerState,
  node: SkillNode,
  onBuy: (id: string) => void,
  createElement: (tag: string) => HTMLElement
): HTMLElement {
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
  } else {
    const btn = createElement("button") as HTMLButtonElement;
    btn.textContent = `Migliora — ${cost} monete`;
    btn.disabled = !buyable;
    btn.addEventListener("click", () => onBuy(node.id));
    card.append(btn);
  }
  return card;
}
