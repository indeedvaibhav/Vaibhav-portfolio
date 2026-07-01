import { useCallback, useRef } from 'react';
import useStore from './useStore';

/**
 * Web Audio API-based sound system — no external audio files needed.
 * Generates ambient hum, hover pings, and click tones procedurally.
 */
export function useAudio() {
  const ctxRef = useRef(null);
  const isMuted = useStore((s) => s.isMuted);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const playHoverPing = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available — fail silently
    }
  }, [isMuted, getCtx]);

  const playClickSound = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getCtx();

      // Two oscillators for a richer chord
      [440, 660].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          freq * 0.8,
          ctx.currentTime + 0.3
        );

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      });
    } catch {
      // Audio not available — fail silently
    }
  }, [isMuted, getCtx]);

  return { playHoverPing, playClickSound };
}
