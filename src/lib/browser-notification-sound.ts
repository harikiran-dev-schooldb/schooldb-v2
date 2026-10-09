let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let unlockRegistered = false;

function getAudioContext() {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }

  audioContext ??= new AudioContext();
  return audioContext;
}

async function unlockAudio() {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === "suspended") await context.resume();
    audioUnlocked = context.state === "running";
  } catch {
    audioUnlocked = false;
  }
}

/**
 * Browsers permit app-generated audio only after a user gesture. Register a
 * one-time listener early so later foreground notifications can play a chime.
 */
export function prepareNotificationSound() {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;

  const unlock = () => {
    void unlockAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

/** Play a brief two-note chime for a foreground web notification. */
export async function playNotificationSound() {
  const context = getAudioContext();
  if (!context) return;

  if (!audioUnlocked || context.state !== "running") {
    await unlockAudio();
  }
  if (context.state !== "running") return;

  const start = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
  gain.connect(context.destination);

  const first = context.createOscillator();
  first.type = "sine";
  first.frequency.setValueAtTime(659.25, start);
  first.connect(gain);
  first.start(start);
  first.stop(start + 0.18);

  const second = context.createOscillator();
  second.type = "sine";
  second.frequency.setValueAtTime(880, start + 0.16);
  second.connect(gain);
  second.start(start + 0.16);
  second.stop(start + 0.42);
}
