import { createRun, movePlayer, tick, pickupChests } from "./game.js";
import { drawRun } from "./render.js";
import { queryUI } from "./ui.js";
const SAVE_KEY = "maze-escaper:v2";
function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw)
            return JSON.parse(raw);
    }
    catch { /* ignore */ }
    return { level: 1, bestAir: 0 };
}
function persist(data) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }
    catch { /* ignore */ }
}
class App {
    constructor(doc) {
        this.run = null;
        this.keys = new Set();
        this.raf = 0;
        this.lastTs = null;
        this.loop = (ts) => {
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
        this.ui = queryUI(doc);
        this.save = loadSave();
        document.getElementById("btn-play")?.addEventListener("click", () => this.start());
        document.getElementById("btn-menu")?.addEventListener("click", () => this.showHome());
        document.getElementById("btn-retry")?.addEventListener("click", () => this.start());
        this.showHome();
    }
    start() {
        this.run = createRun(this.save.level);
        this.ui.screens.run.hidden = false;
        this.ui.screens.result.hidden = true;
        this.ui.screens.home.hidden = true;
        this.loop(performance.now());
    }
    showHome() {
        this.ui.screens.home.hidden = false;
        this.ui.screens.run.hidden = true;
        this.ui.screens.result.hidden = true;
    }
    render() {
        if (!this.run)
            return;
        const canvas = document.getElementById("maze-canvas");
        drawRun(canvas, this.run, { revealAll: true, fogRadius: 3 });
        this.ui.hudAir.textContent = this.run.air.toFixed(1);
        this.ui.hudLevel.textContent = String(this.run.level);
        this.ui.hudCoins.textContent = String(this.run.lootCoins);
    }
}
const app = new App(document);
export { app };
