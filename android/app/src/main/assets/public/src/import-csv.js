// Multi-App CSV Importer
// Resilient parser for FitNotes (Android/iOS), Strong, Hevy, Apple Health, and standard spreadsheets.

import { BUILT_IN_EXERCISES } from "./muscle-data.js";

/**
 * RFC 4180 compliant CSV parser.
 * Handles quoted fields, embedded commas, newlines, escaped quotes (""), and BOM.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const s = String(text || "").replace(/^\uFEFF/, ""); // Remove UTF-8 BOM if present

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Column aliases for header mapping
const COLUMN_ALIASES = [
  ["exercise", ["exercise", "exercise name", "exercise title", "movement"]],
  ["date", ["date", "workout date", "start time", "start_time"]],
  ["time", ["time", "start time", "start_time"]],
  ["workoutName", ["workout name", "title", "routine"]],
  ["category", ["category", "body part", "muscle group"]],
  ["weightKg", ["weight kg", "weight_kg", "weight(kg)"]],
  ["weightLb", ["weight lbs", "weight lb", "weight_lbs", "weight(lbs)"]],
  ["weight", ["weight", "load"]],
  ["reps", ["reps", "repetitions", "rep count"]],
  ["duration", ["seconds", "duration_seconds", "duration seconds", "time_seconds"]],
  ["distance", ["distance", "distance km", "distance_km"]],
  ["effort", ["rpe", "rir", "effort", "notes", "comment", "exercise_notes"]]
];

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((col, idx) => {
    const n = norm(col);
    for (const [canonical, aliases] of COLUMN_ALIASES) {
      if (aliases.some((a) => n === a || n.includes(a))) {
        if (map[canonical] === undefined) {
          map[canonical] = idx;
        }
      }
    }
  });
  return map;
}

/**
 * Heuristic mapping for exercise names to canonical 16-muscle groupings.
 */
function inferMuscleMapping(exerciseName = "", category = "") {
  const target = (exerciseName + " " + category).toLowerCase();
  
  if (target.includes("bench") || target.includes("chest") || target.includes("push up") || target.includes("fly")) {
    return { primary: ["chest"], secondary: ["triceps", "anterior_deltoids"] };
  }
  if (target.includes("squat") || target.includes("leg press") || target.includes("lunge") || target.includes("quad")) {
    return { primary: ["quadriceps"], secondary: ["glutes"] };
  }
  if (target.includes("deadlift") || target.includes("rdl") || target.includes("hamstring") || target.includes("curl") && target.includes("leg")) {
    return { primary: ["hamstrings", "lower_back"], secondary: ["glutes"] };
  }
  if (target.includes("overhead") || target.includes("shoulder") || target.includes("military") || target.includes("lateral raise")) {
    return { primary: ["anterior_deltoids", "lateral_deltoids"], secondary: ["triceps"] };
  }
  if (target.includes("row") || target.includes("pull up") || target.includes("lat") || target.includes("pull down")) {
    return { primary: ["lats"], secondary: ["biceps", "traps"] };
  }
  if (target.includes("bicep") || target.includes("curl")) {
    return { primary: ["biceps"], secondary: ["forearms"] };
  }
  if (target.includes("tricep") || target.includes("dip") || target.includes("extension")) {
    return { primary: ["triceps"], secondary: ["chest"] };
  }
  if (target.includes("calf") || target.includes("calves")) {
    return { primary: ["calves"], secondary: [] };
  }
  if (target.includes("crunch") || target.includes("plank") || target.includes("ab") || target.includes("core")) {
    return { primary: ["abs"], secondary: ["obliques"] };
  }
  return { primary: ["chest"], secondary: [] };
}

/**
 * Parse workout CSV into LEAN MODE workouts, customExercises, and measurements.
 */
export function importWorkoutCSV(csvText, existingCustomExercises = []) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  const headerMap = buildHeaderMap(rows[0]);
  if (headerMap.exercise === undefined || headerMap.date === undefined) {
    throw new Error("Could not detect required columns ('Exercise' and 'Date') in CSV.");
  }

  const workoutsByDate = new Map();
  const newCustomExercises = [];
  const knownExercises = new Map();

  BUILT_IN_EXERCISES.forEach((ex) => {
    knownExercises.set(norm(ex.name), ex);
  });
  existingCustomExercises.forEach((ex) => {
    knownExercises.set(norm(ex.name), ex);
  });

  let totalSetsCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[headerMap.date]?.trim();
    const rawExName = row[headerMap.exercise]?.trim();
    if (!rawDate || !rawExName) continue;

    // Parse date (supports YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, DD/MM/YYYY, MM/DD/YYYY)
    let parsedDate = "";
    let parsedTime = "";

    if (rawDate.includes(" ")) {
      const parts = rawDate.split(" ");
      parsedDate = parts[0];
      parsedTime = parts[1]?.slice(0, 5) || "";
    } else {
      parsedDate = rawDate;
    }

    // Standardize date to YYYY-MM-DD
    if (parsedDate.includes("/")) {
      const dp = parsedDate.split("/");
      if (dp[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY
        parsedDate = `${dp[2]}-${String(dp[0]).padStart(2, "0")}-${String(dp[1]).padStart(2, "0")}`;
      }
    }

    // Parse weight and convert lbs to kg if needed
    let weight = 0;
    if (headerMap.weightKg !== undefined && row[headerMap.weightKg]) {
      weight = parseFloat(row[headerMap.weightKg]) || 0;
    } else if (headerMap.weightLb !== undefined && row[headerMap.weightLb]) {
      const lbs = parseFloat(row[headerMap.weightLb]) || 0;
      weight = Math.round(lbs * 0.453592 * 10) / 10;
    } else if (headerMap.weight !== undefined && row[headerMap.weight]) {
      weight = parseFloat(row[headerMap.weight]) || 0;
    }

    // Parse reps
    const reps = headerMap.reps !== undefined ? parseInt(row[headerMap.reps], 10) || 1 : 1;
    const effort = headerMap.effort !== undefined ? String(row[headerMap.effort] || "").trim() : "";
    const workoutTitle = (headerMap.workoutName !== undefined && row[headerMap.workoutName]?.trim()) || "Workout Session";
    const category = (headerMap.category !== undefined && row[headerMap.category]?.trim()) || "General";

    // Match or create exercise definition
    const exKey = norm(rawExName);
    let matchedEx = knownExercises.get(exKey);

    if (!matchedEx) {
      const mapping = inferMuscleMapping(rawExName, category);
      matchedEx = {
        id: "custom_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: rawExName,
        category: category || "Strength",
        isCustom: true,
        muscleMapping: mapping
      };
      knownExercises.set(exKey, matchedEx);
      newCustomExercises.push(matchedEx);
    }

    // Group into workouts by Date + Title
    const sessionKey = `${parsedDate}__${workoutTitle}`;
    if (!workoutsByDate.has(sessionKey)) {
      workoutsByDate.set(sessionKey, {
        id: "imp_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
        date: parsedDate,
        time: parsedTime || "10:00",
        title: workoutTitle,
        type: "Gym",
        exercises: []
      });
    }

    const session = workoutsByDate.get(sessionKey);
    let sessionEx = session.exercises.find((e) => norm(e.name) === exKey);

    if (!sessionEx) {
      sessionEx = {
        name: matchedEx.name,
        category: matchedEx.category || category,
        isCustom: Boolean(matchedEx.isCustom),
        muscleMapping: matchedEx.muscleMapping || {
          primary: matchedEx.defaultPrimary || ["chest"],
          secondary: matchedEx.defaultSecondary || []
        },
        sets: []
      };
      session.exercises.push(sessionEx);
    }

    sessionEx.sets.push({
      reps,
      weight,
      effort: effort || undefined
    });
    totalSetsCount++;
  }

  const workouts = Array.from(workoutsByDate.values());

  return {
    workouts,
    customExercises: newCustomExercises,
    stats: {
      totalWorkouts: workouts.length,
      totalSets: totalSetsCount,
      totalExercises: knownExercises.size
    }
  };
}

