export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 4;
export const LEFT = 8;

export interface Maze {
  n: number;
  walls: Uint8Array;
  entrance: number;
  exit: number;
}

export type Rng = () => number;

export function mazeSizeForLevel(level: number): number {
  return Math.min(11 + (level - 1) * 2, 41);
}

export function idx(maze: Maze, x: number, y: number): number {
  return y * maze.n + x;
}

export function xy(maze: Maze, i: number): { x: number; y: number } {
  return { x: i % maze.n, y: Math.floor(i / maze.n) };
}

function opposite(dir: number): number {
  switch (dir) {
    case TOP: return BOTTOM;
    case RIGHT: return LEFT;
    case BOTTOM: return TOP;
    case LEFT: return RIGHT;
    default: return 0;
  }
}

export function neighborIndex(n: number, i: number, dir: number): number {
  const x = i % n;
  const y = Math.floor(i / n);
  switch (dir) {
    case TOP: return y > 0 ? y * n + x - n : -1;
    case RIGHT: return x < n - 1 ? i + 1 : -1;
    case BOTTOM: return y < n - 1 ? i + n : -1;
    case LEFT: return x > 0 ? i - 1 : -1;
    default: return -1;
  }
}

export function canMove(maze: Maze, from: number, dir: number): boolean {
  if ((maze.walls[from] & dir) === 0) {
    return neighborIndex(maze.n, from, dir) >= 0;
  }
  return false;
}

export function generateMaze(n: number, rng: Rng = Math.random): Maze {
  const walls = new Uint8Array(n * n).fill(TOP | RIGHT | BOTTOM | LEFT);
  const visited = new Uint8Array(n * n);
  const directions = [TOP, RIGHT, BOTTOM, LEFT];

  const start = 0;
  visited[start] = 1;
  const stack: number[] = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisited: number[] = [];
    for (const dir of directions) {
      const next = neighborIndex(n, current, dir);
      if (next >= 0 && !visited[next]) unvisited.push(dir);
    }
    if (unvisited.length === 0) {
      stack.pop();
      continue;
    }
    const dir = unvisited[Math.floor(rng() * unvisited.length)];
    const next = neighborIndex(n, current, dir);
    walls[current] &= ~dir;
    walls[next] &= ~opposite(dir);
    visited[next] = 1;
    stack.push(next);
  }

  const maze: Maze = { n, walls, entrance: start, exit: start };
  maze.exit = farthestCell(maze, start);
  return maze;
}

export function bfs(maze: Maze, start: number): Int32Array {
  const n = maze.n;
  const dist = new Int32Array(n * n).fill(-1);
  dist[start] = 0;
  const queue: number[] = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const dir of [TOP, RIGHT, BOTTOM, LEFT]) {
      if (!canMove(maze, current, dir)) continue;
      const next = neighborIndex(n, current, dir);
      if (dist[next] === -1) {
        dist[next] = dist[current] + 1;
        queue.push(next);
      }
    }
  }
  return dist;
}

export function farthestCell(maze: Maze, start: number): number {
  const dist = bfs(maze, start);
  let best = start;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] > dist[best]) best = i;
  }
  return best;
}
