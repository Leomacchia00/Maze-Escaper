import { test } from "node:test";
import assert from "assert/strict";
import { darknessForLevel } from "../camera.js";

test("darknessForLevel: parte chiara e scurisce col livello", () => {
  const l1 = darknessForLevel(1);
  const l5 = darknessForLevel(5);
  const l20 = darknessForLevel(20);
  assert.ok(l1 < l5 && l5 < l20, "monotona crescente");
  assert.ok(l1 > 0.1, "livello 1 non completamente buio");
  assert.ok(l20 <= 0.93, "cap al 93%");
});

test("darknessForLevel: mai oltre il cap", () => {
  for (let lv = 1; lv <= 60; lv++) {
    const d = darknessForLevel(lv);
    assert.ok(d >= 0.55 && d <= 0.93);
  }
});
