import { createRun, tick, movePlayer, pause, resume, computeScoreBreakdown, fogRadius } from "./game.js";
import { drawRun } from "./render.js";
import { loadPlayerState, savePlayerState, recordRunResult, defaultPlayerState } from "./storage.js";
import { awardRunCoins, buySkill } from "./skills.js";
import { queryUI, showScreen, renderHome, renderHud, renderSkills, renderSettings, setPauseOverlay, renderResult } from "./ui.js";
class App {
    constructor(document_) {
        this.document_ = document_;
        this.run = null;
        this.lastFrame = null;
        this.rafId = null;
        this.keys = new Set();
        this.joyVec = { x: 0, y: 0 };
        this.joyOrigin = null;
        this.justSetRecord = false;
        this.pauseReturnFocus = null;
        this.bumpCooldown = 0;
        this.ui = queryUI(this.document_);
        this.player = loadPlayerState();
        this.bind();
        this.goHome();
        this.loop = this.loop.bind(this);
        this.rafId = this.document_.defaultView.requestAnimationFrame(this.loop);
    }
    bind() {
        this.ui.btnPlay.addEventListener("click", () => this.startRun(this.player.level));
        this.ui.btnSkills.addEventListener("click", () => this.showSkills());
        this.ui.btnSettings.addEventListener("click", () => this.showSettings());
        this.ui.btnBackSkills.addEventListener("click", () => this.goHome());
        this.ui.btnBackSettings.addEventListener("click", () => this.goHome());
        this.ui.btnBackRun.addEventListener("click", () => this.abandonRun());
        this.ui.btnBackResult.addEventListener("click", () => this.goHome());
        this.ui.btnPause.addEventListener("click", () => this.togglePause());
        this.ui.btnResume.addEventListener("click", () => this.resumeRun());
        this.ui.btnRestartRun.addEventListener("click", () => {
            if (this.run)
                this.startRun(this.run.level);
        });
        this.ui.btnQuitRun.addEventListener("click", () => this.abandonRun());
        this.ui.btnNextLevel.addEventListener("click", () => this.startRun(this.player.level));
        this.ui.settingVibration.addEventListener("change", () => {
            this.player = {
                ...this.player,
                settings: { ...this.player.settings, vibration: this.ui.settingVibration.checked },
            };
            savePlayerState(this.player);
        });
        this.ui.btnResetProgress.addEventListener("click", () => this.resetProgress());
        this.ui.btnRetry.addEventListener("click", () => {
            this.startRun(this.player.level);
        });
        this.ui.btnResultMenu.addEventListener("click", () => this.goHome());
        this.document_.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (this.ui.screens.skills.hidden === false || this.ui.screens.settings.hidden === false) {
                    this.goHome();
                }
                else {
                    this.togglePause();
                }
                return;
            }
            const k = e.key.toLowerCase();
            this.keys.add(k);
        });
        this.document_.addEventListener("keyup", (e) => {
            this.keys.delete(e.key.toLowerCase());
        });
        this.document_.defaultView?.addEventListener("blur", () => this.keys.clear());
        const wrap = this.document_.getElementById("canvas-wrap");
        wrap.addEventListener("touchstart", (e) => {
            const t = e.changedTouches[0];
            this.joyOrigin = { x: t.clientX, y: t.clientY };
            this.joyVec = { x: 0, y: 0 };
        }, { passive: true });
        wrap.addEventListener("touchmove", (e) => {
            if (!this.joyOrigin)
                return;
            e.preventDefault();
            const t = e.changedTouches[0];
            const max = 48;
            let dx = (t.clientX - this.joyOrigin.x) / max;
            let dy = (t.clientY - this.joyOrigin.y) / max;
            const len = Math.hypot(dx, dy);
            if (len > 1) {
                dx /= len;
                dy /= len;
            }
            this.joyVec = { x: dx, y: dy };
        }, { passive: false });
        wrap.addEventListener("touchend", () => {
            this.joyOrigin = null;
            this.joyVec = { x: 0, y: 0 };
        }, { passive: true });
    }
    goHome() {
        this.run = null;
        renderHome(this.ui, this.player);
        showScreen(this.ui, "home");
    }
    showSkills() {
        this.renderSkillsScreen();
        showScreen(this.ui, "skills");
    }
    showSettings() {
        renderSettings(this.ui, this.player);
        showScreen(this.ui, "settings");
    }
    abandonRun() {
        if (this.run && (this.run.status === "running" || this.run.status === "ready")) {
            this.run = pause(this.run);
        }
        this.goHome();
    }
    resetProgress() {
        if (!this.document_.defaultView?.confirm("Azzerare tutti i progressi? Livello, record e statistiche verranno cancellati.")) {
            return;
        }
        this.player = { ...defaultPlayerState(), settings: this.player.settings };
        savePlayerState(this.player);
        renderHome(this.ui, this.player);
        renderSettings(this.ui, this.player);
    }
    renderSkillsScreen() {
        renderSkills(this.ui, this.player, (id) => {
            this.player = buySkill(this.player, id);
            savePlayerState(this.player);
            this.renderSkillsScreen();
        }, (tag) => this.document_.createElement(tag));
    }
    startRun(level) {
        this.run = createRun(level, Math.random, this.player.skills);
        this.justSetRecord = false;
        showScreen(this.ui, "run");
        setPauseOverlay(this.ui, false);
        this.renderCurrent();
    }
    vibrate(pattern) {
        if (this.player.settings?.vibration === false)
            return;
        try {
            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                navigator.vibrate(pattern);
            }
        }
        catch {
            // vibration not available
        }
    }
    togglePause() {
        if (!this.run)
            return;
        if (this.run.status === "paused") {
            this.resumeRun();
        }
        else if (this.run.status === "running" || this.run.status === "ready") {
            const active = this.document_.activeElement;
            this.pauseReturnFocus =
                active && typeof active.focus === "function" ? active : null;
            this.run = pause(this.run);
            setPauseOverlay(this.ui, true);
            this.ui.pauseOverlay.focus({ preventScroll: true });
            this.renderCurrent();
        }
    }
    resumeRun() {
        if (!this.run || this.run.status !== "paused")
            return;
        this.run = resume(this.run);
        setPauseOverlay(this.ui, false);
        this.pauseReturnFocus?.focus({ preventScroll: true });
        this.pauseReturnFocus = null;
        this.renderCurrent();
    }
    finishRun(won) {
        const run = this.run;
        const n = run.maze.n;
        const breakdown = won ? computeScoreBreakdown(run.timeLeft, n, run.visitedCount) : null;
        const score = breakdown ? breakdown.total : null;
        const prevBest = this.player.bestScores[run.level];
        this.justSetRecord = won && score !== null && (prevBest === undefined || score > prevBest);
        this.player = recordRunResult(this.player, run.level, won, score);
        this.player = awardRunCoins(this.player, won, run.level);
        savePlayerState(this.player);
        renderResult(this.ui, {
            won,
            level: run.level,
            breakdown,
            isRecord: this.justSetRecord,
            nextLevel: won ? run.level + 1 : run.level,
        });
        if (!won) {
            drawRun(this.ui.resultMaze, run, { revealAll: true, fogRadius: Infinity });
        }
        showScreen(this.ui, "result");
    }
    renderCurrent() {
        if (!this.run)
            return;
        const canvas = this.document_.getElementById("maze-canvas");
        drawRun(canvas, this.run, {
            revealAll: fogRadius(this.run) === Infinity,
            fogRadius: fogRadius(this.run),
        });
        renderHud(this.ui, this.run.level, this.run.timeLeft, this.run.baseTime);
        const bar = this.document_.getElementById("time-bar-fill");
        if (bar) {
            const frac = Math.max(0, Math.min(1, this.run.timeLeft / this.run.baseTime));
            bar.style.width = `${(frac * 100).toFixed(1)}%`;
            bar.classList.toggle("low", frac < 0.25);
        }
    }
    loop(ts) {
        if (this.lastFrame !== null && this.run) {
            const dt = Math.min((ts - this.lastFrame) / 1000, 0.25);
            const input = this.inputVector();
            const before = { px: this.run.px, py: this.run.py };
            this.run = movePlayer(this.run, input.ix, input.iy, dt);
            if ((input.ix !== 0 || input.iy !== 0) && this.bumpCooldown <= 0) {
                const moved = Math.hypot(this.run.px - before.px, this.run.py - before.py);
                if (moved < 1e-6) {
                    this.bumpCooldown = 0.4;
                    this.vibrate(15);
                    const wrap = this.document_.getElementById("canvas-wrap");
                    if (wrap) {
                        wrap.classList.remove("bump");
                        void wrap.offsetWidth;
                        wrap.classList.add("bump");
                    }
                }
            }
            this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
            this.run = tick(this.run, dt);
            const finished = this.run.status === "won" || this.run.status === "lost";
            if (finished) {
                const won = this.run.status === "won";
                this.finishRun(won);
                this.run = null;
                if (won)
                    this.vibrate([20, 40, 20]);
                else
                    this.vibrate(60);
            }
            this.renderCurrent();
        }
        this.lastFrame = ts;
        this.rafId = this.document_.defaultView.requestAnimationFrame(this.loop);
    }
    inputVector() {
        let ix = 0;
        let iy = 0;
        if (this.keys.has("arrowup") || this.keys.has("w"))
            iy -= 1;
        if (this.keys.has("arrowdown") || this.keys.has("s"))
            iy += 1;
        if (this.keys.has("arrowleft") || this.keys.has("a"))
            ix -= 1;
        if (this.keys.has("arrowright") || this.keys.has("d"))
            ix += 1;
        ix += this.joyVec.x;
        iy += this.joyVec.y;
        const mag = Math.hypot(ix, iy);
        if (mag > 1) {
            ix /= mag;
            iy /= mag;
        }
        return { ix, iy };
    }
}
function boot(doc) {
    return new App(doc);
}
if (typeof document !== "undefined" && document.getElementById("app")) {
    boot(document);
}
export { App, boot };
