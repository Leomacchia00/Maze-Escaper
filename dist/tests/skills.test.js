import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILL_TREE, skillEffects, canBuy, buySkill, branchOf, } from "../skills.js";
test("l'albero ha 3 rami da 3 livelli", () => {
    assert.equal(SKILL_TREE.length, 9);
    assert.equal(branchOf(SKILL_TREE, "aria").length, 3);
    assert.equal(branchOf(SKILL_TREE, "passo").length, 3);
    assert.equal(branchOf(SKILL_TREE, "fortuna").length, 3);
});
test("i costi crescono dentro ogni ramo", () => {
    for (const branch of ["aria", "passo", "fortuna"]) {
        const costs = branchOf(SKILL_TREE, branch).map((n) => n.cost);
        assert.ok(costs[0] < costs[1] && costs[1] < costs[2], `costi non crescenti in ${branch}`);
    }
});
test("i prerequisiti puntano al livello precedente dello stesso ramo", () => {
    for (const node of SKILL_TREE) {
        if (!node.requires)
            continue;
        const req = SKILL_TREE.find((n) => n.id === node.requires);
        assert.ok(req, `prerequisito inesistente: ${node.requires}`);
        assert.equal(req.branch, node.branch);
        assert.ok(req.cost < node.cost);
    }
});
test("effetti vuoti senza skill acquistate", () => {
    const fx = skillEffects({});
    assert.equal(fx.airMult, 1);
    assert.equal(fx.speedMult, 1);
    assert.equal(fx.coinMult, 1);
});
test("effetti cumulativi con tutti i rami maxati", () => {
    const all = {};
    for (const n of SKILL_TREE)
        all[n.id] = true;
    const fx = skillEffects(all);
    assert.ok(fx.airMult > 1.9);
    assert.ok(fx.speedMult > 1.5);
    assert.ok(fx.coinMult > 1.6);
});
test("canBuy: bloccato senza prerequisito", () => {
    const air2 = SKILL_TREE.find((n) => n.id === "air2");
    assert.equal(canBuy(air2, {}, 1000), "locked");
});
test("canBuy: povero senza monete sufficienti", () => {
    const air1 = SKILL_TREE.find((n) => n.id === "air1");
    assert.equal(canBuy(air1, {}, 10), "poor");
});
test("canBuy: già posseduta", () => {
    const air1 = SKILL_TREE.find((n) => n.id === "air1");
    assert.equal(canBuy(air1, { air1: true }, 1000), "owned");
});
test("canBuy: disponibile con prerequisito e monete", () => {
    const air2 = SKILL_TREE.find((n) => n.id === "air2");
    assert.equal(canBuy(air2, { air1: true }, 1000), null);
});
test("buySkill: scala le monete e compra", () => {
    const res = buySkill({}, "air1", 50);
    assert.ok(res);
    assert.equal(res.coins, 20);
    assert.equal(res.owned.air1, true);
});
test("buySkill: rifiuta se bloccata o povera", () => {
    assert.equal(buySkill({}, "air2", 1000), null);
    assert.equal(buySkill({}, "air1", 5), null);
});
test("buySkill: rifiuta doppio acquisto", () => {
    const res = buySkill({ air1: true }, "air1", 1000);
    assert.equal(res, null);
});
