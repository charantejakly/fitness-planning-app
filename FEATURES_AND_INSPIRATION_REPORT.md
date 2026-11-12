# LEAN MODE: External Feature Inspirations & Comparative Research Report

**Document Version:** 1.0.0  
**Generated On:** November 12, 2026  
**Repository:** [https://github.com/charantejakly/fitness-planning-app](https://github.com/charantejakly/fitness-planning-app)  
**Scope:** Complete inventory of externally inspired features already incorporated into LEAN MODE, alongside a comparative research report of open-source architectures (`OpenGym`, `Lift`, `OpenNutriTracker`, `SparkyFitness`).

---

## Executive Summary

LEAN MODE is designed as a private, local-first fitness and nutrition ecosystem featuring an interactive 3D/2D anatomical heatmap, recovery accounting, deterministic metabolic algorithms, and strict user data sovereignty.

To ensure our application delivers world-class training and nutrition utility without proprietary bloat or cloud dependencies, we conducted an exhaustive architectural and algorithmic review of prominent open-source fitness repositories:
1. **OpenGym** (`alexpcosta/opengym`): Mobile training, progression mechanics, and CSV formats.
2. **LIFT** (`pawan67/lift`): Pure TypeScript domain logic, barbell loading, warmup pyramiding, and RP volume landmarks.
3. **OpenNutriTracker** (`simonoppowa/OpenNutriTracker`): Peer-reviewed nutritional science, fasting intervals, hydration, and WHO anthropometrics.
4. **SparkyFitness** (`CodeWithCJ/SparkyFitness`): Bannister impulse-response fatigue models, EWMA weight trend smoothing, and knapsack plate solvers.

This document serves as the permanent record of features we have already extracted and integrated, as well as the evaluation of new candidate capabilities for future phases.

---

## Part 1: Features Already Implemented in LEAN MODE (Inspired by External Apps)

The following features were identified from external open-source engines and engineered into LEAN MODE, backed by 84 automated unit and integration tests:

### 1. Screen Wake Lock & Sound/Haptic Rest Timer (Inspired by OpenGym & Native Workout Apps)
* **Problem Solved:** Trainees resting between heavy sets frequently had their mobile screen turn off, interrupting rest timing and requiring fingerprint/passcode unlocking with chalked or sweaty hands. Audio alerts were often blocked by background browser policies or required downloading bulky audio files.
* **Architecture & Files:**
  * [`src/wakelock.js`](file:///c:/APP/src/wakelock.js): Manages the W3C Screen Wake Lock API (`navigator.wakeLock`). It is automatically requested upon entering `workout_editor` and released upon exit. Re-acquires locks dynamically when the app regains focus via `visibilitychange`.
  * [`src/sound.js`](file:///c:/APP/src/sound.js): Synthesizes an ascending two-tone WebAudio sine wave chime ($880\,\text{Hz} \rightarrow 1320\,\text{Hz}$) with smooth gain ramping and triggers hardware vibration (`navigator.vibrate([120, 80, 240])`) on zero-countdown. Zero external audio asset dependencies.
  * **UI**: Clean Rest Timer bar on the Workout Editor with quick presets (`+30s`, `+60s`, `+90s`, `+2m`, `Reset`).

### 2. Estimated 1RM Engine & Strength Progression Curve (Inspired by OpenGym, Strong & Hevy)
* **Problem Solved:** Lifters change repetition ranges across sessions (e.g. 5 reps on heavy days vs 10 reps on volume days), making raw weight comparisons inaccurate for assessing true strength development.
* **Architecture & Files:**
  * [`src/onerm.js`](file:///c:/APP/src/onerm.js): Implements the validated Epley formula ($1\text{RM} = w \times (1 + r / 30)$) and Brzycki formula.
  * **Guardrail**: Enforces an evidence-based repetition cap ($r \le 12$) to prevent sub-maximal endurance sets from producing skewed 1RM projections.
  * **PR Detection**: Evaluates completed sets against all historical sessions for that exercise to detect all-time personal records (`is1RMRecord`).
  * **UI**: Added a **1RM Strength** interactive analytics mode in `progressView` with an exercise dropdown, all-time PR badge, and chronological strength trend bars.

### 3. Multi-App Workout CSV Importer (Inspired by OpenGym, Hevy & Strong)
* **Problem Solved:** Users migrating from established workout trackers (Hevy, Strong App, FitNotes, Apple Health) face high friction when their historical workout data is locked in foreign CSV schemas.
* **Architecture & Files:**
  * [`src/import-csv.js`](file:///c:/APP/src/import-csv.js): Full RFC 4180 CSV parser supporting escaped quotes, multiline fields, commas, and CRLF line breaks.
  * **Smart Column Mapping**: Automatically detects and normalizes headers from Hevy (`Exercise Name`, `Weight`, `Reps`), Strong (`Exercise Name`, `Weight`, `Reps`, `RPE`), and FitNotes (`Date`, `Exercise`, `Weight`, `Reps`).
  * **Unit & Taxonomy Normalization**: Converts imperial pound weights ($\text{lbs} \rightarrow \text{kg}$) with high precision. Matches recognized exercises against our built-in catalog and automatically creates custom exercises with inferred primary muscle groupings for non-catalog lifts.
  * **UI**: Integrated into the Data screen with file picker and non-destructive merge.

### 4. Effort Rating (RPE / RIR) & "Hard Sets" Heatmap Filter (Inspired by OpenGym & Hypertrophy Science)
* **Problem Solved:** Counting all sets equally misrepresents training volume; a warmup set at RIR 5 does not generate the same hypertrophy stimulus as an all-out set taken to RPE 8.5 or failure.
* **Architecture & Files:**
  * [`src/effort.js`](file:///c:/APP/src/effort.js): Unified parser accepting Repetitions in Reserve (RIR $0 - 5$), Rate of Perceived Exertion (RPE $6 - 10$), and string tokens (`failure`, `@8`, `@9.5`).
  * **Hard Set Threshold**: Defines an effective stimulus set as $\text{RIR} \le 2$ or $\text{RPE} \ge 8$.
  * [`src/heatmap.js`](file:///c:/APP/src/heatmap.js): Updated `calculateDailyHeatmap` to accept filter modes:
    * `all`: Displays total gross volume.
    * `hard`: Displays effective stimulus volume only, recalculating set totals and color bands.
  * **UI**: Mode tabs on the Training screen toggle between "All Sets" and "Hard (RPE≥8)", dynamically recoloring both the 3D WebGL mesh and the 2D anatomical SVG.

### 5. Deterministic Automated Progression Engine (Inspired by OpenGym, Starting Strength & GSLP)
* **Problem Solved:** Trainees frequently stall because they guess their working weights or fail to implement systematic double-progression and deload resets.
* **Architecture & Files:**
  * [`src/progression.js`](file:///c:/APP/src/progression.js): Deterministic rule engine supporting:
    * **Linear Progression**: $+2.5\,\text{kg}$ increment for upper body; $+5.0\,\text{kg}$ increment for lower body movements upon achieving target repetitions.
    * **Greyskull LP**: Evaluates the final AMRAP (As Many Reps As Possible) set. If target reps are doubled, doubles the weight increment for the next session.
    * **Double Progression**: Holds load constant while working across a repetition window (e.g., $8 - 12$ reps) before advancing weight.
    * **Deload Logic**: Automatically triggers a $10\%$ deload reset after 3 consecutive stalled sessions.
  * **UI**: Added a "⚡ Suggest Target" button in the Workout Editor that analyzes prior performance and pre-fills the next set's load and repetitions with an explanatory rationale.

---

## Part 2: Detailed Architectural Review of Newly Cloned Repositories

```
c:\APP\
├── OPENGYM/             # Cloned: OpenGym (React Native / Expo)
├── LIFT/                # Cloned: Lift (TypeScript monorepo / pure shared domain)
├── OPENNUTRITRACKER/    # Cloned: OpenNutriTracker (Flutter / Dart / Hive)
└── SPARKYFITNESS/       # Cloned: SparkyFitness (TypeScript / Express / Multiplatform)
```

### 1. LIFT (`https://github.com/pawan67/lift`)
* **Core Value**: Exceptionally pure domain package (`packages/shared/src`) with zero framework lock-in.

| Module | Core Logic & Algorithms |
| :--- | :--- |
| **`plates.ts`** | **Greedy Barbell Plate Solver**: Given barbell weight ($20\,\text{kg}$) and target weight, calculates symmetrical plate stacks ($25, 20, 15, 10, 5, 2.5, 1.25\,\text{kg}$) per sleeve. Flags unachievable weights and remainder gaps. |
| **`warmup.ts`** | **Loadable Warmup Pyramids**: Generates Wendler 5/3/1 style ramps ($40\% \times 8 \rightarrow 60\% \times 5 \rightarrow 80\% \times 3$). Critically, every percentage is snapped to real loadable plate denominations so users never see fractional, unloadable weights. |
| **`landmarks.ts`** | **RP Hypertrophy Volume Landmarks**: Implements Dr. Mike Israetel's per-muscle volume tiers: MV (Maintenance Volume), MEV (Minimum Effective Volume), MAV (Maximum Adaptive Volume), and MRV (Maximum Recoverable Volume). Scaled across Beginner, Intermediate, and Advanced trainees. |
| **`supersets.ts`** | **Contiguous Superset Invariants**: Enforces contiguous runs ($A_1/A_2$, $B_1/B_2$) on exercise rows so rest timers and routines manage paired movements seamlessly. |
| **`ai/coach-chat.ts`** | **BYO-Key Direct AI Coach**: Client-side LLM connectivity (Ollama, LM Studio, Claude, OpenAI) running on user's personal API keys without server mediation. |

---

### 2. OpenNutriTracker (`https://github.com/simonoppowa/OpenNutriTracker`)
* **Core Value**: Peer-reviewed, cited nutritional science with local AES-256 storage and zero advertising or analytics SDKs.

| Module | Core Logic & Algorithms |
| :--- | :--- |
| **`features/fasting`** | **Fasting Intervals**: Tracks 16:8, 18:6, 20:4, and circadian fasts. Separates completion and cancellation timestamps into distinct domain fields with real-time countdown progress rings. |
| **`water_intake`** | **Hydration Accounting**: Quick-add water logging ($+250\,\text{ml}$, $+500\,\text{ml}$) compared against dynamic targets ($35\,\text{ml} / \text{kg}$ bodyweight). |
| **`healthy_weight_calc.dart`** | **WHO Healthy Weight Span**: Inverts the WHO BMI formula to calculate healthy bodyweight spans ($\text{kg} = \text{BMI} \times h^2$) for heights, offering realistic target boundaries ($18.5 - 24.9\,\text{BMI}$). |
| **`met_calc.dart`** | **2024 Compendium of Physical Activities**: Accurately computes energy expenditure using task-specific METs ($\text{Burn} = \text{MET} \times \text{kg} \times \text{hours}$). |
| **`add_meal`** | **Meal-Type Calorie Budgeting**: Divides daily TDEE targets into sensible meal allocations (Breakfast 25%, Lunch 35%, Dinner 30%, Snacks 10%). |

---

### 3. SparkyFitness (`https://github.com/CodeWithCJ/SparkyFitness`)
* **Core Value**: Advanced athletic training load modeling and long-term trend analysis.

| Module | Core Logic & Algorithms |
| :--- | :--- |
| **`fitnessFatigue.ts`** | **Bannister Impulse-Response Model**: Calculates Chronic Training Load (CTL: 42-day rolling decay = "Fitness") and Acute Training Load (ATL: 7-day rolling decay = "Fatigue"). Derives Training Stress Balance ($\text{TSB} = \text{CTL} - \text{ATL} = \text{Form}$). |
| **`readiness.ts`** | **Readiness Score ($0 - 100$)**: Synthesizes TSB form, sleep duration, and resting heart rate into an objective daily freshness indicator. |
| **`weightTrend.ts`** | **EWMA Weight Smoothing & Goal Forecaster**: Trailing 7-day Exponentially Weighted Moving Average removing acute water weight noise. Calculates true 14-day weight rate ($\text{kg/week}$) and extrapolates the exact calendar date to reach the goal weight. |
| **`plateCalculator.ts`** | **Bounded Knapsack Plate Solver**: Employs dynamic programming to calculate exact plate loading for non-standard plate inventories or uneven pairs. |
| **`adaptiveCoaching.ts`** | **Feedback-Driven Auto-Regulation**: Automatically reduces working weights by $10\%$ or suggests joint-friendly substitutions when persistent pain or "too hard" feedback is logged. |

---

## Part 3: High-Value Candidate Features for Future LEAN MODE Phases

Based on scientific validity, local-first compatibility, and direct synergy with our current 3D anatomy and training engine, the following packages are recommended:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  RECOMMENDED PACKAGES                                   │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────┤
│ Package 1: Barbell & Rack     │ Package 2: RP Hypertrophy     │ Package 3: Body Trend   │
│ (LIFT & SparkyFitness)        │ (LIFT / Israetel Science)     │ (SparkyFitness & ONT)   │
├───────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ • Barbell Plate Calculator    │ • MV, MEV, MAV, MRV Landmarks │ • EWMA Weight Trend     │
│ • Wendler Warmup Pyramids     │ • Color-coded Volume Bands    │ • Goal Date Forecaster  │
│ • Snap to Physical Plates     │ • 3D Muscle Inspection Target │ • WHO Healthy Span      │
└───────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

### Candidate 1: Visual Barbell Plate Calculator & Warm-Up Ramp Generator
* **Source:** LIFT (`plates.ts`, `warmup.ts`) & SparkyFitness (`plateCalculator.ts`)
* **Fit for LEAN MODE:** In the Workout Editor, tapping any target load (e.g. $82.5\,\text{kg}$) displays a modal or popup showing the exact plate configuration ($20\,\text{kg}\text{ bar} + 20\,\text{kg} + 10\,\text{kg} + 1.25\,\text{kg}$ per side) along with a "+ Insert Warmup Sets" button that auto-inserts standard Wendler ramp sets ($40\%, 60\%, 80\%$) into the session.

### Candidate 2: Renaissance Periodization Hypertrophy Volume Landmarks
* **Source:** LIFT (`landmarks.ts`)
* **Fit for LEAN MODE:** Our app already categorizes workouts into 16 canonical muscles. Integrating RP landmarks allows our Muscle Inspection card and Weekly Progress report to indicate whether each muscle received:
  * $< \text{MV}$: Under-stimulated (atrophy risk)
  * $\text{MV} - \text{MEV}$: Maintenance volume
  * $\text{MEV} - \text{MAV}$: Optimal hypertrophy stimulus
  * $> \text{MRV}$: Overreaching (fatigue exceeds recovery)

### Candidate 3: EWMA Weight Trend Smoothing & Goal Date Forecaster
* **Source:** SparkyFitness (`weightTrend.ts`) & OpenNutriTracker (`healthy_weight_calc.dart`)
* **Fit for LEAN MODE:** Bodyweight fluctuations from water and sodium often obscure real fat loss or muscle gain. A 7-day EWMA trend line on the Progress chart eliminates scale panic and projects the exact date (e.g. *"At your current rate of $-0.45\,\text{kg/week}$, you will reach $74\,\text{kg}$ on December 28"*).

### Candidate 4: Daily Hydration (Water) & Fasting Window Tracker
* **Source:** OpenNutriTracker (`water_intake_data_source.dart`, `features/fasting`)
* **Fit for LEAN MODE:** Clean, minimalist hydration counter on the Today tab with quick-add cups ($+250\,\text{ml}$, $+500\,\text{ml}$) against a daily target ($35\,\text{ml/kg}$), plus an optional 16:8 intermittent fasting timer.

---

## Part 4: Mathematical Formulations & References

| Algorithm / Metric | Mathematical Definition | Scientific Source |
| :--- | :--- | :--- |
| **Estimated 1RM (Epley)** | $1\text{RM} = w \times \left(1 + \frac{r}{30}\right)$ for $r \le 12$ | Epley, B. (1985). *Poundage Chart*. |
| **Estimated 1RM (Brzycki)** | $1\text{RM} = w \times \frac{36}{37 - r}$ for $r \le 12$ | Brzycki, M. (1993). *Strength Testing*. |
| **BMR (Mifflin-St Jeor)** | $10 \times \text{kg} + 6.25 \times \text{cm} - 5 \times \text{age} + s$ ($+5$ male, $-161$ female) | Mifflin et al. (1990). *Am J Clin Nutr*. |
| **Hypertrophy Volume** | $\text{MV} < \text{MEV} \le \text{Optimal (MAV)} \le \text{MRV}$ | Israetel, M. et al. (2019). *Renaissance Periodization*. |
| **Fitness / Fatigue (Bannister)** | $\text{CTL}_t = \text{CTL}_{t-1} \times e^{-1/42} + \text{Load}_t \times (1 - e^{-1/42})$<br>$\text{ATL}_t = \text{ATL}_{t-1} \times e^{-1/7} + \text{Load}_t \times (1 - e^{-1/7})$<br>$\text{TSB}_t = \text{CTL}_t - \text{ATL}_t$ | Bannister, E. W. (1991). *Modeling human performance*. |
| **WHO Healthy Weight** | $\text{Weight}_{\text{min}} = 18.5 \times h^2$, $\text{Weight}_{\text{max}} = 24.9 \times h^2$ | WHO Technical Report Series 854. |
| **Physical Activity Energy** | $\text{Energy (kcal)} = \text{MET} \times \text{Weight (kg)} \times \text{Duration (hours)}$ | 2024 Compendium of Physical Activities. |
| **EWMA Weight Trend** | $\text{Trend}_t = \alpha \times \text{Weight}_t + (1 - \alpha) \times \text{Trend}_{t-1}$ where $\alpha = \frac{2}{N + 1}$ ($N=7$) | Walker, J. (1996). *The Hacker's Diet*. |

---

## Implementation Status (Completed)

All 4 candidate packages identified from **LIFT**, **OpenNutriTracker**, and **SparkyFitness** have now been implemented, verified with 109 passing automated tests, integrated into the UI, synced to Capacitor Android, and compiled into the debug APK:

1. **Package 1 (Barbell & Rack Suite):**
   - Barbell Plate sleeve calculator (`calculatePlates`) supporting IWF color-coded discs (25kg Red, 20kg Blue, 15kg Yellow, 10kg Green, 5kg White, 2.5kg Black, 1.25kg Silver).
   - Warm-up pyramid set generator (`generateWarmupSets`) supporting Wendler 5/3/1 ramp (40%, 60%, 80%) snapped to barbell increments.
   - Interactive Plate Calculator modal in workout editor with real-time +/- steppers, sleeve disc visuals, and one-tap warmup injection.
2. **Package 2 (RP Hypertrophy Science Landmarks):**
   - Volume landmarks (MV, MEV, MAV, MRV) for all 16 canonical muscles from Dr. Mike Israetel's Renaissance Periodization literature.
   - Trainee level scaling (beginner, intermediate, advanced) and 7-day rolling set volume aggregator (`calculateWeeklyMuscleVolume`).
   - Integrated into inspected muscle detail card in Training heatmap.
3. **Package 3 (Body Trend & Forecaster):**
   - Exponentially Weighted Moving Average (`computeWeightTrend`, $\alpha = 0.25$ for $N=7$) smoothing daily weigh-ins and filtering out water/sodium noise.
   - 14-day velocity rate ($\text{kg/week}$) and calendar goal date forecaster (`forecastWeightGoal`).
   - WHO Healthy Weight Span display (`healthyWeightSpan`) based on BMI 18.5–24.9 in Profile view.
   - Integrated into Progress view.
4. **Package 4 (Daily Habits Suite):**
   - Evidence-based hydration tracking ($35\,\text{ml/kg}$ target, one-tap ml logging, and progress gauge) in Today view.
   - Intermittent fasting tracker (14:10, 16:8, 18:6, 20:4 presets, live elapsed countdown, and completion state machine) in Today view.


