// Estimated One-Rep Max (1RM) Engine
// Submaximal load estimators with scientific bounds (Epley, Brzycki, Lombardi).

export const REP_CAP = 12;

export const FORMULAS = {
  // Epley 1985 — w · (1 + r / 30)
  epley: (w, r) => w * (1 + r / 30),
  // Brzycki 1993 — w · 36 / (37 − r)
  brzycki: (w, r) => w * 36 / (37 - r),
  // Lombardi 1989 — w · r^0.10
  lombardi: (w, r) => w * Math.pow(r, 0.1)
};

export const DEFAULT_FORMULA = "epley";

/**
 * Estimate 1RM from a completed set.
 * Returns null for missing/zero/negative values, non-numeric values, or reps > REP_CAP.
 * 1 rep returns the weight itself.
 */
export function estimate1RM(w, r, formula = DEFAULT_FORMULA) {
  const weight = Number(w);
  const reps = Number(r);
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps < 1) return null;
  if (reps > REP_CAP) return null;

  const fn = FORMULAS[formula] || FORMULAS[DEFAULT_FORMULA];
  const est = reps === 1 ? weight : fn(weight, Math.round(reps));
  if (!Number.isFinite(est) || est <= 0) return null;
  return Math.round(est * 10) / 10;
}

/**
 * Best 1RM estimate from an array of sets for an exercise.
 */
export function bestSet1RM(sets = [], formula = DEFAULT_FORMULA) {
  let best = null;
  sets.forEach((s) => {
    const est = estimate1RM(s.weight, s.reps, formula);
    if (est !== null && (!best || est > best.est)) {
      best = {
        est,
        weight: Number(s.weight),
        reps: Math.round(Number(s.reps))
      };
    }
  });
  return best;
}

/**
 * Chronological series of 1RM progression for a given exercise name across workouts.
 */
export function e1rmSeries(workouts = [], exerciseName, formula = DEFAULT_FORMULA) {
  if (!exerciseName) return [];
  const targetName = exerciseName.toLowerCase().trim();
  const points = [];

  // Sort workouts chronologically by date and time
  const sorted = [...workouts].sort((a, b) => {
    const dComp = (a.date || "").localeCompare(b.date || "");
    if (dComp !== 0) return dComp;
    return (a.time || "").localeCompare(b.time || "");
  });

  sorted.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      if ((ex.name || "").toLowerCase().trim() === targetName) {
        const best = bestSet1RM(ex.sets, formula);
        if (best) {
          points.push({
            date: w.date,
            time: w.time || null,
            est: best.est,
            weight: best.weight,
            reps: best.reps
          });
        }
      }
    });
  });

  return points;
}

/**
 * All-time best 1RM for an exercise across workout history.
 */
export function best1RM(workouts = [], exerciseName, formula = DEFAULT_FORMULA) {
  let best = null;
  const series = e1rmSeries(workouts, exerciseName, formula);
  series.forEach((p) => {
    if (!best || p.est > best.est) {
      best = { ...p };
    }
  });
  return best;
}

/**
 * Check if a completed set beats all prior 1RM estimates for this exercise.
 */
export function is1RMRecord(priorWorkouts = [], exerciseName, weight, reps, formula = DEFAULT_FORMULA) {
  const currentEst = estimate1RM(weight, reps, formula);
  if (currentEst === null) return null;
  const prev = best1RM(priorWorkouts, exerciseName, formula);
  if (!prev) {
    return { isRecord: true, est: currentEst, prevEst: 0 };
  }
  if (currentEst > prev.est) {
    return { isRecord: true, est: currentEst, prevEst: prev.est };
  }
  return { isRecord: false, est: currentEst, prevEst: prev.est };
}

