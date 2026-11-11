// Synthesized WebAudio tones & haptic feedback for rest intervals.
// Zero external audio files required — runs completely offline.

let audioCtx = null;

export function beep(enabled = true, freq = 880, dur = 0.18, when = 0) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = audioCtx || new AudioContextClass();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = freq || 880;
    o.type = "sine";
    const t0 = audioCtx.currentTime + (when || 0);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18));
    o.start(t0);
    o.stop(t0 + (dur || 0.18) + 0.05);
  } catch (e) {
    // Graceful no-op if user interaction hasn't unlocked audio yet
  }
}

export function playRestCompleteChime() {
  // Pleasant two-tone completion chime: 880Hz -> 1174Hz
  beep(true, 880, 0.18, 0);
  beep(true, 1174, 0.28, 0.16);
  vibrate([200, 100, 200]);
}

export function vibrate(pattern = [200]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Non-fatal if device doesn't have vibration hardware
  }
}

