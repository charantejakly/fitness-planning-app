// Effort Rating System (RIR / RPE)
// Unified effort parsing, normalization, and hard set detection for hypertrophy stimulus.

export const HARD_RIR_CEILING = 2; // RIR <= 2 (or RPE >= 8) is considered an effective working set near failure

/**
 * Parses user input or imported string into structured effort { rir, rpe, raw }.
 * Returns null if not recognizable.
 */
export function parseEffort(input) {
  if (input === undefined || input === null) return null;
  const str = String(input).trim().toLowerCase();
  if (!str) return null;

  // Failure
  if (str === "failure" || str === "fail" || str === "f") {
    return { kind: "rir", rir: 0, rpe: 10, raw: input };
  }

  // RIR matching: "rir 2", "2 rir", "rir: 1"
  const rirMatch = str.match(/rir\s*[:=]?\s*([0-5](?:\.[0-9])?)/i) || str.match(/([0-5](?:\.[0-9])?)\s*rir/i);
  if (rirMatch) {
    const val = parseFloat(rirMatch[1]);
    return { kind: "rir", rir: val, rpe: Math.max(6, 10 - val), raw: input };
  }

  // RPE matching: "rpe 8", "@8", "8.5 rpe"
  const rpeMatch = str.match(/rpe\s*[:=]?\s*([6-9](?:\.[0-9])?|10)/i) || str.match(/@\s*([6-9](?:\.[0-9])?|10)/) || str.match(/([6-9](?:\.[0-9])?|10)\s*rpe/i);
  if (rpeMatch) {
    const val = parseFloat(rpeMatch[1]);
    return { kind: "rpe", rpe: val, rir: Math.max(0, 10 - val), raw: input };
  }

  // Bare number:
  // If <= 4, assume RIR (0 to 4 reps in reserve)
  // If >= 6 && <= 10, assume RPE (6 to 10)
  const num = parseFloat(str);
  if (!Number.isNaN(num)) {
    if (num >= 0 && num <= 4) {
      return { kind: "rir", rir: num, rpe: Math.max(6, 10 - num), raw: input };
    }
    if (num >= 6 && num <= 10) {
      return { kind: "rpe", rpe: num, rir: Math.max(0, 10 - num), raw: input };
    }
  }

  return null;
}

/**
 * Returns true if a set was taken close to failure (RIR <= 2 or RPE >= 8).
 * Sets without effort ratings return false when explicitly checking for hard sets.
 */
export function isHardSet(set) {
  if (!set || set.effort === undefined || set.effort === null) return false;
  const parsed = parseEffort(set.effort);
  if (!parsed) return false;
  return parsed.rir <= HARD_RIR_CEILING;
}

