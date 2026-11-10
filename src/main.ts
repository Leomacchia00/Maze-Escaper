import { RunState, createRun, movePlayer, tick, pickupChests } from "./game.js";
import { drawRun } from "./render.js";
import { queryUI, UIRefs } from "./ui.js";

const SAVE_KEY = "maze-escaper:v2";

interface SaveData {
  level: number;
  bestAir: number;
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw) as SaveData;
  } catch { /* ignore */ }
  return { level: 1, bestAir: 0 };
}

function persist(data: SaveData): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

class App {
  private ui: UIRefs;
  private run: RunState | null = null;
  private save: SaveData;
  private keys = new Set<string>();
  private raf = 0;
  private lastTs: number | null = null;

  constructor(doc: Document) {
    this.ui = queryUI(doc);
    this.save = loadSave();
    document.getElementById("btn-play")?.addEventListener("click", () => this.start());
    document.getElementById("btn-menu")?.addEventListener("click", () => this.showHome());
    document.getElementById("btn-retry")?.addEventListener("click", () => this.start());
    this.showHome();
  }

  private start(): void {
    this.run = createRun(this.save.level);
    this.ui.screens.run.hidden = false;
    this.ui.screens.result.hidden = true;
    this.ui.screens.home.hidden = true;
    this.loop(performance.now());
  }

  private showHome(): void {
    this.ui.screens.home.hidden = false;
    this.ui.screens.run.hidden = true;
    this.ui.screens.result.hidden = true;
  }

  private loop = (ts: number): void => {
    const dt = this.lastTs !== null ? (ts - this.lastTs) / 1000 : 0;
    this.lastTs = ts;
    if (this.run) {
      const ix = (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) - (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0);
      const iy = (this.keys.has("arrowdown") || this.keys.has("s") ? 1 : 0) - (this.keys.has("arrowup") || this.keys.has("w") ? 1 : 0);
      this.run = movePlayer(this.run, ix, iy, dt);
      this.run = tick(this.run, dt);
      this.run = pickupChests(this.run);
      this.render();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private render(): void {
    if (!this.run) return;
    const canvas = document.getElementById("maze-canvas") as HTMLCanvasElement;
    drawRun(canvas, this.run, { revealAll: true, fogRadius: 3 });
    this.ui.hudAir.textContent = this.run.air.toFixed(1);
    this.ui.hudLevel.textContent = String(this.run.level);
    this.ui.hudCoins.textContent = String(this.run.lootCoins);
  }
}

const app = new App(document);
export { app };
