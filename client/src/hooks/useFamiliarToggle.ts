import { useCallback } from 'react';
import { useGameState } from '../state/GameStateContext';
import { useSfx } from './useSfx';
import { rollFamiliar, FAMILIAR_GREETINGS } from '../data/familiar';
import { content } from '../content';

// Ported from reference `toggleFamiliar` (lines 1047-1059). Resolves the note left in
// Task 9 — opening the familiar needs a random emoji roll, a side effect that doesn't
// belong in the reducer, so it lives here instead.
export function useFamiliarToggle() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();

  return useCallback(() => {
    tick();
    if (state.familiarOpen) {
      dispatch({ type: 'CLOSE_FAMILIAR' });
      return;
    }
    const emoji = rollFamiliar();
    const greeting = FAMILIAR_GREETINGS[emoji] ?? content.familiar.fallbackGreeting;
    dispatch({ type: 'OPEN_FAMILIAR', emoji, greeting });
    dispatch({ type: 'UNLOCK_DISCOVERY', key: 'familiar' });
  }, [state.familiarOpen, dispatch, tick]);
}
