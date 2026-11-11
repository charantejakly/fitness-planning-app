import test from "node:test";
import assert from "node:assert/strict";
import { estimate1RM, bestSet1RM, e1rmSeries, best1RM, is1RMRecord, REP_CAP } from "../src/onerm.js";

test("1RM Estimator: 1 rep returns the weight itself", () => {
  assert.equal(estimate1RM(100, 1), 100);
  assert.equal(estimate1RM(62.5, 1), 62.5);
});

test("1RM Estimator: Epley formula calculation w * (1 + r/30)", () => {
  // 100 kg x 10 reps = 100 * (1 + 10/30) = 133.3 kg
  assert.equal(estimate1RM(100, 10), 133.3);
  // 80 kg x 6 reps = 80 * (1 + 6/30) = 96.0 kg
  assert.equal(estimate1RM(80, 6), 96.0);
});

test("1RM Estimator: enforces REP_CAP <= 12 and refuses invalid inputs", () => {
  assert.equal(estimate1RM(100, 13), null); // Over cap
  assert.equal(estimate1RM(100, 0), null);  // Invalid reps
  assert.equal(estimate1RM(0, 5), null);    // Zero weight
  assert.equal(estimate1RM(-50, 5), null);  // Negative weight
  assert.equal(estimate1RM("abc", 5), null);// NaN
});

test("1RM Estimator: bestSet1RM selects the highest estimate from sets", () => {
  const sets = [
    { weight: 80, reps: 10 }, // 106.7
    { weight: 90, reps: 8 },  // 114.0
    { weight: 100, reps: 5 }  // 116.7 (winner)
  ];
  const best = bestSet1RM(sets);
  assert.ok(best);
  assert.equal(best.est, 116.7);
  assert.equal(best.weight, 100);
  assert.equal(best.reps, 5);
});

test("1RM Estimator: e1rmSeries tracks chronological progression and PR records", () => {
  const workouts = [
    {
      date: "2026-11-01",
      exercises: [{ name: "Bench Press", sets: [{ weight: 80, reps: 5 }] }] // 93.3
    },
    {
      date: "2026-11-08",
      exercises: [{ name: "Bench Press", sets: [{ weight: 85, reps: 5 }] }] // 99.2
    }
  ];

  const series = e1rmSeries(workouts, "Bench Press");
  assert.equal(series.length, 2);
  assert.equal(series[0].est, 93.3);
  assert.equal(series[1].est, 99.2);

  const best = best1RM(workouts, "Bench Press");
  assert.equal(best.est, 99.2);

  // Check new record
  const checkPR = is1RMRecord(workouts, "Bench Press", 90, 5); // 105.0 -> new record
  assert.equal(checkPR.isRecord, true);
  assert.equal(checkPR.est, 105.0);

  // Check sub-record set
  const checkNoPR = is1RMRecord(workouts, "Bench Press", 70, 5); // 81.7 -> not a record
  assert.equal(checkNoPR.isRecord, false);
});

