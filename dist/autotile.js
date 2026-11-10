export function neighborMask(d, x, y) {
    const solid = (xx, yy) => {
        if (xx < 0 || yy < 0 || xx >= d.size || yy >= d.size)
            return true;
        return d.solid[yy * d.size + xx] === 1;
    };
    return {
        n: solid(x, y - 1),
        ne: solid(x + 1, y - 1),
        e: solid(x + 1, y),
        se: solid(x + 1, y + 1),
        s: solid(x, y + 1),
        sw: solid(x - 1, y + 1),
        w: solid(x - 1, y),
        nw: solid(x - 1, y - 1),
    };
}
/**
 * Raggio di curvatura degli angoli interni, in frazione del tile.
 * 0.36 ≈ un terzo del tile: abbastanza visibile senza esagerare.
 */
export const CORNER_RADIUS = 0.36;
/**
 * Profondità dell'ombra proiettata dai muri sul pavimento, in frazione del tile.
 */
export const EDGE_SHADOW = 0.30;
