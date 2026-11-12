// EWMA Weight Trend Smoothing & Goal Forecaster
// Eliminates acute water weight swings using Exponentially Weighted Moving Average
// and projects realistic goal achievement dates based on verified 14-day velocity.

const EWMA_ALPHA = 0.25; // Equivalent to N = 7 day smoothing window: 2 / (7 + 1) = 0.25

/**
 * Calculates WHO Healthy Weight Span based on height in centimeters.
 * BMI 18.5 – 24.9 (WHO Technical Report Series 854).
 * @param {number} heightCm - Height in centimeters
 * @returns {{ minKg: number, maxKg: number, midpointKg: number }}
 */
export function healthyWeightSpan(heightCm) {
  const h = Number(heightCm);
  if (!Number.isFinite(h) || h <= 50 || h >= 280) {
    return { minKg: 50, maxKg: 75, midpointKg: 62.5 };
  }
  const hm2 = Math.pow(h / 100, 2);
  const minKg = Math.round(18.5 * hm2 * 10) / 10;
  const maxKg = Math.round(24.9 * hm2 * 10) / 10;
  const midpointKg = Math.round(((minKg + maxKg) / 2) * 10) / 10;
  return { minKg, maxKg, midpointKg };
}

/**
 * Computes smoothed EWMA weight points from raw measurement history.
 * @param {Array<{ date: string, weight?: number }>} measurements - Chronological measurement logs
 * @returns {Array<{ date: string, rawWeight: number, trendWeight: number }>}
 */
export function computeWeightTrend(measurements = []) {
  const valid = measurements
    .filter((m) => m && m.date && Number(m.weight) > 0)
    .map((m) => ({ date: m.date, weight: Number(m.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) return [];

  // Group multiple weigh-ins on the same day to daily average
  const dailyMap = new Map();
  valid.forEach((m) => {
    if (!dailyMap.has(m.date)) {
      dailyMap.set(m.date, []);
    }
    dailyMap.get(m.date).push(m.weight);
  });

  const dailyEntries = Array.from(dailyMap.entries()).map(([date, weights]) => ({
    date,
    weight: weights.reduce((a, b) => a + b, 0) / weights.length
  }));

  const trendPoints = [];
  let runningTrend = dailyEntries[0].weight;

  dailyEntries.forEach((entry, idx) => {
    if (idx === 0) {
      runningTrend = entry.weight;
    } else {
      runningTrend = EWMA_ALPHA * entry.weight + (1 - EWMA_ALPHA) * runningTrend;
    }
    trendPoints.push({
      date: entry.date,
      rawWeight: Math.round(entry.weight * 10) / 10,
      trendWeight: Math.round(runningTrend * 10) / 10
    });
  });

  return trendPoints;
}

/**
 * Computes weekly rate of change and forecasts calendar completion date for target weight.
 * @param {Array<{ date: string, weight?: number }>} measurements - Measurement records
 * @param {number|null} targetWeightKg - Target weight goal
 * @returns {Object} Trend summary, 14-day velocity (kg/week), and projected goal date
 */
export function forecastWeightGoal(measurements = [], targetWeightKg = null) {
  const trend = computeWeightTrend(measurements);
  if (trend.length === 0) {
    return {
      currentTrend: null,
      weeklyRate: null,
      forecastDate: null,
      daysRemaining: null,
      status: "no_data",
      description: "No weight check-ins recorded yet."
    };
  }

  const latest = trend[trend.length - 1];
  const target = Number(targetWeightKg) || null;

  if (trend.length < 2) {
    return {
      currentTrend: latest.trendWeight,
      weeklyRate: null,
      forecastDate: null,
      daysRemaining: null,
      status: "insufficient_data",
      description: `Current trend: ${latest.trendWeight} kg. Log more weigh-ins to establish rate.`
    };
  }

  // Calculate rate over trailing window (up to 14 days)
  const windowDays = 14;
  const latestDate = new Date(`${latest.date}T12:00:00`);
  const windowStart = new Date(latestDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startIso = windowStart.toISOString().split("T")[0];

  const windowPoints = trend.filter((p) => p.date >= startIso);
  const baseline = windowPoints[0];

  const daySpan = Math.max(1, Math.round((new Date(`${latest.date}T12:00:00`) - new Date(`${baseline.date}T12:00:00`)) / (24 * 60 * 60 * 1000)));
  const weightDiff = latest.trendWeight - baseline.trendWeight;
  const weeklyRate = Math.round((weightDiff / (daySpan / 7)) * 100) / 100; // kg per week

  if (!target || target <= 0) {
    return {
      currentTrend: latest.trendWeight,
      weeklyRate,
      forecastDate: null,
      daysRemaining: null,
      status: "no_goal",
      description: `Current trend: ${latest.trendWeight} kg (${weeklyRate > 0 ? "+" : ""}${weeklyRate} kg/week). Set a goal weight in your profile to enable forecast.`
    };
  }

  const kgRemaining = Math.round(Math.abs(latest.trendWeight - target) * 10) / 10;
  const isLossGoal = target < latest.trendWeight;
  const isGainGoal = target > latest.trendWeight;

  if (kgRemaining <= 0.2) {
    return {
      currentTrend: latest.trendWeight,
      weeklyRate,
      forecastDate: latest.date,
      daysRemaining: 0,
      status: "achieved",
      description: `Target weight of ${target} kg reached! (Current trend: ${latest.trendWeight} kg).`
    };
  }

  // Check direction consistency
  if (isLossGoal && weeklyRate >= -0.05) {
    return {
      currentTrend: latest.trendWeight,
      weeklyRate,
      forecastDate: null,
      daysRemaining: null,
      status: "stalled_or_reversed",
      description: `Goal is ${target} kg (${kgRemaining} kg to lose), but 14-day trend is currently ${weeklyRate > 0 ? "gaining" : "stable"} at ${weeklyRate} kg/week.`
    };
  }

  if (isGainGoal && weeklyRate <= 0.05) {
    return {
      currentTrend: latest.trendWeight,
      weeklyRate,
      forecastDate: null,
      daysRemaining: null,
      status: "stalled_or_reversed",
      description: `Goal is ${target} kg (${kgRemaining} kg to gain), but 14-day trend is currently ${weeklyRate < 0 ? "losing" : "stable"} at ${weeklyRate} kg/week.`
    };
  }

  const absRate = Math.abs(weeklyRate);
  const weeksRemaining = kgRemaining / absRate;
  const daysRemaining = Math.max(1, Math.round(weeksRemaining * 7));

  const forecast = new Date(latestDate.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
  const forecastDate = forecast.toISOString().split("T")[0];

  return {
    currentTrend: latest.trendWeight,
    weeklyRate,
    forecastDate,
    daysRemaining,
    kgRemaining,
    status: "on_track",
    description: `On track to reach ${target} kg in ${daysRemaining} days (${new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" }).format(forecast)}) at ${weeklyRate} kg/week.`
  };
}
