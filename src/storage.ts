export interface Stats {
  played: number;
  won: number;
  lost: number;
}

export interface PlayerSettings {
  vibration: boolean;
}

export interface PlayerState {
  level: number;
  bestScores: Record<number, number>;
  stats: Stats;
  currency: number;
  skills: Record<string, number>;
  settings: PlayerSettings;
}

const STORAGE_KEY = "maze-escaper:v1:player";

export function defaultPlayerState(): PlayerState {
  return {
    level: 1,
    bestScores: {},
    stats: { played: 0, won: 0, lost: 0 },
    currency: 0,
    skills: {},
    settings: { vibration: true },
  };
}

export function loadPlayerState(storage: Storage | null = getLocalStorage()): PlayerState {
  if (!storage) return defaultPlayerState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultPlayerState();
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    const fallback = defaultPlayerState();
    return {
      ...fallback,
      ...parsed,
      bestScores: { ...parsed.bestScores },
      stats: { ...fallback.stats, ...parsed.stats },
      skills: { ...parsed.skills },
      settings: { ...fallback.settings, ...parsed.settings },
    };
  } catch {
    return defaultPlayerState();
  }
}

export function savePlayerState(state: PlayerState, storage: Storage | null = getLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode / quota): progress is not persisted
  }
}

export function recordRunResult(
  state: PlayerState,
  level: number,
  won: boolean,
  score: number | null
): PlayerState {
  const stats = {
    played: state.stats.played + 1,
    won: state.stats.won + (won ? 1 : 0),
    lost: state.stats.lost + (won ? 0 : 1),
  };
  const level_ = won ? Math.max(state.level, level + 1) : state.level;
  let bestScores = state.bestScores;
  if (won && score !== null && score > (state.bestScores[level] ?? -1)) {
    bestScores = { ...state.bestScores, [level]: score };
  }
  return { ...state, level: level_, bestScores, stats };
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}
