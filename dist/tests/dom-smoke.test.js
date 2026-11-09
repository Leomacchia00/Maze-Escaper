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
    const classes = new Set();
    return {
        id,
        hidden: true,
        textContent: "",
        className: "",
        disabled: false,
        checked: false,
        children,
        classList: {
            toggle(name, force) {
                const on = force ?? !classes.has(name);
                if (on)
                    classes.add(name);
                else
                    classes.delete(name);
                return on;
            },
            add: (name) => classes.add(name),
            remove: (name) => classes.delete(name),
            contains: (name) => classes.has(name),
        },
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
        focus(_opts) { },
        querySelector(_sel) { return { focus: (_o) => { } }; },
    };
}
function makeDocument() {
    const canvases = new Map();
    const els = new Map();
    const docListeners = {};
    const ids = [
        "screen-home", "screen-run", "screen-result", "screen-skills", "screen-settings",
        "home-level", "home-currency", "stat-runs", "stat-wins", "stat-losses",
        "hud-time", "hud-level",
        "skills-list", "skills-currency",
        "pause-overlay", "result-title", "result-score-value", "result-breakdown",
        "breakdown-time", "breakdown-size", "breakdown-efficiency", "result-record",
        "maze-canvas", "result-maze",
        "btn-play", "btn-skills", "btn-settings", "btn-back-skills", "btn-back-settings",
        "btn-back-run", "btn-back-result", "btn-pause", "btn-retry", "btn-result-menu",
        "btn-resume", "btn-restart-run", "btn-quit-run", "btn-next-level",
        "setting-vibration", "btn-reset-progress",
        "canvas-wrap", "app",
    ];
    for (const id of ids)
        els.set(id, makeEl(id, canvases));
    const doc = {
        title: "",
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
    for (const el of els.values()) {
        el.ownerDocument = doc;
    }
    return {
        doc: doc,
        expectTitle: (t) => assert.ok(doc.title.includes(t)),
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
    harness.expectTitle("Partita");
    let won = false;
    const dirs = [KEY.up, KEY.right, KEY.down, KEY.left];
    for (let i = 0; i < 60000 && !won; i++) {
        pressKey(harness, dirs[Math.floor(Math.random() * dirs.length)]);
        if (ui.get("screen-result").hidden === false)
            won = true;
    }
    assert.ok(won, "random-walk keypresses must eventually reach the exit");
    assert.ok(ui.get("result-title").textContent.includes("Vittoria"), "victory title shown");
    assert.notEqual(ui.get("result-score-value").textContent, "—", "score shown on win");
    assert.equal(ui.get("result-breakdown").hidden, false, "score breakdown visible on win");
    assert.equal(ui.get("result-maze").hidden, true, "maze review hidden on win");
    ui.get("btn-result-menu").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "back to home");
    assert.equal(ui.get("stat-wins").textContent, "1", "stats updated");
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
    assert.equal(ui.get("result-score-value").textContent, "—", "no score on loss");
    assert.equal(ui.get("result-breakdown").hidden, true, "breakdown hidden on loss");
    assert.equal(ui.get("result-maze").hidden, false, "maze visible for path review on loss");
    ui.get("btn-retry").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false, "retry restarts the run");
});
test("smoke DOM: impostazioni mostrano toggle e reset progressi", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-settings").fire("click", {});
    assert.equal(ui.get("screen-settings").hidden, false, "settings screen visible");
    harness.expectTitle("Impostazioni");
    assert.equal(ui.get("setting-vibration").checked, true, "vibration on by default");
    ui.get("setting-vibration").checked = false;
    ui.get("setting-vibration").fire("change", {});
    ui.get("btn-back-settings").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "back to home from settings");
    ui.get("btn-settings").fire("click", {});
    assert.equal(ui.get("setting-vibration").checked, false, "vibration setting persisted in session");
    const confirmCalls = [];
    harness.doc.defaultView.confirm = (m) => {
        confirmCalls.push(m);
        return true;
    };
    ui.get("btn-reset-progress").fire("click", {});
    assert.equal(confirmCalls.length, 1, "reset asks for confirmation");
    assert.equal(ui.get("home-level").textContent, "1", "level reset");
    assert.equal(ui.get("home-currency").textContent, "0", "currency reset");
    assert.equal(ui.get("stat-runs").textContent, "0", "stats reset");
    assert.equal(ui.get("setting-vibration").checked, false, "settings survive progress reset");
});
test("smoke DOM: back dalla run abbandona e torna al menu", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-play").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false);
    pressKey(harness, KEY.up);
    ui.get("btn-back-run").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "back to home from run");
    assert.equal(ui.get("screen-run").hidden, true, "run screen hidden after abandon");
});
test("smoke DOM: menu pausa con riprendi, ricomincia e menu", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-play").fire("click", {});
    assert.equal(ui.get("pause-overlay").hidden, true, "overlay hidden at run start");
    pressKey(harness, KEY.up);
    ui.get("btn-pause").fire("click", {});
    assert.equal(ui.get("pause-overlay").hidden, false, "pause menu shown");
    ui.get("btn-restart-run").fire("click", {});
    assert.equal(ui.get("screen-run").hidden, false, "restart stays on run screen");
    assert.equal(ui.get("pause-overlay").hidden, true, "overlay closed after restart");
    assert.equal(ui.get("hud-time").textContent, "27.5s", "timer reset to base time on restart");
    pressKey(harness, KEY.up);
    ui.get("btn-pause").fire("click", {});
    ui.get("btn-resume").fire("click", {});
    assert.equal(ui.get("pause-overlay").hidden, true, "resume closes pause menu");
    const t0 = Number(ui.get("hud-time").textContent.replace("s", ""));
    assert.ok(t0 > 0, "timer keeps running after resume");
    ui.get("btn-pause").fire("click", {});
    ui.get("btn-quit-run").fire("click", {});
    assert.equal(ui.get("screen-home").hidden, false, "quit returns to menu");
});
test("smoke DOM: prossimo livello visibile solo alla vittoria e parte al livello successivo", async () => {
    const harness = makeDocument();
    const { boot } = await import("../main.js");
    boot(harness.doc);
    harness.frame(0);
    const ui = harness.els;
    ui.get("btn-play").fire("click", {});
    for (const key of [KEY.up, KEY.right, KEY.down, KEY.left]) {
        pressKey(harness, key);
        if (ui.get("screen-result").hidden === false)
            break;
    }
    const won = ui.get("result-title").textContent.includes("Vittoria");
    assert.equal(ui.get("btn-next-level").hidden, won === false, "next-level only on win");
    if (won) {
        ui.get("btn-next-level").fire("click", {});
        assert.equal(ui.get("screen-run").hidden, false, "next level starts a run");
        assert.equal(ui.get("hud-level").textContent, "Livello 2", "next level is level 2");
    }
});
