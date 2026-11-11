import test from "node:test";
import assert from "node:assert/strict";
import { parseEffort, isHardSet, HARD_RIR_CEILING } from "../src/effort.js";
import { calculateDailyHeatmap } from "../src/heatmap.js";

test("Effort Parser: parses RIR and RPE representations correctly", () => {
  assert.deepEqual(parseEffort("failure"), { kind: "rir", rir: 0, rpe: 10, raw: "failure" });
  assert.deepEqual(parseEffort("RIR 2"), { kind: "rir", rir: 2, rpe: 8, raw: "RIR 2" });
  assert.deepEqual(parseEffort("RPE 8.5"), { kind: "rpe", rpe: 8.5, rir: 1.5, raw: "RPE 8.5" });
  assert.deepEqual(parseEffort("@9"), { kind: "rpe", rpe: 9, rir: 1, raw: "@9" });
  assert.deepEqual(parseEffort("0"), { kind: "rir", rir: 0, rpe: 10, raw: "0" });
  assert.deepEqual(parseEffort("8"), { kind: "rpe", rpe: 8, rir: 2, raw: "8" });
  assert.equal(parseEffort(""), null);
  assert.equal(parseEffort(null), null);
});

test("Effort Parser: isHardSet identifies sets near failure (RIR <= 2 / RPE >= 8)", () => {
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RIR 0" }), true);
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RIR 2" }), true);
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RPE 8" }), true);
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RPE 9.5" }), true);
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RIR 3" }), false);
  assert.equal(isHardSet({ reps: 8, weight: 80, effort: "RPE 7" }), false);
  assert.equal(isHardSet({ reps: 8, weight: 80 }), false); // unrated set
});

test("Heatmap Filter: calculateDailyHeatmap filters sets by All vs Hard Sets", () => {
  const sessions = [
    {
      date: "2026-11-10",
      exercises: [
        {
          name: "Barbell Bench Press",
          category: "Chest",
          muscleMapping: { primary: ["chest"], secondary: [] },
          sets: [
            { reps: 10, weight: 60, effort: "RIR 4" }, // Warmup / easy (not hard)
            { reps: 8, weight: 80, effort: "RIR 2" },  // Hard set
            { reps: 6, weight: 85, effort: "RIR 0" }   // Hard set (failure)
          ]
        }
      ]
    }
  ];

  // All sets: 3 sets
  const allHeatmap = calculateDailyHeatmap(sessions, undefined, "all");
  assert.equal(allHeatmap.totalSets, 3);
  assert.equal(allHeatmap.muscles.chest.sets, 3);

  // Hard sets only: 2 sets
  const hardHeatmap = calculateDailyHeatmap(sessions, undefined, "hard");
  assert.equal(hardHeatmap.totalSets, 2);
  assert.equal(hardHeatmap.muscles.chest.sets, 2);
});

