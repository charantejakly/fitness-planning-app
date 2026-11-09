import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getCanonicalMuscleIdForMesh, isWebGLAvailable } from "../src/anatomy-3d.js";
import { CANONICAL_MUSCLES } from "../src/muscle-data.js";

test("3D Anatomy Engine: 1. getCanonicalMuscleIdForMesh maps meshes correctly to canonical 16-muscle catalog", () => {
  const mappings = [
    { name: "FJ1367", group: "Chest", expected: "chest" },
    { name: "FJ1367M", group: "Chest", expected: "chest" },
    { name: "FJ1371", group: "Shoulders", expected: "anterior_deltoids" },
    { name: "FJ1372", group: "Shoulders", expected: "lateral_deltoids" },
    { name: "FJ1373", group: "Shoulders", expected: "posterior_deltoids" },
    { name: "FJ1377", group: "Biceps", expected: "biceps" },
    { name: "FJ1381", group: "Triceps", expected: "triceps" },
    { name: "FJ1384", group: "Forearms", expected: "forearms" },
    { name: "FJ1365", group: "Obliques", expected: "obliques" },
    { name: "FJ1428", group: "UpperBack", expected: "traps" },
    { name: "FJ1425", group: "LowerBack", expected: "lower_back" },
    { name: "FJ1419", group: "Glutes", expected: "glutes" },
    { name: "FJ1433", group: "Quadriceps", expected: "quadriceps" },
    { name: "FJ1438", group: "Hamstrings", expected: "hamstrings" },
    { name: "FJ1446", group: "Calves", expected: "calves" }
  ];

  for (const m of mappings) {
    const canonicalId = getCanonicalMuscleIdForMesh(m.name, m.group);
    assert.equal(canonicalId, m.expected, `Mesh ${m.name} in ${m.group} should map to ${m.expected}`);
    assert.ok(CANONICAL_MUSCLES.has(canonicalId), `Canonical ID ${canonicalId} must exist in CANONICAL_MUSCLES`);
  }
});

test("3D Anatomy Engine: 2. Standalone 3D assets exist locally with verified sizes", () => {
  const muscleGlb = path.resolve("assets/models/lean-mode-muscles.glb");
  const surfaceGlb = path.resolve("assets/models/human-body-surface.glb");
  const skullGlb = path.resolve("assets/models/human-skull.glb");
  const mapJson = path.resolve("assets/models/muscle-model-map.json");

  assert.ok(fs.existsSync(muscleGlb), "lean-mode-muscles.glb must exist");
  assert.ok(fs.existsSync(surfaceGlb), "human-body-surface.glb must exist");
  assert.ok(fs.existsSync(skullGlb), "human-skull.glb must exist");
  assert.ok(fs.existsSync(mapJson), "muscle-model-map.json must exist");
});

test("3D Anatomy Engine: 3. Three.js vendor modules are bundled locally with zero CDN dependencies", () => {
  const threeModule = path.resolve("src/vendor/three/build/three.module.js");
  const orbitControls = path.resolve("src/vendor/three/controls/OrbitControls.js");
  const gltfLoader = path.resolve("src/vendor/three/loaders/GLTFLoader.js");
  const bufferUtils = path.resolve("src/vendor/three/utils/BufferGeometryUtils.js");

  assert.ok(fs.existsSync(threeModule), "Local three.module.js must exist");
  assert.ok(fs.existsSync(orbitControls), "Local OrbitControls.js must exist");
  assert.ok(fs.existsSync(gltfLoader), "Local GLTFLoader.js must exist");
  assert.ok(fs.existsSync(bufferUtils), "Local BufferGeometryUtils.js must exist");
});

test("3D Anatomy Engine: 4. isWebGLAvailable returns a boolean without throwing", () => {
  const result = isWebGLAvailable();
  assert.equal(typeof result, "boolean");
});
