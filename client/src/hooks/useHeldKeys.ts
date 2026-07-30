import { useEffect, useRef } from 'react';

export type MoveKey = 'left' | 'right' | 'jump';

export interface HeldKeysApi {
  heldKeys: React.RefObject<Set<MoveKey>>;
  press: (key: MoveKey) => void;
  release: (key: MoveKey) => void;
}

const KEY_MAP: Record<string, MoveKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'jump',
  Spacebar: 'jump',
};

export function useHeldKeys(): HeldKeysApi {
  const heldKeys = useRef<Set<MoveKey>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      e.preventDefault();
      heldKeys.current.add(mapped);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      heldKeys.current.delete(mapped);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const press = (key: MoveKey) => heldKeys.current.add(key);
  const release = (key: MoveKey) => heldKeys.current.delete(key);

  return { heldKeys, press, release };
}
