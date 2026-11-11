// Screen Wake Lock — keeps the display awake while an active workout is in progress.
// Automatically re-acquires the lock on document visibility change (e.g. returning to app).

export const isWakeLockSupported = () => {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
};

let sentinel = null;
let wanted = false;
let pending = false;

async function acquire() {
  if (!wanted || sentinel || pending || !isWakeLockSupported()) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

  pending = true;
  try {
    const s = await navigator.wakeLock.request("screen");
    if (!wanted) {
      s.release().catch(() => {});
      return;
    }
    sentinel = s;
    s.addEventListener("release", () => {
      if (sentinel === s) sentinel = null;
    });
  } catch (e) {
    // Graceful fallback: browser may reject in low battery or battery saver mode
    sentinel = null;
  } finally {
    pending = false;
  }
}

const onVisible = () => {
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    acquire();
  }
};

export function requestWakeLock() {
  if (wanted) return;
  wanted = true;
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible);
  }
  acquire();
}

export function releaseWakeLock() {
  wanted = false;
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisible);
  }
  const s = sentinel;
  sentinel = null;
  if (s && typeof s.release === "function") {
    s.release().catch(() => {});
  }
}

export function isWakeLockActive() {
  return Boolean(sentinel);
}

