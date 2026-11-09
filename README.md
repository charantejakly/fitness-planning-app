# LEAN MODE

A privacy-focused, offline-first personal calorie and nutrition tracker designed for web and Android APK.

## Core Invariants
- **Track, never coach:** No meal plans, diet prescriptions, workout suggestions, or "what to eat next" prompts.
- **Cardio insight on-request only:** Cardio calculations are accessible strictly upon explicit user request.
- **No data fabrication:** Unknown foods route to manual entry; nutrition values are never assumed to be zero.
- **Independent streaks:** Streaks count logged or completed days. Exceeding calorie targets does not break streaks.
- **Local-first storage:** Data resides in browser `localStorage`. Meal photos are stored in `IndexedDB`. No cloud telemetry.

## Quick Start

### 1. Run Development Server
```powershell
npm run start
```
Open `http://localhost:5173` (or `http://<laptop-ip>:5173` from a phone on the same Wi-Fi).

### 2. Run Test Suite
```powershell
npm test
# Or: node --test tests/*.test.js
```

### 3. Build Production Web Distribution
```powershell
npm run build
npm run preview
```

## Android APK Packaging (Capacitor)

The project is initialized with Capacitor (`com.leanmode.tracker`) pointing to `dist/`.

```powershell
# 1. Build and synchronize web assets into the native Android project
npm run sync

# 2. Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete.
2. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Locate `app-debug.apk` and transfer to your device.

## Project Structure
```text
├── android/               # Native Android Capacitor wrapper project
├── assets/                # Application styling, branding, and anatomy diagrams
├── docs/                  # Architecture specs, roadmaps, and audit logs
├── human-atlas-main/      # 3D human anatomy mesh buffers and coordinate maps
├── muscles-3d-main/       # 3D interactive muscle glTF model and React viewer
├── scripts/               # Zero-dependency build, test, and dev server scripts
│   ├── build.mjs          # Static asset packager to dist/
│   ├── server.mjs         # Lightweight local dev/preview HTTP server
│   ├── verify.mjs         # Invariant & specification verification runner
│   └── sync-anatomy.mjs   # Anatomy asset synchronization tool
├── src/                   # Active application source
│   ├── anatomy-3d.js      # Three.js 3D model canvas & viewer controller
│   ├── anatomy-svg.js     # High-fidelity SVG muscle trace viewer & heatmap
│   ├── food-estimator.js  # Heuristic natural language Indian food parser
│   ├── heatmap.js         # Interactive muscle heatmap rendering logic
│   ├── idb.js             # Zero-dependency IndexedDB storage for photo blobs
│   ├── main.js            # SPA views, navigation bus, and event controllers
│   ├── muscle-data.js     # Anatomical muscle groups, exercise mappings & recovery data
│   ├── recovery.js        # Recovery score calculations and fatigue state tracking
│   ├── store.js           # Mifflin-St Jeor BMR/TDEE math, streak & state manager
│   └── style.css          # Responsive athletic editorial stylesheet
├── stage2-assembly/       # Offline food database assembly scripts and USDA/ISA tables
├── tests/                 # Automated unit tests (Node test runner)
│   ├── store.test.js      # Unit tests for calculations, migration, & estimators
│   ├── recovery.test.js   # Unit tests for muscle fatigue & recovery formulas
│   └── validator.test.js  # Schema & storage boundary unit tests
├── capacitor.config.json  # Capacitor native configuration
├── icon.svg               # App vector icon & PWA maskable icon
├── index.html             # Single-page application entry HTML
├── manifest.webmanifest   # PWA manifest metadata
├── package.json           # Scripts and Capacitor dependencies
├── SUMMARY.md             # Complete workspace audit & deduplication log
└── sw.js                  # Service Worker cache-first offline manager
```

## Data & Backups
- **Structured Data:** Full state JSON backup includes profile, food entries, custom food items, workouts, and measurements.
- **Merge vs Replace:** Distinct operations with full pre-validation before mutating state.
- **CSV Exports:** Individual CSV downloads for food entries, workouts, and body measurements.
- **Photos:** Stored locally in `IndexedDB` (`lean-mode-db`) and excluded from lightweight JSON backups.
