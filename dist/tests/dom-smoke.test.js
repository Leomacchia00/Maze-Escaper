import { test } from "node:test";
import assert from "node:assert/strict";
function makeCanvas() {
    const ctx = new Proxy({}, {
        get: (_t, prop) => {
            if (prop === "canvas")
                return undefined;
            return (..._args) => undefined;
        },
        set: () => true,
    });
    return {
        width: 640,
        height: 640,
        hidden: false,
        textContent: "",
        getContext: () => ctx,
        addEventListener: (_t, _fn) => { },
    };
}
function makeEl(id, canvases) {
    const listeners = {};
    const canvas = makeCanvas();
    canvases.set(id, canvas);
    const children = [];
    return {
        id,
        hidden: true,
        textContent: "",
        className: "",
        disabled: false,
        children,
        getContext: canvas.getContext,
        get width() { return canvas.width; },
        set width(v) { canvas.width = v; },
        get height() { return canvas.height; },
        set height(v) { canvas.height = v; },
        addEventListener(type, fn) {
            (listeners[type] ?? (listeners[type] = [])).push(fn);
        },
        fire(type, e) {
            for (const fn of listeners[type] ?? [])
                fn(e);
        },
        appendChild(child) { children.push(child); },
        replaceChildren() { children.length = 0; },
        append(...rest) { children.push(...rest); },
    };
}
function makeDocument() {
    const canvases = new Map();
    const els = new Map();
    const docListeners = {};
    const ids = [
        "screen-home", "screen-run", "screen-result", "screen-skills",
        "home-level", "home-stats", "home-currency", "hud-time", "hud-level",
        "skills-list", "skills-currency",
        "pause-overlay", "result-title", "result-score", "result-record",
        "maze-canvas", "result-maze",
        "btn-play", "btn-skills", "btn-back-skills", "btn-pause", "btn-retry", "btn-result-menu",
        "canvas-wrap", "app",
    ];
    for (const id of ids)
        els.set(id, makeEl(id, canvases));
    const doc = {
        getElementById: (id) => els.get(id) ?? null,
        createElement: (_tag) => makeEl(`dynamic-${els.size}`, canvases),
        addEventListener: (type, fn) => {
            (docListeners[type] ?? (docListeners[type] = [])).push(fn);
        },
        defaultView: {
            requestAnimationFrame: (cb) => {
                rafCb = cb;
                return 1;
            },
        },
    };
    let rafCb = null;
    return {
        doc: doc,
        els,
        docListeners,
        fireDoc(type, e) {
            for (const fn of docListeners[type] ?? [])
                fn(e);
        },
        frame(ts) {
            const cb = rafCb;
            rafCb = null;
            cb?.(ts);
        },
    };
}
const KEY = { up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" };
function pressKey(harness, key) {
    harness.fireDoc("keydown", { key, preventDefault: () => { } });
}
test("smoke DOM: run vinta mostra schermata risultato vittoria", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-play").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false, "run screen visible");
    let won = false;
    const dirs = [KEY.up, KEY.right, KEY.down, KEY.left];
    for (let i = 0; i < 60000 && !won; i++) {
        pressKey(harness, dirs[Math.floor(Math.random() * dirs.length)]);
        if (ui.get("screen-result").hidden === false)
            won = true;
    }
    assert.ok(won, "random-walk keypresses must eventually reach the exit");
    assert.ok(ui.get("result-title").textContent.includes("Vittoria"), "victory title shown");
    assert.ok(ui.get("result-score").textContent.includes("Punteggio:"), "score shown");
    assert.equal(ui.get("result-maze").hidden, true, "maze review hidden on win");
    ui.get("btn-result-menu").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "back to home");
    assert.ok(ui.get("home-stats").textContent.includes("Vinte: 1"), "stats updated");
});
test("smoke DOM: schermata skill mostra nodi e permette acquisti", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-skills").fire("click", {});
    assert.equal(ui.get("screen-skills").hidden, false, "skills screen visible");
    assert.equal(ui.get("skills-list").children.length, 4, "four skill nodes rendered");
    ui.get("btn-back-skills").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "back to home from skills");
});
test("smoke DOM: tempo scaduto mostra schermata sconfitta con labirinto visibile", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-play").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false);
    for (const key of [KEY.up, KEY.right, KEY.down, KEY.left]) {
        pressKey(harness, key);
    }
    const t0 = Number(ui.get("hud-time").textContent.replace("s", ""));
    assert.ok(t0 > 0, "timer started after first move");
    let ts = 16;
    for (let i = 0; i < 4000; i++) {
        harness.frame(ts);
        ts += 16;
        if (ui.get("screen-result").hidden === false)
            break;
    }
    assert.equal(ui.get("screen-result").hidden, false, "result screen shown");
    assert.ok(ui.get("result-title").textContent.includes("Tempo scaduto"), "defeat title shown");
    assert.ok(ui.get("result-score").textContent.includes("Nessun punteggio"), "no score on loss");
    assert.equal(ui.get("result-maze").hidden, false, "maze visible for path review on loss");
    ui.get("btn-retry").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false, "retry restarts the run");
});
