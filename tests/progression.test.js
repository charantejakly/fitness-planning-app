import test from "node:test";
import assert from "node:assert/strict";
import { suggestNextPrescription, getIncrement } from "../src/progression.js";

test("Progression: getIncrement differentiates upper body (+2.5kg) from lower body (+5kg)", () => {
  assert.equal(getIncrement("Barbell Bench Press", "Chest"), 2.5);
  assert.equal(getIncrement("Overhead Press", "Shoulders"), 2.5);
  assert.equal(getIncrement("Barbell Squat", "Legs"), 5.0);
  assert.equal(getIncrement("Romanian Deadlift", "Back"), 5.0);
});

test("Progression: Linear policy advances weight when all reps are hit", () => {
  const history = [
    {
      date: "2026-11-01",
      exercises: [
        {
          name: "Barbell Bench Press",
          category: "Chest",
          sets: [
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 },
            { weight: 80, reps: 8 }
          ]
        }
      ]
    }
  ];

  const next = suggestNextPrescription(history, "Barbell Bench Press", "linear", { targetReps: 8 });
  assert.equal(next.suggestedWeight, 82.5);
  assert.equal(next.suggestedReps, 8);
  assert.equal(next.isDeload, false);
});

test("Progression: Linear policy triggers 10% deload after 3 consecutive stalled sessions", () => {
  const history = [
    {
      date: "2026-11-01",
      exercises: [{ name: "Barbell Bench Press", sets: [{ weight: 100, reps: 6 }] }]
    },
    {
      date: "2026-11-04",
      exercises: [{ name: "Barbell Bench Press", sets: [{ weight: 100, reps: 6 }] }]
    },
    {
      date: "2026-11-07",
      exercises: [{ name: "Barbell Bench Press", sets: [{ weight: 100, reps: 7 }] }]
    }
  ];

  const next = suggestNextPrescription(history, "Barbell Bench Press", "linear", { targetReps: 8 });
  assert.equal(next.suggestedWeight, 90.0); // 100 * 0.9 = 90
  assert.equal(next.isDeload, true);
});

test("Progression: Greyskull LP doubles increment on AMRAP crush and deloads on failure", () => {
  // Scenario 1: AMRAP double crush
  const crushHistory = [
    {
      date: "2026-11-01",
      exercises: [
        {
          name: "Barbell Squat",
          category: "Legs",
          sets: [
            { weight: 100, reps: 5 },
            { weight: 100, reps: 5 },
            { weight: 100, reps: 11 } // AMRAP >= 5 * 2 = 10
          ]
        }
      ]
    }
  ];

  const nextCrush = suggestNextPrescription(crushHistory, "Barbell Squat", "greyskull", { targetReps: 5 });
  assert.equal(nextCrush.suggestedWeight, 110.0); // 100 + (5kg * 2) = 110

  // Scenario 2: AMRAP failure -> immediate 10% reset
  const failHistory = [
    {
      date: "2026-11-01",
      exercises: [
        {
          name: "Barbell Squat",
          category: "Legs",
          sets: [
            { weight: 100, reps: 5 },
            { weight: 100, reps: 5 },
            { weight: 100, reps: 4 } // missed 5
          ]
        }
      ]
    }
  ];
  const nextFail = suggestNextPrescription(failHistory, "Barbell Squat", "greyskull", { targetReps: 5 });
  assert.equal(nextFail.suggestedWeight, 90.0);
  assert.equal(nextFail.isDeload, true);
});

test("Progression: Double progression works through rep range before weight increase", () => {
  const midHistory = [
    {
      date: "2026-11-01",
      exercises: [
        {
          name: "Dumbbell Curl",
          category: "Arms",
          sets: [
            { weight: 14, reps: 10 },
            { weight: 14, reps: 9 },
            { weight: 14, reps: 8 }
          ]
        }
      ]
    }
  ];
  const nextMid = suggestNextPrescription(midHistory, "Dumbbell Curl", "double", { repsMin: 8, repsMax: 12 });
  assert.equal(nextMid.suggestedWeight, 14); // Keeps 14 kg
  assert.equal(nextMid.suggestedReps, 10);   // Steps up reps

  // All hit max (12 reps)
  const maxHistory = [
    {
      date: "2026-11-01",
      exercises: [
        {
          name: "Dumbbell Curl",
          category: "Arms",
          sets: [
            { weight: 14, reps: 12 },
            { weight: 14, reps: 12 },
            { weight: 14, reps: 12 }
          ]
        }
      ]
    }
  ];
  const nextMax = suggestNextPrescription(maxHistory, "Dumbbell Curl", "double", { repsMin: 8, repsMax: 12 });
  assert.equal(nextMax.suggestedWeight, 16.5); // 14 + 2.5
  assert.equal(nextMax.suggestedReps, 8);      // Resets to bottom of range
});

