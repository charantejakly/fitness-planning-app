import {
  loadData,
  saveData,
  uid,
  localDate,
  nutrition,
  calculateBmr,
  calculateTdee,
  targetCalories,
  streak,
  weeklySummary,
  calculateProgressAnalytics,
  validateBackup,
  mergeData,
  blankData,
  DEFAULT_PROFILE
} from "./store.js";
import { estimateFood } from "./food-estimator.js";
import { saveAttachment, getAttachment, deleteAttachment } from "./idb.js";
import {
  CANONICAL_CATALOG,
  CANONICAL_MUSCLES,
  BUILT_IN_EXERCISES,
  isValidSet,
  isValidExercise,
  getWorkoutDetailStatus,
  evaluateLoggingStatus,
  isPositiveNumber
} from "./muscle-data.js";
import {
  DEFAULT_HEATMAP_THRESHOLDS,
  HEATMAP_PALETTE,
  validateHeatmapThresholds,
  calculateDailyHeatmap
} from "./heatmap.js";
import { renderAnteriorSvg, renderPosteriorSvg } from "./anatomy-svg.js";
import {
  DEFAULT_RECOVERY_HOURS,
  validateRecoveryHours,
  findLatestPrimarySession,
  calculateMuscleRecovery,
  calculateAllMuscleRecovery
} from "./recovery.js";
import { createAnatomy3DViewer, isWebGLAvailable } from "./anatomy-3d.js";

let data = loadData();
let activeDate = localDate();
let activeView = "today";
let editId = null;
let editMeasurementId = null;
let editWorkoutId = null;
let pendingPhotoData = null; // temporary dataUrl or blob for current entry form

// Phase 1 Training Editor & Modal State
let editingWorkoutSession = null;
let activePickerCategory = "All";
let pickerSearchQuery = "";
let editingExerciseMusclesIndex = null;
let editingCustomExerciseId = null;

// URL parameter initialization (for deep-linking & testing)
const initialParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

// Heatmap & 3D Anatomy State
let anatomyDisplayMode = initialParams?.get("anatomy") || "3d"; // "3d" (default) | "2d" (fallback/toggle)
let active3DViewer = null;
let presentationMode3D = initialParams?.get("mode") || "full"; // "full" (Mode A default) | "half" (Mode B)
let splitMode3D = initialParams?.get("split") || "world"; // "world" (True Sagittal) | "camera" (View-Aligned)
let heatmapAnatomyView = "anterior"; // "anterior" | "posterior"
let inspectedMuscleId = initialParams?.get("inspect") || null;
let previousRenderedView = null;

if (initialParams?.get("view")) {
  activeView = initialParams.get("view");
}
if (initialParams?.get("date")) {
  activeDate = initialParams.get("date");
}

// Progress & Analytics interactive state
let progressMetric = "calories"; // "calories" | "protein" | "sets" | "minutes"
let progressRange = 7; // 7 | 14 | 30
let selectedProgressDate = null;

const app = document.querySelector("#app");
const number = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const esc = (value = "") =>
  String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const dateLabel = (date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));

function persist() {
  saveData(data);
}

function navButton(view, icon, label) {
  return `<button class="nav-item ${activeView === view ? "is-active" : ""}" data-nav="${view}" aria-label="${label}">
    <span>${icon}</span>
    <small>${label}</small>
  </button>`;
}

function empty(title, copy, action, target, actionType = null) {
  const actionAttr = actionType ? `data-action="${actionType}"` : `data-nav="${target}"`;
  const onclickAttr = actionType === "workout" ? ' onclick="window._openWorkoutEditor && window._openWorkoutEditor()"' : "";
  const containerAttr = actionType ? `data-action="${actionType}" role="button" tabindex="0" style="cursor:pointer;"` : "";
  return `<div class="empty" ${containerAttr}${onclickAttr}>
    <div class="empty-mark">+</div>
    <h3>${title}</h3>
    <p>${copy}</p>
    ${action ? `<button type="button" class="button ghost" ${actionAttr}${onclickAttr}>${action}</button>` : ""}
  </div>`;
}

function macro(name, value, target, className) {
  const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return `<div class="macro ${className}">
    <div>
      <span>${name}</span>
      <b>${number(value)}<small>g</small></b>
    </div>
    <div class="bar"><i style="width:${percent}%"></i></div>
    <small>${target ? `${number(target)}g target` : "Target not set"}</small>
  </div>`;
}

// ---------------- TODAY VIEW ----------------
function todayView() {
  const entries = data.entries.filter((x) => x.date === activeDate);
  const totals = nutrition(entries);
  const calTarget = targetCalories(data.profile);
  const remaining = calTarget - totals.calories;
  const isCompleted = data.completedDays.includes(activeDate);

  return `<main class="screen">
    <header class="topbar">
      <div>
        <p class="eyebrow">${activeDate === localDate() ? "TODAY" : dateLabel(activeDate).toUpperCase()}</p>
        <h1>LEAN <em>MODE</em></h1>
      </div>
      <button class="avatar" data-nav="profile" aria-label="Open profile">
        ${data.profile.name ? esc(data.profile.name[0]).toUpperCase() : "⊙"}
      </button>
    </header>

    <section class="date-switcher">
      <button type="button" data-date="-1" aria-label="Previous day">‹</button>
      <input id="active-date" type="date" value="${activeDate}" aria-label="Tracking date" />
      <button type="button" data-date="1" aria-label="Next day">›</button>
    </section>

    <section class="cal-card">
      <div class="ring" style="--progress:${calTarget ? Math.min(100, (totals.calories / calTarget) * 100) : 0}%">
        <div>
          <strong>${number(Math.abs(remaining))}</strong>
          <span>${calTarget ? (remaining >= 0 ? "kcal remaining" : "kcal over") : "kcal logged"}</span>
        </div>
      </div>
      <div class="cal-meta">
        <span>Consumed <b>${number(totals.calories)}</b></span>
        <span>Target <b>${calTarget ? number(calTarget) : "—"}</b></span>
        <button type="button" class="text-button" data-nav="profile">${calTarget ? "Edit target" : "Set target"}</button>
      </div>
    </section>

    <section class="day-status-card">
      <div>
        <span>Daily Tracking Status</span>
        <b>${isCompleted ? "✓ Day marked complete" : entries.length ? `${entries.length} food items recorded` : "No entries logged yet"}</b>
      </div>
      <button type="button" class="button ${isCompleted ? "ghost" : "primary"}" data-toggle-complete="${activeDate}">
        ${isCompleted ? "Reopen Day" : "Complete Day"}
      </button>
    </section>

    <section class="macro-grid">
      ${macro("Protein", totals.protein, data.profile.proteinTarget, "protein")}
      ${macro("Carbs", totals.carbs, data.profile.carbsTarget, "carbs")}
      ${macro("Fat", totals.fat, data.profile.fatTarget, "fat")}
      ${macro("Fibre", totals.fibre, data.profile.fibreTarget, "fibre")}
    </section>

    <section class="section-head">
      <div>
        <p class="eyebrow">FOOD LOG</p>
        <h2>${dateLabel(activeDate)}</h2>
      </div>
    </section>

    ${
      entries.length
        ? `<div class="meal-list">${entries.map(foodCard).join("")}</div>`
        : empty("Nothing logged yet", "Add food when you eat. This tracker never assumes a meal or fills in data for you.", "Log food", "food")
    }
  </main>`;
}

function foodCard(entry) {
  const photoId = entry.photoId;
  return `<article class="food-card" data-entry-id="${entry.id}">
    <div class="food-icon" id="food-icon-${entry.id}">
      ${photoId ? `<img src="" id="photo-thumb-${entry.id}" alt="Food thumbnail" />` : "≈"}
    </div>
    <div class="food-main">
      <div>
        <h3>${esc(entry.name)}</h3>
        <span>${esc(entry.meal || "Food log")} · ${entry.source === "estimate" ? "Estimated portion" : entry.source === "custom" ? "Custom item" : "Manual entry"}</span>
      </div>
      <b>${number(entry.calories)} <small>kcal</small></b>
      <p>P ${number(entry.protein)}g · C ${number(entry.carbs)}g · F ${number(entry.fat)}g · Fi ${number(entry.fibre)}g</p>
    </div>
    <div class="card-actions">
      <button type="button" data-edit-food="${entry.id}" aria-label="Edit ${esc(entry.name)}">Edit</button>
      <button type="button" data-delete-food="${entry.id}" aria-label="Delete ${esc(entry.name)}">×</button>
    </div>
  </article>`;
}

// ---------------- FOOD LOGGING & ESTIMATION ----------------
function estimatePreviewHtml(estimate, amount = "") {
  if (!estimate) {
    return `<div class="estimate-fallback">
      <p class="form-help estimate-help" aria-live="polite">Food not recognized in Indian catalog yet. You can still log it using Manual Entry below.</p>
    </div>`;
  }
  const quantity = estimate.quantityUnit ? Number(amount || estimate.baseAmount) : 1;
  const factor = estimate.quantityUnit ? quantity / estimate.baseAmount : 1;
  const values = {
    calories: Math.round(estimate.calories * factor),
    protein: Math.round(estimate.protein * factor),
    carbs: Math.round(estimate.carbs * factor),
    fat: Math.round(estimate.fat * factor),
    fibre: Math.round(estimate.fibre * factor)
  };

  return `<section class="estimate-card" aria-live="polite">
    <p class="eyebrow">ESTIMATED NUTRITION</p>
    ${
      estimate.quantityUnit
        ? `<label class="amount-field">Amount consumed <span><input id="food-amount" type="number" min="1" max="5000" step="1" value="${quantity}" /> ${estimate.quantityUnit}</span></label>`
        : ""
    }
    <div id="estimate-values">
      <strong>${number(values.calories)} <small>kcal</small></strong>
      <p>P ${number(values.protein)}g · C ${number(values.carbs)}g · F ${number(values.fat)}g · Fi ${number(values.fibre)}g</p>
    </div>
    <span class="estimate-meta">Recognised: ${esc(estimate.matched.join(" + "))}. Typical Indian home-serving; recipes vary.</span>
  </section>`;
}

function foodView() {
  const editing = data.entries.find((x) => x.id === editId);
  const item = editing || {
    date: activeDate,
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fibre: "",
    meal: "Food log",
    source: "estimate"
  };

  const initialEstimate = estimateFood(item.name, data.customFoods);
  const isEditingManual = Boolean(editing && editing.source === "manual");
  pendingPhotoData = null;

  return `<main class="screen">
    <header class="simple-head">
      <button type="button" class="back" data-nav="today">←</button>
      <div>
        <p class="eyebrow">${editing ? "EDIT ENTRY" : "NEW FOOD ENTRY"}</p>
        <h1>${editing ? "Correct the record" : "Log what you ate"}</h1>
      </div>
    </header>

    <div class="boundary-note">
      Food name in. Nutrition estimate out. This app logs your food; it does not prescribe meals or diet changes.
    </div>

    <form id="food-form" class="form-card">
      <div class="tab-switch">
        <label class="tab-pill"><input type="radio" name="entryMode" value="estimate" ${isEditingManual ? "" : "checked"} /> <span>Indian Estimator</span></label>
        <label class="tab-pill"><input type="radio" name="entryMode" value="manual" ${isEditingManual ? "checked" : ""} /> <span>Manual / Custom</span></label>
      </div>

      <label>What did you eat?
        <input required id="food-name" name="name" maxlength="120" autocomplete="off" placeholder="e.g. 2 rotis with dal or 1 bowl curd rice" value="${esc(item.name)}" />
      </label>
      <p class="form-help">Include portions where possible (e.g., 2 rotis, 1 cup dal, 250 ml milk).</p>

      <div id="estimate-container" class="${isEditingManual ? "hidden" : ""}">
        <div id="estimate-preview">${estimatePreviewHtml(initialEstimate, item.amountMl || "")}</div>
      </div>

      <!-- Manual & Custom section -->
      <div id="manual-section" class="manual-fields ${isEditingManual ? "" : "hidden"}">
        <div class="two">
          <label>Calories (kcal) * <input id="manual-calories" name="calories" type="number" min="0" max="10000" value="${item.calories || ""}" /></label>
          <label>Protein (g) <input id="manual-protein" name="protein" type="number" min="0" max="500" step="0.1" value="${item.protein || ""}" /></label>
        </div>
        <div class="three">
          <label>Carbs (g) <input id="manual-carbs" name="carbs" type="number" min="0" max="1000" step="0.1" value="${item.carbs || ""}" /></label>
          <label>Fat (g) <input id="manual-fat" name="fat" type="number" min="0" max="500" step="0.1" value="${item.fat || ""}" /></label>
          <label>Fibre (g) <input id="manual-fibre" name="fibre" type="number" min="0" max="200" step="0.1" value="${item.fibre || ""}" /></label>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" id="save-custom-food" name="saveCustomFood" />
          <span>Save as reusable Custom Food in local library</span>
        </label>
      </div>

      <!-- Local Photo Attachment -->
      <section class="photo-section">
        <p class="eyebrow">LOCAL PHOTO ATTACHMENT (OPTIONAL)</p>
        <label class="photo-picker">
          <input id="food-photo-input" type="file" accept="image/*" />
          <span id="photo-picker-label">${editing && editing.photoId ? "Photo attached (click to replace)" : "Attach meal photo (stays on device)"}</span>
        </label>
        <div id="photo-preview-wrap" class="${editing && editing.photoId ? "" : "hidden"}">
          <img id="photo-preview" src="" alt="Meal preview" />
          <button type="button" class="button ghost small-button" id="remove-photo">Remove photo</button>
        </div>
      </section>

      <div class="form-actions">
        <button type="button" class="button ghost" data-nav="today">Cancel</button>
        <button type="submit" class="button primary">${editing ? "Save changes" : "Log food"}</button>
      </div>
    </form>
  </main>`;
}

// ---------------- PROFILE VIEW ----------------
function profileView() {
  const p = data.profile;
  const bmr = calculateBmr(p);
  const tdee = calculateTdee(p);

  return `<main class="screen">
    <header class="simple-head">
      <button type="button" class="back" data-nav="today">←</button>
      <div>
        <p class="eyebrow">PROFILE & TARGETS</p>
        <h1>Your numbers</h1>
      </div>
    </header>

    <p class="intro">These calculations are estimates based on details you provide. Your chosen calorie target controls the dashboard.</p>

    <form id="profile-form" class="form-card">
      <label>Name
        <input name="name" maxlength="40" value="${esc(p.name)}" placeholder="Optional" />
      </label>

      <div class="two">
        <label>Sex
          <select required name="sex">
            <option value="">Select</option>
            <option value="male" ${p.sex === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${p.sex === "female" ? "selected" : ""}>Female</option>
          </select>
        </label>
        <label>Age
          <input name="age" type="number" min="13" max="120" value="${p.age}" />
        </label>
      </div>

      <div class="two">
        <label>Height (cm)
          <input name="height" type="number" min="80" max="260" value="${p.height}" />
        </label>
        <label>Weight (kg)
          <input name="weight" type="number" min="20" max="400" step="0.1" value="${p.weight}" />
        </label>
      </div>

      <div class="two">
        <label>Lower Waist (cm)
          <input name="lowerWaist" type="number" min="20" max="250" step="0.1" value="${p.lowerWaist || ""}" placeholder="Baseline" />
        </label>
        <label>Upper Abdomen (cm)
          <input name="upperAbdomen" type="number" min="20" max="250" step="0.1" value="${p.upperAbdomen || ""}" placeholder="Baseline" />
        </label>
      </div>

      <label>Activity used for TDEE
        <select name="activity">
          <option value="1.2" ${p.activity === "1.2" ? "selected" : ""}>Sedentary (1.2)</option>
          <option value="1.375" ${p.activity === "1.375" ? "selected" : ""}>Light (1.375)</option>
          <option value="1.55" ${p.activity === "1.55" ? "selected" : ""}>Moderate (1.55)</option>
          <option value="1.725" ${p.activity === "1.725" ? "selected" : ""}>Very active (1.725)</option>
        </select>
      </label>

      ${
        bmr
          ? `<div class="calc">
              <span>BMR <b>${number(bmr)} kcal</b></span>
              <span>Estimated TDEE <b>${number(tdee)} kcal</b></span>
            </div>`
          : ""
      }

      <div class="two">
        <label>Daily calorie target
          <input name="targetCalories" type="number" min="1" max="10000" value="${p.targetCalories}" placeholder="Optional" />
        </label>
        <label>Goal label
          <select name="goal">
            <option value="maintain" ${p.goal === "maintain" ? "selected" : ""}>Maintain</option>
            <option value="cut" ${p.goal === "cut" ? "selected" : ""}>Cut</option>
            <option value="gain" ${p.goal === "gain" ? "selected" : ""}>Gain</option>
          </select>
        </label>
      </div>
      <p class="form-help">Leave calorie target blank to use the TDEE estimate. This is a calculation, not a meal plan or food recommendation.</p>

      <h3>Daily macro targets (optional)</h3>
      <div class="four">
        <label>Protein (g) <input name="proteinTarget" type="number" min="0" value="${p.proteinTarget}" /></label>
        <label>Carbs (g) <input name="carbsTarget" type="number" min="0" value="${p.carbsTarget}" /></label>
        <label>Fat (g) <input name="fatTarget" type="number" min="0" value="${p.fatTarget}" /></label>
        <label>Fibre (g) <input name="fibreTarget" type="number" min="0" value="${p.fibreTarget}" /></label>
      </div>

      <div class="form-actions">
        <button type="submit" class="button primary">Save profile</button>
      </div>
    </form>
  </main>`;
}

// ---------------- PROGRESS & WEEKLY REPORTS VIEW ----------------
function progressView() {
  const analytics = calculateProgressAnalytics(data, activeDate, progressRange);
  const targetCal = targetCalories(data.profile);
  const targetProtein = Number(data.profile.proteinTarget) || null;

  // Metric metadata
  let metricLabel = "Calories";
  let metricUnit = "kcal";
  let targetRefVal = null;
  let maxVal = 10;
  let barColor = "#79956b";

  if (progressMetric === "calories") {
    metricLabel = "Daily Calories";
    metricUnit = "kcal";
    targetRefVal = targetCal;
    maxVal = Math.max(targetCal || 2000, ...analytics.days.map((d) => d.totals.calories), 500);
    barColor = "#79956b";
  } else if (progressMetric === "protein") {
    metricLabel = "Daily Protein";
    metricUnit = "g";
    targetRefVal = targetProtein;
    maxVal = Math.max(targetProtein || 120, ...analytics.days.map((d) => d.totals.protein), 30);
    barColor = "#3e8879";
  } else if (progressMetric === "sets") {
    metricLabel = "Lifting Sets (Volume)";
    metricUnit = "sets";
    targetRefVal = null;
    maxVal = Math.max(15, ...analytics.days.map((d) => d.sets), 5);
    barColor = "#e98a32";
  } else if (progressMetric === "minutes") {
    metricLabel = "Active Workout Time";
    metricUnit = "min";
    targetRefVal = null;
    maxVal = Math.max(60, ...analytics.days.map((d) => d.minutes), 20);
    barColor = "#51406f";
  }

  // Target reference line
  let targetLineHtml = "";
  if (targetRefVal && targetRefVal > 0 && maxVal > 0) {
    const targetPercent = Math.min(100, Math.max(5, Math.round((targetRefVal / maxVal) * 100)));
    targetLineHtml = `
      <div class="chart-target-line" style="bottom:${targetPercent}%;">
        <span>Target: ${number(targetRefVal)} ${metricUnit}</span>
      </div>
    `;
  }

  // Days bars
  const dayBars = analytics.days
    .map((d) => {
      let val = 0;
      if (progressMetric === "calories") val = d.totals.calories;
      else if (progressMetric === "protein") val = d.totals.protein;
      else if (progressMetric === "sets") val = d.sets;
      else if (progressMetric === "minutes") val = d.minutes;

      const isSelected = selectedProgressDate === d.date;
      const heightPercent = maxVal ? Math.min(100, Math.max(val ? 10 : 3, Math.round((val / maxVal) * 100))) : 3;

      let customBarColor = barColor;
      if (val === 0) {
        customBarColor = "var(--line)";
      } else if (progressMetric === "calories" && targetCal && val > targetCal) {
        customBarColor = "#b88e40";
      }

      const valLabel = val ? `${number(val)}${metricUnit === "g" ? "g" : ""}` : "—";
      const weekdayDisplay = progressRange > 14 ? d.weekdayNarrow : d.weekdayShort;

      const dots = [];
      if (d.hasFood) dots.push(`<span class="day-bar-dot" title="Food logged"></span>`);
      if (d.hasWorkout) dots.push(`<span class="day-bar-dot workout" title="Workout logged (${d.sets} sets)"></span>`);
      if (d.isCompleted) dots.push(`<span class="day-bar-dot complete" title="Day completed"></span>`);

      return `
        <button type="button" class="day-bar ${isSelected ? "selected" : ""}" data-progress-day="${d.date}" aria-label="${d.weekdayShort} ${dateLabel(d.date)}: ${val} ${metricUnit}">
          ${val > 0 && progressRange <= 14 ? `<span class="day-bar-val">${valLabel}</span>` : ""}
          <span style="height:${heightPercent}%; background:${customBarColor}; ${val === 0 ? "opacity:0.35;" : ""}"></span>
          <small>${weekdayDisplay}</small>
          <div class="day-bar-indicators">
            ${dots.join("")}
          </div>
        </button>
      `;
    })
    .join("");

  // Day Inspector Card (if a day is selected)
  let dayInspectHtml = "";
  if (selectedProgressDate) {
    const d = analytics.days.find((x) => x.date === selectedProgressDate);
    if (d) {
      const foodSummary = d.hasFood
        ? `<div style="margin-top:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <strong>Nutrition (${number(d.totals.calories)} kcal)</strong>
              ${targetCal ? `<small style="color:${d.totals.calories <= targetCal ? "var(--accent)" : "#9c6b1a"}; font-weight:600;">${d.totals.calories - targetCal > 0 ? `+${number(d.totals.calories - targetCal)} over target` : `${number(targetCal - d.totals.calories)} remaining`}</small>` : ""}
            </div>
            <p style="margin:4px 0 2px; font-size:11px; color:var(--ink);">
              <strong>Protein:</strong> ${number(d.totals.protein)}g · <strong>Carbs:</strong> ${number(d.totals.carbs)}g · <strong>Fat:</strong> ${number(d.totals.fat)}g${d.totals.fibre ? ` · <strong>Fibre:</strong> ${number(d.totals.fibre)}g` : ""}
            </p>
            <p style="margin:2px 0 0; font-size:11px; color:var(--muted); line-height:1.4;">
              ${d.entries.map((e) => esc(e.name)).join(" · ")} (${d.entryCount} item${d.entryCount === 1 ? "" : "s"})
            </p>
          </div>`
        : `<p style="margin:6px 0 0; font-size:11px; color:var(--muted);">No food entries logged on this date.</p>`;

      const workoutSummary = d.hasWorkout
        ? `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--line);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <strong>Training (${d.workoutCount} session${d.workoutCount === 1 ? "" : "s"} · ${d.sets} total sets)</strong>
              ${d.minutes ? `<small style="color:var(--muted);">${d.minutes} min${d.distance ? ` · ${d.distance} km` : ""}</small>` : ""}
            </div>
            <p style="margin:4px 0 2px; font-size:11px; color:var(--ink);">
              ${d.workouts.map((w) => `<strong>${esc(w.title || w.type || "Workout")}</strong>${w.exercises?.length ? ` (${w.exercises.length} exercise${w.exercises.length === 1 ? "" : "s"})` : ""}`).join(" · ")}
            </p>
            ${d.primaryMuscles.length ? `<p style="margin:2px 0 0; font-size:11px; color:var(--muted);"><strong>Muscles stimulated:</strong> ${d.primaryMuscles.map((mId) => CANONICAL_CATALOG.find((c) => c.id === mId)?.name || mId).join(", ")}</p>` : ""}
          </div>`
        : `<p style="margin:6px 0 0; font-size:11px; color:var(--muted); padding-top:6px; border-top:1px dashed var(--line);">Rest day — no workouts recorded.</p>`;

      const measurementSummary = d.weight || d.waist
        ? `<p style="margin:8px 0 0; font-size:11px; color:var(--ink); padding-top:6px; border-top:1px dashed var(--line);">
            <strong>Body Check-in:</strong> ${d.weight ? `Weight: ${d.weight} kg` : ""}${d.weight && d.waist ? " · " : ""}${d.waist ? `Waist: ${d.waist} cm` : ""}
          </p>`
        : "";

      dayInspectHtml = `
        <div class="day-inspect-card" role="region" aria-label="Day performance details">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <strong style="font-size:14px;">${d.weekdayShort}, ${dateLabel(d.date)}</strong>
              ${d.isCompleted ? `<span class="tag-badge" style="background:#eaf2e8; color:#365327;">Day Complete ✓</span>` : ""}
              ${d.hasWorkout ? `<span class="tag-badge" style="background:#efeaf7; color:#51406f;">Workout 🏋</span>` : ""}
            </div>
            <button type="button" class="button ghost small-button" data-close-progress-inspect aria-label="Close day breakdown">✕</button>
          </div>
          ${foodSummary}
          ${workoutSummary}
          ${measurementSummary}
          <div style="display:flex; gap:6px; margin-top:12px; flex-wrap:wrap;">
            <button type="button" class="button ghost small-button" data-nav-day="today" data-date="${d.date}">Open in Today ↗</button>
            <button type="button" class="button ghost small-button" data-nav-day="workouts" data-date="${d.date}">Open in Training ↗</button>
          </div>
        </div>
      `;
    }
  }

  // Top muscles tags
  const topMusclesHtml = analytics.topMuscles.length
    ? analytics.topMuscles
        .slice(0, 5)
        .map((m) => {
          const cat = CANONICAL_CATALOG.find((c) => c.id === m.id);
          const name = cat ? cat.name : m.id;
          return `<span class="tag-badge">${esc(name)}: <strong>${m.sets} sets</strong></span>`;
        })
        .join("")
    : `<span style="font-size:11px; color:var(--muted);">No lifting sets recorded in this period.</span>`;

  return `<main class="screen">
    <header class="topbar">
      <div>
        <p class="eyebrow">PROGRESS & ANALYTICS</p>
        <h1>Keep the <em>record</em></h1>
      </div>
      <div class="streak">
        <b>${streak(data.entries, activeDate, data.completedDays)}</b>
        <span>day<br>streak</span>
      </div>
    </header>

    <!-- Interactive Performance Chart -->
    <section class="report">
      <div class="section-head" style="margin-bottom:8px;">
        <div>
          <p class="eyebrow">INTEGRATED PERFORMANCE RECORD</p>
          <h2>${metricLabel} (${progressRange}-Day)</h2>
        </div>
      </div>

      <!-- Controls: Metrics and Range -->
      <div class="chart-controls">
        <div class="chart-pill-group" role="tablist" aria-label="Select metric">
          <button type="button" class="${progressMetric === "calories" ? "active" : ""}" data-progress-metric="calories">Calories</button>
          <button type="button" class="${progressMetric === "protein" ? "active" : ""}" data-progress-metric="protein">Protein</button>
          <button type="button" class="${progressMetric === "sets" ? "active" : ""}" data-progress-metric="sets">Training Sets</button>
          <button type="button" class="${progressMetric === "minutes" ? "active" : ""}" data-progress-metric="minutes">Active Mins</button>
        </div>

        <div class="chart-pill-group" role="tablist" aria-label="Select time range">
          <button type="button" class="${progressRange === 7 ? "active" : ""}" data-progress-range="7">7D</button>
          <button type="button" class="${progressRange === 14 ? "active" : ""}" data-progress-range="14">14D</button>
          <button type="button" class="${progressRange === 30 ? "active" : ""}" data-progress-range="30">30D</button>
        </div>
      </div>

      <div class="chart-wrapper">
        ${targetLineHtml}
        <div class="chart">${dayBars}</div>
      </div>

      <p class="form-help" style="margin-top:6px; font-size:11px; text-align:center;">
        Tap any day to inspect full nutrition, workouts, and exercise breakdowns.
      </p>

      ${dayInspectHtml}

      <!-- Cross-App Summary Analytics -->
      <div style="margin-top:16px;">
        <p class="eyebrow" style="margin-bottom:6px;">PERIOD PERFORMANCE TOTALS (${progressRange} DAYS)</p>
        <div class="analytics-grid">
          <div class="analytics-cell">
            <span>Food Logged</span>
            <b>${analytics.foodLoggedDays} / ${analytics.rangeDays} days</b>
          </div>
          <div class="analytics-cell">
            <span>Avg Intake</span>
            <b>${analytics.avgCalories ? `${number(analytics.avgCalories)} kcal` : "No data"}</b>
          </div>
          <div class="analytics-cell">
            <span>Avg Protein</span>
            <b>${analytics.avgProtein ? `${number(analytics.avgProtein)} g` : "No data"}</b>
          </div>
          <div class="analytics-cell">
            <span>Workouts Logged</span>
            <b>${analytics.totalWorkouts} sessions</b>
          </div>
          <div class="analytics-cell">
            <span>Lifting Volume</span>
            <b>${analytics.totalSets} total sets</b>
          </div>
          <div class="analytics-cell">
            <span>Active Time</span>
            <b>${analytics.totalMinutes ? `${analytics.totalMinutes} mins` : "0 mins"}</b>
          </div>
          <div class="analytics-cell">
            <span>Both Food &amp; Gym</span>
            <b>${analytics.bothLoggedDays} days</b>
          </div>
          <div class="analytics-cell">
            <span>Days Completed</span>
            <b>${analytics.completedDaysCount} days</b>
          </div>
        </div>

        <!-- Top Stimulated Muscles -->
        <div style="margin-top:12px; padding:10px; background:var(--paper); border:1px solid var(--line); border-radius:10px;">
          <p class="eyebrow" style="margin:0 0 4px; font-size:10px;">TOP MUSCLES TRAINED (${progressRange}D VOLUME)</p>
          <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
            ${topMusclesHtml}
          </div>
        </div>
      </div>
    </section>
  </main>`;
}

// ---------------- WORKOUT VIEW & HELPERS (PHASE 1) ----------------
function detailedBadgeText(w) {
  const primarySet = new Set();
  let totalSets = 0;
  for (const ex of w.exercises || []) {
    const validCount = (ex.sets || []).filter(isValidSet).length;
    totalSets += validCount;
    for (const m of ex.muscleMapping?.primary || []) {
      const match = CANONICAL_CATALOG.find((c) => c.id === m);
      if (match) primarySet.add(match.name);
    }
  }
  const muscles = Array.from(primarySet);
  const muscleSummary = muscles.slice(0, 3).join(" · ") + (muscles.length > 3 ? "..." : "");
  return `${muscleSummary || "Detailed"} · ${totalSets} set${totalSets === 1 ? "" : "s"}`;
}

function renderInspectCard(mId, heatmapData) {
  if (!mId) return "";
  const isTrainedDay = heatmapData !== null && heatmapData.muscles;
  const mInfo = isTrainedDay && heatmapData.muscles[mId]
    ? heatmapData.muscles[mId]
    : null;

  const catItem = CANONICAL_CATALOG.find((c) => c.id === mId);
  const muscleName = mInfo ? mInfo.name : (catItem ? catItem.name : mId);
  const viewHint = catItem ? ` (${catItem.view === 'both' ? 'Front & Back' : catItem.view === 'anterior' ? 'Front view' : 'Back view'})` : "";
  const sets = mInfo ? mInfo.sets : 0;
  const label = mInfo ? mInfo.label : "No training";
  const color = mInfo ? mInfo.color : "#A7A9A5";

  const contributingStr = mInfo && mInfo.contributingExercises.length
    ? mInfo.contributingExercises.map((e) => typeof e === "object" ? `${esc(e.exerciseName)} (${e.sets} set${e.sets === 1 ? "" : "s"})` : esc(e)).join(", ")
    : "None (0 direct sets)";
  const secondaryStr = mInfo && mInfo.secondaryInvolvement.length
    ? mInfo.secondaryInvolvement.map((e) => esc(e)).join(", ")
    : "None";

  return `
    <div class="muscle-inspect-card" role="region" aria-label="Inspected muscle details">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="legend-color" style="background:${color}; width:14px; height:14px;"></span>
          <strong style="font-size:14px;">${esc(muscleName)}</strong>
          <small style="color:var(--muted); font-size:11px;">${viewHint}</small>
        </div>
        <button type="button" class="button ghost small-button" data-action="close-inspect" aria-label="Close muscle details">✕</button>
      </div>
      <p style="margin:6px 0 2px; font-size:12px;"><strong>Primary Sets:</strong> ${sets} sets · <span style="color:${color === '#E8C84A' ? '#925f12' : color}; font-weight:600;">${esc(label)}</span></p>
      <p style="margin:2px 0; font-size:11px; color:var(--ink);"><strong>Contributing exercises (primary):</strong> ${contributingStr}</p>
      <p style="margin:2px 0; font-size:11px; color:var(--muted);"><strong>Secondary involvement (0 set credit):</strong> ${secondaryStr}</p>
    </div>
  `;
}

function workoutView() {
  // 1. Daily Heatmap calculation for activeDate
  const sessionsOnActiveDate = data.workouts.filter((w) => w.date === activeDate);
  const list = [...sessionsOnActiveDate].sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  const heatmapData = calculateDailyHeatmap(sessionsOnActiveDate, DEFAULT_HEATMAP_THRESHOLDS);
  const isTrainedDay = heatmapData !== null;
  const muscleMap = isTrainedDay ? heatmapData.muscles : {};

  const svgHtml = heatmapAnatomyView === "posterior"
    ? renderPosteriorSvg(muscleMap, { selectedMuscle: inspectedMuscleId })
    : renderAnteriorSvg(muscleMap, { selectedMuscle: inspectedMuscleId });

  const inspectCardHtml = renderInspectCard(inspectedMuscleId, heatmapData);

  let statusNoteHtml = "";
  if (!isTrainedDay) {
    const hasAnySession = sessionsOnActiveDate.length > 0;
    if (hasAnySession) {
      statusNoteHtml = `
        <div class="boundary-note" style="margin:0 0 10px; background:var(--paper); border-color:var(--line); text-align:left; font-size:11px;">
          <strong>Detailed muscle tracking not recorded for ${dateLabel(activeDate)}</strong>
          <p style="margin:2px 0 0;">Sessions on this date are general cardio or legacy entries without canonical muscle mappings. Showing neutral base anatomy (0 sets).</p>
        </div>
      `;
    } else {
      statusNoteHtml = `
        <p class="form-help" style="margin:0 0 8px; font-size:11px; text-align:center; color:var(--muted);">
          No training recorded for ${dateLabel(activeDate)}. Showing base anatomy (0 sets).
        </p>
      `;
    }
  } else {
    statusNoteHtml = `
      <p class="form-help" style="margin:0 0 8px; font-size:11px; text-align:center;">
        Tap any muscle region to inspect sets and exercise attributions.
      </p>
    `;
  }

  const is3DSupported = isWebGLAvailable();
  const is3DActive = is3DSupported && anatomyDisplayMode === "3d";

  const anatomySelectorHtml = `
    <div class="anatomy-mode-tabs" role="tablist" aria-label="Anatomy viewer format">
      <button type="button" class="${is3DActive ? 'active' : ''}" data-anatomy-display="3d">3D Anatomy</button>
      <button type="button" class="${!is3DActive ? 'active' : ''}" data-anatomy-display="2d">2D Vector</button>
    </div>
  `;

  let viewerHtml = "";
  if (is3DActive) {
    viewerHtml = `
      <div id="anatomy-3d-mount"></div>
    `;
  } else {
    viewerHtml = `
      <div class="heatmap-view-toggle">
        <button type="button" class="${heatmapAnatomyView === 'anterior' ? 'active' : ''}" data-heatmap-view="anterior">Front View</button>
        <button type="button" class="${heatmapAnatomyView === 'posterior' ? 'active' : ''}" data-heatmap-view="posterior">Back View</button>
      </div>
      <div class="heatmap-svg-wrap">
        ${svgHtml}
      </div>
    `;
  }

  const heatmapHtml = `
    <section class="heatmap-container" aria-label="Daily Muscle Heatmap">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="button ghost small-button" data-date="-1" aria-label="Previous day">‹</button>
          <div>
            <p class="eyebrow" style="margin:0;">DAILY HEATMAP</p>
            <h3 style="margin:0; font-size:15px;">${dateLabel(activeDate)}</h3>
          </div>
          <button type="button" class="button ghost small-button" data-date="1" aria-label="Next day">›</button>
          ${activeDate !== localDate() ? `<button type="button" class="text-button" id="btn-heatmap-today" style="font-size:11px; margin-left:4px;">Today</button>` : ""}
        </div>
        ${anatomySelectorHtml}
      </div>

      ${statusNoteHtml}

      ${viewerHtml}

      <div id="inspect-card-wrap">
        ${inspectCardHtml}
      </div>

      <div class="heatmap-legend" aria-label="Heatmap intensity legend">
        <div class="legend-item"><span class="legend-color" style="background:#A7A9A5;"></span> 0 sets (No training)</div>
        <div class="legend-item"><span class="legend-color" style="background:#E8C84A;"></span> 1–5 (Minimal)</div>
        <div class="legend-item"><span class="legend-color" style="background:#E98A32;"></span> 6–11 (Moderate)</div>
        <div class="legend-item"><span class="legend-color" style="background:#D83B43;"></span> 12–19 (Good)</div>
        <div class="legend-item"><span class="legend-color" style="background:#51406F;"></span> 20+ (Elite)</div>
      </div>
      <p class="form-help" style="font-size:10px; margin-top:8px; text-align:center; color:var(--muted);">
        Thresholds represent logged set volume for ${dateLabel(activeDate)} only, not scientific training quality.
      </p>
    </section>
  `;

  // 2. Estimated Recovery Tracker calculation
  const allRecovery = calculateAllMuscleRecovery(data.workouts, data.recoveryHours, data.recoveryOverrides, new Date());

  const recoveryCardsHtml = allRecovery.map((item) => {
    let badgeClass = "badge-unlogged";
    let badgeText = item.statusLabel;

    if (item.state === "completed" || item.state === "override-completed") {
      badgeClass = "badge-completed";
      badgeText = item.isOverridden ? "Override: Completed" : "Window Completed";
    } else if (item.state === "in-progress" || item.state === "override-in-progress") {
      badgeClass = "badge-in-progress";
      badgeText = item.isOverridden ? "Override: In progress" : "In Progress";
    } else if (item.state === "date-only") {
      badgeClass = "badge-date-only";
      badgeText = item.isOverridden ? (item.overrideState === "completed" ? "Override: Completed" : "Override: In progress") : "Date-Only Estimate";
    } else if (item.state === "invalid-future") {
      badgeClass = "badge-future";
      badgeText = "Future timestamp";
    } else if (item.state === "unlogged") {
      badgeClass = "badge-unlogged";
      badgeText = "No primary session";
    }

    let actionsHtml = "";
    if (item.hasSession) {
      if (item.isOverridden) {
        actionsHtml = `<button type="button" class="button small-button ghost" data-recovery-revert="${item.muscleId}" aria-label="Revert ${esc(item.muscleName)} override">Revert override</button>`;
      } else {
        const isCurrentlyCompleted = item.state === "completed";
        actionsHtml = `
          <button type="button" class="button small-button ghost" data-recovery-override="${item.muscleId}" data-target-state="${isCurrentlyCompleted ? 'in-progress' : 'completed'}" aria-label="Set ${esc(item.muscleName)} override">
            ${isCurrentlyCompleted ? 'Override: Mark in progress' : 'Override: Mark complete'}
          </button>
        `;
      }
    }

    return `
      <article class="recovery-card" data-muscle-recovery="${item.muscleId}">
        <div class="recovery-card-head">
          <div>
            <h4 class="recovery-card-title">${esc(item.muscleName)}</h4>
            <span style="font-size:11px; color:var(--muted);">${item.configuredDurationHours}h window</span>
          </div>
          <span class="detail-badge ${badgeClass}">${badgeText}</span>
        </div>
        <p class="recovery-card-details">${esc(item.details)}</p>
        ${actionsHtml ? `<div class="recovery-card-actions">${actionsHtml}</div>` : ""}
      </article>
    `;
  }).join("");

  const recoveryHtml = `
    <section class="section-head" style="margin-top:20px;">
      <div>
        <p class="eyebrow">RECOVERY</p>
        <h2>Estimated recovery tracker</h2>
      </div>
      <div>
        <button type="button" class="button ghost small-button" data-action="manage-recovery-durations" aria-label="Configure recovery durations">Configure windows</button>
      </div>
    </section>

    <div class="boundary-note" style="margin-bottom:12px;">
      Mathematical elapsed-time estimates based on your logged sessions and configured recovery windows. This is purely descriptive accounting; it does not measure biological recovery or provide workout coaching.
    </div>

    <div class="recovery-container">
      ${recoveryCardsHtml}
    </div>
  `;

  return `<main class="screen">
    ${heatmapHtml}

    <section class="section-head" style="margin-top:20px;">
      <div>
        <p class="eyebrow">SESSIONS FOR ${dateLabel(activeDate).toUpperCase()}</p>
        <h2>Workout &amp; cardio log</h2>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; align-items:center;">
        <div style="display:flex; align-items:center; gap:4px; margin-right:4px;">
          <button type="button" class="button ghost small-button" data-date="-1" aria-label="Previous day">‹</button>
          <span style="font-size:12px; font-weight:600; min-width:80px; text-align:center;">${dateLabel(activeDate)}</span>
          <button type="button" class="button ghost small-button" data-date="1" aria-label="Next day">›</button>
          ${activeDate !== localDate() ? `<button type="button" class="text-button" id="btn-session-today" data-action="go-today" style="font-size:11px; margin-left:2px;">Today</button>` : ""}
        </div>
        <button type="button" class="button ghost small-button" id="toggle-cardio-insight" aria-label="Request cardio insight">Cardio insight</button>
        <button type="button" class="button ghost small-button" data-action="manage-custom-exercises" aria-label="Manage custom exercises">Custom exercises</button>
        <button type="button" class="add-button" data-action="workout">+ Add</button>
      </div>
    </section>

    <div id="cardio-insight-panel" class="hidden boundary-note" style="background:#f4f6ef; border-color:#657b5c;">
      <strong>Approximate Cardio Accounting (Requested by User):</strong>
      <p style="margin:4px 0 0; font-size:11px;">
        Cardio logs are purely descriptive records of your physical work. Energy expenditure figures, when referenced, are mathematical approximations based on duration and body weight, and are <em>never</em> automatically added back to your food budget or subtracted from daily intake.
      </p>
    </div>

    ${
      list.length
        ? `<div class="workout-list">
            ${list
              .map((x) => {
                const status = x.detailStatus || getWorkoutDetailStatus(x);
                let badgeHtml = "";
                if (status === "legacy") {
                  badgeHtml = `<span class="detail-badge badge-legacy">Legacy workout — detailed muscle data unavailable</span>`;
                } else if (status === "general") {
                  badgeHtml = `<span class="detail-badge badge-general">Detailed muscle data not recorded</span>`;
                } else if (status === "incomplete") {
                  badgeHtml = `<span class="detail-badge badge-incomplete">Incomplete muscle data</span>`;
                } else if (status === "detailed") {
                  badgeHtml = `<span class="detail-badge badge-detailed">${detailedBadgeText(x)}</span>`;
                }

                const lateBadge = x.loggingStatus === "late" ? `<span class="late-badge">Late entry</span>` : "";

                const exerciseSnippet = x.exercises && x.exercises.length
                  ? `<p class="form-help" style="margin-top:6px; font-size:12px; color:var(--ink);">
                      ${x.exercises.map((e) => `<strong>${esc(e.name)}</strong> (${(e.sets || []).filter(isValidSet).length} sets)`).join(" · ")}
                    </p>`
                  : "";

                return `<article>
                  <div class="workout-type">${x.type === "Cardio" ? "↗" : "□"}</div>
                  <div>
                    <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                      <h3 style="margin:0;">${esc(x.title || "Workout")}</h3>
                      ${lateBadge}
                    </div>
                    <div>${badgeHtml}</div>
                    <p style="margin-top:4px;">
                      ${x.type ? esc(x.type) : "Session"}${x.minutes ? ` · ${x.minutes} min` : ""}${x.distance ? ` · ${x.distance} km` : ""}${x.note ? ` · ${esc(x.note)}` : ""}
                    </p>
                    ${exerciseSnippet}
                    <time>${x.date ? dateLabel(x.date) : "Date unrecorded"}${x.time ? ` at ${x.time}` : ""}</time>
                  </div>
                  <div class="card-actions">
                    <button type="button" data-edit-workout="${x.id}" aria-label="Edit session">Edit</button>
                    <button type="button" data-delete-workout="${x.id}" aria-label="Delete session">×</button>
                  </div>
                </article>`;
              })
              .join("")}
          </div>`
        : empty(`No sessions logged for ${dateLabel(activeDate)}`, "Add a record for this day if you want one. Nothing is assumed about your gym plan.", "Add session", "workout_editor", "workout")
    }

    ${recoveryHtml}
  </main>`;
}

function createDefaultWorkoutSession() {
  return {
    id: uid(),
    date: activeDate,
    time: "",
    title: "",
    type: "Gym",
    minutes: "",
    distance: "",
    note: "",
    isLegacy: false,
    createdAt: null,
    exercises: []
  };
}

function openWorkoutEditor(id = null) {
  if (id) {
    const existing = data.workouts.find((w) => w.id === id);
    if (existing) {
      editingWorkoutSession = JSON.parse(JSON.stringify(existing));
    } else {
      editingWorkoutSession = createDefaultWorkoutSession();
    }
  } else {
    editingWorkoutSession = createDefaultWorkoutSession();
  }
  activeView = "workout_editor";
  layout();
}
if (typeof window !== "undefined") {
  window._openWorkoutEditor = openWorkoutEditor;
}

function workoutEditorView() {
  if (!editingWorkoutSession) {
    editingWorkoutSession = createDefaultWorkoutSession();
  }

  const session = editingWorkoutSession;
  const isEditing = Boolean(data.workouts.some((w) => w.id === session.id));

  return `<main class="screen workout-editor">
    <header class="simple-head">
      <button type="button" class="back" data-nav="workouts">←</button>
      <div>
        <p class="eyebrow">${isEditing ? "EDIT SESSION" : "NEW SESSION"}</p>
        <h1>${isEditing ? "Update training record" : "Record your training"}</h1>
      </div>
    </header>

    <div class="boundary-note">
      Record what you train. This screen stores sets, repetitions, and muscle involvement; it never prescribes exercises, workouts, or target weights.
    </div>

    ${
      session.isLegacy
        ? `<div class="boundary-note" style="background:#fbf8f2; border-color:#dcd3c3; color:#726859; margin-bottom:14px;">
            <strong>Legacy workout — detailed muscle data unavailable.</strong>
            <p style="margin:4px 0 0; font-size:11px;">You can update session fields above or add exercises below to upgrade this historical record.</p>
          </div>`
        : ""
    }

    <form id="workout-editor-form" class="form-card">
      <div class="two">
        <label>Workout Date *
          <input required id="we-date" name="date" type="date" max="${localDate()}" value="${session.date || activeDate}" />
        </label>
        <label>Actual Time (optional)
          <input id="we-time" name="time" type="time" value="${session.time || ""}" />
        </label>
      </div>

      <div class="two">
        <label>Session Title *
          <input required id="we-title" name="title" maxlength="80" placeholder="e.g. Chest & Triceps Push" value="${esc(session.title || "")}" />
        </label>
        <label>Type
          <select id="we-type" name="type">
            <option value="Gym" ${session.type === "Gym" ? "selected" : ""}>Gym</option>
            <option value="Cardio" ${session.type === "Cardio" ? "selected" : ""}>Cardio</option>
            <option value="Other" ${session.type === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
      </div>

      <div class="two">
        <label>Duration (minutes, optional)
          <input id="we-minutes" name="minutes" type="number" min="0" max="1440" placeholder="e.g. 60" value="${session.minutes !== undefined ? session.minutes : ""}" />
        </label>
        <label>Distance (km, optional)
          <input id="we-distance" name="distance" type="number" min="0" max="200" step="0.1" placeholder="e.g. 5.0" value="${session.distance !== undefined ? session.distance : ""}" />
        </label>
      </div>

      <label>Notes (optional)
        <input id="we-note" name="note" maxlength="160" placeholder="Personal notes, cues or conditions" value="${esc(session.note || "")}" />
      </label>

      <!-- EXERCISES & SETS LIST -->
      <section style="margin-top:16px;">
        <div class="section-head" style="margin-bottom:12px;">
          <div>
            <p class="eyebrow">EXERCISES &amp; SETS</p>
            <h2 style="font-size:16px;">Recorded movements</h2>
          </div>
          <button type="button" class="button ghost small-button" id="btn-open-exercise-picker">+ Add Exercise</button>
        </div>

        ${
          session.exercises && session.exercises.length
            ? `<div id="workout-exercises-container">
                ${session.exercises
                  .map((ex, exIdx) => {
                    const primaryNames = (ex.muscleMapping?.primary || [])
                      .map((m) => CANONICAL_CATALOG.find((c) => c.id === m)?.name || m);
                    const secondaryNames = (ex.muscleMapping?.secondary || [])
                      .map((m) => CANONICAL_CATALOG.find((c) => c.id === m)?.name || m);

                    return `<div class="exercise-block" data-exercise-index="${exIdx}">
                      <div class="exercise-block-header">
                        <div>
                          <p class="exercise-block-cat">${esc(ex.category || "Exercise")}${ex.isCustom ? " · Custom" : ""}</p>
                          <h3 class="exercise-block-title">${esc(ex.name)}</h3>
                        </div>
                        <button type="button" class="btn-del-set" data-remove-exercise="${exIdx}" aria-label="Remove ${esc(ex.name)}">×</button>
                      </div>

                      <div class="muscle-chips">
                        <span style="font-size:10px; color:var(--muted); margin-right:2px;">Primary:</span>
                        ${
                          primaryNames.length
                            ? primaryNames.map((p) => `<span class="chip-primary">${esc(p)}</span>`).join("")
                            : `<span style="font-size:10px; color:var(--red);">None (incomplete)</span>`
                        }
                        ${
                          secondaryNames.length
                            ? `<span style="font-size:10px; color:var(--muted); margin-left:4px; margin-right:2px;">Secondary:</span>
                               ${secondaryNames.map((s) => `<span class="chip-secondary">${esc(s)}</span>`).join("")}`
                            : ""
                        }
                        <button type="button" class="chip-edit-link" data-edit-exercise-muscles="${exIdx}">Edit muscles</button>
                      </div>

                      <table class="set-table">
                        <thead>
                          <tr>
                            <th class="col-num">#</th>
                            <th>Reps *</th>
                            <th>Weight (kg)</th>
                            <th>Effort</th>
                            <th class="col-del"></th>
                          </tr>
                        </thead>
                        <tbody>
                          ${(ex.sets || [])
                            .map((s, sIdx) => `
                              <tr>
                                <td class="col-num">${sIdx + 1}</td>
                                <td>
                                  <input type="number" min="1" step="1" placeholder="reps" data-set-field="reps" data-ex-idx="${exIdx}" data-set-idx="${sIdx}" value="${s.reps !== undefined ? s.reps : ""}" required />
                                </td>
                                <td>
                                  <input type="number" min="0" step="0.5" placeholder="bodyweight" data-set-field="weight" data-ex-idx="${exIdx}" data-set-idx="${sIdx}" value="${s.weight !== undefined ? s.weight : ""}" />
                                </td>
                                <td>
                                  <input type="text" placeholder="e.g. RPE 8" data-set-field="effort" data-ex-idx="${exIdx}" data-set-idx="${sIdx}" value="${esc(s.effort || "")}" />
                                </td>
                                <td class="col-del">
                                  <button type="button" class="btn-del-set" data-remove-set="${exIdx},${sIdx}" aria-label="Delete set ${sIdx + 1}">×</button>
                                </td>
                              </tr>
                            `)
                            .join("")}
                        </tbody>
                      </table>
                      <button type="button" class="btn-add-set" data-add-set="${exIdx}">+ Add Set</button>
                    </div>`;
                  })
                  .join("")}
              </div>`
            : `<div class="empty" style="padding:22px; margin-bottom:14px; background:var(--card); border:1px dashed var(--line); border-radius:12px;">
                <p class="form-help" style="margin:0;">No exercises added yet. Tap <strong>+ Add Exercise</strong> above to record sets and muscles, or save now as a general/cardio record.</p>
              </div>`
        }
      </section>

      <div style="display:flex; gap:10px; margin-top:20px;">
        <button type="submit" class="button primary" style="flex:1;">${isEditing ? "Update Workout Record" : "Save Workout Session"}</button>
        <button type="button" class="button ghost" data-nav="workouts">Cancel</button>
      </div>
    </form>
  </main>`;
}

// ---------------- DATA & SETTINGS VIEW ----------------
function dataView() {
  return `<main class="screen">
    <header class="simple-head">
      <button type="button" class="back" data-nav="today">←</button>
      <div>
        <p class="eyebrow">YOUR DATA</p>
        <h1>Private & portable</h1>
      </div>
    </header>

    <section class="data-card">
      <h2>Export Backups</h2>
      <p>Download your complete data as JSON, or export specific logs as standard CSV spreadsheets. Your data remains strictly on this device unless you export it.</p>
      <small class="form-help" style="margin-bottom:8px; display:block;">Note: JSON backups store complete structured logs and profile data. Meal photos remain stored in your local browser database and are not bundled into the lightweight JSON export.</small>
      <button type="button" class="button primary" data-export="json">Export JSON Backup (v2)</button>
      <button type="button" class="button ghost" data-export="foods">Export Food Logs (CSV)</button>
      <button type="button" class="button ghost" data-export="workouts">Export Training Logs (CSV)</button>
      <button type="button" class="button ghost" data-export="measurements">Export Measurements (CSV)</button>
    </section>

    <section class="data-card">
      <h2>Import Backup</h2>
      <p>Restore or merge records from a LEAN MODE JSON backup file.</p>
      <label class="photo-picker">
        <input id="import-file" type="file" accept="application/json" />
        <span id="import-file-name">Select JSON backup file</span>
      </label>
      <div class="two mt-2">
        <button type="button" class="button primary" id="btn-merge-import">Merge into Data</button>
        <button type="button" class="button danger-button" id="btn-replace-import">Replace All Data</button>
      </div>
      <small class="form-help">"Merge" combines records without duplicate entries. "Replace" completely overwrites local data.</small>
    </section>

    <section class="data-card danger">
      <h2>Reset Local Data</h2>
      <p>Permanently removes the locally stored profile and logs. Export a JSON backup first if you may need them later.</p>
      <button type="button" class="button danger-button" data-reset>Reset This Device</button>
    </section>
  </main>`;
}

function exercisePickerModalHtml() {
  const customExercises = data.customExercises || [];
  const allExercises = [
    ...customExercises.map((c) => ({ ...c, isCustom: true })),
    ...BUILT_IN_EXERCISES.map((b) => ({ ...b, isCustom: false }))
  ];

  const categories = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Custom"];

  const filtered = allExercises.filter((ex) => {
    if (activePickerCategory === "Custom" && !ex.isCustom) return false;
    if (activePickerCategory !== "All" && activePickerCategory !== "Custom" && ex.category !== activePickerCategory) return false;
    if (pickerSearchQuery) {
      const q = pickerSearchQuery.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchCat = (ex.category || "").toLowerCase().includes(q);
      const matchMuscles = [...(ex.defaultPrimary || []), ...(ex.defaultSecondary || [])].some((m) => m.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchMuscles) return false;
    }
    return true;
  });

  return `<div class="modal-backdrop" id="modal-exercise-picker">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">EXERCISE CATALOG</p>
      <h2 id="picker-title" style="margin-bottom:10px;">Select movement</h2>

      <input id="picker-search-input" type="search" placeholder="Search exercises, categories, or muscles..." value="${esc(pickerSearchQuery)}" style="margin-bottom:8px;" />

      <div class="filter-pills">
        ${categories
          .map((cat) => `<button type="button" class="filter-pill ${activePickerCategory === cat ? "is-active" : ""}" data-picker-cat="${cat}">${cat}</button>`)
          .join("")}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <small class="form-help">${filtered.length} exercise${filtered.length === 1 ? "" : "s"} found</small>
        <button type="button" class="text-button" id="btn-create-custom-ex" style="font-size:11px; font-weight:600;">+ New Custom Exercise</button>
      </div>

      <div class="exercise-picker-list">
        ${
          filtered.length
            ? filtered
                .map((ex) => {
                  const prims = (ex.defaultPrimary || [])
                    .map((m) => CANONICAL_CATALOG.find((c) => c.id === m)?.name || m)
                    .join(", ");
                  return `<button type="button" class="picker-item" data-pick-exercise-id="${esc(ex.id)}" data-is-custom="${ex.isCustom ? "true" : "false"}">
                    <div>
                      <div style="font-weight:700; font-size:14px;">${esc(ex.name)}${ex.isCustom ? ` <span style="font-size:10px; color:#3b6b32; font-weight:600;">(Custom)</span>` : ""}</div>
                      <div style="font-size:11px; color:var(--muted);">${esc(ex.category || "General")}${prims ? ` · Primary: ${esc(prims)}` : ""}</div>
                    </div>
                    <span style="font-size:18px; color:var(--muted); font-weight:700;">+</span>
                  </button>`;
                })
                .join("")
            : `<div class="empty" style="padding:16px;"><p class="form-help">No matching exercises found.</p></div>`
        }
      </div>
    </section>
  </div>`;
}

function muscleMappingModalHtml(exIdx) {
  if (!editingWorkoutSession || !editingWorkoutSession.exercises || !editingWorkoutSession.exercises[exIdx]) {
    return "";
  }
  const ex = editingWorkoutSession.exercises[exIdx];
  const currentPrimary = new Set(ex.muscleMapping?.primary || []);
  const currentSecondary = new Set(ex.muscleMapping?.secondary || []);

  return `<div class="modal-backdrop" id="modal-muscle-mapping">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="muscle-map-title">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">MUSCLE ATTRIBUTION</p>
      <h2 id="muscle-map-title" style="margin-bottom:4px;">${esc(ex.name)}</h2>
      <p class="form-help" style="margin-bottom:12px; font-size:11px;">
        Primary muscles receive full set attribution in the heatmap. Secondary muscles reflect involvement only and receive 0 set credit.
      </p>

      <div class="muscle-grid">
        ${CANONICAL_CATALOG.map((m) => {
          let currentRole = "none";
          if (currentPrimary.has(m.id)) currentRole = "primary";
          else if (currentSecondary.has(m.id)) currentRole = "secondary";

          return `<div class="muscle-select-item">
            <span style="font-weight:600;">${esc(m.name)}</span>
            <select data-muscle-role-select="${m.id}" data-ex-idx="${exIdx}">
              <option value="none" ${currentRole === "none" ? "selected" : ""}>None</option>
              <option value="primary" ${currentRole === "primary" ? "selected" : ""}>Primary (Sets)</option>
              <option value="secondary" ${currentRole === "secondary" ? "selected" : ""}>Secondary (Involved)</option>
            </select>
          </div>`;
        }).join("")}
      </div>

      <div style="display:flex; gap:10px; margin-top:14px;">
        <button type="button" class="button primary" id="btn-save-muscle-mapping" data-ex-idx="${exIdx}" style="flex:1;">Save Attribution</button>
        <button type="button" class="button ghost" data-close-modal>Cancel</button>
      </div>
    </section>
  </div>`;
}

function customExercisesManagerModalHtml() {
  const customExercises = data.customExercises || [];
  return `<div class="modal-backdrop" id="modal-custom-exercises">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="ce-mgr-title">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">CUSTOM LIBRARY</p>
      <h2 id="ce-mgr-title" style="margin-bottom:4px;">Custom Exercises</h2>
      <p class="form-help" style="margin-bottom:12px; font-size:11px;">
        Create your own movements with custom primary and secondary muscle attributions.
      </p>

      <div style="margin-bottom:12px;">
        <button type="button" class="button primary small-button" id="btn-show-add-custom-form">+ Create New Exercise</button>
      </div>

      <div class="exercise-picker-list" style="max-height:260px;">
        ${
          customExercises.length
            ? customExercises.map((ce) => {
                const prims = (ce.defaultPrimary || [])
                  .map((m) => CANONICAL_CATALOG.find((c) => c.id === m)?.name || m)
                  .join(", ");
                return `<div class="picker-item" style="cursor:default;">
                  <div>
                    <div style="font-weight:700; font-size:14px;">${esc(ce.name)}</div>
                    <div style="font-size:11px; color:var(--muted);">${esc(ce.category || "Custom")}${prims ? ` · Primary: ${esc(prims)}` : ""}</div>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="button ghost small-button" data-edit-ce-id="${esc(ce.id)}">Edit</button>
                    <button type="button" class="btn-del-set" data-delete-ce-id="${esc(ce.id)}" aria-label="Delete ${esc(ce.name)}">×</button>
                  </div>
                </div>`;
              }).join("")
            : `<div class="empty" style="padding:16px;"><p class="form-help">No custom exercises created yet.</p></div>`
        }
      </div>
    </section>
  </div>`;
}

function customExerciseFormModalHtml(ceId = null) {
  const existing = ceId ? (data.customExercises || []).find((c) => c.id === ceId) : null;
  const isEditing = Boolean(existing);
  const currentPrimary = new Set(existing?.defaultPrimary || []);
  const currentSecondary = new Set(existing?.defaultSecondary || []);

  const categories = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Other"];

  return `<div class="modal-backdrop" id="modal-custom-ex-form">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="ce-form-title">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">${isEditing ? "EDIT EXERCISE" : "NEW EXERCISE"}</p>
      <h2 id="ce-form-title" style="margin-bottom:12px;">${isEditing ? "Update custom movement" : "Create custom movement"}</h2>

      <form id="custom-exercise-form" data-ce-id="${existing?.id || ""}">
        <label>Exercise Name *
          <input required name="name" maxlength="80" placeholder="e.g. Incline Cable Fly" value="${esc(existing?.name || "")}" />
        </label>
        <label>Category
          <select name="category">
            ${categories.map((c) => `<option value="${c}" ${existing?.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </label>

        <p class="eyebrow" style="margin-top:10px;">Muscle Attribution</p>
        <p class="form-help" style="font-size:11px; margin-bottom:8px;">Select role for each muscle involved in this movement:</p>

        <div class="muscle-grid">
          ${CANONICAL_CATALOG.map((m) => {
            let role = "none";
            if (currentPrimary.has(m.id)) role = "primary";
            else if (currentSecondary.has(m.id)) role = "secondary";

            return `<div class="muscle-select-item">
              <span style="font-weight:600;">${esc(m.name)}</span>
              <select name="muscle_${m.id}">
                <option value="none" ${role === "none" ? "selected" : ""}>None</option>
                <option value="primary" ${role === "primary" ? "selected" : ""}>Primary (Sets)</option>
                <option value="secondary" ${role === "secondary" ? "selected" : ""}>Secondary (Involved)</option>
              </select>
            </div>`;
          }).join("")}
        </div>

        <div style="display:flex; gap:10px; margin-top:14px;">
          <button type="submit" class="button primary" style="flex:1;">${isEditing ? "Update Exercise" : "Save Custom Exercise"}</button>
          <button type="button" class="button ghost" data-close-modal>Cancel</button>
        </div>
      </form>
    </section>
  </div>`;
}

function recoveryConfigModalHtml() {
  const currentHours = validateRecoveryHours(data.recoveryHours || {});
  return `<div class="modal-backdrop" id="modal-recovery-config">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="rc-title" style="max-height:85vh; overflow-y:auto;">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">RECOVERY SETTINGS</p>
      <h2 id="rc-title" style="margin-bottom:4px;">Recovery Windows</h2>
      <p class="form-help" style="margin-bottom:12px; font-size:11px;">
        Configure estimated recovery duration (1–336 hours) for each canonical muscle. Defaults reflect approved Gate B durations.
      </p>

      <form id="recovery-config-form">
        <div class="recovery-duration-grid">
          ${CANONICAL_CATALOG.map((m) => `
            <div class="recovery-duration-row">
              <label for="dur_${m.id}" style="font-size:12px; font-weight:600; margin:0;">${esc(m.name)}</label>
              <div style="display:flex; align-items:center; gap:4px;">
                <input
                  type="number"
                  id="dur_${m.id}"
                  name="dur_${m.id}"
                  value="${currentHours[m.id]}"
                  min="1"
                  max="336"
                  step="1"
                  style="width:65px; padding:4px 6px; font-size:12px; text-align:right;"
                  required
                />
                <span style="font-size:11px; color:var(--muted);">hrs</span>
              </div>
            </div>
          `).join("")}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; gap:8px; flex-wrap:wrap;">
          <button type="button" class="button ghost small-button" data-action="reset-recovery-defaults">Reset to Defaults</button>
          <div style="display:flex; gap:8px;">
            <button type="button" class="button ghost" data-close-modal>Cancel</button>
            <button type="submit" class="button">Save Durations</button>
          </div>
        </div>
      </form>
    </section>
  </div>`;
}

// ---------------- MODAL SHEET (MEASUREMENT / TRAINING) ----------------
function modal(kind, editId = null) {
  if (kind === "exercise_picker") return exercisePickerModalHtml();
  if (kind === "muscle_mapping") return muscleMappingModalHtml(editingExerciseMusclesIndex);
  if (kind === "custom_exercises_manager") return customExercisesManagerModalHtml();
  if (kind === "custom_exercise_form") return customExerciseFormModalHtml(editingCustomExerciseId);
  if (kind === "recovery_config") return recoveryConfigModalHtml();

  const isMeasurement = kind === "measurement";
  const existing = data.measurements.find((x) => x.id === editId);

  return `<div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" class="modal-close" data-close-modal aria-label="Close">×</button>
      <p class="eyebrow">${existing ? "EDIT RECORD" : "NEW RECORD"}</p>
      <h2 id="modal-title">Body measurement</h2>
      <form id="modal-form" data-kind="measurement" data-edit-id="${editId || ""}">
        <div class="two">
          <label>Date <input required name="date" type="date" value="${existing?.date || activeDate}" /></label>
          <label>Weight (kg) <input name="weight" type="number" min="20" max="400" step="0.1" value="${existing?.weight || ""}" /></label>
        </div>
        <div class="two">
          <label>Lower Waist (cm) <input name="waist" type="number" min="20" max="250" step="0.1" value="${existing?.waist || ""}" /></label>
          <label>Upper Abdomen (cm) <input name="upperAbdomen" type="number" min="20" max="250" step="0.1" value="${existing?.upperAbdomen || ""}" /></label>
        </div>
        <button type="submit" class="button primary">${existing ? "Update record" : "Save record"}</button>
      </form>
    </section>
  </div>`;
}

// ---------------- LAYOUT & THUMBNAIL HYDRATION ----------------
function layout() {
  const views = {
    today: todayView,
    food: foodView,
    profile: profileView,
    progress: progressView,
    workouts: workoutView,
    workout_editor: workoutEditorView,
    data: dataView
  };
  app.innerHTML = `<div class="app-shell">
    ${views[activeView]()}
    <nav class="bottom-nav">
      ${navButton("today", "⌂", "Today")}
      ${navButton("progress", "◔", "Progress")}
      <button type="button" class="quick-add" data-action="food" aria-label="Log food">+</button>
      ${navButton("workouts", "□", "Training")}
      ${navButton("data", "↥", "Data")}
    </nav>
  </div>`;

  if (previousRenderedView !== activeView) {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo(0, 0);
    }
    previousRenderedView = activeView;
  }

  // Hydrate photo thumbnails asynchronously if on todayView or foodView
  if (activeView === "today") {
    const todayEntries = data.entries.filter((x) => x.date === activeDate && x.photoId);
    for (const entry of todayEntries) {
      getAttachment(entry.photoId).then((dataUrl) => {
        const iconWrap = document.querySelector(`#food-icon-${entry.id}`);
        const img = document.querySelector(`#photo-thumb-${entry.id}`);
        if (dataUrl && img) {
          img.src = dataUrl;
        } else if (iconWrap) {
          // If attachment was removed or not found in current browser, fall back cleanly
          iconWrap.textContent = "≈";
        }
      }).catch(() => {
        const iconWrap = document.querySelector(`#food-icon-${entry.id}`);
        if (iconWrap) iconWrap.textContent = "≈";
      });
    }
  }

  if (activeView === "food" && editId) {
    const editing = data.entries.find((x) => x.id === editId);
    if (editing && editing.photoId) {
      getAttachment(editing.photoId).then((dataUrl) => {
        const preview = document.querySelector("#photo-preview");
        if (preview && dataUrl) {
          preview.src = dataUrl;
          document.querySelector("#photo-preview-wrap")?.classList.remove("hidden");
        }
      });
    }
  }

  // Stage 3: Mount or Dispose 3D Anatomy Viewer
  if (activeView === "workouts" && anatomyDisplayMode === "3d" && isWebGLAvailable()) {
    const mountEl = document.getElementById("anatomy-3d-mount");
    if (mountEl) {
      if (active3DViewer) {
        active3DViewer.destroy();
        active3DViewer = null;
      }
      const sessionsOnActiveDate = data.workouts.filter((w) => w.date === activeDate);
      const heatmapData = calculateDailyHeatmap(sessionsOnActiveDate, DEFAULT_HEATMAP_THRESHOLDS);

      createAnatomy3DViewer(mountEl, {
        heatmapData,
        initialPresentationMode: presentationMode3D,
        initialSplitMode: splitMode3D,
        inspectedMuscleId,
        onMuscleSelect: (info) => {
          inspectedMuscleId = info ? info.muscleId : null;
          const cardWrap = document.getElementById("inspect-card-wrap");
          if (cardWrap) {
            cardWrap.innerHTML = renderInspectCard(inspectedMuscleId, heatmapData);
          }
        }
      }).then((viewer) => {
        if (viewer && viewer.supported) {
          active3DViewer = viewer;

          if (initialParams?.get("capture_name")) {
            const capName = initialParams.get("capture_name");
            setTimeout(async () => {
              const canvas = document.querySelector("#a3d-canvas-box canvas");
              if (canvas) {
                const dataUrl = canvas.toDataURL("image/png");
                await fetch("/save-screenshot?name=" + capName, {
                  method: "POST",
                  body: dataUrl
                });
                console.log("Saved capture: " + capName);
              }
            }, 800);
          }
        }
      });
    }
  } else if (activeView !== "workouts" && active3DViewer) {
    active3DViewer.destroy();
    active3DViewer = null;
  }
}

function openModal(kind, id = null) {
  document.querySelector(".modal-backdrop")?.remove();
  document.body.insertAdjacentHTML("beforeend", modal(kind, id));
  document.querySelector(".modal input")?.focus();
}

function download(name, content, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]).filter((x) => x !== "photo" && x !== "photoId");
  return [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const val = row[key];
          const str = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "");
          return `"${str.replaceAll('"', '""')}"`;
        })
        .join(",")
    )
  ].join("\n");
}

// ---------------- EVENT BUS ----------------
document.addEventListener("click", (event) => {
  // Modal close on backdrop or X button
  if (event.target.closest("[data-close-modal]")) {
    document.querySelector(".modal-backdrop")?.remove();
    return;
  }
  if (event.target.closest("[data-action='reset-recovery-defaults']")) {
    data.recoveryHours = {};
    persist();
    document.querySelector(".modal-backdrop")?.remove();
    layout();
    return;
  }

  const nav = event.target.closest("[data-nav]");
  if (nav) {
    const targetNav = nav.dataset.nav;
    if (targetNav === "workout_editor") {
      openWorkoutEditor();
      return;
    }
    activeView = targetNav;
    editId = null;
    layout();
    return;
  }

  const dateShift = event.target.closest("[data-date]");
  if (dateShift) {
    const next = new Date(`${activeDate}T12:00:00`);
    next.setDate(next.getDate() + Number(dateShift.dataset.date));
    activeDate = localDate(next);
    layout();
    return;
  }

  const toggleComplete = event.target.closest("[data-toggle-complete]");
  if (toggleComplete) {
    const d = toggleComplete.dataset.toggleComplete;
    if (data.completedDays.includes(d)) {
      data.completedDays = data.completedDays.filter((x) => x !== d);
    } else {
      data.completedDays.push(d);
    }
    persist();
    layout();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    if (action.dataset.action === "food") {
      activeView = "food";
      editId = null;
      layout();
    } else if (action.dataset.action === "workout") {
      openWorkoutEditor();
    } else if (action.dataset.action === "manage-custom-exercises") {
      openModal("custom_exercises_manager");
    } else if (action.dataset.action === "close-inspect") {
      inspectedMuscleId = null;
      if (active3DViewer) {
        active3DViewer.updateState({ inspectedMuscleId: null });
      }
      const cardWrap = document.getElementById("inspect-card-wrap");
      if (cardWrap) {
        cardWrap.innerHTML = "";
      } else {
        layout();
      }
      return;
    } else if (action.dataset.action === "manage-recovery-durations") {
      openModal("recovery_config");
    } else {
      openModal(action.dataset.action);
    }
    return;
  }

  // 3D vs 2D Anatomy View Mode Toggle
  const anatomyDisplayToggle = event.target.closest("[data-anatomy-display]");
  if (anatomyDisplayToggle) {
    anatomyDisplayMode = anatomyDisplayToggle.dataset.anatomyDisplay;
    layout();
    return;
  }

  // Heatmap View Switcher (Front / Back)
  const heatmapViewToggle = event.target.closest("[data-heatmap-view]");
  if (heatmapViewToggle) {
    heatmapAnatomyView = heatmapViewToggle.dataset.heatmapView;
    layout();
    return;
  }

  // Jump to today in heatmap or sessions header
  if (
    event.target.id === "btn-heatmap-today" ||
    event.target.closest("#btn-heatmap-today") ||
    event.target.id === "btn-session-today" ||
    event.target.closest("#btn-session-today") ||
    event.target.closest("[data-action='go-today']")
  ) {
    activeDate = localDate();
    layout();
    return;
  }

  // Tap muscle region on SVG anatomy heatmap
  const muscleGroup = event.target.closest("[data-muscle]");
  if (muscleGroup) {
    const muscleId = muscleGroup.dataset.muscle;
    if (inspectedMuscleId === muscleId) {
      inspectedMuscleId = null; // deselect on second tap
    } else {
      inspectedMuscleId = muscleId;
    }
    layout();
    return;
  }

  // Progress metric switch
  const progressMetricBtn = event.target.closest("[data-progress-metric]");
  if (progressMetricBtn) {
    progressMetric = progressMetricBtn.dataset.progressMetric;
    layout();
    return;
  }

  // Progress range switch
  const progressRangeBtn = event.target.closest("[data-progress-range]");
  if (progressRangeBtn) {
    progressRange = Number(progressRangeBtn.dataset.progressRange) || 7;
    layout();
    return;
  }

  // Progress day selection / toggle
  const progressDayBtn = event.target.closest("[data-progress-day]");
  if (progressDayBtn) {
    const tapped = progressDayBtn.dataset.progressDay;
    selectedProgressDate = selectedProgressDate === tapped ? null : tapped;
    layout();
    return;
  }

  // Close progress day inspector
  if (event.target.closest("[data-close-progress-inspect]")) {
    selectedProgressDate = null;
    layout();
    return;
  }

  // Nav day directly to Today or Training tab
  const navDay = event.target.closest("[data-nav-day]");
  if (navDay) {
    activeDate = navDay.dataset.date;
    activeView = navDay.dataset.navDay;
    editId = null;
    layout();
    return;
  }

  // Recovery manual display override button
  const overrideBtn = event.target.closest("[data-recovery-override]");
  if (overrideBtn) {
    const muscleId = overrideBtn.dataset.recoveryOverride;
    const targetState = overrideBtn.dataset.targetState; // "completed" | "in-progress"
    const latest = findLatestPrimarySession(muscleId, data.workouts);
    if (latest && latest.session) {
      if (!data.recoveryOverrides || typeof data.recoveryOverrides !== "object") {
        data.recoveryOverrides = {};
      }
      data.recoveryOverrides[muscleId] = {
        state: targetState,
        latestWorkoutId: latest.session.id,
        updatedAt: new Date().toISOString()
      };
      persist();
      layout();
    }
    return;
  }

  // Recovery revert override button
  const revertBtn = event.target.closest("[data-recovery-revert]");
  if (revertBtn) {
    const muscleId = revertBtn.dataset.recoveryRevert;
    if (data.recoveryOverrides && data.recoveryOverrides[muscleId]) {
      delete data.recoveryOverrides[muscleId];
      persist();
      layout();
    }
    return;
  }

  const editFood = event.target.closest("[data-edit-food]");
  if (editFood) {
    editId = editFood.dataset.editFood;
    activeView = "food";
    layout();
    return;
  }

  const deleteFood = event.target.closest("[data-delete-food]");
  if (deleteFood && confirm("Delete this food entry?")) {
    const entry = data.entries.find((x) => x.id === deleteFood.dataset.deleteFood);
    if (entry?.photoId) deleteAttachment(entry.photoId);
    data.entries = data.entries.filter((x) => x.id !== deleteFood.dataset.deleteFood);
    persist();
    layout();
    return;
  }

  const editMeasurement = event.target.closest("[data-edit-measurement]");
  if (editMeasurement) {
    openModal("measurement", editMeasurement.dataset.editMeasurement);
    return;
  }

  const deleteMeasurement = event.target.closest("[data-delete-measurement]");
  if (deleteMeasurement && confirm("Delete this measurement record?")) {
    data.measurements = data.measurements.filter((x) => x.id !== deleteMeasurement.dataset.deleteMeasurement);
    persist();
    layout();
    return;
  }

  const editWorkout = event.target.closest("[data-edit-workout]");
  if (editWorkout) {
    openWorkoutEditor(editWorkout.dataset.editWorkout);
    return;
  }

  const deleteWorkout = event.target.closest("[data-delete-workout]");
  if (deleteWorkout && confirm("Delete this training record?")) {
    data.workouts = data.workouts.filter((x) => x.id !== deleteWorkout.dataset.deleteWorkout);
    persist();
    layout();
    return;
  }

  // --- Phase 1 Training Editor Clicks ---
  if (event.target.id === "btn-open-exercise-picker") {
    activePickerCategory = "All";
    pickerSearchQuery = "";
    openModal("exercise_picker");
    return;
  }

  const pickItem = event.target.closest("[data-pick-exercise-id]");
  if (pickItem) {
    const exId = pickItem.dataset.pickExerciseId;
    const isCustom = pickItem.dataset.isCustom === "true";
    const sourceList = isCustom ? (data.customExercises || []) : BUILT_IN_EXERCISES;
    const found = sourceList.find((x) => x.id === exId);
    if (found && editingWorkoutSession) {
      if (!Array.isArray(editingWorkoutSession.exercises)) {
        editingWorkoutSession.exercises = [];
      }
      editingWorkoutSession.exercises.push({
        id: uid(),
        exerciseId: found.id,
        name: found.name,
        category: found.category || "General",
        isCustom,
        muscleMapping: {
          primary: [...(found.defaultPrimary || [])],
          secondary: [...(found.defaultSecondary || [])]
        },
        sets: [
          { id: uid(), reps: "", weight: "", effort: "" }
        ]
      });
      document.querySelector(".modal-backdrop")?.remove();
      layout();
    }
    return;
  }

  const pickerCatBtn = event.target.closest("[data-picker-cat]");
  if (pickerCatBtn) {
    activePickerCategory = pickerCatBtn.dataset.pickerCat;
    openModal("exercise_picker");
    return;
  }

  const addSetBtn = event.target.closest("[data-add-set]");
  if (addSetBtn) {
    const exIdx = Number(addSetBtn.dataset.addSet);
    if (editingWorkoutSession?.exercises?.[exIdx]) {
      const prevSets = editingWorkoutSession.exercises[exIdx].sets || [];
      const lastSet = prevSets[prevSets.length - 1];
      editingWorkoutSession.exercises[exIdx].sets.push({
        id: uid(),
        reps: lastSet?.reps !== undefined ? lastSet.reps : "",
        weight: lastSet?.weight !== undefined ? lastSet.weight : "",
        effort: ""
      });
      layout();
    }
    return;
  }

  const removeSetBtn = event.target.closest("[data-remove-set]");
  if (removeSetBtn) {
    const [exIdxStr, setIdxStr] = removeSetBtn.dataset.removeSet.split(",");
    const exIdx = Number(exIdxStr);
    const setIdx = Number(setIdxStr);
    if (editingWorkoutSession?.exercises?.[exIdx]?.sets) {
      editingWorkoutSession.exercises[exIdx].sets.splice(setIdx, 1);
      layout();
    }
    return;
  }

  const removeExBtn = event.target.closest("[data-remove-exercise]");
  if (removeExBtn) {
    const exIdx = Number(removeExBtn.dataset.removeExercise);
    if (editingWorkoutSession?.exercises) {
      editingWorkoutSession.exercises.splice(exIdx, 1);
      layout();
    }
    return;
  }

  const editMusclesBtn = event.target.closest("[data-edit-exercise-muscles]");
  if (editMusclesBtn) {
    editingExerciseMusclesIndex = Number(editMusclesBtn.dataset.editExerciseMuscles);
    openModal("muscle_mapping");
    return;
  }

  if (event.target.id === "btn-save-muscle-mapping") {
    const exIdx = Number(event.target.dataset.exIdx);
    if (editingWorkoutSession?.exercises?.[exIdx]) {
      const primary = [];
      const secondary = [];
      const selects = document.querySelectorAll("[data-muscle-role-select]");
      selects.forEach((sel) => {
        const mId = sel.dataset.muscleRoleSelect;
        if (sel.value === "primary") primary.push(mId);
        else if (sel.value === "secondary") secondary.push(mId);
      });
      editingWorkoutSession.exercises[exIdx].muscleMapping = { primary, secondary };
      document.querySelector(".modal-backdrop")?.remove();
      layout();
    }
    return;
  }

  if (event.target.id === "btn-create-custom-ex" || event.target.id === "btn-show-add-custom-form") {
    editingCustomExerciseId = null;
    openModal("custom_exercise_form");
    return;
  }

  const editCeBtn = event.target.closest("[data-edit-ce-id]");
  if (editCeBtn) {
    editingCustomExerciseId = editCeBtn.dataset.editCeId;
    openModal("custom_exercise_form");
    return;
  }

  const deleteCeBtn = event.target.closest("[data-delete-ce-id]");
  if (deleteCeBtn && confirm("Delete this custom exercise definition? (Existing workout records will not be altered)")) {
    const ceId = deleteCeBtn.dataset.deleteCeId;
    data.customExercises = (data.customExercises || []).filter((c) => c.id !== ceId);
    persist();
    openModal("custom_exercises_manager");
    return;
  }

  const exportBtn = event.target.closest("[data-export]");
  if (exportBtn) {
    const type = exportBtn.dataset.export;
    if (type === "json") {
      download(`lean-mode-backup-${localDate()}.json`, JSON.stringify(data, null, 2), "application/json");
    } else if (type === "foods") {
      download(`lean-mode-foods-${localDate()}.csv`, csv(data.entries), "text/csv");
    } else if (type === "workouts") {
      download(`lean-mode-workouts-${localDate()}.csv`, csv(data.workouts), "text/csv");
    } else if (type === "measurements") {
      download(`lean-mode-measurements-${localDate()}.csv`, csv(data.measurements), "text/csv");
    }
    return;
  }

  if (event.target.id === "toggle-cardio-insight") {
    const panel = document.querySelector("#cardio-insight-panel");
    if (panel) panel.classList.toggle("hidden");
    return;
  }

  if (event.target.id === "remove-photo") {
    pendingPhotoData = "REMOVE";
    document.querySelector("#photo-preview-wrap")?.classList.add("hidden");
    const preview = document.querySelector("#photo-preview");
    if (preview) preview.src = "";
    document.querySelector("#photo-picker-label").textContent = "Attach meal photo (stays on device)";
    return;
  }

  if (event.target.closest("[data-reset]") && confirm("This permanently removes all local LEAN MODE data. Continue?")) {
    data = {
      version: 2,
      profile: { ...DEFAULT_PROFILE },
      entries: [],
      measurements: [],
      workouts: [],
      customFoods: [],
      completedDays: []
    };
    persist();
    activeView = "today";
    layout();
    return;
  }

  // Backup Merge vs Replace handlers
  const fileInput = document.querySelector("#import-file");
  if (fileInput && fileInput.files && fileInput.files[0]) {
    if (event.target.id === "btn-merge-import") {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const validation = validateBackup(parsed);
          if (!validation.valid) {
            alert("Backup validation failed: " + validation.error);
            return;
          }
          data = mergeData(data, parsed);
          persist();
          alert("Backup merged successfully without duplicates.");
          activeView = "today";
          layout();
        } catch (e) {
          alert("Invalid backup file: " + e.message);
        }
      };
      reader.readAsText(fileInput.files[0]);
      return;
    }

    if (event.target.id === "btn-replace-import") {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const validation = validateBackup(parsed);
          if (!validation.valid) {
            alert("Backup validation failed: " + validation.error);
            return;
          }
          if (!confirm("Warning: This will REPLACE all current records with the validated backup file. Existing data will be overwritten. Proceed?")) return;
          data = mergeData(blankData(), parsed);
          persist();
          alert("Backup restored successfully.");
          activeView = "today";
          layout();
        } catch (e) {
          alert("Invalid backup file: " + e.message);
        }
      };
      reader.readAsText(fileInput.files[0]);
      return;
    }
  }
});

// Non-destructive targeted update for food estimation input without full DOM re-render
document.addEventListener("input", (event) => {
  if (event.target.id === "food-name") {
    const val = event.target.value;
    const est = estimateFood(val, data.customFoods);
    const container = document.querySelector("#estimate-preview");
    if (container) {
      container.innerHTML = estimatePreviewHtml(est);
    }
  }

  // Update numbers when food-amount (milk etc) changes without losing focus!
  if (event.target.id === "food-amount") {
    const name = document.querySelector("#food-name")?.value || "";
    const est = estimateFood(name, data.customFoods);
    if (est && est.quantityUnit) {
      const amount = Number(event.target.value || est.baseAmount);
      const factor = amount / est.baseAmount;
      const valuesWrap = document.querySelector("#estimate-values");
      if (valuesWrap) {
        valuesWrap.innerHTML = `<strong>${number(Math.round(est.calories * factor))} <small>kcal</small></strong>
          <p>P ${number(Math.round(est.protein * factor))}g · C ${number(Math.round(est.carbs * factor))}g · F ${number(Math.round(est.fat * factor))}g · Fi ${number(Math.round(est.fibre * factor))}g</p>`;
      }
    }
    return;
  }

  // Live update set inputs in workout editor without losing DOM focus
  const setFieldInput = event.target.closest("[data-set-field]");
  if (setFieldInput && editingWorkoutSession) {
    const field = setFieldInput.dataset.setField;
    const exIdx = Number(setFieldInput.dataset.exIdx);
    const setIdx = Number(setFieldInput.dataset.setIdx);
    const setObj = editingWorkoutSession.exercises?.[exIdx]?.sets?.[setIdx];
    if (setObj) {
      if (field === "reps") setObj.reps = setFieldInput.value !== "" ? Number(setFieldInput.value) : "";
      else if (field === "weight") setObj.weight = setFieldInput.value !== "" ? Number(setFieldInput.value) : "";
      else if (field === "effort") setObj.effort = setFieldInput.value;
    }
    return;
  }

  // Live filter in exercise picker
  if (event.target.id === "picker-search-input") {
    pickerSearchQuery = event.target.value;
    const modalElem = document.querySelector("#modal-exercise-picker");
    if (modalElem) {
      modalElem.outerHTML = exercisePickerModalHtml();
      const inp = document.querySelector("#picker-search-input");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }
    return;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "active-date") {
    activeDate = event.target.value;
    layout();
  }

  // Mode tab switcher in food form
  if (event.target.name === "entryMode") {
    const isManual = event.target.value === "manual";
    const manualSec = document.querySelector("#manual-section");
    const estimateSec = document.querySelector("#estimate-container");
    if (manualSec) {
      if (isManual) manualSec.classList.remove("hidden");
      else manualSec.classList.add("hidden");
    }
    if (estimateSec) {
      if (isManual) estimateSec.classList.add("hidden");
      else estimateSec.classList.remove("hidden");
    }
  }

  // Handle local food photo selection and client-side compression/preview
  if (event.target.id === "food-photo-input" && event.target.files[0]) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      // Resize client-side via canvas to keep size under 300KB
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        pendingPhotoData = compressed;

        const preview = document.querySelector("#photo-preview");
        if (preview) preview.src = compressed;
        document.querySelector("#photo-preview-wrap")?.classList.remove("hidden");
        document.querySelector("#photo-picker-label").textContent = `${file.name} attached`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (event.target.id === "import-file" && event.target.files[0]) {
    document.querySelector("#import-file-name").textContent = event.target.files[0].name;
  }
});

// Form Submissions
document.addEventListener("submit", async (event) => {
  if (event.target.id === "food-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = form.get("name")?.trim();
    const mode = form.get("entryMode");
    const existing = data.entries.find((x) => x.id === editId);

    let entryCalories = 0;
    let entryProtein = 0;
    let entryCarbs = 0;
    let entryFat = 0;
    let entryFibre = 0;
    let source = "estimate";
    let matchedItems = [];
    let amountMl = undefined;

    const manualCals = form.get("calories");
    if (mode === "manual") {
      if (manualCals === null || manualCals === "") {
        alert("Please enter calories for manual entry.");
        return;
      }
      entryCalories = Math.max(0, Number(manualCals) || 0);
      entryProtein = Math.max(0, Number(form.get("protein")) || 0);
      entryCarbs = Math.max(0, Number(form.get("carbs")) || 0);
      entryFat = Math.max(0, Number(form.get("fat")) || 0);
      entryFibre = Math.max(0, Number(form.get("fibre")) || 0);
      source = "manual";

      // If user chose to save as reusable custom food
      if (form.get("saveCustomFood")) {
        const cfExists = data.customFoods.some((cf) => cf.name.toLowerCase() === name.toLowerCase());
        if (!cfExists) {
          data.customFoods.push({
            name,
            calories: entryCalories,
            protein: entryProtein,
            carbs: entryCarbs,
            fat: entryFat,
            fibre: entryFibre
          });
        }
        source = "custom";
      }
    } else {
      const estimate = estimateFood(name, data.customFoods);
      if (!estimate) {
        alert("Could not estimate this food name. Please switch to 'Manual / Custom' to enter nutrition values.");
        return;
      }
      const amount = estimate.quantityUnit ? Number(document.querySelector("#food-amount")?.value || estimate.baseAmount) : 1;
      const factor = estimate.quantityUnit ? amount / estimate.baseAmount : 1;
      entryCalories = Math.round(estimate.calories * factor);
      entryProtein = Math.round(estimate.protein * factor);
      entryCarbs = Math.round(estimate.carbs * factor);
      entryFat = Math.round(estimate.fat * factor);
      entryFibre = Math.round(estimate.fibre * factor);
      matchedItems = estimate.matched;
      if (estimate.quantityUnit) amountMl = amount;
    }

    // Photo ID management
    let photoId = existing?.photoId || undefined;
    if (pendingPhotoData === "REMOVE") {
      if (photoId) await deleteAttachment(photoId);
      photoId = undefined;
    } else if (pendingPhotoData && pendingPhotoData.startsWith("data:")) {
      photoId = photoId || uid();
      await saveAttachment(photoId, pendingPhotoData, { entryName: name });
    }

    const entry = {
      id: editId || uid(),
      date: existing?.date || activeDate,
      name: amountMl ? `${name} (${amountMl} ml)` : name,
      meal: "Food log",
      calories: entryCalories,
      protein: entryProtein,
      carbs: entryCarbs,
      fat: entryFat,
      fibre: entryFibre,
      source,
      estimateItems: matchedItems,
      amountMl,
      photoId,
      updatedAt: new Date().toISOString()
    };

    if (editId) {
      data.entries = data.entries.map((x) => (x.id === editId ? entry : x));
    } else {
      data.entries.push(entry);
    }

    persist();
    activeDate = entry.date;
    activeView = "today";
    editId = null;
    pendingPhotoData = null;
    layout();
  }

  if (event.target.id === "profile-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    data.profile = { ...data.profile, ...Object.fromEntries(form.entries()) };
    persist();
    activeView = "today";
    layout();
  }

  if (event.target.id === "workout-editor-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const workoutDate = form.get("date");

    if (!workoutDate) {
      alert("Workout date is required.");
      return;
    }
    if (workoutDate > localDate()) {
      alert("Workout date cannot be in the future.");
      return;
    }

    const title = (form.get("title") || "").trim();
    if (!title) {
      alert("Session title is required.");
      return;
    }

    const existingIdx = data.workouts.findIndex((w) => w.id === editingWorkoutSession.id);
    const existing = existingIdx >= 0 ? data.workouts[existingIdx] : null;

    // Preserve original createdAt on edits, or assign new ISO timestamp on creation
    const createdAt = existing?.createdAt || editingWorkoutSession.createdAt || new Date().toISOString();
    const isLegacy = existing ? (existing.isLegacy === true) : false;

    // Recalculate loggingStatus using immutable createdAt and session date
    const loggingStatus = evaluateLoggingStatus(workoutDate, createdAt, localDate());

    // Clean up valid sets from exercises
    const cleanExercises = (editingWorkoutSession.exercises || []).map((ex) => ({
      id: ex.id || uid(),
      exerciseId: ex.exerciseId || uid(),
      name: ex.name,
      category: ex.category || "General",
      isCustom: Boolean(ex.isCustom),
      muscleMapping: {
        primary: Array.isArray(ex.muscleMapping?.primary) ? ex.muscleMapping.primary : [],
        secondary: Array.isArray(ex.muscleMapping?.secondary) ? ex.muscleMapping.secondary : []
      },
      sets: (ex.sets || [])
        .filter((s) => s.reps !== "" && s.reps !== null && s.reps !== undefined && Number.isFinite(Number(s.reps)) && Number(s.reps) > 0)
        .map((s) => ({
          id: s.id || uid(),
          reps: Number(s.reps),
          weight: s.weight !== "" && s.weight !== null && s.weight !== undefined && Number.isFinite(Number(s.weight)) ? Number(s.weight) : "",
          effort: s.effort ? String(s.effort).trim() : ""
        }))
    }));

    const workoutRecord = {
      ...editingWorkoutSession,
      id: editingWorkoutSession.id || uid(),
      date: workoutDate,
      time: form.get("time") || null,
      title,
      type: form.get("type") || "Gym",
      minutes: form.get("minutes") !== "" && form.get("minutes") !== null ? Number(form.get("minutes")) : "",
      distance: form.get("distance") !== "" && form.get("distance") !== null ? Number(form.get("distance")) : "",
      note: (form.get("note") || "").trim(),
      createdAt,
      loggingStatus,
      isLegacy,
      exercises: cleanExercises
    };

    workoutRecord.detailStatus = getWorkoutDetailStatus(workoutRecord);
    workoutRecord.hasDetailedMuscles = workoutRecord.detailStatus === "detailed";

    if (existingIdx >= 0) {
      data.workouts[existingIdx] = workoutRecord;
    } else {
      data.workouts.unshift(workoutRecord);
    }

    persist();
    editingWorkoutSession = null;
    activeView = "workouts";
    layout();
    return;
  }

  if (event.target.id === "custom-exercise-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const ceId = event.target.dataset.ceId;
    const name = (form.get("name") || "").trim();
    if (!name) {
      alert("Exercise name is required.");
      return;
    }
    const category = form.get("category") || "Other";

    const defaultPrimary = [];
    const defaultSecondary = [];
    for (const m of CANONICAL_CATALOG) {
      const role = form.get(`muscle_${m.id}`);
      if (role === "primary") defaultPrimary.push(m.id);
      else if (role === "secondary") defaultSecondary.push(m.id);
    }

    if (defaultPrimary.length === 0) {
      alert("Please select at least one primary muscle for this exercise.");
      return;
    }

    if (!Array.isArray(data.customExercises)) {
      data.customExercises = [];
    }

    if (ceId) {
      const idx = data.customExercises.findIndex((c) => c.id === ceId);
      if (idx >= 0) {
        data.customExercises[idx] = {
          ...data.customExercises[idx],
          name,
          category,
          defaultPrimary,
          defaultSecondary
        };
      }
    } else {
      data.customExercises.push({
        id: `ce_${uid()}`,
        name,
        category,
        defaultPrimary,
        defaultSecondary,
        isCustom: true
      });
    }

    persist();
    document.querySelector(".modal-backdrop")?.remove();
    if (activeView === "workout_editor") {
      openModal("exercise_picker");
    } else {
      openModal("custom_exercises_manager");
    }
    return;
  }

  if (event.target.id === "modal-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const values = Object.fromEntries(form.entries());
    const kind = event.target.dataset.kind;
    const editingId = event.target.dataset.editId;

    if (kind === "measurement") {
      if (!values.weight && !values.waist && !values.upperAbdomen) return;
      const record = {
        id: editingId || uid(),
        ...values
      };
      if (editingId) {
        data.measurements = data.measurements.map((x) => (x.id === editingId ? record : x));
      } else {
        data.measurements.push(record);
      }
    }

    persist();
    document.querySelector(".modal-backdrop")?.remove();
    layout();
    return;
  }

  if (event.target.id === "recovery-config-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const newHours = {};
    for (const m of CANONICAL_CATALOG) {
      const val = Number(form.get(`dur_${m.id}`));
      if (Number.isFinite(val) && val >= 1 && val <= 336) {
        newHours[m.id] = Math.round(val);
      }
    }
    data.recoveryHours = validateRecoveryHours(newHours);
    persist();
    document.querySelector(".modal-backdrop")?.remove();
    layout();
    return;
  }
});

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const k of keys) caches.delete(k);
      });
    }
  } else {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.log("SW reg failed", err));
  }
}

// Initial Layout
layout();
