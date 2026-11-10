const CACHE = "lean-mode-v15";
const ASSETS = [
  "/",
  "/index.html",
  "/src/main.js",
  "/src/store.js",
  "/src/food-estimator.js",
  "/src/idb.js",
  "/src/muscle-data.js",
  "/src/anatomy-svg.js",
  "/src/anatomy-3d.js",
  "/src/heatmap.js",
  "/src/recovery.js",
  "/src/style.css",
  "/manifest.webmanifest",
  "/icon.svg",
  "/assets/anatomy/front.png",
  "/assets/anatomy/back.png",
  "/assets/models/lean-mode-muscles.glb",
  "/assets/models/human-body-surface.glb",
  "/assets/models/human-skull.glb",
  "/assets/models/muscle-model-map.json",
  "/src/vendor/three/build/three.module.js",
  "/src/vendor/three/controls/OrbitControls.js",
  "/src/vendor/three/loaders/GLTFLoader.js",
  "/src/vendor/three/utils/BufferGeometryUtils.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy: always fetch freshest assets from server when reachable
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/index.html") : new Response("", { status: 408, statusText: "Offline" }))))
  );
});
