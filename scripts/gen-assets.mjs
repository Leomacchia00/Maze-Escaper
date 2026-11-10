// Genera assets/tiles.png (atlas 9x3 tile da 48px) e assets/player.png (4 direzioni x 2 frame).
// Stile "cozy pixel" ispirato ai tileset Anokolisa: pastello, tondo, outline caldi.
// Zero dipendenze: encoder PNG scritto a mano (RGBA8, filtro 0).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = 48;

class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
  px(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c.length > 3 ? c[3] : 255;
  }
  rect(x, y, w, h, c) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.px(x + xx, y + yy, c); }
  circle(cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.px(x, y, c);
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
}

function hex(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mix(h, f) {
  const c = hex(h);
  return c.map((v) => Math.min(255, Math.round(v * f)));
}

function hash2(x, y, s) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rrect(img, x, y, w, h, r, c) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const cx = Math.min(xx, w - 1 - xx);
      const cy = Math.min(yy, h - 1 - yy);
      if (cx < r && cy < r) {
        const dx = r - cx, dy = r - cy;
        if (dx * dx + dy * dy > r * r) continue;
      }
      img.px(x + xx, y + yy, c);
    }
  }
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc32.t = crc32.t || (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let v = n; for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1; t[n] = v >>> 0; }
      return t;
    })();
    c = crc32.t[(c ^ buf[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, "ascii"), data]);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}

function encodePNG(img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    for (let x = 0; x < img.w; x++) {
      const si = (y * img.w + x) * 4, di = y * (img.w * 4 + 1) + 1 + x * 4;
      raw[di] = img.d[si]; raw[di + 1] = img.d[si + 1]; raw[di + 2] = img.d[si + 2]; raw[di + 3] = img.d[si + 3];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- palette biomi (contratto con src/render.ts) ----------
const BIOMES = [
  { floorA: "#eaf6d8", floorB: "#d9eec2", wallTop: "#7ed957", wallSide: "#3f9e3f", outline: "#4a6a3e" },
  { floorA: "#e7e0d2", floorB: "#d8cfbd", wallTop: "#b08d5f", wallSide: "#7a5c38", outline: "#4a3828" },
  { floorA: "#e4e1f5", floorB: "#d3cfee", wallTop: "#a78bfa", wallSide: "#6d5bd0", outline: "#3e3270" },
];

// ---------- atlas tiles 9x3 ----------
const atlas = new Img(9 * T, 3 * T);

function putTile(tile, col, row) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const si = (y * T + x) * 4;
    const di = ((row * T + y) * atlas.w + col * T + x) * 4;
    atlas.d[di] = tile.d[si]; atlas.d[di + 1] = tile.d[si + 1]; atlas.d[di + 2] = tile.d[si + 2]; atlas.d[di + 3] = tile.d[si + 3];
  }
}

// ---------- pavimenti: chiazze morbide seamless + dettagli carini ----------
function floorTile(base, patch, light, seed, decorate) {
  const img = new Img(T, T);
  img.rect(0, 0, T, T, hex(base));
  for (let i = 0; i < 5; i++) {
    const bx = hash2(i, seed, 11) * T;
    const by = hash2(i, seed, 23) * T;
    const r = 5 + hash2(i, seed, 31) * 7;
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) {
      img.ellipse(bx + dx, by + dy, r, r * 0.65, hex(patch));
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = 3 + Math.floor(hash2(i, seed, 41) * (T - 6));
    const y = 3 + Math.floor(hash2(i, seed, 53) * (T - 6));
    img.rect(x, y, 3, 3, hex(light));
  }
  if (decorate) decorate(img);
  return img;
}

function flower(img, x, y, petal, center) {
  img.rect(x - 3, y, 3, 3, petal);
  img.rect(x + 3, y, 3, 3, petal);
  img.rect(x, y - 3, 3, 3, petal);
  img.rect(x, y + 3, 3, 3, petal);
  img.rect(x, y, 3, 3, center);
}

function tuft(img, x, y, c) {
  img.rect(x, y - 3, 3, 6, c);
  img.rect(x - 3, y, 3, 3, c);
  img.rect(x + 3, y, 3, 3, c);
}

const DECOR = [
  (img) => {
    flower(img, 12, 14, [255, 255, 255, 255], [245, 183, 10, 255]);
    flower(img, 33, 34, [255, 200, 220, 255], [245, 183, 10, 255]);
    tuft(img, 36, 12, [140, 205, 110, 255]);
    tuft(img, 10, 38, [140, 205, 110, 255]);
  },
  (img) => {
    img.ellipse(12, 14, 4, 3, [150, 140, 125, 255]);
    img.ellipse(34, 32, 5, 4, [150, 140, 125, 255]);
    img.rect(20, 28, 3, 3, [120, 105, 90, 255]);
    img.rect(23, 31, 3, 3, [120, 105, 90, 255]);
    img.rect(26, 34, 3, 3, [120, 105, 90, 255]);
  },
  (img) => {
    img.rect(12, 12, 3, 3, [255, 255, 255, 230]);
    img.rect(32, 30, 3, 3, [255, 255, 255, 230]);
    img.rect(22, 38, 3, 3, [255, 240, 250, 200]);
    img.rect(38, 10, 3, 3, [255, 240, 250, 200]);
    img.rect(9, 33, 9, 3, [255, 255, 255, 160]);
    img.rect(12, 30, 3, 9, [255, 255, 255, 160]);
  },
];

// ---------- muri: blocco smussato con outline caldo + faccia a mattoni ----------
function wallCapTile(top, edge) {
  const img = new Img(T, T);
  rrect(img, 2, 2, T - 4, T - 4, 9, hex(top));
  rrect(img, 5, 5, T - 10, 9, 5, mix(top, 1.18));
  rrect(img, 5, T - 12, T - 10, 5, 3, mix(top, 0.82));
  for (let yy = 0; yy < T - 4; yy++) for (let xx = 0; xx < T - 4; xx++) {
    const cx = Math.min(xx, T - 5 - xx), cy = Math.min(yy, T - 5 - yy);
    if (cx < 9 && cy < 9) {
      const dx = 9 - cx, dy = 9 - cy;
      const inside = dx * dx + dy * dy <= 9 * 9;
      const prevInside = (() => {
        const px2 = Math.min(xx - 1, T - 6 - xx), py2 = Math.min(yy, T - 6 - yy);
        if (px2 < 9 && py2 < 9) { const a = 9 - px2, b = 9 - py2; return a * a + b * b <= 9 * 9; }
        return true;
      })();
      if (inside && !prevInside) img.px(xx + 2, yy + 2, hex(edge));
    }
  }
  return img;
}

function wallFrontTile(side, hi, edge) {
  const img = new Img(T, T);
  img.rect(0, 0, T, T, hex(side));
  for (let row = 0; row < 3; row++) {
    const y = row * 16;
    img.rect(0, y, T, 2, mix(side, 0.7));
    const off = row % 2 === 0 ? 0 : 12;
    img.rect((off + 12) % T, y, 2, 16, mix(side, 0.7));
    img.rect((off + 28) % T, y, 2, 16, mix(side, 0.7));
    img.rect(0, y + 2, T, 2, hex(hi));
  }
  img.rect(0, T - 3, T, 3, mix(side, 0.65));
  return img;
}

// ---------- oggetti ----------
function chestTile(body, lid, metal, gem) {
  const img = new Img(T, T);
  rrect(img, 8, 18, 32, 20, 5, hex(body));
  rrect(img, 8, 10, 32, 12, 6, hex(lid));
  rrect(img, 8, 10, 32, 4, 2, mix(lid, 1.2));
  img.rect(8, 20, 32, 3, hex(metal));
  img.rect(20, 10, 5, 28, hex(metal));
  rrect(img, 20, 22, 5, 8, 2, hex(gem));
  img.rect(10, 36, 28, 2, mix(body, 0.75));
  return img;
}

function torchTile() {
  const img = new Img(T, T);
  rrect(img, 20, 20, 8, 16, 3, [139, 90, 43, 255]);
  rrect(img, 17, 14, 14, 9, 4, [96, 64, 48, 255]);
  img.circle(24, 12, 7, [245, 130, 32, 255]);
  img.circle(24, 11, 4, [255, 220, 90, 255]);
  img.circle(24, 10, 2, [255, 255, 255, 255]);
  img.circle(24, 12, 10, [245, 130, 32, 60]);
  return img;
}

function portalTile(accent) {
  const img = new Img(T, T);
  img.circle(24, 24, 16, [...hex(accent), 70]);
  img.circle(24, 24, 12, [...hex(accent), 140]);
  img.circle(24, 24, 8, [255, 255, 255, 200]);
  img.circle(24, 24, 4, [255, 255, 255, 255]);
  return img;
}

function coinTile() {
  const img = new Img(T, T);
  img.circle(24, 24, 8, [224, 161, 12, 255]);
  img.circle(24, 24, 6, [255, 215, 94, 255]);
  img.rect(21, 20, 3, 3, [255, 255, 255, 255]);
  return img;
}

function gemTile(color) {
  const img = new Img(T, T);
  const c = hex(color);
  for (let dy = -8; dy <= 8; dy++) {
    const w = 8 - Math.abs(dy);
    img.rect(24 - w, 24 + dy, w * 2, 1, c);
  }
  img.rect(20, 18, 3, 3, [255, 255, 255, 255]);
  return img;
}

// ---------- assemblaggio atlas ----------
// riga 0: pavimenti A/B per bioma (contratto: bi*2 e bi*2+1)
const floorSets = [
  { base: "#eaf6d8", patch: "#d9eec2", light: "#f6fbee" },
  { base: "#e7e0d2", patch: "#d8cfbd", light: "#f4efe2" },
  { base: "#e4e1f5", patch: "#d3cfee", light: "#f7f6ff" },
];
floorSets.forEach((s, i) => {
  putTile(floorTile(s.base, s.patch, s.light, 101 + i, DECOR[i]), i * 2, 0);
  putTile(floorTile(s.base, s.patch, s.light, 202 + i, DECOR[i]), i * 2 + 1, 0);
});

// riga 1: cappelli muro (bi*2) + facce frontali (bi*2+1), casse a cols 6-8
BIOMES.forEach((b, i) => {
  putTile(wallCapTile(b.wallTop, b.outline), i * 2, 1);
  putTile(wallFrontTile(b.wallSide, mix(b.wallTop, 1.1)), i * 2 + 1, 1);
});
putTile(chestTile("#8b5a2b", "#c98d4e", "#f5b70a", "#f5b70a"), 6, 1);
putTile(chestTile("#e0a10c", "#ffd75e", "#fff3c4", "#f5b70a"), 7, 1);
putTile(chestTile("#8b6fe8", "#c4b0f5", "#f5b70a", "#f472b6"), 8, 1);

// riga 2: torcia (0), moneta (1), portale (2, contratto drawExit), gemma (3)
putTile(torchTile(), 0, 2);
putTile(coinTile(), 1, 2);
putTile(portalTile("#f5b70a"), 2, 2);
putTile(gemTile("#a78bfa"), 3, 2);

mkdirSync(join(root, "assets"), { recursive: true });
writeFileSync(join(root, "assets", "tiles.png"), encodePNG(atlas));

// ---------- player sheet 192x96: 4 direzioni x 2 frame ----------
function playerFrame(dir, frame) {
  const img = new Img(T, T);
  const bob = frame === 1 ? 1 : 0;
  img.ellipse(20, footY(frame), 3.5, 2.5, [12, 74, 110, 255]);
  img.ellipse(28, footY(frame) + (frame === 1 ? -1 : 1), 3.5, 2.5, [12, 74, 110, 255]);
  img.ellipse(24, 28 - bob, 11, 12 - bob, [56, 189, 248, 255]);
  img.ellipse(24, 16 - bob, 10, 5, [245, 183, 10, 255]);
  img.ellipse(24, 13 - bob, 7, 4, [245, 183, 10, 255]);
  const eyeDx = dir === 1 ? -3 : dir === 2 ? 3 : 0;
  if (dir !== 3) {
    img.circle(21 + eyeDx, 26 - bob, 2.5, [255, 255, 255, 255]);
    img.circle(27 + eyeDx, 26 - bob, 2.5, [255, 255, 255, 255]);
    img.circle(21 + eyeDx + (dir === 1 ? -1 : dir === 2 ? 1 : 0), 26 - bob, 1.2, [12, 40, 70, 255]);
    img.circle(27 + eyeDx + (dir === 1 ? -1 : dir === 2 ? 1 : 0), 26 - bob, 1.2, [12, 40, 70, 255]);
  }
  return img;
}

function footY(frame) { return frame === 1 ? 42 : 41; }

const sheet = new Img(4 * T, 2 * T);
const DIRS = ["down", "left", "right", "up"];
DIRS.forEach((_, dir) => {
  for (let frame = 0; frame < 2; frame++) {
    const f = playerFrame(dir, frame);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const si = (y * T + x) * 4, di = ((frame * T + y) * (4 * T)) + dir * T + x;
      const di4 = di * 4;
      sheet.d[di4] = f.d[si]; sheet.d[di4 + 1] = f.d[si + 1]; sheet.d[di4 + 2] = f.d[si + 2]; sheet.d[di4 + 3] = f.d[si + 3];
    }
  }
});
writeFileSync(join(root, "assets", "player.png"), encodePNG(sheet));

console.log("OK: assets/tiles.png (432x144) + assets/player.png (192x96)");
