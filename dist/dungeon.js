import { randInt, shuffle } from "./rng.js";
export function dungeonSizeForLevel(level) {
    return Math.min(61, 21 + (level - 1) * 2);
}
export function roomCountForLevel(level) {
    return Math.min(12, 4 + Math.floor((level - 1) / 2));
}
export function isSolid(d, x, y) {
    if (x < 0 || y < 0 || x >= d.size || y >= d.size)
        return true;
    return d.solid[y * d.size + x] === 1;
}
export function rectCenter(r) {
    return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) };
}
function overlaps(a, b, gap) {
    return (a.x - gap < b.x + b.w &&
        a.x + a.w + gap > b.x &&
        a.y - gap < b.y + b.h &&
        a.y + a.h + gap > b.y);
}
function carveCell(d, x, y) {
    if (x > 0 && y > 0 && x < d.size - 1 && y < d.size - 1)
        d.solid[y * d.size + x] = 0;
}
function carveRect(d, r) {
    for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++)
            carveCell(d, x, y);
    }
}
function carveCorridor(d, ax, ay, bx, by) {
    let x = ax;
    let y = ay;
    while (x !== bx) {
        carveCell(d, x, y);
        x += bx > x ? 1 : -1;
    }
    while (y !== by) {
        carveCell(d, x, y);
        y += by > y ? 1 : -1;
    }
    carveCell(d, x, y);
}
export function bfsDistances(d, sx, sy) {
    const n = d.size;
    const dist = new Int32Array(n * n).fill(-1);
    const queue = new Int32Array(n * n);
    let head = 0;
    let tail = 0;
    const start = sy * n + sx;
    dist[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
        const cur = queue[head++];
        const cx = cur % n;
        const cy = (cur - cx) / n;
        const nd = dist[cur] + 1;
        const steps = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
        ];
        for (const [nx, ny] of steps) {
            if (nx < 0 || ny < 0 || nx >= n || ny >= n)
                continue;
            const idx = ny * n + nx;
            if (d.solid[idx] === 1 || dist[idx] !== -1)
                continue;
            dist[idx] = nd;
            queue[tail++] = idx;
        }
    }
    return dist;
}
export function reachableFloorCount(d, sx, sy) {
    const dist = bfsDistances(d, sx, sy);
    let count = 0;
    for (let i = 0; i < dist.length; i++)
        if (dist[i] >= 0)
            count++;
    return count;
}
export function floorCount(d) {
    let count = 0;
    for (let i = 0; i < d.solid.length; i++)
        if (d.solid[i] === 0)
            count++;
    return count;
}
export function generateDungeon(size, roomCount, rng) {
    const solid = new Uint8Array(size * size).fill(1);
    const rooms = [];
    const attempts = roomCount * 80;
    for (let i = 0; i < attempts && rooms.length < roomCount; i++) {
        const w = randInt(rng, 1, 3) * 2 + 1;
        const h = randInt(rng, 1, 3) * 2 + 1;
        const x = 1 + 2 * Math.floor(rng() * ((size - 1 - w) / 2));
        const y = 1 + 2 * Math.floor(rng() * ((size - 1 - h) / 2));
        const r = { x, y, w, h };
        if (rooms.some((o) => overlaps(r, o, 2)))
            continue;
        rooms.push(r);
    }
    const d = {
        size,
        solid,
        rooms,
        entrance: { x: 1, y: 1 },
        exit: { x: 1, y: 1 },
    };
    for (const r of rooms)
        carveRect(d, r);
    fillMaze(d, rng);
    carveDoors(d, rooms, rng);
    braid(d, rng, 0.35);
    const first = rectCenter(rooms[0]);
    d.entrance = first;
    repairConnectivity(d, first);
    const dist = bfsDistances(d, first.x, first.y);
    let best = first;
    let bestDist = -1;
    for (const r of rooms) {
        const c = rectCenter(r);
        const dd = dist[c.y * d.size + c.x];
        if (dd > bestDist) {
            bestDist = dd;
            best = c;
        }
    }
    d.exit = best;
    return d;
}
function fillMaze(d, rng) {
    const n = d.size;
    const visited = new Uint8Array(n * n);
    const dirs = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
    ];
    for (let sy = 1; sy < n; sy += 2) {
        for (let sx = 1; sx < n; sx += 2) {
            const start = sy * n + sx;
            if (d.solid[start] === 0 || visited[start])
                continue;
            visited[start] = 1;
            d.solid[start] = 0;
            const stack = [[sx, sy]];
            while (stack.length > 0) {
                const top = stack[stack.length - 1];
                const order = shuffle([...dirs], rng);
                let moved = false;
                for (const [dx, dy] of order) {
                    const nx = top[0] + dx;
                    const ny = top[1] + dy;
                    if (nx < 1 || ny < 1 || nx > n - 2 || ny > n - 2)
                        continue;
                    const nIdx = ny * n + nx;
                    if (visited[nIdx] || d.solid[nIdx] === 0)
                        continue;
                    visited[nIdx] = 1;
                    d.solid[(top[1] + dy / 2) * n + (top[0] + dx / 2)] = 0;
                    d.solid[nIdx] = 0;
                    stack.push([nx, ny]);
                    moved = true;
                    break;
                }
                if (!moved)
                    stack.pop();
            }
        }
    }
}
function regionLabels(d) {
    const n = d.size;
    const labels = new Int32Array(n * n).fill(-1);
    let current = 0;
    for (let i = 0; i < n * n; i++) {
        if (d.solid[i] === 1 || labels[i] !== -1)
            continue;
        const queue = [i];
        labels[i] = current;
        let head = 0;
        while (head < queue.length) {
            const cur = queue[head++];
            const cx = cur % n;
            const cy = (cur - cx) / n;
            const steps = [
                [cx + 1, cy],
                [cx - 1, cy],
                [cx, cy + 1],
                [cx, cy - 1],
            ];
            for (const [nx, ny] of steps) {
                if (nx < 0 || ny < 0 || nx >= n || ny >= n)
                    continue;
                const idx = ny * n + nx;
                if (d.solid[idx] === 1 || labels[idx] !== -1)
                    continue;
                labels[idx] = current;
                queue.push(idx);
            }
        }
        current++;
    }
    return labels;
}
function carveDoors(d, rooms, rng) {
    const n = d.size;
    const labels = regionLabels(d);
    for (const r of rooms) {
        const candidates = [];
        for (let y = r.y - 1; y <= r.y + r.h; y++) {
            for (let x = r.x - 1; x <= r.x + r.w; x++) {
                if (x < 1 || y < 1 || x > n - 2 || y > n - 2)
                    continue;
                const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
                if (inside)
                    continue;
                const idx = y * n + x;
                if (d.solid[idx] !== 1)
                    continue;
                let touchesRoom = false;
                let touchesOther = false;
                const steps = [
                    [x + 1, y],
                    [x - 1, y],
                    [x, y + 1],
                    [x, y - 1],
                ];
                for (const [nx, ny] of steps) {
                    if (nx < 0 || ny < 0 || nx >= n || ny >= n)
                        continue;
                    const nIdx = ny * n + nx;
                    if (d.solid[nIdx] === 1)
                        continue;
                    const inRoom = nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h;
                    if (inRoom)
                        touchesRoom = true;
                    else if (labels[nIdx] >= 0)
                        touchesOther = true;
                }
                if (touchesRoom && touchesOther)
                    candidates.push([x, y]);
            }
        }
        shuffle(candidates, rng);
        const doors = Math.min(candidates.length, 2 + Math.floor(rng() * 2));
        for (let i = 0; i < doors; i++) {
            const [dx, dy] = candidates[i];
            d.solid[dy * n + dx] = 0;
        }
    }
}
function braid(d, rng, chance) {
    const n = d.size;
    const floorNeighbors = (x, y) => {
        let count = 0;
        const steps = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
        ];
        for (const [nx, ny] of steps) {
            if (nx >= 0 && ny >= 0 && nx < n && ny < n && d.solid[ny * n + nx] === 0)
                count++;
        }
        return count;
    };
    const deadEnds = [];
    for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
            if (d.solid[y * n + x] === 0 && floorNeighbors(x, y) === 1)
                deadEnds.push([x, y]);
        }
    }
    shuffle(deadEnds, rng);
    for (const [x, y] of deadEnds) {
        if (rng() > chance)
            continue;
        const walls = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
        ].filter(([nx, ny]) => nx > 0 && ny > 0 && nx < n - 1 && ny < n - 1 && d.solid[ny * n + nx] === 1);
        shuffle(walls, rng);
        for (const [wx, wy] of walls) {
            if (floorNeighbors(wx, wy) >= 2) {
                d.solid[wy * n + wx] = 0;
                break;
            }
        }
    }
}
function repairConnectivity(d, entrance) {
    const n = d.size;
    for (let pass = 0; pass < 40; pass++) {
        const dist = bfsDistances(d, entrance.x, entrance.y);
        let unreachable = false;
        for (let i = 0; i < n * n; i++) {
            if (d.solid[i] === 0 && dist[i] === -1)
                unreachable = true;
        }
        if (!unreachable)
            return;
        let carved = false;
        for (let y = 1; y < n - 1 && !carved; y++) {
            for (let x = 1; x < n - 1 && !carved; x++) {
                const idx = y * n + x;
                if (d.solid[idx] !== 1)
                    continue;
                const steps = [
                    [x + 1, y],
                    [x - 1, y],
                    [x, y + 1],
                    [x, y - 1],
                ];
                let hasReachable = false;
                let hasUnreachable = false;
                for (const [nx, ny] of steps) {
                    if (nx < 0 || ny < 0 || nx >= n || ny >= n)
                        continue;
                    const nIdx = ny * n + nx;
                    if (d.solid[nIdx] === 1)
                        continue;
                    if (dist[nIdx] === -1)
                        hasUnreachable = true;
                    else
                        hasReachable = true;
                }
                if (hasReachable && hasUnreachable) {
                    d.solid[idx] = 0;
                    carved = true;
                }
            }
        }
        if (!carved) {
            let target = null;
            for (let i = 0; i < n * n && !target; i++) {
                if (d.solid[i] === 0 && dist[i] === -1)
                    target = [i % n, Math.floor(i / n)];
            }
            if (!target)
                return;
            carveCorridor(d, entrance.x, entrance.y, target[0], target[1]);
        }
    }
}
