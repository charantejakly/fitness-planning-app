# LEAN MODE — Stage 2.6 Missing Anatomy Investigation Report

## 1. Executive Summary

This report documents the exhaustive technical and licensing investigation into sourcing supplementary 3D geometry for the two missing muscular regions in the LEAN MODE anatomy engine:
1. **Rectus Abdominis** (`FMA9628`): Anterior abdominal wall / core flexor.
2. **Latissimus Dorsi** (`FMA13357`): Superficial back musculature / pull synergist.

In accordance with user directives (Stage 2.4 Option A — Strict Compliance, and Stage 2.6 Requirement 6):
- **Zero OrganUI Geometry:** No geometry from OrganUI or BodyParts3D 3.0 has been used, rescaled, or considered.
- **Zero 2D-to-3D Meshing:** The Gemini-generated visual reference images were used solely as lighting and aesthetic baselines, never as mesh sources.
- **Zero Placeholder Substitutions:** Unavailable anatomy is explicitly marked as `Pending Geometry`. No unrelated muscles have been repurposed.
- **Current Status:** Retained as documented missing geometry pending an officially verified, coordinate-compatible, CC BY/CC0 source.

---

## 2. Provenance of Omission in DBCLS BodyParts3D 4.0

The primary geometry repository for LEAN MODE Stage 2 is the official **DBCLS BodyParts3D 4.0 release** (2,234 parts distributed via Human Atlas).

An audit of the DBCLS 4.0 ontology files (`tree.csv` and chunk manifests 1 through 5) revealed:
- `FMA9628` (*Rectus abdominis*) and `FMA13357` (*Latissimus dorsi*) are registered as high-level anatomical concepts in the FMA ontology graph.
- In the 4.0 ELEMENT polygon dataset, DBCLS provided segmented polygonal primitives for 402 muscular components (e.g. pectoralis major `FJ1367`/`FJ1367M`, trapezius `FJ1428`/`FJ1428M`, obliques `FJ1365`/`FJ1365M`, rectus femoris `FJ1433`/`FJ1433M`).
- However, the primitive triangulated meshes for `FMA9628` and `FMA13357` were omitted by DBCLS during the 2013 polygon reduction process due to polygon density constraints and complex aponeurotic insertions. Consequently, they do not exist within the official 4.0 polygon release.

---

## 3. Evaluation of Prospective Open Geometry Sources

| Prospective Source | License | Geometry Quality | Coordinate Compatibility | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **OrganUI / BP3D 3.0** | Unverified / Mixed | Low (Decimated single shell) | Incompatible (requires non-uniform scaling & arbitrary origin shift) | **STRICTLY REJECTED** (mandated Option A) |
| **Z-Anatomy Project** | CC BY-SA 4.0 | High (Clean individual bellies) | Incompatible (Blender meters, Z-up; requires affine transformation) | **HOLD** (CC BY-SA copyleft clause imposes ShareAlike constraints) |
| **NIH 3D Print Exchange** | Public Domain / CC0 | Low to Moderate (Raw CT scan segmentation, noisy, non-manifold) | Incompatible (Patient DICOM patient coordinates vary per scan) | **REJECTED** (Fails anatomical clarity requirements) |
| **Direct DBCLS 2008 Unreduced** | CC BY-SA 2.1 JP | High (Original MRI voxelization) | Coordinate-compatible (same DICOM mm system) | **PENDING REVIEW** (Requires heavy manual remeshing and license dual-check) |

### 3.1 Detailed Analysis of Z-Anatomy
- **License:** CC BY-SA 4.0. The "ShareAlike" provision means any asset created by merging Z-Anatomy geometry into `lean-mode-muscles.glb` must itself be licensed under CC BY-SA 4.0. If the project wishes to retain CC BY 4.0 for the entire asset pipeline, mixing in CC BY-SA geometry creates copyleft propagation.
- **Coordinates:** Z-Anatomy models are positioned around `(0, 0, 0)` in Blender coordinate space (meters). BodyParts3D uses anatomical DICOM millimeter coordinates where the human center of mass and vertex coordinates range from `[-800, +800] mm`. Aligning them would require estimating non-rigid affine transformations.

---

## 4. Current State & Mitigation in LEAN MODE

1. **Asset Integrity:** `lean-mode-muscles.glb` contains **180 verified, clean, bilateral skeletal muscle meshes** from DBCLS BodyParts3D 4.0.
2. **Explicit Marking:** In `asset-manifest.json` and `muscle-model-map.json`, `Abs` is formally recorded with `meshCount: 0, status: "pending_geometry"`.
3. **UI Transparency:** The Stage 2.6 prototype dropdown displays:
   `Abs (0 meshes · Pending Geometry)`
   Selecting Abs informs the user that the core muscle group is awaiting verified geometry rather than displaying a false mesh.
4. **Workout Group Preservation:** The 13 canonical workout groups remain intact:
   `Chest, Shoulders, Biceps, Triceps, Forearms, Abs, Obliques, Upper Back, Lower Back, Glutes, Quadriceps, Hamstrings, Calves`.

---

## 5. Next Steps for Future Stages

1. Monitor DBCLS open data repositories for any standalone CC BY 4.0 polygon release of the abdominal aponeurosis and latissimus dorsi.
2. If deemed acceptable by the project maintainers, initiate an isolated legal review for adopting CC BY-SA 4.0 geometry (such as Z-Anatomy) under a separate modular asset file (`supplemental-muscles.glb`) so that the primary `lean-mode-muscles.glb` retains its pure CC BY 4.0 license.
