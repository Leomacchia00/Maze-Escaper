import { cameraFor, seenMask, visibleRange } from "./camera.js";
export const BIOMES = [
    {
        name: "Prato Incantato",
        floorA: "#eaf6d8",
        floorB: "#d9eec2",
        wallTop: "#7ed957",
        wallSide: "#3f9e3f",
        accent: "#f5b70a",
        fog: "#eaf6d8",
    },
    {
        name: "Caverne Profonde",
        floorA: "#e7e0d2",
        floorB: "#d8cfbd",
        wallTop: "#b08d5f",
        wallSide: "#7a5c38",
        accent: "#e0a83c",
        fog: "#efe9dc",
    },
    {
        name: "Galassia",
        floorA: "#e4e1f5",
        floorB: "#d3cfee",
        wallTop: "#a78bfa",
        wallSide: "#6d5bd0",
        accent: "#f472b6",
        fog: "#e4e1f5",
    },
];
export function biomeForLevel(level) {
    const tier = Math.min(BIOMES.length - 1, Math.floor((level - 1) / 5));
    return BIOMES[tier];
}
function shade(hex, f) {
    const v = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((v >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((v >> 8) & 255) * f));
    const b = Math.min(255, Math.round((v & 255) * f));
    return `rgb(${r},${g},${b})`;
}
const playerSprite = new Image();
playerSprite.src = "assets/player.png";
const chestSprite = new Image();
chestSprite.src = "assets/chest.png";
const tintCache = new Map();
function tintedChest(kind) {
    if (!chestSprite.complete || chestSprite.naturalWidth === 0)
        return null;
    const hit = tintCache.get(kind);
    if (hit)
        return hit;
    const size = chestSprite.naturalWidth;
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const cx2 = cv.getContext("2d");
    if (!cx2)
        return null;
    cx2.drawImage(chestSprite, 0, 0);
    if (kind !== "legno") {
        cx2.globalCompositeOperation = "source-atop";
        cx2.globalAlpha = 0.4;
        cx2.fillStyle = kind === "oro" ? "#ffd75e" : "#a78bfa";
        cx2.fillRect(0, 0, size, size);
    }
    tintCache.set(kind, cv);
    return cv;
}
function cellHash(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function decorateFloor(ctx, g, b, x, y) {
    const h = cellHash(x, y);
    const sx = g.ox + x * g.tw;
    const sy = g.oy + y * g.tw;
    if (h < 0.12) {
        ctx.fillStyle = shade(b.wallTop, 1.15);
        ctx.beginPath();
        ctx.arc(sx + g.tw * 0.3, sy + g.tw * 0.35, g.tw * 0.06, 0, Math.PI * 2);
        ctx.arc(sx + g.tw * 0.62, sy + g.tw * 0.6, g.tw * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.accent;
        ctx.beginPath();
        ctx.arc(sx + g.tw * 0.3, sy + g.tw * 0.35, g.tw * 0.025, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (h < 0.3) {
        ctx.strokeStyle = shade(b.floorB, 0.82);
        ctx.lineWidth = Math.max(1, g.tw * 0.04);
        ctx.beginPath();
        ctx.moveTo(sx + g.tw * 0.4, sy + g.tw * 0.65);
        ctx.lineTo(sx + g.tw * 0.4, sy + g.tw * 0.45);
        ctx.moveTo(sx + g.tw * 0.55, sy + g.tw * 0.7);
        ctx.lineTo(sx + g.tw * 0.55, sy + g.tw * 0.5);
        ctx.stroke();
    }
}
function drawWall(ctx, g, b, x, y) {
    const sx = g.ox + x * g.tw;
    const sy = g.oy + y * g.tw;
    ctx.fillStyle = b.wallTop;
    ctx.fillRect(sx, sy - g.rise, g.tw + 0.5, g.tw - g.frontH + g.rise);
    ctx.fillStyle = b.wallSide;
    ctx.fillRect(sx, sy + g.tw - g.frontH, g.tw + 0.5, g.frontH);
    ctx.fillStyle = shade(b.wallSide, 0.8);
    ctx.fillRect(sx, sy + g.tw - g.frontH, g.tw + 0.5, Math.max(1.5, g.tw * 0.06));
}
function drawExit(ctx, g, d, b) {
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
    const cx = g.ox + (d.exit.x + 0.5) * g.tw;
    const cy = g.oy + (d.exit.y + 0.5) * g.tw;
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = b.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, g.tw * 0.36 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = Math.max(2, g.tw * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, g.tw * 0.28 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
const CHEST_COLORS = {
    legno: { top: "#c98d4e", side: "#8b5a2b" },
    oro: { top: "#ffd75e", side: "#e0a10c" },
    ornata: { top: "#c4b0f5", side: "#8b6fe8" },
};
function drawChest(ctx, g, x, y, kind) {
    const cx = g.ox + x * g.tw;
    const cy = g.oy + y * g.tw;
    const w = g.tw * 0.52;
    const h = g.tw * 0.34;
    const lid = w * 0.26;
    const tinted = tintedChest(kind);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.55, g.tw * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tinted) {
        ctx.drawImage(tinted, cx - w * 0.75, cy - w * 0.85, w * 1.5, w * 1.5);
        return;
    }
    const colors = CHEST_COLORS[kind] || CHEST_COLORS.legno;
    ctx.fillStyle = colors.side;
    ctx.fillRect(cx - w / 2, cy - h, w, h);
    ctx.fillStyle = colors.top;
    ctx.fillRect(cx - w / 2, cy - h - lid, w, lid);
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - w / 2, cy - h - lid, w, h + lid);
    ctx.fillStyle = "#f5b70a";
    ctx.fillRect(cx - w * 0.06, cy - h * 0.75, w * 0.12, h * 0.4);
}
function drawPlayer(ctx, g, state) {
    const cx = g.ox + state.px * g.tw;
    const cy = g.oy + state.py * g.tw;
    const bob = Math.sin(Date.now() / 140) * g.tw * 0.03;
    const r = g.tw * 0.26;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.75, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
        const w = g.tw * 0.95;
        const flip = state.facingX < 0;
        ctx.save();
        ctx.translate(cx, cy - r * 0.55 + bob);
        if (flip)
            ctx.scale(-1, 1);
        ctx.drawImage(playerSprite, -w / 2, (-w * playerSprite.naturalHeight) / playerSprite.naturalWidth, w, (w * playerSprite.naturalHeight) / playerSprite.naturalWidth);
        ctx.restore();
        return;
    }
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 1.05 + bob, r, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    const eyeDx = state.facingX * r * 0.18;
    const eyeDy = state.facingY * r * 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - r * 0.32 + eyeDx, cy - r * 1.2 + bob + eyeDy, r * 0.22, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.32 + eyeDx, cy - r * 1.2 + bob + eyeDy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c4a6e";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3 + eyeDx * 1.7, cy - r * 1.2 + bob + eyeDy * 1.7, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.34 + eyeDx * 1.7, cy - r * 1.2 + bob + eyeDy * 1.7, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
}
function drawPopups(ctx, g, fx) {
    for (const p of fx.popups) {
        const alpha = Math.max(0, 1 - p.age / 1.2);
        const rise = p.age * g.tw * 0.6;
        const cx = g.ox + p.x * g.tw;
        const cy = g.oy + p.y * g.tw - g.tw * 0.7 - rise;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${Math.max(12, g.tw * 0.3)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, cx, cy);
        ctx.fillStyle = "#e0a10c";
        ctx.fillText(p.text, cx, cy);
        ctx.restore();
    }
}
function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function drawMiniMap(ctx, state, seen, b, width) {
    const mapSize = Math.min(150, width * 0.28);
    const pad = 12;
    const mx = width - mapSize - pad;
    const my = pad;
    const s = mapSize / state.dungeon.size;
    const n = state.dungeon.size;
    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRectPath(ctx, mx, my, mapSize, mapSize, 10);
    ctx.fillStyle = "#fdfdf7";
    ctx.fill();
    ctx.strokeStyle = "rgba(53,64,42,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.wallTop;
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const i = y * n + x;
            if (state.visited[i] === 1 && state.dungeon.solid[i] === 0) {
                ctx.fillRect(mx + x * s, my + y * s, s + 0.5, s + 0.5);
            }
        }
    }
    const ex = state.dungeon.exit.x;
    const ey = state.dungeon.exit.y;
    if (seen[ey * n + ex] === 1) {
        ctx.fillStyle = b.accent;
        ctx.beginPath();
        ctx.arc(mx + (ex + 0.5) * s, my + (ey + 0.5) * s, Math.max(2.5, s * 0.7), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "#35402a";
    ctx.beginPath();
    ctx.arc(mx + state.px * s, my + state.py * s, Math.max(2.5, s * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
export function drawRun(canvas, state, fx = { shake: 0, popups: [] }) {
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const b = biomeForLevel(state.level);
    const d = state.dungeon;
    const n = d.size;
    const g = cameraFor(state.px, state.py, n, canvas.width, canvas.height);
    const seen = seenMask(state.visited, n);
    const range = visibleRange(g, canvas.width, canvas.height);
    const isSeen = (x, y) => seen[y * n + x] === 1;
    ctx.save();
    if (fx.shake > 0) {
        const m = fx.shake * fx.shake * 10;
        ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
    }
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#fdf8ec");
    grad.addColorStop(1, b.fog);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = range.y0; y <= range.y1; y++) {
        for (let x = range.x0; x <= range.x1; x++) {
            if (d.solid[y * n + x] === 1)
                continue;
            ctx.fillStyle = (x + y) % 2 === 0 ? b.floorA : b.floorB;
            const sx = g.ox + x * g.tw;
            const sy = g.oy + y * g.tw;
            ctx.fillRect(sx, sy, g.tw + 0.5, g.tw + 0.5);
            if (isSeen(x, y))
                decorateFloor(ctx, g, b, x, y);
        }
    }
    if (isSeen(d.exit.x, d.exit.y))
        drawExit(ctx, g, d, b);
    const chests = state.chests.filter((c) => !c.opened && isSeen(c.x, c.y));
    const ents = [
        ...chests.map((c) => ({ y: c.y, draw: () => drawChest(ctx, g, c.x, c.y, c.kind) })),
        { y: state.py, draw: () => drawPlayer(ctx, g, state) },
    ];
    ents.sort((a, c) => a.y - c.y);
    let ei = 0;
    for (let y = range.y0; y <= range.y1 + 1; y++) {
        for (let x = range.x0; x <= range.x1; x++) {
            if (d.solid[y * n + x] === 1)
                drawWall(ctx, g, b, x, y);
        }
        while (ei < ents.length && Math.floor(ents[ei].y) === y) {
            ents[ei].draw();
            ei++;
        }
    }
    while (ei < ents.length) {
        ents[ei].draw();
        ei++;
    }
    ctx.fillStyle = b.fog;
    for (let y = range.y0; y <= range.y1 + 1; y++) {
        for (let x = range.x0; x <= range.x1; x++) {
            if (x < 0 || y < 0 || x >= n || y >= n)
                continue;
            if (seen[y * n + x] === 1)
                continue;
            const sx = g.ox + x * g.tw;
            const sy = g.oy + y * g.tw;
            ctx.fillRect(sx, sy - g.rise - 1, g.tw + 0.5, g.tw + g.rise + 2);
        }
    }
    drawPopups(ctx, g, fx);
    ctx.restore();
    drawMiniMap(ctx, state, seen, b, canvas.width);
}
