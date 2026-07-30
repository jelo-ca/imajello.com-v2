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

export function useHeldKeys(paused: boolean): HeldKeysApi {
  const heldKeys = useRef<Set<MoveKey>>(new Set());

  useEffect(() => {
    // Platformer stays mounted (only "paused") while a dialog is open on top of it (e.g.
    // walking into the Contact nav button opens ContactDialog, or opening the Familiar
    // chat) — the physics loop itself already early-returns while paused, but these
    // window-level listeners used to keep intercepting Space/arrow keys the whole time
    // regardless, breaking input to whatever's actually on screen. While paused, don't
    // register the listeners at all, and clear any keys already held so nothing carries
    // over once play resumes.
    if (paused) {
      heldKeys.current.clear();
      return;
    }
    // Bail out of both preventDefault() and the held-keys mutation whenever the event
    // isn't meant for the game: typing targets (mirrors the guard App.tsx's own keydown
    // handler uses) and — more broadly — any interactive element that itself expects to
    // handle Space/arrow keys (buttons, links, selects, custom [role="button"]s), e.g.
    // dialog close buttons, inventory items, quest-log tabs, the SFX toggle, or the native
    // <select> in QuestLogDialog.
    const isBlockedTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
      return !!el.closest?.('button, a, select, [role="button"]');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isBlockedTarget(e.target)) return;
      const mapped = KEY_MAP[e.key];
      if (!mapped) return;
      e.preventDefault();
      heldKeys.current.add(mapped);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isBlockedTarget(e.target)) return;
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
  }, [paused]);

  // Guard press (not release) against paused too, so a mobile tap on the (always-mounted)
  // TouchControls buttons can't add a "held" key while the game isn't actually running;
  // release is always safe to let through.
  const press = (key: MoveKey) => { if (!paused) heldKeys.current.add(key); };
  const release = (key: MoveKey) => heldKeys.current.delete(key);

  return { heldKeys, press, release };
}
