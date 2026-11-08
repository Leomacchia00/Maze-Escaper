import { PlayerState } from "./storage.js";
import { SKILLS, SkillNode, canBuy, skillCost, skillLevel } from "./skills.js";

export type ScreenId = "home" | "run" | "result" | "skills";

export interface ResultInfo {
  won: boolean;
  level: number;
  score: number | null;
  isRecord: boolean;
  nextLevel: number;
}

export interface UIElements {
  screens: Record<ScreenId, HTMLElement>;
  homeLevel: HTMLElement;
  homeStats: HTMLElement;
  homeCurrency: HTMLElement;
  skillsList: HTMLElement;
  skillsCurrency: HTMLElement;
  btnBackSkills: HTMLButtonElement;
  hudTime: HTMLElement;
  hudLevel: HTMLElement;
  pauseOverlay: HTMLElement;
  resultTitle: HTMLElement;
  resultScore: HTMLElement;
  resultRecord: HTMLElement;
  resultMaze: HTMLCanvasElement;
  btnPlay: HTMLButtonElement;
  btnSkills: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnRetry: HTMLButtonElement;
  btnResultMenu: HTMLButtonElement;
}

export function queryUI(root: Document = document): UIElements {
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
    btnBackSkills: requireEl(root, "btn-back-skills") as HTMLButtonElement,
    btnSkills: requireEl(root, "btn-skills") as HTMLButtonElement,
    hudTime: requireEl(root, "hud-time"),
    hudLevel: requireEl(root, "hud-level"),
    pauseOverlay: requireEl(root, "pause-overlay"),
    resultTitle: requireEl(root, "result-title"),
    resultScore: requireEl(root, "result-score"),
    resultRecord: requireEl(root, "result-record"),
    resultMaze: requireEl(root, "result-maze") as HTMLCanvasElement,
    btnPlay: requireEl(root, "btn-play") as HTMLButtonElement,
    btnPause: requireEl(root, "btn-pause") as HTMLButtonElement,
    btnRetry: requireEl(root, "btn-retry") as HTMLButtonElement,
    btnResultMenu: requireEl(root, "btn-result-menu") as HTMLButtonElement,
  };
}

function requireEl(root: Document, id: string): HTMLElement {
  const el = root.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
}

export function showScreen(ui: UIElements, id: ScreenId): void {
  for (const key of Object.keys(ui.screens) as ScreenId[]) {
    ui.screens[key].hidden = key !== id;
  }
}

export function renderHome(ui: UIElements, player: PlayerState): void {
  ui.homeLevel.textContent = String(player.level);
  ui.homeStats.textContent = formatStats(player);
  ui.homeCurrency.textContent = `Monete: ${player.currency}`;
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

  const title = createElement("h2");
  title.textContent = `${node.name} — livello ${level}/${node.maxLevel}`;
  const desc = createElement("p");
  desc.textContent = node.description;
  card.append(title, desc);

  if (cost === null) {
    const max = createElement("p");
    max.textContent = "Livello massimo raggiunto";
    card.append(max);
  } else {
    const btn = createElement("button") as HTMLButtonElement;
    btn.textContent = `Migliora — ${cost} monete`;
    btn.disabled = !buyable;
    btn.addEventListener("click", () => onBuy(node.id));
    card.append(btn);
  }
  return card;
}

export function formatStats(player: PlayerState): string {
  const s = player.stats;
  return `Giocate: ${s.played} · Vinte: ${s.won} · Perse: ${s.lost}`;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  const tenths = Math.floor((s - whole) * 10);
  return `${whole}.${tenths}s`;
}

export function renderHud(ui: UIElements, level: number, timeLeft: number): void {
  ui.hudLevel.textContent = `Livello ${level}`;
  ui.hudTime.textContent = formatTime(timeLeft);
}

export function setPauseOverlay(ui: UIElements, paused: boolean): void {
  ui.pauseOverlay.hidden = !paused;
}

export function renderResult(ui: UIElements, info: ResultInfo): void {
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
