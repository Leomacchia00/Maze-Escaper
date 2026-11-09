import { test } from "node:test";
import assert from "node:assert/strict";

type Listener = (e: unknown) => void;

function makeCanvas() {
  const ctx = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === "canvas") return undefined;
      return (..._args: unknown[]) => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return {
    width: 640,
    height: 640,
    hidden: false,
    textContent: "",
    getContext: () => ctx,
    addEventListener: (_t: string, _fn: Listener) => {},
  };
}

function makeEl(id: string, canvases: Map<string, ReturnType<typeof makeCanvas>>) {
  const listeners: Record<string, Listener[]> = {};
  const canvas = makeCanvas();
  canvases.set(id, canvas);
  const children: unknown[] = [];
  const classes = new Set<string>();
  return {
    id,
    hidden: true,
    textContent: "",
    className: "",
    disabled: false,
    children,
    classList: {
      toggle(name: string, force?: boolean) {
        const on = force ?? !classes.has(name);
        if (on) classes.add(name); else classes.delete(name);
        return on;
      },
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
    },
    getContext: canvas.getContext,
    get width() { return canvas.width; },
    set width(v: number) { canvas.width = v; },
    get height() { return canvas.height; },
    set height(v: number) { canvas.height = v; },
    addEventListener(type: string, fn: Listener) {
      (listeners[type] ??= []).push(fn);
    },
    fire(type: string, e: unknown) {
      for (const fn of listeners[type] ?? []) fn(e);
    },
    appendChild(child: unknown) { children.push(child); },
    replaceChildren() { children.length = 0; },
    append(...rest: unknown[]) { children.push(...rest); },
    focus(_opts?: unknown) {},
    querySelector(_sel: string) { return { focus: (_o?: unknown) => {} }; },
  };
}

function makeDocument() {
  const canvases = new Map<string, ReturnType<typeof makeCanvas>>();
  const els = new Map<string, ReturnType<typeof makeEl>>();
  const docListeners: Record<string, Listener[]> = {};
  const ids = [
    "screen-home", "screen-run", "screen-result", "screen-skills",
    "home-level", "home-currency", "stat-runs", "stat-wins", "stat-losses",
    "hud-time", "hud-level",
    "skills-list", "skills-currency",
    "pause-overlay", "result-title", "result-score-value", "result-breakdown",
    "breakdown-time", "breakdown-size", "breakdown-efficiency", "result-record",
    "maze-canvas", "result-maze",
    "btn-play", "btn-skills", "btn-back-skills", "btn-pause", "btn-retry", "btn-result-menu",
    "canvas-wrap", "app",
  ];
  for (const id of ids) els.set(id, makeEl(id, canvases));
  const doc = {
    title: "",
    getElementById: (id: string) => els.get(id) ?? null,
    createElement: (_tag: string) => makeEl(`dynamic-${els.size}`, canvases),
    addEventListener: (type: string, fn: Listener) => {
      (docListeners[type] ??= []).push(fn);
    },
    defaultView: {
      requestAnimationFrame: (cb: (ts: number) => void) => {
        rafCb = cb;
        return 1;
      },
    },
  };
  let rafCb: ((ts: number) => void) | null = null;
  for (const el of els.values()) {
    (el as { ownerDocument?: unknown }).ownerDocument = doc;
  }
  return {
    doc: doc as unknown as Document,
    expectTitle: (t: string) => assert.ok((doc as { title: string }).title.includes(t)),
    els,
    docListeners,
    fireDoc(type: string, e: unknown) {
      for (const fn of docListeners[type] ?? []) fn(e);
    },
    frame(ts: number) {
      const cb = rafCb;
      rafCb = null;
      cb?.(ts);
    },
  };
}

const KEY = { up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" } as const;

function pressKey(harness: ReturnType<typeof makeDocument>, key: string) {
  harness.fireDoc("keydown", { key, preventDefault: () => {} });
}

test("smoke DOM: run vinta mostra schermata risultato vittoria", async () => {
  const harness = makeDocument();
  const { boot } = await import("../main.js");
  boot(harness.doc);
  harness.frame(0);

  const ui = harness.els;
  ui.get("btn-play")!.fire("click", {});
  assert.equal(ui.get("screen-run")!.hidden, false, "run screen visible");
  harness.expectTitle("Partita");

  let won = false;
  const dirs = [KEY.up, KEY.right, KEY.down, KEY.left];
  for (let i = 0; i < 60000 && !won; i++) {
    pressKey(harness, dirs[Math.floor(Math.random() * dirs.length)]);
    if (ui.get("screen-result")!.hidden === false) won = true;
  }
  assert.ok(won, "random-walk keypresses must eventually reach the exit");
  assert.ok(ui.get("result-title")!.textContent.includes("Vittoria"), "victory title shown");
  assert.notEqual(ui.get("result-score-value")!.textContent, "—", "score shown on win");
  assert.equal(ui.get("result-breakdown")!.hidden, false, "score breakdown visible on win");
  assert.equal(ui.get("result-maze")!.hidden, true, "maze review hidden on win");

  ui.get("btn-result-menu")!.fire("click", {});
  assert.equal(ui.get("screen-home")!.hidden, false, "back to home");
  assert.equal(ui.get("stat-wins")!.textContent, "1", "stats updated");
});

test("smoke DOM: schermata skill mostra nodi e permette acquisti", async () => {
  const harness = makeDocument();
  const { boot } = await import("../main.js");
  boot(harness.doc);
  harness.frame(0);

  const ui = harness.els;
  ui.get("btn-skills")!.fire("click", {});
  assert.equal(ui.get("screen-skills")!.hidden, false, "skills screen visible");
  assert.equal(ui.get("skills-list")!.children.length, 4, "four skill nodes rendered");

  ui.get("btn-back-skills")!.fire("click", {});
  assert.equal(ui.get("screen-home")!.hidden, false, "back to home from skills");
});

test("smoke DOM: tempo scaduto mostra schermata sconfitta con labirinto visibile", async () => {
  const harness = makeDocument();
  const { boot } = await import("../main.js");
  boot(harness.doc);
  harness.frame(0);

  const ui = harness.els;
  ui.get("btn-play")!.fire("click", {});
  assert.equal(ui.get("screen-run")!.hidden, false);

  for (const key of [KEY.up, KEY.right, KEY.down, KEY.left]) {
    pressKey(harness, key);
  }
  const t0 = Number(ui.get("hud-time")!.textContent.replace("s", ""));
  assert.ok(t0 > 0, "timer started after first move");

  let ts = 16;
  for (let i = 0; i < 4000; i++) {
    harness.frame(ts);
    ts += 16;
    if (ui.get("screen-result")!.hidden === false) break;
  }
  assert.equal(ui.get("screen-result")!.hidden, false, "result screen shown");
  assert.ok(ui.get("result-title")!.textContent.includes("Tempo scaduto"), "defeat title shown");
  assert.equal(ui.get("result-score-value")!.textContent, "—", "no score on loss");
  assert.equal(ui.get("result-breakdown")!.hidden, true, "breakdown hidden on loss");
  assert.equal(ui.get("result-maze")!.hidden, false, "maze visible for path review on loss");

  ui.get("btn-retry")!.fire("click", {});
  assert.equal(ui.get("screen-run")!.hidden, false, "retry restarts the run");
});
