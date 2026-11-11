import test from "node:test";
import assert from "node:assert/strict";
import { isWakeLockSupported, requestWakeLock, releaseWakeLock, isWakeLockActive } from "../src/wakelock.js";
import { beep, playRestCompleteChime, vibrate } from "../src/sound.js";

test("WakeLock: handles supported check and lifecycle safely in Node environment", () => {
  assert.equal(typeof isWakeLockSupported(), "boolean");
  assert.equal(isWakeLockActive(), false);
  
  // Safe calls in headless/Node environment without errors
  requestWakeLock();
  releaseWakeLock();
  assert.equal(isWakeLockActive(), false);
});

test("Sound & Haptics: handles beep and vibrate safely without throwing", () => {
  assert.doesNotThrow(() => {
    beep(false);
    beep(true, 440, 0.1);
    playRestCompleteChime();
    vibrate([100]);
  });
});

