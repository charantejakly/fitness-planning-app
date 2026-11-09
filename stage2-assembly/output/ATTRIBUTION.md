# Attribution Notice: LEAN MODE 3D Anatomy Assets

## Geometry Provenance & Licensing Summary
All 3D geometry in `lean-mode-muscles.glb` (muscular system), `human-body-surface.glb` (integumentary system), and `human-skull.glb` (cranial skeletal system) is derived from **Human Atlas**, which distributes optimized polygon representations of the Database Center for Life Science (**DBCLS**) **BodyParts3D Release 4.0**.

- **Source:** BodyParts3D 4.0
- **Authors/Institution:** Database Center for Life Science (DBCLS), Joint Support-Center for Data Science Research, Research Organization of Information and Systems (ROIS), Japan.
- **Official Portal:** [https://lifesciencedb.jp/bp3d/](https://lifesciencedb.jp/bp3d/)
- **Data Archive Description:** [https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html)
- **Official DBCLS License Page:** [https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)

---

## License Terms: CC BY 4.0 & Historical Context

1. **Current Official License (Updated 2025-02-27):**
   * The official DBCLS BodyParts3D license page grants rights under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.
   * License URI: [https://creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/)
   * Official Attribution Requirement:
     > *"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"*

2. **Historical OBJ Header Notice (CC BY-SA 2.1 Japan):**
   * Legacy raw Wavefront `.obj` files in the 2013 BodyParts3D archive contain header text citing the *Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP)* license.
   * On February 27, 2025, DBCLS modernized the distribution license across its archive database to **CC BY 4.0**, permitting commercial, educational, and open derivative use with attribution.

3. **Strict Zero Third-Party / OrganUI Geometry Confirmation:**
   * **100% OrganUI Free:** No meshes, transformations, or data structures from OrganUI or BodyParts3D 3.0 were utilized, extracted, or merged into any of these assets.
   * **Zero Unverified Substitutions:** All vertices originate from verified DBCLS BodyParts3D 4.0 polygon buffer chunks.

---

## Detailed Asset Inventory

### 1. Muscular Anatomy (`lean-mode-muscles.glb`)
- **Source:** Human Atlas (DBCLS BodyParts3D 4.0 binary chunks 1–5).
- **Size:** 7,413,832 bytes (~7.07 MB)
- **Meshes / Nodes:** 180 independent bilateral muscular components (90 left / 90 right).
- **Vertices / Triangles:** 239,116 vertices / 246,512 triangles.
- **Coverage:** 11 active workout target groups (Chest, Shoulders, Biceps, Triceps, Forearms, Obliques, Upper Back, Lower Back, Glutes, Quads, Hamstrings, Calves).
- **Pending Geometry:** `rectus_abdominis` (Abs) and `latissimus_dorsi` (Lats) are explicitly omitted in accordance with DBCLS 4.0 polygon release omissions.

### 2. Body Surface (`human-body-surface.glb`)
- **Source:** Human Atlas part `FJ2810` / FMA7163 (Skin), DBCLS BodyParts3D 4.0 chunk 10 (`body-10.bin`).
- **Size:** 950,368 bytes (~0.91 MB)
- **Vertices / Triangles:** 22,902 vertices / 44,744 triangles.
- **Role:** Medical comparison surface layer on anatomical left half. Disconnected from raycasting and workout tracking.

### 3. Cranial Skeletal Anatomy (`human-skull.glb`)
- **Source:** Human Atlas cranial parts (`FJ3200` frontal, `FJ3309` occipital, `FJ3274/3380` parietals, `FJ3281/3386` temporals, `FJ3289` mandible, `FJ3269/3375` maxillae, etc.), DBCLS BodyParts3D 4.0 chunks 12 & 13.
- **Size:** 1,284,824 bytes (~1.22 MB)
- **Vertices / Triangles:** 38,719 vertices / 80,094 triangles.
- **Role:** Provides anatomical cranial/head volume on the exposed right half to replace empty cranial space with matching bone structure.
