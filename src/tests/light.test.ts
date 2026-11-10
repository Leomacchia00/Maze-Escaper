import { test } from "node:test";
import assert from "assert/strict";
import { isLitNow, LIGHT_RADIUS } from "../camera.js";

test("isLitNow: la cella del player è sempre illuminata", () => {
  assert.equal(isLitNow(2, 2, 2, 2), true);
});

test("isLitNow: celle entro il raggio sono illuminate", () => {
  assert.equal(isLitNow(5, 5, 6, 5), true);
  assert.equal(isLitNow(5, 5, 5, 7), true);
});

test("isLitNow: celle oltre il raggio non lo sono", () => {
  assert.equal(isLitNow(5, 5, 5, 5 + Math.ceil(LIGHT_RADIUS) + 1), false);
  assert.equal(isLitNow(0, 0, 10, 10), false);
});

test("isLitNow: raggio personalizzato rispettato", () => {
  assert.equal(isLitNow(0, 0, 1, 1, 1.5), true);
  assert.equal(isLitNow(0, 0, 3, 0, 1.5), false);
});
