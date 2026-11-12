// Habits: Hydration (Water) Tracking
// Inspired by OpenNutriTracker & WHO anthropometrics.

export const DEFAULT_WATER_ML_PER_KG = 35; // 35 ml per kg body weight

/**
 * Calculates evidence-based daily water intake target in ml.
 * @param {number} [weightKg=70] - Trainee bodyweight in kg
 * @returns {number} Daily target in ml (clamped between 1500 and 4500 ml)
 */
export function calculateWaterTarget(weightKg = 70) {
  const w = Number(weightKg) || 70;
  const rawMl = w * DEFAULT_WATER_ML_PER_KG;
  const rounded = Math.round(rawMl / 50) * 50;
  return Math.min(4500, Math.max(1500, rounded));
}

/**
 * Records or updates water intake for a specific date.
 * @param {Object} waterLogs - Map of date -> total ml
 * @param {string} date - "YYYY-MM-DD"
 * @param {number} deltaMl - Amount to add (positive) or subtract (negative)
 * @returns {Object} Updated waterLogs clone
 */
export function updateWaterIntake(waterLogs = {}, date, deltaMl) {
  const updated = { ...(waterLogs || {}) };
  const current = Number(updated[date]) || 0;
  const next = Math.max(0, current + Number(deltaMl));
  updated[date] = next;
  return updated;
}

/**
 * Evaluates water hydration progress for a given date.
 * @param {Object} waterLogs - Map of date -> total ml
 * @param {string} date - "YYYY-MM-DD"
 * @param {number} targetMl - Target in ml
 * @returns {{ currentMl: number, targetMl: number, percent: number, remainingMl: number }}
 */
export function evaluateWaterProgress(waterLogs = {}, date, targetMl = 2500) {
  const currentMl = Number(waterLogs?.[date]) || 0;
  const target = Math.max(500, Number(targetMl) || 2500);
  const percent = Math.min(100, Math.round((currentMl / target) * 100));
  const remainingMl = Math.max(0, target - currentMl);
  return { currentMl, targetMl: target, percent, remainingMl };
}


