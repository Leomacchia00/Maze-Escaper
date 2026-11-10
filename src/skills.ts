export type SkillId =
  | "air1" | "air2" | "air3"
  | "speed1" | "speed2" | "speed3"
  | "luck1" | "luck2" | "luck3";

export type Branch = "aria" | "passo" | "fortuna";

export interface SkillNode {
  id: SkillId;
  name: string;
  desc: string;
  cost: number;
  requires: SkillId | null;
  branch: Branch;
  emoji: string;
}

export const SKILL_TREE: SkillNode[] = [
  { id: "air1", name: "Filtro nuovo", desc: "+15% aria della maschera", cost: 30, requires: null, branch: "aria", emoji: "🌬️" },
  { id: "air2", name: "Doppio filtro", desc: "+30% aria della maschera", cost: 90, requires: "air1", branch: "aria", emoji: "😷" },
  { id: "air3", name: "Polmoni d'acciaio", desc: "+50% aria della maschera", cost: 220, requires: "air2", branch: "aria", emoji: "🫁" },
  { id: "speed1", name: "Passo lesto", desc: "+10% velocità", cost: 30, requires: null, branch: "passo", emoji: "👟" },
  { id: "speed2", name: "Scatto", desc: "+20% velocità", cost: 90, requires: "speed1", branch: "passo", emoji: "🏃" },
  { id: "speed3", name: "Vento nelle gambe", desc: "+30% velocità", cost: 220, requires: "speed2", branch: "passo", emoji: "💨" },
  { id: "luck1", name: "Occhio attento", desc: "+10% monete dalle casse", cost: 30, requires: null, branch: "fortuna", emoji: "👀" },
  { id: "luck2", name: "Mani di fata", desc: "+20% monete dalle casse", cost: 90, requires: "luck1", branch: "fortuna", emoji: "✨" },
  { id: "luck3", name: "Stella fortunata", desc: "+35% monete dalle casse", cost: 220, requires: "luck2", branch: "fortuna", emoji: "🌟" },
];

export type Owned = Partial<Record<SkillId, boolean>>;

export interface SkillEffects {
  airMult: number;
  speedMult: number;
  coinMult: number;
}

export function skillEffects(owned: Owned): SkillEffects {
  let airMult = 1;
  let speedMult = 1;
  let coinMult = 1;
  if (owned.air1) airMult += 0.15;
  if (owned.air2) airMult += 0.3;
  if (owned.air3) airMult += 0.5;
  if (owned.speed1) speedMult += 0.1;
  if (owned.speed2) speedMult += 0.2;
  if (owned.speed3) speedMult += 0.3;
  if (owned.luck1) coinMult += 0.1;
  if (owned.luck2) coinMult += 0.2;
  if (owned.luck3) coinMult += 0.35;
  return { airMult, speedMult, coinMult };
}

export type BuyBlock = "locked" | "poor" | "owned";

export function canBuy(node: SkillNode, owned: Owned, coins: number): BuyBlock | null {
  if (owned[node.id]) return "owned";
  if (node.requires && !owned[node.requires]) return "locked";
  if (coins < node.cost) return "poor";
  return null;
}

export function buySkill(
  owned: Owned, id: SkillId, coins: number
): { owned: Owned; coins: number } | null {
  const node = SKILL_TREE.find((n) => n.id === id);
  if (!node || canBuy(node, owned, coins) !== null) return null;
  return { owned: { ...owned, [id]: true }, coins: coins - node.cost };
}

export function branchOf(tree: SkillNode[], branch: Branch): SkillNode[] {
  return tree.filter((n) => n.branch === branch);
}
