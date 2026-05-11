import { useCallback, useRef } from "react";

/**
 * useCompletionSound
 * Generates a beautiful, soft 3-note chime (C5 → E5 → G5 major chord)
 * using the Web Audio API — no external audio files required.
 *
 * Usage:
 *   const { play } = useCompletionSound();
 *   play(); // call when pipeline completes
 */
export function useCompletionSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return ctxRef.current;
  }

  const play = useCallback(() => {
    try {
      const ctx = getCtx();

      // Resume if browser suspended it (requires user gesture — ok here,
      // since play() is always called after a user-initiated pipeline run)
      if (ctx.state === "suspended") {
        ctx.resume().then(() => playNotes(ctx));
      } else {
        playNotes(ctx);
      }
    } catch {
      // Silently ignore — sound is non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { play };
}

function playNotes(ctx: AudioContext) {
  // C5 → E5 → G5  (major chord, ascending)
  const notes: Array<{ freq: number; delay: number; duration: number }> = [
    { freq: 523.25, delay: 0.00, duration: 0.55 }, // C5
    { freq: 659.25, delay: 0.14, duration: 0.55 }, // E5
    { freq: 783.99, delay: 0.28, duration: 0.70 }, // G5
  ];

  notes.forEach(({ freq, delay, duration }) => {
    // Sine + slight triangle blend for a warm, bell-like timbre
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = freq;

    osc2.type = "triangle";
    osc2.frequency.value = freq * 2.01; // slight harmonic shimmer

    const blend = ctx.createGain();
    blend.gain.value = 0.08; // subtle blend

    osc1.connect(gain);
    osc2.connect(blend);
    blend.connect(gain);
    gain.connect(masterGain);
    masterGain.connect(ctx.destination);

    const t0 = ctx.currentTime + delay;

    // Soft attack, natural exponential decay
    masterGain.gain.setValueAtTime(0, t0);
    masterGain.gain.linearRampToValueAtTime(0.18, t0 + 0.018); // fast attack
    masterGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration); // smooth decay

    osc1.start(t0);
    osc1.stop(t0 + duration);
    osc2.start(t0);
    osc2.stop(t0 + duration);
  });
}
