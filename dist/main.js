import { createRun, movePlayer, tick, pickupChests, payout, damagePlayer } from "./game.js";
import { isSolid } from "./dungeon.js";
import { pickupAt } from "./pickups.js";
import { moveEnemies, ENEMY_BOUNTY } from "./enemies.js";
import { playCoin, playChest, playClick, playHurt, playSword, playWin, playLose, resumeAudio } from "./audio.js";
import { drawRun } from "./render.js";
import { biomeForLevel } from "./render.js";
import { queryUI } from "./ui.js";
import { SKILL_TREE, canBuy, buySkill, skillEffects } from "./skills.js";
const SAVE_KEY = "maze-escaper:v4";
const OLD_KEY = "maze-escaper:v3";
const SAVE_VERSION = 4;
function loadSave() {
    const fallback = { version: SAVE_VERSION, level: 1, coins: 0, bestAir: 0, donations: [], skills: {} };
    try {
        for (const key of [SAVE_KEY, OLD_KEY]) {
            const raw = localStorage.getItem(key);
            if (!raw)
                continue;
            const data = JSON.parse(raw);
            if (typeof data.level !== "number")
                continue;
            if (data.version !== 3 && data.version !== SAVE_VERSION)
                continue;
            return {
                version: SAVE_VERSION,
                level: data.level,
                coins: typeof data.coins === "number" ? data.coins : 0,
                bestAir: typeof data.bestAir === "number" ? data.bestAir : 0,
                donations: Array.isArray(data.donations) ? data.donations : [],
                skills: data.skills && typeof data.skills === "object" ? data.skills : {},
            };
        }
    }
    catch {
        /* save corrotto: riparti da zero */
    }
    return fallback;
}
function persist(data) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }
    catch {
        /* storage pieno o bloccato: il gioco continua senza salvataggio */
    }
}
class App {
    constructor(doc) {
        this.run = null;
        this.keys = new Set();
        this.joyStart = null;
        this.joyVec = { x: 0, y: 0 };
        this.fx = { shake: 0, popups: [] };
        this.raf = 0;
        this.lastTs = null;
        this.ended = false;
        this.paused = false;
        this.lastHud = { air: -1, coins: -1, hp: -1 };
        this.attackCd = 0;
        this.hurtCooldown = 0;
        this.loop = (ts) => {
            const dt = this.lastTs !== null ? Math.min((ts - this.lastTs) / 1000, 0.05) : 0;
            this.lastTs = ts;
            if (this.run && !this.paused) {
                const kx = (this.keys.has("arrowright") || this.keys.has("d") ? 1 : 0) -
                    (this.keys.has("arrowleft") || this.keys.has("a") ? 1 : 0);
                const ky = (this.keys.has("arrowdown") || this.keys.has("s") ? 1 : 0) -
                    (this.keys.has("arrowup") || this.keys.has("w") ? 1 : 0);
                const ix = kx !== 0 ? kx : this.joyVec.x;
                const iy = ky !== 0 ? ky : this.joyVec.y;
                const hitStop = !!this.fx.swing && this.fx.swing.age < 0.12;
                if (!hitStop) {
                    const before = this.run.chestOpenCount;
                    const coinsBefore = this.run.coins;
                    this.run = movePlayer(this.run, ix, iy, dt);
                    this.run = tick(this.run, dt);
                    this.run.enemies = moveEnemies(this.run.enemies, this.run.dungeon, dt, this.run.px, this.run.py);
                    this.run = pickupChests(this.run);
                    this.collectPickups();
                    this.checkEnemyCollisions(dt);
                    if (this.run.chestOpenCount > before) {
                        const chest = this.run.chests.find((c) => c.opened && c.id === before);
                        if (chest) {
                            const gained = this.run.coins - coinsBefore;
                            const popup = { x: chest.x, y: chest.y, text: `+${gained}💰`, age: 0 };
                            this.fx.popups.push(popup);
                            playChest();
                        }
                    }
                }
                this.attackCd = Math.max(0, this.attackCd - dt);
                if (this.fx.swing) {
                    this.fx.swing.age += dt;
                    if (this.fx.swing.age > 0.15)
                        this.fx.swing = null;
                }
                if (this.fx.hurt) {
                    this.fx.hurt = Math.max(0, this.fx.hurt - dt * 2.2);
                }
                this.fx.shake = Math.max(0, this.fx.shake - dt * 1.5);
                for (const p of this.fx.popups)
                    p.age += dt;
                this.fx.popups = this.fx.popups.filter((p) => p.age < 1.2);
                this.render();
                if ((this.run.status === "won" || this.run.status === "lost") && !this.ended) {
                    this.ended = true;
                    if (this.run.status === "lost")
                        this.fx.shake = 1;
                    this.endRun();
                }
            }
            this.raf = requestAnimationFrame(this.loop);
        };
        this.ui = queryUI(doc);
        this.save = loadSave();
        doc.getElementById("btn-play")?.addEventListener("click", () => { playClick(); this.start(); });
        doc.getElementById("btn-menu")?.addEventListener("click", () => { playClick(); this.showHome(); });
        doc.getElementById("btn-skills")?.addEventListener("click", () => { playClick(); this.showSkills(); });
        doc.getElementById("btn-skills-back")?.addEventListener("click", () => { playClick(); this.showHome(); });
        this.ui.skillTree.addEventListener("click", (e) => this.onTreeClick(e));
        doc.getElementById("btn-retry")?.addEventListener("click", () => { playClick(); this.start(); });
        doc.getElementById("btn-pause")?.addEventListener("click", () => { playClick(); this.togglePause(); });
        doc.getElementById("btn-resume")?.addEventListener("click", () => { playClick(); this.resume(); });
        doc.getElementById("btn-abandon")?.addEventListener("click", () => { playClick(); this.abandonRun(); });
        doc.getElementById("btn-attack")?.addEventListener("click", () => this.attack());
        doc.getElementById("btn-attack-big")?.addEventListener("click", () => this.attack());
        doc.addEventListener("keydown", (e) => {
            resumeAudio();
            const k = e.key.toLowerCase();
            if (k === "escape" && this.run && !this.ended) {
                e.preventDefault();
                this.togglePause();
                return;
            }
            if (k === " " || k === "e") {
                e.preventDefault();
                this.attack();
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
                resumeAudio();
                this.joyStart = { x: e.clientX, y: e.clientY };
                canvas.setPointerCapture(e.pointerId);
            });
            canvas.addEventListener("pointermove", (e) => {
                if (!this.joyStart)
                    return;
                const dx = e.clientX - this.joyStart.x;
                const dy = e.clientY - this.joyStart.y;
                const dead = 12;
                const max = 48;
                const len = Math.hypot(dx, dy);
                if (len < dead) {
                    this.joyVec = { x: 0, y: 0 };
                }
                else {
                    const clamped = Math.min(len, max);
                    this.joyVec = { x: (dx / len) * (clamped / max), y: (dy / len) * (clamped / max) };
                }
            });
            const release = () => {
                this.joyStart = null;
                this.joyVec = { x: 0, y: 0 };
            };
            canvas.addEventListener("pointerup", release);
            canvas.addEventListener("pointercancel", release);
        }
        const joy = doc.getElementById("joystick");
        const knob = doc.getElementById("joy-knob");
        if (joy && knob) {
            const R = 36;
            let joyId = null;
            const setVec = (e) => {
                const rect = joy.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                let dx = e.clientX - cx;
                let dy = e.clientY - cy;
                const len = Math.hypot(dx, dy);
                if (len > R) {
                    dx = (dx / len) * R;
                    dy = (dy / len) * R;
                }
                knob.style.transform = `translate(${dx}px, ${dy}px)`;
                this.joyVec = { x: dx / R, y: dy / R };
            };
            joy.addEventListener("pointerdown", (e) => {
                resumeAudio();
                joyId = e.pointerId;
                joy.setPointerCapture(e.pointerId);
                setVec(e);
            });
            joy.addEventListener("pointermove", (e) => {
                if (joyId !== e.pointerId)
                    return;
                setVec(e);
            });
            const joyEnd = (e) => {
                if (joyId !== e.pointerId)
                    return;
                joyId = null;
                knob.style.transform = "translate(0px, 0px)";
                this.joyVec = { x: 0, y: 0 };
            };
            joy.addEventListener("pointerup", joyEnd);
            joy.addEventListener("pointercancel", joyEnd);
        }
        this.refreshHome();
        this.showHome();
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("./sw.js").catch(() => { });
        }
    }
    showSkills() {
        this.renderSkillTree();
        this.ui.screens.home.hidden = true;
        this.ui.screens.run.hidden = true;
        this.ui.screens.result.hidden = true;
        this.ui.screens.skills.hidden = false;
    }
    onTreeClick(e) {
        const target = e.target.closest("[data-skill]");
        if (!target)
            return;
        const id = target.getAttribute("data-skill");
        const res = buySkill(this.save.skills, id, this.save.coins);
        if (!res)
            return;
        this.save.skills = res.owned;
        this.save.coins = res.coins;
        persist(this.save);
        this.renderSkillTree();
    }
    renderSkillTree() {
        this.ui.skillsCoins.textContent = String(this.save.coins);
        this.ui.skillTree.innerHTML = "";
        const branches = [
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
    refreshHome() {
        this.ui.homeLevel.textContent = String(this.save.level);
        this.ui.homeCoins.textContent = String(this.save.coins);
        this.ui.homeBest.textContent = this.save.bestAir > 0 ? `${this.save.bestAir}s` : "—";
    }
    start() {
        this.run = createRun(this.save.level, (Date.now() ^ performance.now()) >>> 0, this.save.skills);
        this.fx = { shake: 0, popups: [] };
        this.ended = false;
        this.paused = false;
        this.ui.pauseOverlay.hidden = true;
        this.lastHud = { air: -1, coins: -1, hp: -1 };
        this.lastTs = null;
        this.ui.screens.home.hidden = true;
        this.ui.screens.result.hidden = true;
        this.ui.screens.run.hidden = false;
        this.ui.hudBiome.textContent = biomeForLevel(this.run.level).name;
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(this.loop);
    }
    togglePause() {
        if (!this.run || this.ended)
            return;
        this.paused = !this.paused;
        this.ui.pauseOverlay.hidden = !this.paused;
        this.lastTs = null;
    }
    resume() {
        if (!this.paused)
            return;
        this.paused = false;
        this.ui.pauseOverlay.hidden = true;
        this.lastTs = null;
    }
    abandonRun() {
        this.paused = false;
        this.ui.pauseOverlay.hidden = true;
        this.showHome();
    }
    showHome() {
        this.refreshHome();
        this.ui.screens.home.hidden = false;
        this.ui.screens.run.hidden = true;
        this.ui.screens.result.hidden = true;
        this.ui.screens.skills.hidden = true;
        cancelAnimationFrame(this.raf);
    }
    endRun() {
        if (!this.run)
            return;
        const won = this.run.status === "won";
        if (won)
            playWin();
        else
            playLose();
        const got = payout(this.run);
        this.save.coins += got.coins;
        if (won)
            this.save.level += 1;
        if (this.run.air > this.save.bestAir)
            this.save.bestAir = Math.round(this.run.air * 10) / 10;
        for (const d of got.donations) {
            if (!this.save.donations.includes(d))
                this.save.donations.push(d);
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
    attack() {
        if (!this.run || this.run.status !== "running" || this.paused)
            return;
        if (this.attackCd > 0)
            return;
        this.attackCd = 0.45;
        playSword();
        const fx = this.run.facingX;
        const fy = this.run.facingY;
        this.fx.swing = { age: 0, facingX: fx, facingY: fy };
        const survivors = [];
        for (const e of this.run.enemies) {
            const dx = e.x - this.run.px;
            const dy = e.y - this.run.py;
            const dist = Math.hypot(dx, dy);
            const inRange = dist < 1.7;
            const inArc = dist > 0 ? (dx * fx + dy * fy) / dist > 0.25 : true;
            if (inRange && inArc) {
                e.hp -= 1;
                e.flash = 0.12;
                const kx = e.x + fx * 0.3;
                const ky = e.y + fy * 0.3;
                if (!isSolid(this.run.dungeon, Math.floor(kx), Math.floor(ky))) {
                    e.x = kx;
                    e.y = ky;
                }
                this.fx.popups.push({ x: e.x, y: e.y, text: "-1", age: 0, color: "#dc2626" });
            }
            if (e.hp > 0)
                survivors.push(e);
            else {
                this.run.coins += ENEMY_BOUNTY[e.kind];
                this.fx.popups.push({ x: e.x, y: e.y, text: `+${ENEMY_BOUNTY[e.kind]}\ud83d\udcb0`, age: 0 });
            }
        }
        this.run.enemies = survivors;
    }
    collectPickups() {
        if (!this.run)
            return;
        const hit = pickupAt(this.run, this.run.pickups);
        if (!hit)
            return;
        hit.taken = true;
        this.run.coins += hit.coins;
        playCoin();
        this.fx.popups.push({ x: hit.x, y: hit.y, text: `+${hit.coins}\ud83d\udcb0`, age: 0 });
    }
    checkEnemyCollisions(dt) {
        if (!this.run)
            return;
        if (this.hurtCooldown > 0) {
            this.hurtCooldown -= dt;
            return;
        }
        for (const e of this.run.enemies) {
            if (Math.hypot(e.x - this.run.px, e.y - this.run.py) < 0.6) {
                this.run = damagePlayer(this.run, 1);
                this.fx.shake = 1;
                this.fx.hurt = 1;
                this.fx.popups.push({ x: this.run.px, y: this.run.py, text: "-1", age: 0, color: "#dc2626" });
                playHurt();
                this.hurtCooldown = 1.2;
                break;
            }
        }
    }
    render() {
        if (!this.run)
            return;
        const canvas = document.getElementById("maze-canvas");
        if (canvas)
            drawRun(canvas, this.run, this.fx);
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
        if (this.run.hp !== this.lastHud.hp) {
            this.lastHud.hp = this.run.hp;
            this.ui.hudHp.textContent = "\u2764\ufe0f".repeat(this.run.hp) + "\u26a1".repeat(this.run.maxHp - this.run.hp);
        }
    }
}
const app = new App(document);
export { app };
