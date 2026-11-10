import { getWorkoutDetailStatus, evaluateLoggingStatus } from "./muscle-data.js";

export const DEFAULT_PROFILE = {
  name: "User",
  sex: "male",
  age: "20",
  height: "178",
  weight: "80",
  lowerWaist: "92",
  upperAbdomen: "85",
  activity: "1.2",
  goal: "maintain",
  targetCalories: "",
  proteinTarget: "",
  carbsTarget: "",
  fatTarget: "",
  fibreTarget: "",
  foodEnvironment: "College mess",
  dietaryPattern: "Omnivore",
  weighInCadence: "Weekly"
};

export const CURRENT_SCHEMA_VERSION = 3;

export const blankData = () => ({
  version: CURRENT_SCHEMA_VERSION,
  profile: { ...DEFAULT_PROFILE },
  entries: [],
  measurements: [],
  workouts: [],
  customFoods: [],
  customExercises: [],
  completedDays: [],
  recoveryOverrides: {},
  recoveryHours: {}
});

export function validateBackup(obj) {
  if (!obj || typeof obj !== "object") {
    return { valid: false, error: "Backup must be a valid JSON object." };
  }
  if (obj.version !== undefined && (typeof obj.version !== "number" || !Number.isFinite(obj.version) || obj.version < 1 || obj.version > CURRENT_SCHEMA_VERSION)) {
    return { valid: false, error: "Unsupported backup schema version." };
  }
  if (!Array.isArray(obj.entries)) {
    return { valid: false, error: "Invalid backup: 'entries' must be an array." };
  }
  if (obj.measurements && !Array.isArray(obj.measurements)) {
    return { valid: false, error: "Invalid backup: 'measurements' must be an array." };
  }
  if (obj.workouts && !Array.isArray(obj.workouts)) {
    return { valid: false, error: "Invalid backup: 'workouts' must be an array." };
  }
  if (obj.customFoods && !Array.isArray(obj.customFoods)) {
    return { valid: false, error: "Invalid backup: 'customFoods' must be an array." };
  }
  if (obj.customExercises && !Array.isArray(obj.customExercises)) {
    return { valid: false, error: "Invalid backup: 'customExercises' must be an array." };
  }
  if (obj.completedDays && !Array.isArray(obj.completedDays)) {
    return { valid: false, error: "Invalid backup: 'completedDays' must be an array." };
  }
  if (obj.recoveryOverrides && (typeof obj.recoveryOverrides !== "object" || Array.isArray(obj.recoveryOverrides))) {
    return { valid: false, error: "Invalid backup: 'recoveryOverrides' must be an object." };
  }
  if (obj.recoveryHours && (typeof obj.recoveryHours !== "object" || Array.isArray(obj.recoveryHours))) {
    return { valid: false, error: "Invalid backup: 'recoveryHours' must be an object." };
  }
  return { valid: true };
}

export function migrateData(stored) {
  if (!stored || typeof stored !== "object") return blankData();

  const rawVersion = stored.version;
  const sourceVersion = typeof rawVersion === "number" && Number.isFinite(rawVersion) ? rawVersion : 1;

  // Safe handling of future unsupported schemas: preserve stored data without corruption
  if (sourceVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(`Unsupported future schema version ${sourceVersion} encountered; preserving data safely.`);
    return stored;
  }

  const isMigratingFromPreV3 = sourceVersion < 3;

  const migratedWorkouts = (stored.workouts || []).map((w) => {
    if (!w || typeof w !== "object") return w;

    // Strict legacy classification based on source schema version
    const isLegacy = isMigratingFromPreV3 ? true : (w.isLegacy === true);

    const detailStatus = getWorkoutDetailStatus({
      ...w,
      isLegacy
    });

    return {
      // 1. Retain all original user properties verbatim (no truthy overwrites):
      ...w,

      // 2. Add Schema v3 properties only when undefined:
      id: w.id !== undefined ? w.id : uid(),
      date: w.date !== undefined ? w.date : null,
      time: w.time !== undefined ? w.time : null,
      title: w.title !== undefined ? w.title : "",
      type: w.type !== undefined ? w.type : null,
      minutes: w.minutes !== undefined ? w.minutes : "",
      distance: w.distance !== undefined ? w.distance : "",
      note: w.note !== undefined ? w.note : "",

      // 3. Metadata integrity (never fabricate timestamps or assume on-time):
      isLegacy,
      createdAt: w.createdAt !== undefined ? w.createdAt : null,
      loggingStatus: w.loggingStatus !== undefined
        ? w.loggingStatus
        : (w.createdAt && w.date ? evaluateLoggingStatus(w.date, w.createdAt) : "unknown"),

      detailStatus,
      hasDetailedMuscles: detailStatus === "detailed",
      exercises: Array.isArray(w.exercises) ? w.exercises : []
    };
  });

  return {
    ...blankData(),
    ...stored,
    profile: { ...DEFAULT_PROFILE, ...(stored.profile || {}) },
    entries: Array.isArray(stored.entries) ? stored.entries : [],
    measurements: Array.isArray(stored.measurements) ? stored.measurements : [],
    workouts: migratedWorkouts,
    customFoods: Array.isArray(stored.customFoods) ? stored.customFoods : [],
    customExercises: Array.isArray(stored.customExercises) ? stored.customExercises : [],
    completedDays: Array.isArray(stored.completedDays) ? stored.completedDays : [],
    recoveryOverrides: (stored.recoveryOverrides && typeof stored.recoveryOverrides === "object" && !Array.isArray(stored.recoveryOverrides))
      ? stored.recoveryOverrides
      : {},
    recoveryHours: (stored.recoveryHours && typeof stored.recoveryHours === "object" && !Array.isArray(stored.recoveryHours))
      ? stored.recoveryHours
      : {},
    version: CURRENT_SCHEMA_VERSION
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem("lean-mode-data");
    if (!raw) return blankData();
    const stored = JSON.parse(raw);
    return migrateData(stored);
  } catch (err) {
    console.error("Failed to load local data:", err);
    return blankData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem("lean-mode-data", JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save local data:", err);
    throw err;
  }
}

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const localDate = (value = new Date()) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function nutrition(entries) {
  const safeNum = (val) => {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + safeNum(entry.calories),
      protein: sum.protein + safeNum(entry.protein),
      carbs: sum.carbs + safeNum(entry.carbs),
      fat: sum.fat + safeNum(entry.fat),
      fibre: sum.fibre + safeNum(entry.fibre)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }
  );
}

// Mifflin-St Jeor equation:
// Men: 10 x weight(kg) + 6.25 x height(cm) - 5 x age + 5
// Women: 10 x weight(kg) + 6.25 x height(cm) - 5 x age - 161
export function calculateBmr(profile) {
  const { sex, age, height, weight } = profile || {};
  if (!sex || !age || !height || !weight) return null;
  const numWeight = Number(weight);
  const numHeight = Number(height);
  const numAge = Number(age);
  if (!numWeight || !numHeight || !numAge) return null;
  const s = sex === "male" ? 5 : -161;
  return Math.round(10 * numWeight + 6.25 * numHeight - 5 * numAge + s);
}

export function calculateTdee(profile) {
  const bmr = calculateBmr(profile);
  if (!bmr) return null;
  const activity = Number(profile?.activity) || 1.2;
  return Math.round(bmr * activity);
}

export function targetCalories(profile) {
  return Number(profile?.targetCalories) || calculateTdee(profile) || 0;
}

// Streak counts consecutive days with logged food or explicit day completion up to today/reference date
// Note: Exceeding calories does NOT break a streak; streaks measure tracking consistency!
export function streak(entries, today = localDate(), completedDays = []) {
  const loggedDates = new Set(entries.map((entry) => entry.date));
  const markedDates = new Set(completedDays);
  let count = 0;
  const cursor = new Date(`${today}T12:00:00`);

  while (loggedDates.has(localDate(cursor)) || markedDates.has(localDate(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// Computes 7-day or custom range summary without assuming unlogged days are 0 calories
export function weeklySummary(entries, today = localDate()) {
  const days = [];
  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(localDate(d));
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let loggedDaysCount = 0;

  const dayStats = days.map((date) => {
    const dayEntries = entries.filter((x) => x.date === date);
    const totals = nutrition(dayEntries);
    const hasLog = dayEntries.length > 0;
    if (hasLog) {
      totalCalories += totals.calories;
      totalProtein += totals.protein;
      loggedDaysCount += 1;
    }
    return {
      date,
      hasLog,
      totals
    };
  });

  const avgCalories = loggedDaysCount ? Math.round(totalCalories / loggedDaysCount) : null;
  const avgProtein = loggedDaysCount ? Math.round(totalProtein / loggedDaysCount) : null;

  return {
    days: dayStats,
    loggedDaysCount,
    totalLoggedDaysInWeek: loggedDaysCount,
    avgCalories,
    avgProtein
  };
}

// Computes comprehensive multi-domain progress analytics across food, workouts, and measurements
export function calculateProgressAnalytics(appData, endDate = localDate(), rangeDays = 7) {
  const days = [];
  const cursor = new Date(`${endDate}T12:00:00`);
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(localDate(d));
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let foodLoggedDays = 0;

  let totalWorkouts = 0;
  let totalSets = 0;
  let totalMinutes = 0;
  let workoutLoggedDays = 0;
  let bothLoggedDays = 0;
  let completedDaysCount = 0;

  const muscleSetsMap = {};

  const entries = appData?.entries || [];
  const workouts = appData?.workouts || [];
  const measurements = appData?.measurements || [];
  const completedDays = appData?.completedDays || [];

  const dayStats = days.map((date) => {
    const dayEntries = entries.filter((x) => x.date === date);
    const dayWorkouts = workouts.filter((x) => x.date === date);
    const dayMeasurements = measurements.filter((x) => x.date === date);
    const isCompleted = completedDays.includes(date);

    const totals = nutrition(dayEntries);
    const hasFood = dayEntries.length > 0;
    const hasWorkout = dayWorkouts.length > 0;

    if (hasFood) {
      totalCalories += totals.calories;
      totalProtein += totals.protein;
      totalCarbs += totals.carbs;
      totalFat += totals.fat;
      foodLoggedDays += 1;
    }

    let daySets = 0;
    let dayMinutes = 0;
    let dayDistance = 0;
    const dayMuscles = new Set();
    const workoutTitles = [];

    if (hasWorkout) {
      workoutLoggedDays += 1;
      totalWorkouts += dayWorkouts.length;
      for (const w of dayWorkouts) {
        if (w.title) workoutTitles.push(w.title);
        dayMinutes += Number(w.minutes || 0);
        dayDistance += Number(w.distance || 0);
        for (const ex of w.exercises || []) {
          const validSets = (ex.sets || []).filter((s) => s && Number(s.reps) > 0).length;
          daySets += validSets;
          for (const mId of ex.muscleMapping?.primary || []) {
            dayMuscles.add(mId);
            muscleSetsMap[mId] = (muscleSetsMap[mId] || 0) + validSets;
          }
        }
      }
      totalSets += daySets;
      totalMinutes += dayMinutes;
    }

    if (hasFood && hasWorkout) {
      bothLoggedDays += 1;
    }
    if (isCompleted) {
      completedDaysCount += 1;
    }

    const latestWeight = dayMeasurements.length ? dayMeasurements[dayMeasurements.length - 1].weight : null;
    const latestWaist = dayMeasurements.length ? dayMeasurements[dayMeasurements.length - 1].waist : null;

    const weekdayNarrow = new Intl.DateTimeFormat("en-IN", { weekday: "narrow" }).format(new Date(`${date}T12:00:00`));
    const weekdayShort = new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(`${date}T12:00:00`));

    return {
      date,
      weekdayNarrow,
      weekdayShort,
      hasFood,
      hasWorkout,
      hasBoth: hasFood && hasWorkout,
      isCompleted,
      totals,
      entryCount: dayEntries.length,
      entries: dayEntries,
      workouts: dayWorkouts,
      workoutCount: dayWorkouts.length,
      workoutTitles,
      sets: daySets,
      minutes: dayMinutes,
      distance: dayDistance,
      primaryMuscles: Array.from(dayMuscles),
      weight: latestWeight,
      waist: latestWaist
    };
  });

  const avgCalories = foodLoggedDays ? Math.round(totalCalories / foodLoggedDays) : null;
  const avgProtein = foodLoggedDays ? Math.round(totalProtein / foodLoggedDays) : null;
  const avgCarbs = foodLoggedDays ? Math.round(totalCarbs / foodLoggedDays) : null;
  const avgFat = foodLoggedDays ? Math.round(totalFat / foodLoggedDays) : null;

  const topMuscles = Object.entries(muscleSetsMap)
    .map(([id, sets]) => ({ id, sets }))
    .sort((a, b) => b.sets - a.sets);

  return {
    days: dayStats,
    rangeDays,
    foodLoggedDays,
    workoutLoggedDays,
    bothLoggedDays,
    completedDaysCount,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    totalWorkouts,
    totalSets,
    totalMinutes,
    topMuscles
  };
}

// Merge new imported data into existing data avoiding duplicate IDs
export function mergeData(existing, incoming) {
  const migratedIncoming = migrateData(incoming);
  const entryIds = new Set(existing.entries.map((x) => x.id));
  const measurementIds = new Set(existing.measurements.map((x) => x.id));
  const workoutIds = new Set(existing.workouts.map((x) => x.id));
  const customFoodNames = new Set(existing.customFoods.map((x) => x.name.toLowerCase()));

  const newEntries = migratedIncoming.entries.filter((x) => !entryIds.has(x.id));
  const newMeasurements = migratedIncoming.measurements.filter((x) => !measurementIds.has(x.id));
  const newWorkouts = migratedIncoming.workouts.filter((x) => !workoutIds.has(x.id));
  const newCustomFoods = migratedIncoming.customFoods.filter((x) => !customFoodNames.has(x.name.toLowerCase()));
  const customExerciseIds = new Set((existing.customExercises || []).map((x) => x.id));
  const customExerciseNames = new Set((existing.customExercises || []).map((x) => x.name.toLowerCase()));
  const newCustomExercises = (migratedIncoming.customExercises || []).filter(
    (x) => !customExerciseIds.has(x.id) && !customExerciseNames.has(x.name.toLowerCase())
  );
  const mergedCompletedDays = Array.from(new Set([...existing.completedDays, ...migratedIncoming.completedDays]));

  return {
    ...existing,
    profile: {
      ...existing.profile,
      ...(migratedIncoming.profile?.name ? { name: migratedIncoming.profile.name } : {})
    },
    entries: [...existing.entries, ...newEntries],
    measurements: [...existing.measurements, ...newMeasurements],
    workouts: [...existing.workouts, ...newWorkouts],
    customFoods: [...existing.customFoods, ...newCustomFoods],
    customExercises: [...(existing.customExercises || []), ...newCustomExercises],
    completedDays: mergedCompletedDays,
    recoveryOverrides: { ...(existing.recoveryOverrides || {}), ...(migratedIncoming.recoveryOverrides || {}) },
    recoveryHours: { ...(existing.recoveryHours || {}), ...(migratedIncoming.recoveryHours || {}) },
    version: CURRENT_SCHEMA_VERSION
  };
}
