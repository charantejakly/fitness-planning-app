// Barbell Plate Calculator
// Calculates the exact symmetric plate arrangement for each sleeve of a barbell.

export const PLATE_COLORS = {
  25: { bg: "#d32f2f", text: "#ffffff", border: "#b71c1c" }, // Red
  20: { bg: "#1976d2", text: "#ffffff", border: "#0d47a1" }, // Blue
  15: { bg: "#fbc02d", text: "#212121", border: "#f57f17" }, // Yellow
  10: { bg: "#388e3c", text: "#ffffff", border: "#1b5e20" }, // Green
  5: { bg: "#f5f5f5", text: "#212121", border: "#9e9e9e" },  // White
  2.5: { bg: "#212121", text: "#ffffff", border: "#000000" },// Black
  1.25: { bg: "#b0bec5", text: "#212121", border: "#78909c" },// Silver
  0.5: { bg: "#cfd8dc", text: "#37474f", border: "#90a4ae" }
};

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_BAR_KG = 20;

/**
 * Calculates symmetric plate loading per barbell sleeve.
 * @param {number} targetKg - Desired total bar weight in kg
 * @param {number} [barKg=20] - Weight of the barbell in kg
 * @param {number[]} [availablePlates=DEFAULT_PLATES_KG] - Available plate denominations
 * @returns {Object} Loading result with per-side plates, achieved weight, and exactness
 */
export function calculatePlates(targetKg, barKg = DEFAULT_BAR_KG, availablePlates = DEFAULT_PLATES_KG) {
  const target = Number(targetKg);
  const bar = Number(barKg) || DEFAULT_BAR_KG;

  if (!Number.isFinite(target) || target <= 0) {
    return {
      targetKg: 0,
      barKg: bar,
      achievedKg: 0,
      remainderKg: 0,
      exact: false,
      belowBar: true,
      platesPerSide: [],
      summaryText: "Empty / Invalid weight"
    };
  }

  if (target < bar) {
    return {
      targetKg: target,
      barKg: bar,
      achievedKg: bar,
      remainderKg: target - bar,
      exact: false,
      belowBar: true,
      platesPerSide: [],
      summaryText: `Target is lighter than the bar (${bar} kg)`
    };
  }

  // Weight required on each side of the barbell
  let remainingPerSide = (target - bar) / 2;
  const sorted = [...availablePlates].sort((a, b) => b - a);
  const platesPerSide = [];

  for (const denom of sorted) {
    if (denom <= 0) continue;
    // Tolerance for floating point inaccuracy
    const count = Math.floor((remainingPerSide + 0.0001) / denom);
    if (count > 0) {
      const colors = PLATE_COLORS[denom] || { bg: "#90a4ae", text: "#212121", border: "#546e7a" };
      platesPerSide.push({
        weightKg: denom,
        count,
        bg: colors.bg,
        text: colors.text,
        border: colors.border,
        label: `${denom}kg`
      });
      remainingPerSide -= count * denom;
      remainingPerSide = Math.round(remainingPerSide * 1000) / 1000;
    }
  }

  const loadedPerSide = platesPerSide.reduce((sum, p) => sum + p.weightKg * p.count, 0);
  const achievedKg = Math.round((bar + loadedPerSide * 2) * 100) / 100;
  const remainderKg = Math.round((target - achievedKg) * 100) / 100;
  const exact = Math.abs(remainderKg) < 0.01;

  const summaryParts = platesPerSide.map((p) => `${p.count}×${p.weightKg}kg`);
  const summaryText = summaryParts.length > 0
    ? `${summaryParts.join(" + ")} each side`
    : `Bar only (${bar} kg)`;

  return {
    targetKg: target,
    barKg: bar,
    achievedKg,
    remainderKg,
    exact,
    belowBar: false,
    platesPerSide,
    summaryText
  };
}
