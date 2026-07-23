import { useRef, useCallback } from 'react';
import { useGameState } from '../state/GameStateContext';

export function useSfx() {
  const { state } = useGameState();
  const ctxRef = useRef<AudioContext | null>(null);

  const audioCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = useCallback((freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'square') => {
    const ctx = audioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur + 0.05);
  }, [audioCtx]);

  const tick = useCallback(() => {
    if (!state.sound) return;
    playNote(988, 0, 0.045, 0.018, 'square');
  }, [state.sound, playNote]);

  const chime = useCallback(() => {
    if (!state.sound) return;
    playNote(523, 0, 0.12, 0.035);
    playNote(659, 0.08, 0.12, 0.035);
    playNote(784, 0.16, 0.2, 0.04);
  }, [state.sound, playNote]);

  const fanfare = useCallback(() => {
    if (!state.sound) return;
    playNote(523, 0, 0.1, 0.035);
    playNote(659, 0.1, 0.1, 0.035);
    playNote(784, 0.2, 0.1, 0.035);
    playNote(1047, 0.3, 0.35, 0.045);
  }, [state.sound, playNote]);

  return { tick, chime, fanfare, playNote };
}
