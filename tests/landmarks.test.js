import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_MUSCLES } from "../src/muscle-data.js";
import {
  RP_VOLUME_LANDMARKS,
  evaluateVolumeStatus,
  calculateWeeklyMuscleVolume
} from "../src/landmarks.js";

test("Landmarks: All 16 canonical muscles have defined volume landmarks", () => {
  CANONICAL_MUSCLES.forEach((mId) => {
    assert.ok(RP_VOLUME_LANDMARKS[mId], `Missing landmarks for canonical muscle: ${mId}`);
    const l = RP_VOLUME_LANDMARKS[mId];
    assert.ok(l.mv <= l.mev, `${mId}: MV should be <= MEV`);
    assert.ok(l.mev <= l.mavMin, `${mId}: MEV should be <= mavMin`);
    assert.ok(l.mavMin <= l.mavMax, `${mId}: mavMin should be <= mavMax`);
    assert.ok(l.mavMax <= l.mrv, `${mId}: mavMax should be <= MRV`);
  });
});

test("Landmarks: Evaluates volume tiers correctly across boundaries for Chest (Intermediate)", () => {
  // Chest: mv=8, mev=10, mavMin=12, mavMax=20, mrv=22
  const below = evaluateVolumeStatus("chest", 4, "intermediate");
  assert.equal(below.tier, "below_mv");

  const maint = evaluateVolumeStatus("chest", 8, "intermediate");
  assert.equal(maint.tier, "maintenance");

  const optimal = evaluateVolumeStatus("chest", 14, "intermediate");
  assert.equal(optimal.tier, "optimal");
  assert.match(optimal.label, /Optimal Hypertrophy/);

  const overreach = evaluateVolumeStatus("chest", 21, "intermediate");
  assert.equal(overreach.tier, "overreaching");

  const excessive = evaluateVolumeStatus("chest", 24, "intermediate");
  assert.equal(excessive.tier, "excessive");
});

test("Landmarks: Trainee level scaling adjusts thresholds", () => {
  const beg = evaluateVolumeStatus("chest", 10, "beginner");
  const adv = evaluateVolumeStatus("chest", 10, "advanced");
  // Advanced trainee needs more volume to enter MAV
  assert.ok(beg.mavMax < adv.mavMax);
});

test("Landmarks: calculateWeeklyMuscleVolume aggregates 7-day sets accurately", () => {
  const sampleWorkouts = [
    {
      date: "2026-11-04", // 7 days before 2026-11-10 (inclusive)
      exercises: [
        {
          name: "Barbell Bench Press",
          muscleMapping: { primary: ["chest"] },
          sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] // 3 sets
        }
      ]
    },
    {
      date: "2026-11-08",
      exercises: [
        {
          name: "Incline Dumbbell Press",
          muscleMapping: { primary: ["chest"] },
          sets: [{ reps: 10 }, { reps: 10 }] // 2 sets
        },
        {
          name: "Barbell Squat",
          muscleMapping: { primary: ["quadriceps"] },
          sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] // 3 sets
        }
      ]
    },
    {
      date: "2026-10-25", // Outside the 7-day window
      exercises: [
        {
          name: "Chest Fly",
          muscleMapping: { primary: ["chest"] },
          sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }]
        }
      ]
    }
  ];

  const volume = calculateWeeklyMuscleVolume(sampleWorkouts, "2026-11-10");
  assert.equal(volume["chest"], 5); // 3 + 2 = 5 sets
  assert.equal(volume["quadriceps"], 3);
  assert.equal(volume["lats"], undefined);
});
