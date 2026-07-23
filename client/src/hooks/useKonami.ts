import { useCallback, useRef } from 'react';
import { KONAMI } from '../data/discoveries';

export function useKonami(onUnlock: () => void) {
  const progress = useRef<string[]>([]);

  const trackKey = useCallback((key: string) => {
    const expected = KONAMI[progress.current.length];
    const got = key.length === 1 ? key.toLowerCase() : key;
    if (got === expected) {
      progress.current.push(got);
      if (progress.current.length === KONAMI.length) {
        progress.current = [];
        onUnlock();
      }
    } else {
      progress.current = got === KONAMI[0] ? [got] : [];
    }
  }, [onUnlock]);

  return trackKey;
}
