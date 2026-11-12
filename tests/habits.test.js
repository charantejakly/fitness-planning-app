import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWaterTarget,
  updateWaterIntake,
  evaluateWaterProgress
} from "../src/habits.js";

test("Habits: calculateWaterTarget computes 35ml/kg clamped within safe bounds", () => {
  assert.equal(calculateWaterTarget(70), 2450); // 70 * 35 = 2450
  assert.equal(calculateWaterTarget(30), 1500); // Clamped minimum
  assert.equal(calculateWaterTarget(150), 4500); // Clamped maximum
});

test("Habits: updateWaterIntake handles increments, decrements, and non-negative clamping", () => {
  let logs = {};
  logs = updateWaterIntake(logs, "2026-11-12", 250);
  assert.equal(logs["2026-11-12"], 250);

  logs = updateWaterIntake(logs, "2026-11-12", 500);
  assert.equal(logs["2026-11-12"], 750);

  logs = updateWaterIntake(logs, "2026-11-12", -250);
  assert.equal(logs["2026-11-12"], 500);

  // Clamping at zero
  logs = updateWaterIntake(logs, "2026-11-12", -1000);
  assert.equal(logs["2026-11-12"], 0);
});

test("Habits: evaluateWaterProgress calculates percent and remaining accurately", () => {
  const logs = { "2026-11-12": 1500 };
  const progress = evaluateWaterProgress(logs, "2026-11-12", 2000);
  assert.equal(progress.currentMl, 1500);
  assert.equal(progress.targetMl, 2000);
  assert.equal(progress.percent, 75);
  assert.equal(progress.remainingMl, 500);
});


