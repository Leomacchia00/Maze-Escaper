export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 4;
export const LEFT = 8;
export function neighborIndex(n, i, dir) {
    const x = i % n;
    switch (dir) {
        case TOP: return i - n >= 0 ? i - n : -1;
        case RIGHT: return x < n - 1 ? i + 1 : -1;
        case BOTTOM: return i + n < n * n ? i + n : -1;
        case LEFT: return x > 0 ? i - 1 : -1;
        default: return -1;
    }
}
export function canMove(maze, from, dir) {
    if (maze.walls[from] & dir)
        return false;
    return neighborIndex(maze.n, from, dir) >= 0;
}
export function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
export function generateMaze(n, rng = Math.random) {
    const walls = new Uint8Array(n * n).fill(TOP | RIGHT | BOTTOM | LEFT);
    const visited = new Uint8Array(n * n);
    const stack = [0];
    visited[0] = 1;
    while (stack.length > 0) {
        const cur = stack[stack.length - 1];
        const dirs = shuffle([TOP, RIGHT, BOTTOM, LEFT], rng);
        let advanced = false;
        for (const d of dirs) {
            const next = neighborIndex(n, cur, d);
            if (next >= 0 && !visited[next]) {
                walls[cur] &= ~d;
                walls[next] &= ~opposite(d);
                visited[next] = 1;
                stack.push(next);
                advanced = true;
                break;
            }
        }
        if (!advanced)
            stack.pop();
    }
    const maze = { n, walls, entrance: 0, exit: 0 };
    maze.exit = farthestCell(maze, 0);
    return maze;
}
function opposite(dir) {
    switch (dir) {
        case TOP: return BOTTOM;
        case RIGHT: return LEFT;
        case BOTTOM: return TOP;
        case LEFT: return RIGHT;
        default: return 0;
    }
}
export function bfs(maze, start) {
    const n = maze.n;
    const dist = new Int32Array(n * n).fill(-1);
    dist[start] = 0;
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++];
        for (const dir of [TOP, RIGHT, BOTTOM, LEFT]) {
            const next = neighborIndex(n, cur, dir);
            if (next >= 0 && dist[next] === -1 && (maze.walls[cur] & dir) === 0) {
                dist[next] = dist[cur] + 1;
                queue.push(next);
            }
        }
    }
    return dist;
}
export function farthestCell(maze, start) {
    const dist = bfs(maze, start);
    let best = start;
    for (let i = 0; i < dist.length; i++) {
        if (dist[i] > dist[best])
            best = i;
    }
    return best;
}
export function mazeSizeForLevel(level) {
    return Math.min(11 + (level - 1) * 2, 41);
}
