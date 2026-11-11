import test from "node:test";
import assert from "node:assert/strict";
import { importWorkoutCSV } from "../src/import-csv.js";
import { blankData, mergeData } from "../src/store.js";
import { calculateDailyHeatmap, DEFAULT_HEATMAP_THRESHOLDS } from "../src/heatmap.js";
import { parseEffort, isHardSet } from "../src/effort.js";
import { e1rmSeries, best1RM, is1RMRecord } from "../src/onerm.js";
import { suggestNextPrescription } from "../src/progression.js";
import { isWakeLockSupported, requestWakeLock, releaseWakeLock } from "../src/wakelock.js";
import { playRestCompleteChime, vibrate, beep } from "../src/sound.js";

test("Integration 1: CSV Importer seamlessly populates workouts and custom exercises into store", () => {
  const store = blankData();
  const sampleCSV = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE
2026-11-10 18:00:00,Upper Power,Barbell Bench Press,1,80,5,8
2026-11-10 18:00:00,Upper Power,Barbell Bench Press,2,80,5,8.5
2026-11-10 18:00:00,Upper Power,Barbell Bench Press,3,80,5,9
2026-11-10 18:00:00,Upper Power,Custom Viking Press,1,50,8,7
`;

  const importResult = importWorkoutCSV(sampleCSV, store.customExercises);
  assert.equal(importResult.workouts.length, 1);
  assert.equal(importResult.customExercises.length, 1);
  assert.equal(importResult.customExercises[0].name, "Custom Viking Press");

  // Merge into store
  store.workouts.push(...importResult.workouts);
  store.customExercises.push(...importResult.customExercises);

  assert.equal(store.workouts.length, 1);
  assert.equal(store.workouts[0].exercises.length, 2);
  assert.equal(store.workouts[0].exercises[0].sets.length, 3);
  assert.equal(store.workouts[0].exercises[1].sets.length, 1);
});

test("Integration 2: Heatmap All vs Hard Sets mode filters sets accurately on imported data", () => {
  const sampleWorkouts = [
    {
      id: "w-1",
      date: "2026-11-10",
      time: "18:00",
      exercises: [
        {
          id: "ex-1",
          name: "Barbell Bench Press",
          muscleMapping: { primary: ["chest"], secondary: ["triceps", "front-delts"] },
          sets: [
            { id: "s1", reps: 10, weight: 60, effort: "RIR 4" }, // Warmup / easy (RIR 4 > 2)
            { id: "s2", reps: 8, weight: 80, effort: "RPE 8" },  // Hard set (RPE 8 >= 8)
            { id: "s3", reps: 6, weight: 85, effort: "RPE 9.5" } // Hard set (RPE 9.5 >= 8)
          ]
        }
      ]
    }
  ];

  // All Sets
  const allHeatmap = calculateDailyHeatmap(sampleWorkouts, DEFAULT_HEATMAP_THRESHOLDS, "all");
  assert.ok(allHeatmap);
  assert.equal(allHeatmap.muscles["chest"].sets, 3);

  // Hard Sets only
  const hardHeatmap = calculateDailyHeatmap(sampleWorkouts, DEFAULT_HEATMAP_THRESHOLDS, "hard");
  assert.ok(hardHeatmap);
  assert.equal(hardHeatmap.muscles["chest"].sets, 2);
});

test("Integration 3: 1RM Strength Progression tracks chronological series and finds all-time best", () => {
  const history = [
    {
      id: "w1",
      date: "2026-11-01",
      exercises: [
        { name: "Barbell Squat", sets: [{ reps: 5, weight: 100 }] } // 100 * (1 + 5/30) = 116.67
      ]
    },
    {
      id: "w2",
      date: "2026-11-05",
      exercises: [
        { name: "Barbell Squat", sets: [{ reps: 5, weight: 105 }] } // 105 * (1 + 5/30) = 122.5
      ]
    },
    {
      id: "w3",
      date: "2026-11-10",
      exercises: [
        { name: "Barbell Squat", sets: [{ reps: 3, weight: 115 }] } // 115 * (1 + 3/30) = 126.5
      ]
    }
  ];

  const series = e1rmSeries(history, "Barbell Squat");
  assert.equal(series.length, 3);
  assert.equal(series[0].est, 116.7);
  assert.equal(series[1].est, 122.5);
  assert.equal(series[2].est, 126.5);

  const best = best1RM(history, "Barbell Squat");
  assert.equal(best.est, 126.5);
  assert.equal(best.weight, 115);
  assert.equal(best.reps, 3);

  // Check if a new attempt is a PR
  const rec1 = is1RMRecord(history, "Barbell Squat", 110, 3); // 110 * 1.1 = 121 < 126.5 -> false
  assert.equal(rec1.isRecord, false);

  const rec2 = is1RMRecord(history, "Barbell Squat", 120, 3); // 120 * 1.1 = 132 > 126.5 -> true
  assert.equal(rec2.isRecord, true);
  assert.equal(rec2.est, 132);
});

test("Integration 4: Auto-progression engine computes upper body +2.5kg increment accurately", () => {
  const history = [
    {
      id: "w1",
      date: "2026-11-05",
      exercises: [
        {
          name: "Barbell Bench Press",
          category: "Chest",
          sets: [
            { reps: 8, weight: 80 },
            { reps: 8, weight: 80 },
            { reps: 8, weight: 80 }
          ]
        }
      ]
    }
  ];

  const target = suggestNextPrescription(history, "Barbell Bench Press", "linear", { targetReps: 8 });
  assert.ok(target);
  assert.equal(target.suggestedWeight, 82.5);
  assert.equal(target.suggestedReps, 8);
  assert.match(target.reason, /\+2\.5 kg/);
});

test("Integration 5: Screen Wake Lock and Sound utilities execute safely without browser window crash", () => {
  assert.equal(isWakeLockSupported(), false); // in headless Node
  assert.doesNotThrow(() => requestWakeLock());
  assert.doesNotThrow(() => releaseWakeLock());

  // Sound functions safe in headless Node
  assert.doesNotThrow(() => playRestCompleteChime());
  assert.doesNotThrow(() => beep(440, 100));
  assert.doesNotThrow(() => vibrate(100));
});
