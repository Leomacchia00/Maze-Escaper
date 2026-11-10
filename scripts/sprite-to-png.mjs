import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import jpeg from "jpeg-js";
import { deflateSync } from "node:zlib";

const IN = process.argv[2];
const OUT = process.argv[3];
const TARGET = Number(process.argv[4] || 96);

function crc32(buf) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32.table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const jpg = jpeg.decode(readFileSync(IN), { useTArray: true, formatAsRGBA: true });
const { width: W, height: H, data } = jpg;

const isMagenta = (r, g, b) => r > 130 && b > 130 && g < 110 && Math.abs(r - b) < 90;
let minX = W, minY = H, maxX = 0, maxY = 0;
const alpha = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  if (isMagenta(r, g, b)) {
    alpha[i] = 0;
  } else {
    alpha[i] = 255;
    const x = i % W, y = (i - x) / W;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const pad = 2;
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;

const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = ((minY + y) * W + (minX + x)) * 4;
    const di = (y * cw + x) * 4;
    let r = data[si], g = data[si + 1], b = data[si + 2];
    const mx = Math.max(r, b);
    if (mx > g && isMagenta(r, g, b) === false && mx - g > 60 && alpha[(minY + y) * W + (minX + x)] === 0) {
      r = g = b = 0;
    }
    crop[di] = r; crop[di + 1] = g; crop[di + 2] = b;
    crop[di + 3] = alpha[(minY + y) * W + (minX + x)];
  }
}

const out = Buffer.alloc(TARGET * TARGET * 4);
for (let y = 0; y < TARGET; y++) {
  for (let x = 0; x < TARGET; x++) {
    const sx = Math.min(cw - 1, Math.floor((x * cw) / TARGET));
    const sy = Math.min(ch - 1, Math.floor((y * ch) / TARGET));
    const di = (y * TARGET + x) * 4;
    const si = (sy * cw + sx) * 4;
    out[di] = crop[si]; out[di + 1] = crop[si + 1]; out[di + 2] = crop[si + 2]; out[di + 3] = crop[si + 3];
  }
}

mkdirSync("assets", { recursive: true });
writeFileSync(OUT, png(TARGET, TARGET, out));
console.log(`${OUT}: ${TARGET}x${TARGET} (ritagliato da ${cw}x${ch})`);
