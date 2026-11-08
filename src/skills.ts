import { PlayerState } from "./storage.js";

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];
  requires?: { id: string; level: number };
}

export const SKILLS: SkillNode[] = [
  {
    id: "extra-time",
    name: "Tempo extra",
    description: "+5% sul tempo base di ogni run, per livello.",
    maxLevel: 3,
    costs: [20, 50, 120],
  },
  {
    id: "slow-timer",
    name: "Timer lento",
    description: "Il tempo scorre il 5% più lento, per livello.",
    maxLevel: 3,
    costs: [20, 50, 120],
    requires: { id: "extra-time", level: 1 },
  },
  {
    id: "vision",
    name: "Visione",
    description: "+1 al raggio del fog of war, per livello.",
    maxLevel: 3,
    costs: [20, 50, 120],
  },
  {
    id: "compass",
    name: "Bussola",
    description: "Freccia verso l'uscita sempre visibile sul canvas.",
    maxLevel: 3,
    costs: [20, 50, 120],
    requires: { id: "vision", level: 1 },
  },
];

export function skillNode(id: string): SkillNode {
  const node = SKILLS.find((s) => s.id === id);
  if (!node) throw new Error(`unknown skill: ${id}`);
  return node;
}

export function skillLevel(skills: Record<string, number>, id: string): number {
  return skills[id] ?? 0;
}

export function skillCost(skills: Record<string, number>, id: string): number | null {
  const node = skillNode(id);
  const level = skillLevel(skills, id);
  if (level >= node.maxLevel) return null;
  return node.costs[level];
}

export function requirementMet(skills: Record<string, number>, id: string): boolean {
  const node = skillNode(id);
  if (!node.requires) return true;
  return skillLevel(skills, node.requires.id) >= node.requires.level;
}

export function canBuy(player: PlayerState, id: string): boolean {
  const cost = skillCost(player.skills, id);
  return cost !== null && player.currency >= cost && requirementMet(player.skills, id);
}

export function buySkill(player: PlayerState, id: string): PlayerState {
  if (!canBuy(player, id)) return player;
  const cost = skillCost(player.skills, id)!;
  return {
    ...player,
    currency: player.currency - cost,
    skills: { ...player.skills, [id]: skillLevel(player.skills, id) + 1 },
  };
}

export function extraTimeMultiplier(skills: Record<string, number>): number {
  return 1 + 0.05 * skillLevel(skills, "extra-time");
}

export function timerSpeedFactor(skills: Record<string, number>): number {
  return 1 - 0.05 * skillLevel(skills, "slow-timer");
}

export function fogBonus(skills: Record<string, number>): number {
  return skillLevel(skills, "vision");
}

export function hasCompass(skills: Record<string, number>): boolean {
  return skillLevel(skills, "compass") >= 1;
}

export function coinsForRun(won: boolean, level: number): number {
  return won ? 10 + level * 2 : 2;
}

export function awardRunCoins(player: PlayerState, won: boolean, level: number): PlayerState {
  return { ...player, currency: player.currency + coinsForRun(won, level) };
}
