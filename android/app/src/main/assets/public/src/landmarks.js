// Renaissance Periodization (RP) Hypertrophy Volume Landmarks
// Scientific thresholds by Dr. Mike Israetel: MV, MEV, MAV, and MRV.

/**
 * Standard weekly set volume landmarks for an intermediate trainee across the 16 canonical muscles.
 * - mv: Maintenance Volume (minimum sets/week to preserve muscle)
 * - mev: Minimum Effective Volume (minimum sets/week to stimulate hypertrophy)
 * - mavMin: Lower bound of Maximum Adaptive Volume (optimal growth range)
 * - mavMax: Upper bound of Maximum Adaptive Volume
 * - mrv: Maximum Recoverable Volume (fatigue exceeds recovery beyond this)
 */
export const RP_VOLUME_LANDMARKS = {
  chest: { mv: 8, mev: 10, mavMin: 12, mavMax: 20, mrv: 22 },
  anterior_deltoids: { mv: 0, mev: 0, mavMin: 6, mavMax: 12, mrv: 16 }, // Heavily stimulated by horizontal/incline pressing
  lateral_deltoids: { mv: 6, mev: 8, mavMin: 14, mavMax: 22, mrv: 26 },
  posterior_deltoids: { mv: 4, mev: 6, mavMin: 12, mavMax: 18, mrv: 22 },
  biceps: { mv: 4, mev: 6, mavMin: 12, mavMax: 20, mrv: 24 },
  triceps: { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 18 },
  forearms: { mv: 0, mev: 0, mavMin: 4, mavMax: 10, mrv: 16 }, // Stimulated by heavy pulling and carries
  abs: { mv: 0, mev: 0, mavMin: 8, mavMax: 16, mrv: 20 },
  obliques: { mv: 0, mev: 0, mavMin: 6, mavMax: 14, mrv: 18 },
  traps: { mv: 0, mev: 0, mavMin: 10, mavMax: 20, mrv: 26 },
  lats: { mv: 6, mev: 10, mavMin: 12, mavMax: 20, mrv: 24 },
  lower_back: { mv: 0, mev: 4, mavMin: 6, mavMax: 10, mrv: 14 },
  glutes: { mv: 0, mev: 4, mavMin: 8, mavMax: 16, mrv: 20 },
  quadriceps: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 },
  hamstrings: { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 20 },
  calves: { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 }
};

export const LEVEL_FACTORS = {
  beginner: 0.75,
  intermediate: 1.0,
  advanced: 1.25
};

/**
 * Evaluates weekly set volume for a canonical muscle against RP volume landmarks.
 * @param {string} muscleId - Canonical muscle ID
 * @param {number} weeklySets - Working sets completed in the trailing 7 days
 * @param {"beginner"|"intermediate"|"advanced"} [level="intermediate"] - Trainee level
 * @returns {Object} Volume landmark status, tier, label, color, and boundaries
 */
export function evaluateVolumeStatus(muscleId, weeklySets = 0, level = "intermediate") {
  const base = RP_VOLUME_LANDMARKS[muscleId] || { mv: 4, mev: 6, mavMin: 10, mavMax: 16, mrv: 20 };
  const factor = LEVEL_FACTORS[level] || 1.0;

  const mv = Math.round(base.mv * factor);
  const mev = Math.round(base.mev * factor);
  const mavMin = Math.round(base.mavMin * factor);
  const mavMax = Math.round(base.mavMax * factor);
  const mrv = Math.round(base.mrv * factor);

  const sets = Math.max(0, Number(weeklySets) || 0);

  if (sets < mv) {
    return {
      muscleId,
      weeklySets: sets,
      mv, mev, mavMin, mavMax, mrv,
      tier: "below_mv",
      label: "Below Maintenance (Atrophy Risk)",
      color: "#8d908c",
      description: `Logged ${sets} sets this week. Minimum maintenance threshold is ${mv} sets.`
    };
  }

  if (sets < mev) {
    return {
      muscleId,
      weeklySets: sets,
      mv, mev, mavMin, mavMax, mrv,
      tier: "maintenance",
      label: "Maintenance Volume",
      color: "#e8c84a",
      description: `Logged ${sets} sets this week. Preserves existing muscle mass without stimulus for new growth.`
    };
  }

  if (sets <= mavMax) {
    return {
      muscleId,
      weeklySets: sets,
      mv, mev, mavMin, mavMax, mrv,
      tier: "optimal",
      label: "Optimal Hypertrophy (MAV)",
      color: "#3b6b32",
      description: `Logged ${sets} sets this week. In the prime adaptive volume range (${mavMin}–${mavMax} sets).`
    };
  }

  if (sets <= mrv) {
    return {
      muscleId,
      weeklySets: sets,
      mv, mev, mavMin, mavMax, mrv,
      tier: "overreaching",
      label: "Near Maximum Recovery (Overreaching)",
      color: "#e98a32",
      description: `Logged ${sets} sets this week. High stimulus near your maximum recoverable volume (${mrv} sets).`
    };
  }

  return {
    muscleId,
    weeklySets: sets,
    mv, mev, mavMin, mavMax, mrv,
    tier: "excessive",
    label: "Exceeds MRV (Overreaching)",
    color: "#d32f2f",
    description: `Logged ${sets} sets this week. Exceeds your recovery capacity (${mrv} sets). Fatigue outpaces growth.`
  };
}

/**
 * Calculates primary working sets per canonical muscle across workouts in the trailing 7 days.
 * @param {Array} workouts - User workout sessions
 * @param {string} endDateStr - "YYYY-MM-DD" end date (inclusive)
 * @returns {Record<string, number>} Sets per canonical muscle
 */
export function calculateWeeklyMuscleVolume(workouts = [], endDateStr) {
  const end = new Date(`${endDateStr}T23:59:59`);
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const startIso = start.toISOString().split("T")[0];
  const endIso = end.toISOString().split("T")[0];

  const relevantWorkouts = workouts.filter((w) => {
    return w.date && w.date >= startIso && w.date <= endIso;
  });

  const volumeMap = {};

  relevantWorkouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      const primaryMuscles = ex.muscleMapping?.primary || [];
      const validSets = (ex.sets || []).filter((s) => Number(s.reps) > 0);
      const setCount = validSets.length;

      primaryMuscles.forEach((mId) => {
        volumeMap[mId] = (volumeMap[mId] || 0) + setCount;
      });
    });
  });

  return volumeMap;
}

