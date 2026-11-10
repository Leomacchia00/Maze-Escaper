import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) assert.ok(buf[i] === sig[i], `${path} non è un PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe("asset generati", () => {
  it("tiles.png è un atlas 432x144", () => {
    const { w, h } = pngSize(join("assets", "tiles.png"));
    assert.equal(w, 432);
    assert.equal(h, 144);
  });

  it("player.png è uno sheet 192x96", () => {
    const { w, h } = pngSize(join("assets", "player.png"));
    assert.equal(w, 192);
    assert.equal(h, 96);
  });
});
