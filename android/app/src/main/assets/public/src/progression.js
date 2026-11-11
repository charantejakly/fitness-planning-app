// Automated Progression Engine
// Deterministic rules for next-session load and rep targets (Linear, Greyskull LP, Double Progression).

export const PROGRESSION_POLICIES = ["linear", "greyskull", "double", "time", "off"];

const HEAVY_CATEGORIES = ["legs", "quadriceps", "hamstrings", "back", "glutes"];

export function getIncrement(exerciseName = "", category = "") {
  const combined = (exerciseName + " " + category).toLowerCase();
  const isLower = HEAVY_CATEGORIES.some((c) => combined.includes(c)) || combined.includes("squat") || combined.includes("deadlift");
  return isLower ? 5.0 : 2.5;
}

const snap = (val, step = 2.5) => Math.round(val / step) * step;

/**
 * Suggest next session weight and reps based on chronological workout history.
 * @param {Array} pastWorkouts - Array of user workouts
 * @param {string} exerciseName - Target exercise name
 * @param {string} policy - "linear" | "greyskull" | "double" | "off"
 * @param {Object} options - { targetReps: 8, repsMin: 8, repsMax: 12 }
 */
export function suggestNextPrescription(pastWorkouts = [], exerciseName, policy = "linear", options = {}) {
  if (!exerciseName || policy === "off") {
    return null;
  }

  const targetName = exerciseName.toLowerCase().trim();
  const matchedEntries = [];

  // Sort chronological
  const sorted = [...pastWorkouts].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  sorted.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      if ((ex.name || "").toLowerCase().trim() === targetName && ex.sets && ex.sets.length > 0) {
        matchedEntries.push({
          date: w.date,
          category: ex.category || "",
          sets: ex.sets.filter((s) => Number(s.reps) > 0)
        });
      }
    });
  });

  if (matchedEntries.length === 0) {
    return {
      suggestedWeight: 20,
      suggestedReps: options.targetReps || 8,
      reason: "No prior history recorded. Starting with base target.",
      policy,
      isDeload: false
    };
  }

  const lastEntry = matchedEntries[matchedEntries.length - 1];
  const step = getIncrement(exerciseName, lastEntry.category);
  const targetReps = options.targetReps || 8;
  const lastMaxWeight = Math.max(...lastEntry.sets.map((s) => Number(s.weight) || 0));
  const lastAvgReps = lastEntry.sets.reduce((sum, s) => sum + Number(s.reps), 0) / lastEntry.sets.length;
  const lastFinalSet = lastEntry.sets[lastEntry.sets.length - 1];

  // 1. GREYSKULL LP
  if (policy === "greyskull") {
    const finalReps = Number(lastFinalSet.reps) || 0;
    const baseTarget = options.targetReps || 5;

    // Did final AMRAP set beat target by double?
    if (finalReps >= baseTarget * 2) {
      const doubleJump = step * 2;
      const nextW = lastMaxWeight + doubleJump;
      return {
        suggestedWeight: nextW,
        suggestedReps: baseTarget,
        reason: `Greyskull LP: Final AMRAP set crushed target with ${finalReps} reps (target ${baseTarget}) -> Double jump (+${doubleJump} kg).`,
        policy,
        isDeload: false
      };
    } else if (finalReps >= baseTarget) {
      const nextW = lastMaxWeight + step;
      return {
        suggestedWeight: nextW,
        suggestedReps: baseTarget,
        reason: `Greyskull LP: Hit all prescribed reps (${finalReps}/${baseTarget}) -> +${step} kg.`,
        policy,
        isDeload: false
      };
    } else {
      // Failed final set -> 10% reset
      const resetW = Math.max(step, snap(lastMaxWeight * 0.9, step));
      return {
        suggestedWeight: resetW,
        suggestedReps: baseTarget,
        reason: `Greyskull LP: Missed target reps on final set (${finalReps}/${baseTarget}) -> 10% deload reset.`,
        policy,
        isDeload: true
      };
    }
  }

  // 2. DOUBLE PROGRESSION (rep range e.g. 8-12)
  if (policy === "double") {
    const repsMin = options.repsMin || 8;
    const repsMax = options.repsMax || 12;
    const allHitMax = lastEntry.sets.every((s) => Number(s.reps) >= repsMax);

    if (allHitMax) {
      const nextW = lastMaxWeight + step;
      return {
        suggestedWeight: nextW,
        suggestedReps: repsMin,
        reason: `Double Progression: Reached top of rep range (${repsMax} reps across all sets) -> Increased load (+${step} kg) and reset reps to ${repsMin}.`,
        policy,
        isDeload: false
      };
    } else {
      const nextReps = Math.min(repsMax, Math.round(lastAvgReps) + 1);
      return {
        suggestedWeight: lastMaxWeight,
        suggestedReps: nextReps,
        reason: `Double Progression: Working through rep range (${repsMin}-${repsMax} reps). Aiming for ${nextReps} reps at current load (${lastMaxWeight} kg).`,
        policy,
        isDeload: false
      };
    }
  }

  // 3. LINEAR PROGRESSION (default)
  const allHitTarget = lastEntry.sets.every((s) => Number(s.reps) >= targetReps);

  if (allHitTarget) {
    const nextW = lastMaxWeight + step;
    return {
      suggestedWeight: nextW,
      suggestedReps: targetReps,
      reason: `Linear Progression: All sets completed at target (${targetReps} reps) -> +${step} kg.`,
      policy,
      isDeload: false
    };
  } else {
    // Check if missed 3 sessions in a row
    let consecutiveMisses = 1;
    for (let i = matchedEntries.length - 2; i >= 0 && i >= matchedEntries.length - 4; i--) {
      const entry = matchedEntries[i];
      const hit = entry.sets.every((s) => Number(s.reps) >= targetReps);
      if (!hit) consecutiveMisses++;
      else break;
    }

    if (consecutiveMisses >= 3) {
      const deloadW = Math.max(step, snap(lastMaxWeight * 0.9, step));
      return {
        suggestedWeight: deloadW,
        suggestedReps: targetReps,
        reason: `Linear Progression: Missed target across 3 consecutive sessions -> 10% deload reset.`,
        policy,
        isDeload: true
      };
    }

    return {
      suggestedWeight: lastMaxWeight,
      suggestedReps: targetReps,
      reason: `Linear Progression: Missed target reps in last session. Repeating ${lastMaxWeight} kg for ${targetReps} reps.`,
      policy,
      isDeload: false
    };
  }
}

