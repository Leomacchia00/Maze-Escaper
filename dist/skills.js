export const SKILLS = [
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
export function skillNode(id) {
    const node = SKILLS.find((s) => s.id === id);
    if (!node)
        throw new Error(`unknown skill: ${id}`);
    return node;
}
export function skillLevel(skills, id) {
    return skills[id] ?? 0;
}
export function skillCost(skills, id) {
    const node = skillNode(id);
    const level = skillLevel(skills, id);
    if (level >= node.maxLevel)
        return null;
    return node.costs[level];
}
export function requirementMet(skills, id) {
    const node = skillNode(id);
    if (!node.requires)
        return true;
    return skillLevel(skills, node.requires.id) >= node.requires.level;
}
export function canBuy(player, id) {
    const cost = skillCost(player.skills, id);
    return cost !== null && player.currency >= cost && requirementMet(player.skills, id);
}
export function buySkill(player, id) {
    if (!canBuy(player, id))
        return player;
    const cost = skillCost(player.skills, id);
    return {
        ...player,
        currency: player.currency - cost,
        skills: { ...player.skills, [id]: skillLevel(player.skills, id) + 1 },
    };
}
export function extraTimeMultiplier(skills) {
    return 1 + 0.05 * skillLevel(skills, "extra-time");
}
export function timerSpeedFactor(skills) {
    return 1 - 0.05 * skillLevel(skills, "slow-timer");
}
export function fogBonus(skills) {
    return skillLevel(skills, "vision");
}
export function hasCompass(skills) {
    return skillLevel(skills, "compass") >= 1;
}
export function coinsForRun(won, level) {
    return won ? 10 + level * 2 : 2;
}
export function awardRunCoins(player, won, level) {
    return { ...player, currency: player.currency + coinsForRun(won, level) };
}
