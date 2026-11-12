import test from "node:test";
import assert from "node:assert/strict";
import { calculatePlates, DEFAULT_PLATES_KG, DEFAULT_BAR_KG } from "../src/plates.js";
import { generateWarmupSets } from "../src/warmup.js";

test("Plates: Empty bar returns 0 plates and exact match", () => {
  const result = calculatePlates(20, 20);
  assert.equal(result.achievedKg, 20);
  assert.equal(result.remainderKg, 0);
  assert.equal(result.exact, true);
  assert.equal(result.platesPerSide.length, 0);
  assert.match(result.summaryText, /Bar only/);
});

test("Plates: 60kg target with 20kg bar calculates 1x20kg plate per sleeve", () => {
  const result = calculatePlates(60, 20);
  assert.equal(result.achievedKg, 60);
  assert.equal(result.exact, true);
  assert.equal(result.platesPerSide.length, 1);
  assert.equal(result.platesPerSide[0].weightKg, 20);
  assert.equal(result.platesPerSide[0].count, 1);
  assert.equal(result.summaryText, "1×20kg each side");
});

test("Plates: 102.5kg target calculates 25kg + 15kg + 1.25kg per sleeve", () => {
  // (102.5 - 20) / 2 = 41.25 kg per side -> 25 + 15 + 1.25
  const result = calculatePlates(102.5, 20);
  assert.equal(result.achievedKg, 102.5);
  assert.equal(result.exact, true);
  assert.equal(result.platesPerSide.length, 3);
  assert.equal(result.platesPerSide[0].weightKg, 25);
  assert.equal(result.platesPerSide[1].weightKg, 15);
  assert.equal(result.platesPerSide[2].weightKg, 1.25);
});

test("Plates: Handles target below bar weight safely", () => {
  const result = calculatePlates(15, 20);
  assert.equal(result.belowBar, true);
  assert.equal(result.achievedKg, 20);
  assert.equal(result.exact, false);
});

test("Warmup: Standard Wendler ramp creates 40%, 60%, 80% rungs snapped to bar increments", () => {
  const sets = generateWarmupSets(100, "standard", 20, 2.5);
  assert.equal(sets.length, 3);

  // 40% of 100 = 40kg
  assert.equal(sets[0].weight, 40);
  assert.equal(sets[0].reps, 8);
  assert.equal(sets[0].effort, "warmup");

  // 60% of 100 = 60kg
  assert.equal(sets[1].weight, 60);
  assert.equal(sets[1].reps, 5);

  // 80% of 100 = 80kg
  assert.equal(sets[2].weight, 80);
  assert.equal(sets[2].reps, 3);
});

test("Warmup: Quick ramp creates 50% and 80% sets", () => {
  const sets = generateWarmupSets(100, "quick", 20, 2.5);
  assert.equal(sets.length, 2);
  assert.equal(sets[0].weight, 50);
  assert.equal(sets[0].reps, 5);
  assert.equal(sets[1].weight, 80);
  assert.equal(sets[1].reps, 3);
});

test("Warmup: Drops sets when working weight is equal to or below the barbell", () => {
  const sets = generateWarmupSets(20, "standard", 20, 2.5);
  assert.equal(sets.length, 0);
});
