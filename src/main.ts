import { RunState, createRun, tick, tryMove, pause, resume, computeScoreBreakdown, fogRadius, Direction, TOP, RIGHT, BOTTOM, LEFT } from "./game.js";
import { drawRun } from "./render.js";
import { loadPlayerState, savePlayerState, recordRunResult, defaultPlayerState, PlayerState } from "./storage.js";
import { awardRunCoins, buySkill } from "./skills.js";
import { ScreenId, UIElements, queryUI, showScreen, renderHome, renderHud, renderSkills, renderSettings, setPauseOverlay, renderResult } from "./ui.js";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: TOP, w: TOP, W: TOP,
  ArrowRight: RIGHT, d: RIGHT, D: RIGHT,
  ArrowDown: BOTTOM, s: BOTTOM, S: BOTTOM,
  ArrowLeft: LEFT, a: LEFT, A: LEFT,
};

class App {
  private ui: UIElements;
  private player: PlayerState;
  private run: RunState | null = null;
  private lastFrame: number | null = null;
  private rafId: number | null = null;
  private touchStart: { x: number; y: number } | null = null;
  private justSetRecord = false;
  private pauseReturnFocus: HTMLElement | null = null;

  constructor(private document_: Document) {
    this.ui = queryUI(this.document_);
    this.player = loadPlayerState();
    this.bind();
    this.goHome();
    this.loop = this.loop.bind(this);
    this.rafId = this.document_.defaultView!.requestAnimationFrame(this.loop);
  }

  private bind(): void {
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
      if (this.run) this.startRun(this.run.level);
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
      if (this.run) this.startRun(this.run.level);
    });
    this.ui.btnResultMenu.addEventListener("click", () => this.goHome());

    this.document_.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.ui.screens.skills.hidden === false || this.ui.screens.settings.hidden === false) {
          this.goHome();
        } else {
          this.togglePause();
        }
        return;
      }
      const dir = KEY_MAP[e.key];
      if (dir && this.run) {
        e.preventDefault();
        this.handleMove(dir);
      }
    });

    const wrap = this.document_.getElementById("canvas-wrap")!;
    wrap.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      this.touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    wrap.addEventListener("touchend", (e) => {
      if (!this.touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStart.x;
      const dy = t.clientY - this.touchStart.y;
      this.touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      const dir: Direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? RIGHT : LEFT
          : dy > 0 ? BOTTOM : TOP;
      this.handleMove(dir);
    }, { passive: true });
  }

  private goHome(): void {
    this.run = null;
    renderHome(this.ui, this.player);
    showScreen(this.ui, "home");
  }

  private showSkills(): void {
    this.renderSkillsScreen();
    showScreen(this.ui, "skills");
  }

  private showSettings(): void {
    renderSettings(this.ui, this.player);
    showScreen(this.ui, "settings");
  }

  private abandonRun(): void {
    if (this.run && (this.run.status === "running" || this.run.status === "ready")) {
      this.run = pause(this.run);
    }
    this.goHome();
  }

  private resetProgress(): void {
    if (!this.document_.defaultView?.confirm("Azzerare tutti i progressi? Livello, record e statistiche verranno cancellati.")) {
      return;
    }
    this.player = { ...defaultPlayerState(), settings: this.player.settings };
    savePlayerState(this.player);
    renderHome(this.ui, this.player);
    renderSettings(this.ui, this.player);
  }

  private renderSkillsScreen(): void {
    renderSkills(
      this.ui,
      this.player,
      (id) => {
        this.player = buySkill(this.player, id);
        savePlayerState(this.player);
        this.renderSkillsScreen();
      },
      (tag) => this.document_.createElement(tag)
    );
  }

  private startRun(level: number): void {
    this.run = createRun(level, Math.random, this.player.skills);
    this.justSetRecord = false;
    showScreen(this.ui, "run");
    setPauseOverlay(this.ui, false);
    this.renderCurrent();
  }

  private handleMove(dir: Direction): void {
    if (!this.run) return;
    if (this.run.status === "paused") return;
    const before = this.run;
    const after = tryMove(before, dir);
    if (after === before) return;
    this.run = after;
    if (after.status === "won") {
      this.vibrate([20, 40, 20]);
      this.finishRun(true);
    } else if (after.status === "lost") {
      this.vibrate(60);
      this.finishRun(false);
    } else {
      this.vibrate(8);
    }
  }

  private vibrate(pattern: number | number[]): void {
    if (this.player.settings?.vibration === false) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    } catch {
      // vibration not available
    }
  }

  private togglePause(): void {
    if (!this.run) return;
    if (this.run.status === "paused") {
      this.resumeRun();
    } else if (this.run.status === "running" || this.run.status === "ready") {
      const active = this.document_.activeElement as { focus?: unknown } | null;
      this.pauseReturnFocus =
        active && typeof active.focus === "function" ? (active as HTMLElement) : null;
      this.run = pause(this.run);
      setPauseOverlay(this.ui, true);
      this.ui.pauseOverlay.focus({ preventScroll: true });
      this.renderCurrent();
    }
  }

  private resumeRun(): void {
    if (!this.run || this.run.status !== "paused") return;
    this.run = resume(this.run);
    setPauseOverlay(this.ui, false);
    this.pauseReturnFocus?.focus({ preventScroll: true });
    this.pauseReturnFocus = null;
    this.renderCurrent();
  }

  private finishRun(won: boolean): void {
    const run = this.run!;
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

  private renderCurrent(): void {
    if (!this.run) return;
    const canvas = this.document_.getElementById("maze-canvas") as HTMLCanvasElement;
    drawRun(canvas, this.run, {
      revealAll: fogRadius(this.run) === Infinity,
      fogRadius: fogRadius(this.run),
    });
    renderHud(this.ui, this.run.level, this.run.timeLeft, this.run.baseTime);
  }

  private loop(ts: number): void {
    if (this.lastFrame !== null && this.run) {
      const dt = Math.min((ts - this.lastFrame) / 1000, 0.25);
      this.run = tick(this.run, dt);
      if (this.run.status === "lost") this.finishRun(false);
      this.renderCurrent();
    }
    this.lastFrame = ts;
    this.rafId = this.document_.defaultView!.requestAnimationFrame(this.loop);
  }
}

function boot(doc: Document): App {
  return new App(doc);
}

if (typeof document !== "undefined" && document.getElementById("app")) {
  boot(document);
}

export { App, boot };
