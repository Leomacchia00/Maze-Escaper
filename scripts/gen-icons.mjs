import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

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
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), Buffer.concat([Buffer.alloc(0)]) , chunk("IEND", Buffer.alloc(0))]);
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const green = [88, 182, 76];
  const cream = [253, 248, 236];
  const sunny = [255, 201, 60];
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, green);
  const ringW = Math.max(3, Math.round(size * 0.06));
  const rings = [0.14, 0.3, 0.46];
  for (let ri = 0; ri < rings.length; ri++) {
    const inset = Math.round(size * rings[ri]);
    const half = size - 1 - inset;
    const col = ri === 1 ? sunny : cream;
    for (let k = inset; k <= half; k++) {
      for (let w = 0; w < ringW; w++) {
        set(k, inset + w, col);
        set(k, half - w, col);
        set(inset + w, k, col);
        set(half - w, k, col);
      }
    }
  }
  const mid = Math.round(size / 2);
  const outer = Math.round(size * 0.86);
  for (let y = mid - ringW * 2; y <= mid + ringW * 2; y++) {
    for (let w = 0; w < ringW; w++) {
      set(outer - w, y, green);
      set(outer - ringW - w, y, green);
    }
  }
  return png(size, size, rgba);
}

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon-192.png", drawIcon(192));
writeFileSync("icons/icon-512.png", drawIcon(512));
console.log("icons generated");
