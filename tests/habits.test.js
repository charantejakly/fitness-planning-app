import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWaterTarget,
  updateWaterIntake,
  evaluateWaterProgress,
  startFast,
  completeFast,
  cancelFast,
  getFastStatus,
  formatDuration
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

test("Habits: Fasting timer lifecycle (start, progress, complete, cancel)", () => {
  const baseTime = new Date("2026-11-12T00:00:00.000Z");
  const session = startFast(16, baseTime);
  assert.equal(session.targetHours, 16);
  assert.equal(session.completedAt, null);
  assert.equal(session.cancelledAt, null);

  // Status after 8 hours (50% through 16h fast)
  const halfTime = new Date("2026-11-12T08:00:00.000Z");
  const halfStatus = getFastStatus(session, halfTime);
  assert.equal(halfStatus.isActive, true);
  assert.equal(halfStatus.percent, 50);
  assert.equal(halfStatus.isTargetReached, false);
  assert.equal(halfStatus.elapsedSeconds, 8 * 3600);
  assert.equal(halfStatus.remainingSeconds, 8 * 3600);
  assert.equal(halfStatus.elapsedFormatted, "8:00:00");

  // Status after 16 hours (Target reached!)
  const fullTime = new Date("2026-11-12T16:00:00.000Z");
  const fullStatus = getFastStatus(session, fullTime);
  assert.equal(fullStatus.percent, 100);
  assert.equal(fullStatus.isTargetReached, true);
  assert.equal(fullStatus.remainingSeconds, 0);

  // Complete fast
  const completed = completeFast(session, fullTime);
  assert.ok(completed.completedAt);
  const completedStatus = getFastStatus(completed);
  assert.equal(completedStatus.isActive, false);
  assert.equal(completedStatus.isCompleted, true);

  // Cancel fast
  const cancelled = cancelFast(session, halfTime);
  assert.ok(cancelled.cancelledAt);
  const cancelStatus = getFastStatus(cancelled);
  assert.equal(cancelStatus.isActive, false);
  assert.equal(cancelStatus.isCancelled, true);
});

test("Habits: formatDuration formats seconds into H:MM:SS", () => {
  assert.equal(formatDuration(0), "0:00:00");
  assert.equal(formatDuration(65), "0:01:05");
  assert.equal(formatDuration(3661), "1:01:01");
  assert.equal(formatDuration(16 * 3600), "16:00:00");
});
