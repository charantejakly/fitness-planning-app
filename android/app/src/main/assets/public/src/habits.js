// Habits: Hydration (Water) Tracking & Intermittent Fasting Timer
// Inspired by OpenNutriTracker & WHO anthropometrics.

export const FASTING_PRESETS = [
  { hours: 14, label: "14:10 Circadian", desc: "Gentle daily reset" },
  { hours: 16, label: "16:8 Standard", desc: "Most popular daily fast" },
  { hours: 18, label: "18:6 Deep", desc: "Extended cellular autophagy" },
  { hours: 20, label: "20:4 Warrior", desc: "Advanced compact window" }
];

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

/**
 * Initiates a new fasting session.
 * @param {number} [targetHours=16] - Fasting target duration
 * @param {Date|string} [startTime=new Date()] - Start timestamp
 * @returns {Object} Fasting session
 */
export function startFast(targetHours = 16, startTime = new Date()) {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  return {
    id: `fast-${Date.now()}`,
    startTime: start.toISOString(),
    targetHours: Number(targetHours) || 16,
    completedAt: null,
    cancelledAt: null
  };
}

/**
 * Completes an active fasting session.
 * @param {Object} session - Fasting session object
 * @param {Date} [now=new Date()]
 * @returns {Object} Completed session
 */
export function completeFast(session, now = new Date()) {
  if (!session) return null;
  return {
    ...session,
    completedAt: (now instanceof Date ? now : new Date(now)).toISOString()
  };
}

/**
 * Cancels an active fasting session.
 * @param {Object} session - Fasting session object
 * @param {Date} [now=new Date()]
 * @returns {Object} Cancelled session
 */
export function cancelFast(session, now = new Date()) {
  if (!session) return null;
  return {
    ...session,
    cancelledAt: (now instanceof Date ? now : new Date(now)).toISOString()
  };
}

function padZero(num) {
  return String(Math.floor(num)).padStart(2, "0");
}

export function formatDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${padZero(m)}:${padZero(s)}`;
}

/**
 * Computes current elapsed time, remaining time, and progress for a fasting session.
 * @param {Object} session - Fasting session
 * @param {Date} [now=new Date()] - Current reference time
 * @returns {Object} Fasting countdown and progress status
 */
export function getFastStatus(session, now = new Date()) {
  if (!session || !session.startTime) {
    return {
      isActive: false,
      isFinished: false,
      elapsedSeconds: 0,
      remainingSeconds: 0,
      percent: 0,
      isTargetReached: false,
      elapsedFormatted: "0:00:00",
      remainingFormatted: "0:00:00"
    };
  }

  const isCompleted = Boolean(session.completedAt);
  const isCancelled = Boolean(session.cancelledAt);
  const isActive = !isCompleted && !isCancelled;

  const startMs = new Date(session.startTime).getTime();
  const endMs = isCompleted
    ? new Date(session.completedAt).getTime()
    : isCancelled
    ? new Date(session.cancelledAt).getTime()
    : (now instanceof Date ? now : new Date(now)).getTime();

  const targetTotalSec = (session.targetHours || 16) * 3600;
  const elapsedSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const remainingSec = Math.max(0, targetTotalSec - elapsedSec);
  const percent = Math.min(100, Math.round((elapsedSec / targetTotalSec) * 100));
  const isTargetReached = elapsedSec >= targetTotalSec;

  return {
    isActive,
    isCompleted,
    isCancelled,
    isFinished: isCompleted || isCancelled,
    targetHours: session.targetHours,
    elapsedSeconds: elapsedSec,
    remainingSeconds: remainingSec,
    percent,
    isTargetReached,
    elapsedFormatted: formatDuration(elapsedSec),
    remainingFormatted: formatDuration(remainingSec)
  };
}
