// Warm-up Set Generator
// Generates progressive warm-up sets snapped to physically loadable barbell weights.

export const WARMUP_RAMPS = {
  quick: [
    { fraction: 0.5, reps: 5 },
    { fraction: 0.8, reps: 3 }
  ],
  standard: [
    { fraction: 0.4, reps: 8 },
    { fraction: 0.6, reps: 5 },
    { fraction: 0.8, reps: 3 }
  ],
  thorough: [
    { fraction: 0.3, reps: 10 },
    { fraction: 0.45, reps: 8 },
    { fraction: 0.6, reps: 5 },
    { fraction: 0.75, reps: 3 },
    { fraction: 0.9, reps: 1 }
  ]
};

const snap = (val, step = 2.5) => Math.round(val / step) * step;

/**
 * Generates an array of warm-up sets for a target working weight.
 * @param {number} workWeightKg - Working set weight in kg
 * @param {string} [style="standard"] - "standard" | "quick" | "thorough"
 * @param {number} [barKg=20] - Barbell base weight in kg
 * @param {number} [step=2.5] - Smallest plate jump (default 2.5 kg total bar jump)
 * @returns {Array<{ rung: number, percent: number, weight: number, reps: number, effort: string, label: string }>}
 */
export function generateWarmupSets(workWeightKg, style = "standard", barKg = 20, step = 2.5) {
  const target = Number(workWeightKg);
  const bar = Number(barKg) || 20;

  if (!Number.isFinite(target) || target <= bar) {
    return [];
  }

  const ramp = WARMUP_RAMPS[style] || WARMUP_RAMPS.standard;
  const sets = [];
  let previousWeight = 0;

  ramp.forEach((stepItem, idx) => {
    const rawWeight = target * stepItem.fraction;
    // Minimum weight is the empty bar, capped below the working weight
    let snappedWeight = Math.max(bar, snap(rawWeight, step));

    // Ensure strictly lighter than working set
    if (snappedWeight >= target) {
      snappedWeight = Math.max(bar, target - step);
    }

    // Skip duplicate rungs to avoid redundant sets at the same weight
    if (snappedWeight > previousWeight) {
      sets.push({
        rung: idx + 1,
        percent: Math.round(stepItem.fraction * 100),
        weight: snappedWeight,
        reps: stepItem.reps,
        effort: "warmup",
        label: `Warmup ${idx + 1} (${Math.round(stepItem.fraction * 100)}%)`
      });
      previousWeight = snappedWeight;
    }
  });

  return sets;
}

