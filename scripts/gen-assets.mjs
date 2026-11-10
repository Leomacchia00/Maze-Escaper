// Genera assets/tiles.png (atlas 9x3 tile da 48px) e assets/player.png (4 direzioni x 2 frame).
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

function hash2(x, y, s) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

// ---------- palette biomi ----------
const BIOMES = [
  { floorA: "#eaf6d8", floorB: "#d9eec2", decor: "#7ed957", wallTop: "#7ed957", wallSide: "#3f9e3f" },
  { floorA: "#e7e0d2", floorB: "#d8cfbd", decor: "#b08d5f", wallTop: "#b08d5f", wallSide: "#7a5c38" },
  { floorA: "#e4e1f5", floorB: "#d3cfee", decor: "#a78bfa", wallTop: "#a78bfa", wallSide: "#6d5bd0" },
];

// ---------- atlas tiles 9x3 ----------
const atlas = new Img(9 * T, 3 * T);

function floorTile(base, speck, light, seed) {
  const img = new Img(T, T);
  img.rect(0, 0, T, T, hex(base));
  for (let ly = 0; ly < 16; ly++) {
    for (let lx = 0; lx < 16; lx++) {
      const h = hash2(lx, ly, seed);
      if (h < 0.10) img.rect(lx * 3, ly * 3, 3, 3, hex(speck));
      else if (h > 0.92) img.rect(lx * 3, ly * 3, 3, 3, hex(light));
    }
  }
  return img;
}

function wallCap(top, edge) {
  const img = new Img(T, T);
  img.rect(0, 0, T, T, hex(top));
  img.rect(0, 0, T, 2, hex(edge));
  img.rect(0, T - 2, T, 2, hex(edge));
  img.rect(0, 0, 2, T, hex(edge));
  img.rect(T - 2, 0, 2, T, hex(edge));
  return img;
}

function wallFront(side, mortar, hi) {
  const img = new Img(T, T);
  img.rect(0, 0, T, T, hex(side));
  for (let row = 0; row < 3; row++) {
    const y = row * 16;
    img.rect(0, y, T, 2, hex(mortar));
    const off = row % 2 === 0 ? 0 : 12;
    img.rect((off + 12) % T, y, 2, 16, hex(mortar));
    img.rect((off + 28) % T, y, 2, 16, hex(mortar));
    img.rect(0, y + 2, T, 2, hex(hi));
  }
  return img;
}

function chestTile(body, lid, metal, gem) {
  const img = new Img(T, T);
  img.rect(9, 20, 30, 18, hex(body));
  img.rect(9, 12, 30, 9, hex(lid));
  img.rect(9, 20, 30, 2, hex(metal));
  img.rect(21, 12, 6, 26, hex(metal));
  img.rect(22, 24, 4, 7, hex(gem));
  img.rect(9, 36, 30, 2, hex("#00000055"));
  return img;
}

function torchTile() {
  const img = new Img(T, T);
  img.rect(21, 20, 6, 16, hex("#8b5a2b"));
  img.rect(19, 14, 10, 8, hex("#604030"));
  img.circle(24, 12, 7, [245, 130, 32, 255]);
  img.circle(24, 11, 4, [255, 220, 90, 255]);
  img.circle(24, 10, 2, [255, 255, 255, 255]);
  return img;
}

function portalTile(accent) {
  const img = new Img(T, T);
  img.circle(24, 24, 15, [...hex(accent), 90]);
  img.circle(24, 24, 11, [...hex(accent), 160]);
  img.circle(24, 24, 7, [255, 255, 255, 210]);
  return img;
}

function coinTile() {
  const img = new Img(T, T);
  img.circle(24, 24, 7, [224, 161, 12, 255]);
  img.circle(24, 24, 5, [255, 215, 94, 255]);
  img.rect(22, 20, 3, 3, [255, 255, 255, 255]);
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

// riga 0: pavimenti (A/B per bioma) + decorazioni
const floorSets = [
  { base: "#eaf6d8", speck: "#cfe4b0", light: "#f6fbee" },
  { base: "#e7e0d2", speck: "#cfc4a8", light: "#f4efe2" },
  { base: "#e4e1f5", speck: "#cfc8ee", light: "#f7f6ff" },
];
floorSets.forEach((s, i) => {
  atlas.copy?.(0, 0);
  const a = floorTile(s.base, s.speck, s.light, 101 + i);
  const b = floorTile(s.base, s.speck, s.light, 202 + i);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const si = (y * atlas.w + x) * 4, di = (y * atlas.w + (i * 2) * T + x) * 4;
    atlas.d[di] = a.d[si]; atlas.d[di + 1] = a.d[si + 1]; atlas.d[di + 2] = a.d[si + 2]; atlas.d[di + 3] = a.d[si + 3];
    const dj = (y * atlas.w + (i * 2 + 1) * T + x) * 4;
    atlas.d[dj] = b.d[si]; atlas.d[dj + 1] = b.d[si + 1]; atlas.d[dj + 2] = b.d[si + 2]; atlas.d[dj + 3] = b.d[si + 3];
  }
});

// riga 1: cappelli muro (A) + facce frontali (B) per bioma
BIOMES.forEach((b, i) => {
  const cap = wallCap(b.wallTop, b.wallSide);
  const front = wallFront(b.wallSide, "#00000044", hex(b.wallTop).map((v) => Math.min(255, v * 1.15)));
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const si = (y * T + x) * 4;
    const dCap = (y * atlas.w + (i * 2) * T + x) * 4 + T * 4 * atlas.w;
    const dFront = (y * atlas.w + (i * 2 + 1) * T + x) * 4 + T * 4 * atlas.w;
    atlas.d[dCap] = cap.d[si]; atlas.d[dCap + 1] = cap.d[si + 1]; atlas.d[dCap + 2] = cap.d[si + 2]; atlas.d[dCap + 3] = cap.d[si + 3];
    atlas.d[dFront] = front.d[si]; atlas.d[dFront + 1] = front.d[si + 1]; atlas.d[dFront + 2] = front.d[si + 2]; atlas.d[dFront + 3] = front.d[si + 3];
  }
});

// oggetti: torcia (col 6 riga 1 nella mini-griglia logica? no: riga 2)
torchTile();
coinTile();
gemTile("#a78bfa");
portalTile("#f5b70a");

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
