import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, importWorkoutCSV } from "../src/import-csv.js";

test("CSV Parser: handles quotes, commas, CRLF, and empty lines", () => {
  const csv = `Exercise,Weight,"Reps,Notes"\r\n"Bench Press, Close Grip",80,"8, felt solid"\r\nSquat,100,5\r\n`;
  const rows = parseCSV(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][0], "Bench Press, Close Grip");
  assert.equal(rows[1][1], "80");
  assert.equal(rows[1][2], "8, felt solid");
  assert.equal(rows[2][0], "Squat");
});

test("CSV Importer: parses Hevy style export", () => {
  const hevyExport = `title,start_time,exercise_title,set_index,weight_kg,reps,rpe
"Push Day","2026-11-01 10:00:00","Barbell Bench Press",0,80,10,8
"Push Day","2026-11-01 10:00:00","Barbell Bench Press",1,85,8,9
"Push Day","2026-11-01 10:00:00","Overhead Press",0,50,8,8.5
`;

  const result = importWorkoutCSV(hevyExport);
  assert.equal(result.stats.totalWorkouts, 1);
  assert.equal(result.stats.totalSets, 3);

  const workout = result.workouts[0];
  assert.equal(workout.date, "2026-11-01");
  assert.equal(workout.title, "Push Day");
  assert.equal(workout.exercises.length, 2);
  assert.equal(workout.exercises[0].name, "Barbell Bench Press");
  assert.equal(workout.exercises[0].sets.length, 2);
  assert.equal(workout.exercises[0].sets[0].weight, 80);
  assert.equal(workout.exercises[0].sets[0].reps, 10);
  assert.equal(workout.exercises[0].sets[0].effort, "8");
});

test("CSV Importer: parses Strong/FitNotes style export with lbs to kg conversion", () => {
  const fitnotesExport = `Date,Exercise,Category,"Weight lbs",Reps
2026-11-05,"Barbell Squat",Legs,225,5
2026-11-05,"Barbell Squat",Legs,225,5
`;

  const result = importWorkoutCSV(fitnotesExport);
  assert.equal(result.stats.totalWorkouts, 1);
  assert.equal(result.stats.totalSets, 2);
  // 225 lbs * 0.453592 = ~102.1 kg
  assert.equal(result.workouts[0].exercises[0].sets[0].weight, 102.1);
});

test("CSV Importer: creates custom exercises for unknown movements with inferred muscles", () => {
  const customExport = `Date,Exercise,Weight,Reps
2026-11-06,"Incline Dumbbell Hammer Curl",16,12
`;
  const result = importWorkoutCSV(customExport);
  assert.equal(result.customExercises.length, 1);
  assert.equal(result.customExercises[0].name, "Incline Dumbbell Hammer Curl");
  assert.deepEqual(result.customExercises[0].muscleMapping.primary, ["biceps"]);
});

