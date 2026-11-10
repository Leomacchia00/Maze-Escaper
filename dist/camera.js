export const VISIBLE_TILES = 11;
export const LIGHT_RADIUS = 3.5;
export function isLitNow(px, py, x, y, radius = LIGHT_RADIUS) {
    return Math.hypot(x + 0.5 - (px + 0.5), y + 0.5 - (py + 0.5)) <= radius;
}
export function darknessForLevel(level) {
    return Math.min(0.93, 0.55 + (level - 1) * 0.07);
}
export const RISE_RATIO = 0.3;
export const FRONT_RATIO = 0.42;
export function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}
export function cameraFor(px, py, size, width, height, visibleTiles = VISIBLE_TILES) {
    const tw = Math.min(width, height) / visibleTiles;
    const rise = tw * RISE_RATIO;
    const world = size * tw;
    const wantX = width / 2 - px * tw;
    const wantY = height / 2 - py * tw;
    let ox;
    let oy;
    if (world <= width) {
        ox = (width - world) / 2;
    }
    else {
        ox = clamp(wantX, width - world, 0);
    }
    if (world + rise <= height) {
        oy = (height - world + rise) / 2;
    }
    else {
        oy = clamp(wantY, height - world, rise);
    }
    return { size, tw, frontH: tw * FRONT_RATIO, rise, ox, oy };
}
export function visibleRange(cam, width, height, margin = 1) {
    const n = cam.size;
    const x0 = clamp(Math.floor(-cam.ox / cam.tw) - margin, 0, n - 1);
    const x1 = clamp(Math.floor((width - cam.ox) / cam.tw) + margin, 0, n - 1);
    const y0 = clamp(Math.floor((0 - cam.oy + cam.rise) / cam.tw) - margin, 0, n - 1);
    const y1 = clamp(Math.floor((height - cam.oy + cam.rise) / cam.tw) + margin, 0, n - 1);
    return { x0, y0, x1, y1 };
}
export function seenMask(visited, size) {
    const seen = new Uint8Array(size * size);
    for (let i = 0; i < visited.length; i++) {
        if (!visited[i])
            continue;
        seen[i] = 1;
        const x = i % size;
        const y = (i - x) / size;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= size || ny >= size)
                    continue;
                seen[ny * size + nx] = 1;
            }
        }
    }
    return seen;
}
