// Daily Muscle Heatmap Calculation, Thresholds, and State Aggregation

import { CANONICAL_CATALOG, CANONICAL_MUSCLES, isValidExercise, isValidSet } from "./muscle-data.js";
import { isHardSet } from "./effort.js";

export const DEFAULT_HEATMAP_THRESHOLDS = {
  yellow: 1,
  orange: 6,
  red: 12,
  purple: 20
};

export const HEATMAP_PALETTE = {
  elite: { color: "#51406F", label: "Elite", min: 20 },
  good: { color: "#D83B43", label: "Good", min: 12 },
  moderate: { color: "#E98A32", label: "Moderate", min: 6 },
  minimal: { color: "#E8C84A", label: "Minimal", min: 1 },
  none: { color: "#A7A9A5", label: "No training", min: 0 }
};

export function validateHeatmapThresholds(thresholds) {
  if (!thresholds || typeof thresholds !== "object") {
    return { ...DEFAULT_HEATMAP_THRESHOLDS };
  }
  const y = Number(thresholds.yellow);
  const o = Number(thresholds.orange);
  const r = Number(thresholds.red);
  const p = Number(thresholds.purple);

  const isValid =
    Number.isInteger(y) && y >= 1 &&
    Number.isInteger(o) && o > y &&
    Number.isInteger(r) && r > o &&
    Number.isInteger(p) && p > r;

  if (!isValid) {
    return { ...DEFAULT_HEATMAP_THRESHOLDS };
  }
  return { yellow: y, orange: o, red: r, purple: p };
}

/**
 * Calculates the daily muscle heatmap for a specific calendar date
 * @param {Array} sessionsForDate - Array of workout objects for that date
 * @param {Object} rawThresholds - User-configured or default set thresholds
 * @param {string} filterMode - "all" for all valid sets, "hard" for sets near failure (RIR <= 2 / RPE >= 8)
 * @returns {Object|null} - Daily heatmap data object, or null if no valid detailed training data exists
 */
export function calculateDailyHeatmap(sessionsForDate, rawThresholds = DEFAULT_HEATMAP_THRESHOLDS, filterMode = "all") {
  if (!Array.isArray(sessionsForDate) || sessionsForDate.length === 0) {
    return null;
  }

  const thresholds = validateHeatmapThresholds(rawThresholds);

  // Filter to sessions that have at least one valid detailed exercise
  const qualifyingSessions = [];
  for (const session of sessionsForDate) {
    if (!session || typeof session !== "object") continue;
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const validExercises = exercises.filter(isValidExercise);
    if (validExercises.length > 0) {
      qualifyingSessions.push({
        session,
        validExercises
      });
    }
  }

  // If no qualifying detailed exercises exist on this date, return null (never a blank grey body)
  if (qualifyingSessions.length === 0) {
    return null;
  }

  const primarySetsByMuscle = {};
  const contributingExercisesByMuscle = {};
  const secondaryInvolvementByMuscle = {};

  let totalDaySets = 0;

  for (const item of qualifyingSessions) {
    for (const ex of item.validExercises) {
      const allValidSets = (ex.sets || []).filter(isValidSet);
      const qualifyingSets = filterMode === "hard" ? allValidSets.filter(isHardSet) : allValidSets;
      const validSetsCount = qualifyingSets.length;
      totalDaySets += validSetsCount;

      const primaryMuscles = ex.muscleMapping?.primary || [];
      for (const mId of primaryMuscles) {
        if (!CANONICAL_MUSCLES.has(mId)) continue; // ignore non-canonical mappings safely
        primarySetsByMuscle[mId] = (primarySetsByMuscle[mId] || 0) + validSetsCount;

        if (!contributingExercisesByMuscle[mId]) {
          contributingExercisesByMuscle[mId] = [];
        }
        contributingExercisesByMuscle[mId].push({
          exerciseName: ex.name,
          sets: validSetsCount
        });
      }

      const secondaryMuscles = ex.muscleMapping?.secondary || [];
      for (const mId of secondaryMuscles) {
        if (!CANONICAL_MUSCLES.has(mId)) continue;
        if (!secondaryInvolvementByMuscle[mId]) {
          secondaryInvolvementByMuscle[mId] = new Set();
        }
        secondaryInvolvementByMuscle[mId].add(ex.name);
      }
    }
  }

  const colorMap = {};
  const muscles = {};

  // Iterate across all 16 canonical muscles to guarantee complete mapping
  for (const item of CANONICAL_CATALOG) {
    const mId = item.id;
    const sets = primarySetsByMuscle[mId] || 0;
    const contributing = contributingExercisesByMuscle[mId] || [];
    const secondaryNames = secondaryInvolvementByMuscle[mId]
      ? Array.from(secondaryInvolvementByMuscle[mId])
      : [];

    let color = HEATMAP_PALETTE.none.color;
    let label = HEATMAP_PALETTE.none.label;

    if (sets >= thresholds.purple) {
      color = HEATMAP_PALETTE.elite.color;
      label = HEATMAP_PALETTE.elite.label;
    } else if (sets >= thresholds.red) {
      color = HEATMAP_PALETTE.good.color;
      label = HEATMAP_PALETTE.good.label;
    } else if (sets >= thresholds.orange) {
      color = HEATMAP_PALETTE.moderate.color;
      label = HEATMAP_PALETTE.moderate.label;
    } else if (sets >= thresholds.yellow) {
      color = HEATMAP_PALETTE.minimal.color;
      label = HEATMAP_PALETTE.minimal.label;
    }

    colorMap[mId] = {
      color,
      label,
      sets
    };

    muscles[mId] = {
      muscleId: mId,
      name: item.name,
      view: item.view,
      sets,
      color,
      label,
      contributingExercises: contributing,
      secondaryInvolvement: secondaryNames
    };
  }

  const targetDate = sessionsForDate[0]?.date || null;

  return {
    date: targetDate,
    totalSets: totalDaySets,
    totalDetailedSessions: qualifyingSessions.length,
    thresholds,
    colorMap,
    muscles
  };
}

