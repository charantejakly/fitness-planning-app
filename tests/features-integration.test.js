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

// Import new packages for Integrations 6 - 9
import { calculatePlates } from "../src/plates.js";
import { generateWarmupSets } from "../src/warmup.js";
import { evaluateVolumeStatus, calculateWeeklyMuscleVolume } from "../src/landmarks.js";
import { computeWeightTrend, forecastWeightGoal, healthyWeightSpan } from "../src/weight-trend.js";
import {
  calculateWaterTarget,
  updateWaterIntake,
  evaluateWaterProgress
} from "../src/habits.js";

test("Integration 6: Barbell Plate Solver and Warmup Set Workflow", () => {
  // Lifter intends to bench press 80kg with a 20kg bar
  const targetWeight = 80;
  const plateSolution = calculatePlates(targetWeight, 20);

  assert.equal(plateSolution.achievedKg, 80);
  assert.equal(plateSolution.exact, true);
  assert.equal(plateSolution.barKg, 20);
  // Per sleeve: 1x25kg (red) + 1x5kg (white) = 30kg (greedy fewest plates)
  assert.deepEqual(
    plateSolution.platesPerSide.map((p) => ({ weight: p.weightKg, count: p.count })),
    [
      { weight: 25, count: 1 },
      { weight: 5, count: 1 }
    ]
  );

  // Lifter generates standard Wendler warmup sets for 80kg
  const warmups = generateWarmupSets(targetWeight, "standard", 20, 2.5);
  // 40% of 80kg = 32 -> snapped to 32.5kg
  // 60% of 80kg = 48 -> snapped to 47.5kg
  // 80% of 80kg = 64 -> snapped to 65kg
  assert.equal(warmups.length, 3);
  assert.equal(warmups[0].weight, 32.5);
  assert.equal(warmups[1].weight, 47.5);
  assert.equal(warmups[2].weight, 65);
  assert.ok(warmups.every((w) => w.effort === "warmup"));
  assert.ok(warmups.every((w) => w.weight < targetWeight));
});

test("Integration 7: Trainee RP Volume Landmark Lifecycle", () => {
  const mockWorkouts = [
    {
      date: "2026-11-05",
      exercises: [
        {
          name: "Barbell Bench Press",
          muscleMapping: { primary: ["chest"], secondary: ["triceps"] },
          sets: [
            { weight: 80, reps: 8, effort: "RPE 8" },
            { weight: 80, reps: 8, effort: "RPE 8.5" },
            { weight: 80, reps: 7, effort: "RPE 9" }
          ]
        }
      ]
    },
    {
      date: "2026-11-08",
      exercises: [
        {
          name: "Incline Dumbbell Press",
          muscleMapping: { primary: ["chest"], secondary: [] },
          sets: [
            { weight: 30, reps: 10, effort: "RIR 2" },
            { weight: 30, reps: 9, effort: "RIR 1" },
            { weight: 30, reps: 8, effort: "RIR 1" }
          ]
        },
        {
          name: "Lat Pulldown",
          muscleMapping: { primary: ["lats"], secondary: ["biceps"] },
          sets: [
            { weight: 65, reps: 12, effort: "RPE 8" },
            { weight: 65, reps: 10, effort: "RPE 9" }
          ]
        }
      ]
    },
    {
      date: "2026-11-11",
      exercises: [
        {
          name: "Dips",
          muscleMapping: { primary: ["chest"], secondary: ["triceps"] },
          sets: [
            { weight: 0, reps: 12, effort: "RPE 8" },
            { weight: 0, reps: 10, effort: "RPE 9" }
          ]
        }
      ]
    }
  ];

  const weeklyVol = calculateWeeklyMuscleVolume(mockWorkouts, "2026-11-11");
  assert.equal(weeklyVol.chest, 8);
  assert.equal(weeklyVol.lats, 2);

  // Evaluate Chest: 8 sets for intermediate lifter (MV=8, MEV=10)
  const chestStatus = evaluateVolumeStatus("chest", weeklyVol.chest, "intermediate");
  assert.equal(chestStatus.tier, "maintenance");
  assert.equal(chestStatus.label, "Maintenance Volume");

  // Evaluate Lats: 2 sets for intermediate lifter (MV=6, MEV=10)
  const latsStatus = evaluateVolumeStatus("lats", weeklyVol.lats, "intermediate");
  assert.equal(latsStatus.tier, "below_mv");
  assert.equal(latsStatus.label, "Below Maintenance (Atrophy Risk)");
});

test("Integration 8: EWMA Weight Smoothing, Velocity & Goal Forecast", () => {
  const weighIns = [
    { date: "2026-11-01", weight: 82.0 },
    { date: "2026-11-03", weight: 82.5 },
    { date: "2026-11-05", weight: 81.8 },
    { date: "2026-11-07", weight: 81.2 },
    { date: "2026-11-09", weight: 81.4 },
    { date: "2026-11-11", weight: 80.6 },
    { date: "2026-11-14", weight: 80.2 }
  ];

  const trend = computeWeightTrend(weighIns, 0.25);
  assert.equal(trend.length, 7);
  assert.equal(trend[0].trendWeight, 82.0);

  const latestTrend = trend[trend.length - 1];
  assert.ok(latestTrend.trendWeight < 81.5 && latestTrend.trendWeight > 80.0);

  const forecast = forecastWeightGoal(weighIns, 78.0);
  assert.equal(forecast.status, "on_track");
  assert.ok(forecast.weeklyRate < 0);
  assert.ok(forecast.daysRemaining > 0);
  assert.ok(forecast.forecastDate.startsWith("202"));

  const span = healthyWeightSpan(180);
  assert.equal(span.minKg, 59.9);
  assert.equal(span.maxKg, 80.7);
  assert.equal(span.midpointKg, 70.3);
});

test("Integration 9: Daily Hydration Tracking Cycle", () => {
  const targetMl = calculateWaterTarget(75);
  assert.equal(targetMl, 2650);

  let waterLogs = {};
  const activeDate = "2026-11-12";

  waterLogs = updateWaterIntake(waterLogs, activeDate, 500);
  waterLogs = updateWaterIntake(waterLogs, activeDate, 750);
  waterLogs = updateWaterIntake(waterLogs, activeDate, 1000);

  const progress = evaluateWaterProgress(waterLogs, activeDate, targetMl);
  assert.equal(progress.currentMl, 2250);
  assert.equal(progress.remainingMl, 400);
  assert.equal(progress.percent, 85);
  assert.equal(progress.remainingMl > 0, true);

  waterLogs = updateWaterIntake(waterLogs, activeDate, 400);
  const finalProgress = evaluateWaterProgress(waterLogs, activeDate, targetMl);
  assert.equal(finalProgress.currentMl, 2650);
  assert.equal(finalProgress.remainingMl, 0);
  assert.equal(finalProgress.percent, 100);
});
