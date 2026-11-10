import { Dungeon } from "./dungeon.js";

/**
 * Sistema di autotiling "smooth terrain": ogni cella di pavimento disegna
 * transizioni arrotondate verso i muri adiacenti, calcolando una maschera
 * a 8 vicini. Le transizioni sono composte a runtime (niente 47 varianti
 * pre-generate): base tile + archi di angolo + ombre di bordo.
 */

export interface NeighborMask {
  n: boolean;
  ne: boolean;
  e: boolean;
  se: boolean;
  s: boolean;
  sw: boolean;
  w: boolean;
  nw: boolean;
}

export function neighborMask(d: Dungeon, x: number, y: number): NeighborMask {
  const solid = (xx: number, yy: number): boolean => {
    if (xx < 0 || yy < 0 || xx >= d.size || yy >= d.size) return true;
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
