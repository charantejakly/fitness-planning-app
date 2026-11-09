// 3D Dual Anatomy Viewer Module for LEAN MODE
// Stage 3 Integration: Mode A (Full Muscular Anatomy - Default) & Mode B (Half-Body Comparison)
// Zero external CDN dependencies - bundles locally via Three.js vendor modules.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Cached geometry models and metadata to prevent duplicate loads
let cachedMuscleModel = null;
let cachedSkinModel = null;
let cachedSkullModel = null;
let cachedMuscleMap = null;

// Palette definitions matching Stage 2.6
const METALLIC_SLATE_COLOR = 0x82888e;       // Mode A neutral sculpted medical slate
const ANATOMICAL_TERRACOTTA_COLOR = 0xa85b50;// Mode B deep muscle terracotta
const SKIN_COLOR = 0xdfc2b2;                 // Natural outer body surface
const BONE_COLOR = 0xe5dfd2;                 // Mode B cranial bone ivory
const BONE_SLATE_COLOR = 0x8a9098;           // Mode A cranial metallic tone
const PRIMARY_HIGHLIGHT = 0xc9f25b;          // Signature LEAN MODE lime
const MUTED_COLOR = 0x242a2f;                // Dimmed non-inspected muscles

// Clipping planes for Half-Body mode
// Anatomical right: X < 0, Anatomical left: X > 0
const skinClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.0);
const muscleClipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.0);

/**
 * Maps a 3D mesh part/group to its corresponding canonical 16-muscle identifier
 */
export function getCanonicalMuscleIdForMesh(meshName, group) {
  if (group === "Chest") return "chest";
  if (group === "Biceps") return "biceps";
  if (group === "Triceps") return "triceps";
  if (group === "Forearms") return "forearms";
  if (group === "Abs") return "abs";
  if (group === "Obliques") return "obliques";
  if (group === "LowerBack") return "lower_back";
  if (group === "Glutes") return "glutes";
  if (group === "Quadriceps") return "quadriceps";
  if (group === "Hamstrings") return "hamstrings";
  if (group === "Calves") return "calves";

  if (group === "Shoulders") {
    // Deltoid heads
    if (meshName.includes("FJ1371")) return "anterior_deltoids";
    if (meshName.includes("FJ1372")) return "lateral_deltoids";
    if (meshName.includes("FJ1373")) return "posterior_deltoids";
    return "lateral_deltoids";
  }

  if (group === "UpperBack") {
    // Trapezius vs others
    if (meshName.includes("FJ1428") || meshName.includes("FJ1429") || meshName.includes("FJ1430") || meshName.includes("FJ1431")) {
      return "traps";
    }
    return "traps"; // Rhomboids, levators, teres default to traps/upper back tracking
  }

  return "chest";
}

/**
 * Tests WebGL support safely
 */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

/**
 * Initializes the standalone 3D Dual Anatomy Viewer
 */
export async function createAnatomy3DViewer(container, options = {}) {
  if (!isWebGLAvailable()) {
    return { supported: false };
  }

  const {
    heatmapData = null,
    onMuscleSelect = null,
    initialPresentationMode = "full", // "full" (Mode A Default) | "half" (Mode B)
    initialSplitMode = "world",       // "world" (True Sagittal) | "camera" (View-Aligned)
    inspectedMuscleId = null
  } = options;

  let presentationMode = initialPresentationMode;
  let splitMode = initialSplitMode;
  let currentInspectedId = inspectedMuscleId;
  let currentHeatmapData = heatmapData;
  let autoRotate = false;
  let animId = null;

  // Root wrapper layout
  container.innerHTML = `
    <div class="anatomy-3d-wrapper">
      <div class="anatomy-3d-loading" id="a3d-loading">Loading 3D Anatomy Engine...</div>

      <!-- Top Mode Selector Bar -->
      <div class="anatomy-3d-topbar">
        <div class="anatomy-3d-pill-group">
          <button type="button" class="a3d-pill ${presentationMode === 'full' ? 'active' : ''}" id="a3d-btn-full" data-mode="full">Full Muscular</button>
          <button type="button" class="a3d-pill ${presentationMode === 'half' ? 'active' : ''}" id="a3d-btn-half" data-mode="half">Half-Body</button>
        </div>
        <div class="anatomy-3d-split-group" id="a3d-split-ctrls" style="display:${presentationMode === 'half' ? 'flex' : 'none'};">
          <button type="button" class="a3d-subpill ${splitMode === 'world' ? 'active' : ''}" id="a3d-btn-split-world">Sagittal</button>
          <button type="button" class="a3d-subpill ${splitMode === 'camera' ? 'active' : ''}" id="a3d-btn-split-cam">View</button>
        </div>
      </div>

      <!-- WebGL Canvas Mount -->
      <div class="anatomy-3d-canvas-mount" id="a3d-canvas-box"></div>

      <!-- Bottom Camera Bar -->
      <div class="anatomy-3d-botbar">
        <button type="button" class="a3d-btn-cam" id="a3d-cam-front">Front</button>
        <button type="button" class="a3d-btn-cam" id="a3d-cam-back">Back</button>
        <button type="button" class="a3d-btn-cam" id="a3d-cam-side">Side</button>
        <button type="button" class="a3d-btn-cam" id="a3d-cam-orbit">Orbit</button>
        <button type="button" class="a3d-btn-cam" id="a3d-cam-reset">Reset</button>
      </div>
    </div>
  `;

  const canvasBox = container.querySelector("#a3d-canvas-box");
  const loadingEl = container.querySelector("#a3d-loading");

  const width = canvasBox.clientWidth || 360;
  const height = canvasBox.clientHeight || 460;

  // 1. Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a100d);

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 50);
  camera.position.set(0, 1.05, 2.7);

  // 2. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.localClippingEnabled = true;
  canvasBox.appendChild(renderer.domElement);

  // 3. OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.92, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.4;
  controls.maxDistance = 5.0;

  // 4. Studio Lighting Setup matching medical reference photos
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x2a3238, 1.25);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfffbf5, 1.8);
  keyLight.position.set(2.6, 3.8, 3.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdae8f5, 1.2);
  fillLight.position.set(-2.6, 2.2, 2.2);
  scene.add(fillLight);

  const rimLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
  rimLight1.position.set(2.2, 2.8, -3.0);
  scene.add(rimLight1);

  const rimLight2 = new THREE.DirectionalLight(0xbad2ff, 1.0);
  rimLight2.position.set(-2.2, 2.8, -3.0);
  scene.add(rimLight2);

  const bounceLight = new THREE.DirectionalLight(0x384540, 0.45);
  bounceLight.position.set(0, -3.0, 0.5);
  scene.add(bounceLight);

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.58, 0.02, 64),
    new THREE.MeshStandardMaterial({ color: 0x141f19, roughness: 0.8, metalness: 0.1 })
  );
  pedestal.position.set(0, -0.01, 0);
  scene.add(pedestal);

  // 5. Load Asset Metadata
  if (!cachedMuscleMap) {
    try {
      const resp = await fetch("/assets/models/muscle-model-map.json");
      if (resp.ok) {
        cachedMuscleMap = new Map();
        const json = await resp.json();
        for (const grp in json) {
          const list = json[grp];
          if (Array.isArray(list)) {
            list.forEach((m) => {
              cachedMuscleMap.set(m.partId, {
                group: grp,
                name: m.name,
                side: m.side,
                conceptId: m.conceptId,
                triangleCount: m.triangleCount
              });
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not load muscle-model-map.json:", e);
      cachedMuscleMap = new Map();
    }
  }

  // 6. Load Models
  const loader = new GLTFLoader();
  const muscleMeshes = new Map();
  let skinModel = null;
  let skullModel = null;
  let muscleModel = null;

  async function loadModels() {
    const promises = [];

    // Muscles
    if (!cachedMuscleModel) {
      promises.push(
        new Promise((res) => {
          loader.load("/assets/models/lean-mode-muscles.glb", (gltf) => {
            cachedMuscleModel = gltf.scene;
            res();
          });
        })
      );
    }

    // Skin
    if (!cachedSkinModel) {
      promises.push(
        new Promise((res) => {
          loader.load("/assets/models/human-body-surface.glb", (gltf) => {
            cachedSkinModel = gltf.scene;
            res();
          });
        })
      );
    }

    // Skull
    if (!cachedSkullModel) {
      promises.push(
        new Promise((res) => {
          loader.load("/assets/models/human-skull.glb", (gltf) => {
            cachedSkullModel = gltf.scene;
            res();
          });
        })
      );
    }

    await Promise.all(promises);

    // Instantiate models in scene
    muscleModel = cachedMuscleModel;
    skinModel = cachedSkinModel;
    skullModel = cachedSkullModel;

    // Configure skin
    skinModel.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: SKIN_COLOR,
          roughness: 0.62,
          metalness: 0.04,
          side: THREE.DoubleSide,
          clippingPlanes: [skinClipPlane],
          clipShadows: true
        });
        child.raycast = () => {}; // Never intercept raycasting
      }
    });

    // Configure skull
    skullModel.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: presentationMode === "full" ? BONE_SLATE_COLOR : BONE_COLOR,
          roughness: 0.46,
          metalness: 0.15,
          side: THREE.DoubleSide,
          clippingPlanes: presentationMode === "full" ? [] : [muscleClipPlane],
          clipShadows: true
        });
        child.raycast = () => {};
      }
    });

    // Configure muscles
    muscleModel.traverse((child) => {
      if (child.isMesh) {
        const info = cachedMuscleMap?.get(child.name);
        child.userData = info || {
          group: "General",
          name: child.name,
          side: child.name.endsWith("M") ? "left" : "right",
          conceptId: "DBCLS 4.0"
        };
        child.material = new THREE.MeshStandardMaterial({
          color: METALLIC_SLATE_COLOR,
          roughness: 0.42,
          metalness: 0.18,
          side: THREE.DoubleSide,
          clippingPlanes: presentationMode === "full" ? [] : [muscleClipPlane],
          clipShadows: true
        });
        muscleMeshes.set(child.name, child);
      }
    });

    skinModel.visible = (presentationMode === "half");
    scene.add(skinModel);
    scene.add(skullModel);
    scene.add(muscleModel);

    recolorMuscles();
    if (loadingEl) loadingEl.style.display = "none";
  }

  await loadModels();

  // 7. Shading & Heatmap Coloring Logic
  function recolorMuscles() {
    const isTrainedDay = currentHeatmapData !== null && currentHeatmapData.muscles;
    const baseColor = presentationMode === "full" ? METALLIC_SLATE_COLOR : ANATOMICAL_TERRACOTTA_COLOR;

    // Check if an inspected muscle has an active group
    let activeInspectedGroup = null;
    if (currentInspectedId) {
      for (const [, mesh] of muscleMeshes) {
        const cId = getCanonicalMuscleIdForMesh(mesh.name, mesh.userData?.group);
        if (cId === currentInspectedId) {
          activeInspectedGroup = mesh.userData?.group;
          break;
        }
      }
    }

    muscleMeshes.forEach((mesh) => {
      const g = mesh.userData?.group;
      const cId = getCanonicalMuscleIdForMesh(mesh.name, g);

      if (currentInspectedId) {
        // Highlighting active inspected group
        if (g === activeInspectedGroup || cId === currentInspectedId) {
          mesh.material.color.setHex(PRIMARY_HIGHLIGHT);
          mesh.material.opacity = 1.0;
          mesh.material.transparent = false;
          mesh.material.emissive.setHex(0x283800);
        } else {
          mesh.material.color.setHex(MUTED_COLOR);
          mesh.material.opacity = 0.35;
          mesh.material.transparent = true;
          mesh.material.emissive.setHex(0x000000);
        }
      } else if (isTrainedDay && currentHeatmapData.muscles[cId]) {
        // Active trained day - color by heatmap intensity
        const mInfo = currentHeatmapData.muscles[cId];
        const hex = parseInt(mInfo.color.replace("#", "0x"), 16);
        mesh.material.color.setHex(hex);
        mesh.material.opacity = 1.0;
        mesh.material.transparent = false;
        mesh.material.emissive.setHex(0x000000);
      } else {
        // Default unexercised/neutral anatomy appearance
        mesh.material.color.setHex(baseColor);
        mesh.material.opacity = 1.0;
        mesh.material.transparent = false;
        mesh.material.emissive.setHex(0x000000);
      }
    });
  }

  // 8. Presentation Mode & Split Control
  function setPresentationMode(mode) {
    presentationMode = mode;
    const btnFull = container.querySelector("#a3d-btn-full");
    const btnHalf = container.querySelector("#a3d-btn-half");
    const splitCtrls = container.querySelector("#a3d-split-ctrls");

    if (btnFull) btnFull.classList.toggle("active", mode === "full");
    if (btnHalf) btnHalf.classList.toggle("active", mode === "half");
    if (splitCtrls) splitCtrls.style.display = (mode === "half" ? "flex" : "none");

    if (mode === "full") {
      // Mode A: Full Muscular Anatomy (Bilateral)
      if (skinModel) skinModel.visible = false;
      muscleMeshes.forEach((mesh) => {
        mesh.material.clippingPlanes = [];
        mesh.material.needsUpdate = true;
      });
      if (skullModel) {
        skullModel.traverse((child) => {
          if (child.isMesh) {
            child.material.clippingPlanes = [];
            child.material.color.setHex(BONE_SLATE_COLOR);
            child.material.needsUpdate = true;
          }
        });
      }
    } else {
      // Mode B: Half-Body Comparison
      if (skinModel) {
        skinModel.visible = true;
        skinModel.traverse((child) => {
          if (child.isMesh) {
            child.material.clippingPlanes = [skinClipPlane];
            child.material.needsUpdate = true;
          }
        });
      }
      muscleMeshes.forEach((mesh) => {
        mesh.material.clippingPlanes = [muscleClipPlane];
        mesh.material.needsUpdate = true;
      });
      if (skullModel) {
        skullModel.traverse((child) => {
          if (child.isMesh) {
            child.material.clippingPlanes = [muscleClipPlane];
            child.material.color.setHex(BONE_COLOR);
            child.material.needsUpdate = true;
          }
        });
      }
    }

    recolorMuscles();
  }

  function setSplitMode(mode) {
    splitMode = mode;
    const btnW = container.querySelector("#a3d-btn-split-world");
    const btnC = container.querySelector("#a3d-btn-split-cam");
    if (btnW) btnW.classList.toggle("active", mode === "world");
    if (btnC) btnC.classList.toggle("active", mode === "camera");

    if (mode === "world") {
      skinClipPlane.set(new THREE.Vector3(1, 0, 0), 0.0);
      muscleClipPlane.set(new THREE.Vector3(-1, 0, 0), 0.0);
    }
  }

  function updateCameraSplit() {
    if (presentationMode === "half" && splitMode === "camera") {
      const camRight = new THREE.Vector3();
      camRight.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3())).normalize();
      skinClipPlane.set(camRight, 0.0);
      muscleClipPlane.set(camRight.clone().negate(), 0.0);
    }
  }

  // 9. Camera Controls & Presets
  function setCameraView(view) {
    if (view === "front") {
      camera.position.set(0, 1.05, 2.7);
      controls.target.set(0, 0.92, 0);
    } else if (view === "back") {
      camera.position.set(0, 1.05, -2.7);
      controls.target.set(0, 0.92, 0);
    } else if (view === "side") {
      camera.position.set(-2.7, 1.05, 0);
      controls.target.set(0, 0.92, 0);
    } else if (view === "reset") {
      camera.position.set(0, 1.05, 2.7);
      controls.target.set(0, 0.92, 0);
      currentInspectedId = null;
      recolorMuscles();
      if (onMuscleSelect) onMuscleSelect(null);
    }
    controls.update();
  }

  // 10. Pointer Raycasting for Muscle Selection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerDown(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const activeMeshes = Array.from(muscleMeshes.values());
    const intersects = raycaster.intersectObjects(activeMeshes);

    if (intersects.length > 0) {
      let hit = null;
      if (presentationMode === "full") {
        hit = intersects[0];
      } else {
        if (splitMode === "world") {
          hit = intersects.find((h) => h.point.x <= 0.01);
        } else {
          hit = intersects.find((h) => muscleClipPlane.distanceToPoint(h.point) >= 0);
        }
      }

      if (hit && hit.object) {
        const mesh = hit.object;
        const data = mesh.userData || {};
        const group = data.group || "General";
        const cId = getCanonicalMuscleIdForMesh(mesh.name, group);

        currentInspectedId = cId;
        recolorMuscles();

        if (onMuscleSelect) {
          onMuscleSelect({
            muscleId: cId,
            name: data.name || mesh.name,
            side: data.side || (mesh.name.endsWith("M") ? "left" : "right"),
            group,
            conceptId: data.conceptId || "FMA",
            meshName: mesh.name
          });
        }
        return;
      }
    }

    // Deselect if background clicked
    currentInspectedId = null;
    recolorMuscles();
    if (onMuscleSelect) onMuscleSelect(null);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // Bind UI Buttons
  container.querySelector("#a3d-btn-full")?.addEventListener("click", () => setPresentationMode("full"));
  container.querySelector("#a3d-btn-half")?.addEventListener("click", () => setPresentationMode("half"));
  container.querySelector("#a3d-btn-split-world")?.addEventListener("click", () => setSplitMode("world"));
  container.querySelector("#a3d-btn-split-cam")?.addEventListener("click", () => setSplitMode("camera"));

  container.querySelector("#a3d-cam-front")?.addEventListener("click", () => setCameraView("front"));
  container.querySelector("#a3d-cam-back")?.addEventListener("click", () => setCameraView("back"));
  container.querySelector("#a3d-cam-side")?.addEventListener("click", () => setCameraView("side"));
  container.querySelector("#a3d-cam-reset")?.addEventListener("click", () => setCameraView("reset"));

  const btnOrbit = container.querySelector("#a3d-cam-orbit");
  btnOrbit?.addEventListener("click", () => {
    autoRotate = !autoRotate;
    btnOrbit.classList.toggle("active", autoRotate);
  });

  // 11. Animation Loop
  function animate() {
    animId = requestAnimationFrame(animate);

    if (autoRotate) {
      if (muscleModel) muscleModel.rotation.y += 0.007;
      if (skinModel) skinModel.rotation.y += 0.007;
      if (skullModel) skullModel.rotation.y += 0.007;
    }

    updateCameraSplit();
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  function onResize() {
    if (!canvasBox) return;
    const w = canvasBox.clientWidth || 360;
    const h = canvasBox.clientHeight || 460;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", onResize);

  // Return public controller interface
  return {
    supported: true,
    updateState({ heatmapData: nextHeatmap, inspectedMuscleId: nextInspectedId }) {
      currentHeatmapData = nextHeatmap !== undefined ? nextHeatmap : currentHeatmapData;
      currentInspectedId = nextInspectedId !== undefined ? nextInspectedId : currentInspectedId;
      recolorMuscles();
    },
    setPresentationMode,
    setCameraView,
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = "";
    }
  };
}
