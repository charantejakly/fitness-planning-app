import test from "node:test";
import assert from "node:assert/strict";
import {
  healthyWeightSpan,
  computeWeightTrend,
  forecastWeightGoal
} from "../src/weight-trend.js";

test("Weight Trend: healthyWeightSpan calculates WHO BMI 18.5 - 24.9 span for 175cm", () => {
  const span = healthyWeightSpan(175);
  assert.equal(span.minKg, 56.7);
  assert.equal(span.maxKg, 76.3);
  assert.equal(span.midpointKg, 66.5);
});

test("Weight Trend: computeWeightTrend applies EWMA smoothing to measurements", () => {
  const rawMeasurements = [
    { date: "2026-11-01", weight: 80.0 },
    { date: "2026-11-02", weight: 82.0 }, // Acute water spike
    { date: "2026-11-03", weight: 79.5 },
    { date: "2026-11-04", weight: 79.0 }
  ];

  const trend = computeWeightTrend(rawMeasurements);
  assert.equal(trend.length, 4);
  assert.equal(trend[0].trendWeight, 80.0);
  // On day 2, 82 raw spike is smoothed: 0.25 * 82 + 0.75 * 80 = 80.5
  assert.equal(trend[1].trendWeight, 80.5);
  assert.ok(trend[1].trendWeight < trend[1].rawWeight);
});

test("Weight Trend: forecastWeightGoal projects completion date when loss trend is on track", () => {
  const measurements = [
    { date: "2026-11-01", weight: 80.0 },
    { date: "2026-11-08", weight: 79.5 },
    { date: "2026-11-15", weight: 79.0 }
  ];

  const forecast = forecastWeightGoal(measurements, 77.0);
  assert.equal(forecast.status, "on_track");
  assert.ok(forecast.weeklyRate < 0);
  assert.equal(forecast.kgRemaining, 2.7); // 79.7 trend kg - 77.0 target kg
  assert.ok(forecast.daysRemaining > 0);
  assert.ok(forecast.forecastDate > "2026-11-15");
});

test("Weight Trend: forecastWeightGoal detects reversed or stalled trajectory", () => {
  const measurements = [
    { date: "2026-11-01", weight: 75.0 },
    { date: "2026-11-08", weight: 75.5 },
    { date: "2026-11-15", weight: 76.0 } // Gaining weight
  ];

  const forecast = forecastWeightGoal(measurements, 72.0); // Goal is to lose weight
  assert.equal(forecast.status, "stalled_or_reversed");
  assert.equal(forecast.forecastDate, null);
});

test("Weight Trend: forecastWeightGoal marks goal as achieved when within 0.2kg", () => {
  const measurements = [
    { date: "2026-11-01", weight: 75.2 },
    { date: "2026-11-15", weight: 75.1 }
  ];

  const forecast = forecastWeightGoal(measurements, 75.0);
  assert.equal(forecast.status, "achieved");
  assert.equal(forecast.daysRemaining, 0);
});
