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
    // Platformer stays mounted (only "paused") while a dialog with text inputs is open on
    // top of it (e.g. walking into the Contact nav button opens ContactDialog, or opening
    // the Familiar chat), so these window-level listeners must not steal Space/arrow keys
    // from focused form fields. Mirrors the same guard App.tsx's own keydown handler uses.
    const isTypingTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      e.preventDefault();
      heldKeys.current.add(mapped);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
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
