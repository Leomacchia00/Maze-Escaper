import { RunState, createRun, movePlayer, tick, pickupChests, payout } from "./game.js";
import { drawRun, Fx, Popup } from "./render.js";
import { biomeForLevel } from "./render.js";
import { queryUI, UIRefs } from "./ui.js";
import { SKILL_TREE, SkillId, Owned, canBuy, buySkill, skillEffects } from "./skills.js";

const SAVE_KEY = "maze-escaper:v4";
const OLD_KEY = "maze-escaper:v3";
const SAVE_VERSION = 4;

interface SaveData {
  version: number;
  level: number;
  coins: number;
  bestAir: number;
  donations: string[];
  skills: Owned;
}

function loadSave(): SaveData {
  const fallback: SaveData = { version: SAVE_VERSION, level: 1, coins: 0, bestAir: 0, donations: [], skills: {} };
  try {
    for (const key of [SAVE_KEY, OLD_KEY]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as Partial<SaveData>;
      if (typeof data.level !== "number") continue;
      if (data.version !== 3 && data.version !== SAVE_VERSION) continue;
      return {
        version: SAVE_VERSION,
        level: data.level,
        coins: typeof data.coins === "number" ? data.coins : 0,
        bestAir: typeof data.bestAir === "number" ? data.bestAir : 0,
        donations: Array.isArray(data.donations) ? data.donations : [],
        skills: data.skills && typeof data.skills === "object" ? (data.skills as Owned) : {},
      };
    }
  } catch {
    /* save corrotto: riparti da zero */
  }
  return fallback;
}

function persist(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage pieno o bloccato: il gioco continua senza salvataggio */
  }
}

class App {
  private ui: UIRefs;
  private save: SaveData;
  private run: RunState | null = null;
  private keys = new Set<string>();
  private joyStart: { x: number; y: number } | null = null;
  private joyVec: { x: number; y: number } = { x: 0, y: 0 };
  private fx: Fx = { shake: 0, popups: [] };
  private raf = 0;
  private lastTs: number | null = null;
  private ended = false;
  private paused = false;
  private lastHud = { air: -1, coins: -1 };

  constructor(doc: Document) {
    this.ui = queryUI(doc);
    this.save = loadSave();
    doc.getElementById("btn-play")?.addEventListener("click", () => this.start());
    doc.getElementById("btn-menu")?.addEventListener("click", () => this.showHome());
    doc.getElementById("btn-skills")?.addEventListener("click", () => this.showSkills());
    doc.getElementById("btn-skills-back")?.addEventListener("click", () => this.showHome());
    this.ui.skillTree.addEventListener("click", (e) => this.onTreeClick(e));
    doc.getElementById("btn-retry")?.addEventListener("click", () => this.start());
    doc.getElementById("btn-pause")?.addEventListener("click", () => this.togglePause());
    doc.getElementById("btn-resume")?.addEventListener("click", () => this.resume());
    doc.getElementById("btn-abandon")?.addEventListener("click", () => this.abandonRun());
    doc.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "escape" && this.run && !this.ended) {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      }
    });
    doc.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    const canvas = doc.getElementById("maze-canvas");
    if (canvas) {
      canvas.addEventListener("pointerdown", (e) => {
        this.joyStart = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!this.joyStart) return;
        const dx = e.clientX - this.joyStart.x;
        const dy = e.clientY - this.joyStart.y;
        const dead = 12;
        const max = 48;
        const len = Math.hypot(dx, dy);
        if (len < dead) {
          this.joyVec = { x: 0, y: 0 };
        } else {
          const clamped = Math.min(len, max);
          this.joyVec = { x: (dx / len) * (clamped / max), y: (dy / len) * (clamped / max) };
        }
      });
      const release = (): void => {
        this.joyStart = null;
        this.joyVec = { x: 0, y: 0 };
      };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
    }
    this.refreshHome();
    this.showHome();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  private showSkills(): void {
    this.renderSkillTree();
    this.ui.screens.home.hidden = true;
    this.ui.screens.run.hidden = true;
    this.ui.screens.result.hidden = true;
    this.ui.screens.skills.hidden = false;
  }

  private onTreeClick(e: Event): void {
    const target = (e.target as HTMLElement).closest("[data-skill]");
    if (!target) return;
    const id = target.getAttribute("data-skill") as SkillId;
    const res = buySkill(this.save.skills, id, this.save.coins);
    if (!res) return;
    this.save.skills = res.owned;
    this.save.coins = res.coins;
    persist(this.save);
    this.renderSkillTree();
  }

  private renderSkillTree(): void {
    this.ui.skillsCoins.textContent = String(this.save.coins);
    this.ui.skillTree.innerHTML = "";
    const branches: Array<{ key: string; label: string }> = [
      { key: "aria", label: "🌬️ Aria" },
      { key: "passo", label: "👟 Passo" },
      { key: "fortuna", label: "🍀 Fortuna" },
    ];
    for (const br of branches) {
      const col = document.createElement("div");
      col.className = "skill-col";
      const head = document.createElement("div");
      head.className = "skill-col-head";
      head.textContent = br.label;
      col.appendChild(head);
      for (const node of SKILL_TREE.filter((n) => n.branch === br.key)) {
        const state = canBuy(node, this.save.skills, this.save.coins);
        const el = document.createElement("button");
        el.className = "skill-node " + (state === "owned" ? "owned" : state === "locked" ? "locked" : state === "poor" ? "poor" : "available");
        el.setAttribute("data-skill", node.id);
        el.disabled = state === "locked" || state === "owned" || state === "poor";
        const fx = skillEffects(this.save.skills);
        el.innerHTML = `<span class="skill-emoji">${node.emoji}</span><span class="skill-name">${node.name}</span><span class="skill-desc">${node.desc}</span><span class="skill-cost">${state === "owned" ? "✔ Acquistata" : "🔒 " + node.cost + " 💰"}</span>`;
        void fx;
        col.appendChild(el);
      }
      this.ui.skillTree.appendChild(col);
    }
  }

  private refreshHome(): void {
    this.ui.homeLevel.textContent = String(this.save.level);
    this.ui.homeCoins.textContent = String(this.save.coins);
    this.ui.homeBest.textContent = this.save.bestAir > 0 ? `${this.save.bestAir}s` : "—";
  }

  private start(): void {
    this.run = createRun(this.save.level, (Date.now() ^ performance.now()) >>> 0, this.save.skills);
    this.fx = { shake: 0, popups: [] };
    this.ended = false;
    this.paused = false;
    this.ui.pauseOverlay.hidden = true;
    this.lastHud = { air: -1, coins: -1 };
    this.lastTs = null;
    this.ui.screens.home.hidden = true;
    this.ui.screens.result.hidden = true;
    this.ui.screens.run.hidden = false;
    this.ui.hudBiome.textContent = biomeForLevel(this.run.level).name;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  private togglePause(): void {
    if (!this.run || this.ended) return;
    this.paused = !this.paused;
    this.ui.pauseOverlay.hidden = !this.paused;
    this.lastTs = null;
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.ui.pauseOverlay.hidden = true;
    this.lastTs = null;
  }

  private abandonRun(): void {
    this.paused = false;
    this.ui.pauseOverlay.hidden = true;
    this.showHome();
  }

  private showHome(): void {
    this.refreshHome();
    this.ui.screens.home.hidden = false;
    this.ui.screens.run.hidden = true;
    this.ui.screens.result.hidden = true;
    this.ui.screens.skills.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  private loop = (ts: number): void => {
    const dt = this.lastTs !== null ? Math.min((ts - this.lastTs) / 1000, 0.05) : 0;
    this.lastTs = ts;
    if (this.run && !this.paused) {
      const kx =
        (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) -
        (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0);
      const ky =
        (this.keys.has("arrowdown") || this.keys.has("s") ? 1 : 0) -
        (this.keys.has("arrowup") || this.keys.has("w") ? 1 : 0);
      const ix = kx !== 0 ? kx : this.joyVec.x;
      const iy = ky !== 0 ? ky : this.joyVec.y;
      const before = this.run.chestOpenCount;
      const coinsBefore = this.run.coins;
      this.run = movePlayer(this.run, ix, iy, dt);
      this.run = tick(this.run, dt);
      this.run = pickupChests(this.run);
      if (this.run.chestOpenCount > before) {
        const chest = this.run.chests.find((c) => c.opened && c.id === before);
        if (chest) {
          const gained = this.run.coins - coinsBefore;
          const popup: Popup = { x: chest.x, y: chest.y, text: `+${gained}💰`, age: 0 };
          this.fx.popups.push(popup);
        }
      }
      this.fx.shake = Math.max(0, this.fx.shake - dt * 1.5);
      for (const p of this.fx.popups) p.age += dt;
      this.fx.popups = this.fx.popups.filter((p) => p.age < 1.2);
      this.render();
      if ((this.run.status === "won" || this.run.status === "lost") && !this.ended) {
        this.ended = true;
        if (this.run.status === "lost") this.fx.shake = 1;
        this.endRun();
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private endRun(): void {
    if (!this.run) return;
    const won = this.run.status === "won";
    const got = payout(this.run);
    this.save.coins += got.coins;
    if (won) this.save.level += 1;
    if (this.run.air > this.save.bestAir) this.save.bestAir = Math.round(this.run.air * 10) / 10;
    for (const d of got.donations) {
      if (!this.save.donations.includes(d)) this.save.donations.push(d);
    }
    persist(this.save);
    window.setTimeout(() => {
      this.ui.resultTitle.textContent = won ? "🎉 Sei fuggito!" : "💨 Aria finita…";
      this.ui.lootChests.textContent = String(this.run ? this.run.chestOpenCount : 0);
      this.ui.lootTreasures.textContent = got.treasures.join(", ") || "—";
      this.ui.lootCoins.textContent = `${got.coins} (raccatti ${this.run ? this.run.coins : 0})`;
      this.ui.lootDonations.textContent = got.donations.join(", ") || "—";
      this.ui.screens.run.hidden = true;
      this.ui.screens.result.hidden = false;
    }, won ? 600 : 900);
  }

  private render(): void {
    if (!this.run) return;
    const canvas = document.getElementById("maze-canvas") as HTMLCanvasElement | null;
    if (canvas) drawRun(canvas, this.run, this.fx);
    const airRounded = Math.ceil(this.run.air);
    if (airRounded !== this.lastHud.air) {
      this.lastHud.air = airRounded;
      this.ui.hudAir.textContent = String(airRounded);
      const pct = Math.max(0, Math.min(100, (this.run.air / this.run.baseAir) * 100));
      this.ui.hudAirFill.style.width = `${pct}%`;
      this.ui.hudAirFill.style.background =
        pct > 50 ? "#7ed957" : pct > 25 ? "#ffc93c" : "#f87171";
    }
    if (this.run.coins !== this.lastHud.coins) {
      this.lastHud.coins = this.run.coins;
      this.ui.hudCoins.textContent = String(this.run.coins);
    }
  }
}

const app = new App(document);
export { app };
