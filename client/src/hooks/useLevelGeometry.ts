import { useEffect, useRef, useState } from 'react';
import { levelPixelGeometry, type LevelGeometry } from './platformGeometry';

// Recomputed on resize so the level (and the desktop/mobile variant choice inside
// levelPixelGeometry) tracks the viewport, and on (level, seed) so clearing a level
// builds the next one. The returned object identity is stable between those events,
// which matters because useDonkeyKongLoop lists it as an effect dependency — a new
// identity every render would rebuild the rAF loop constantly.
//
// Generated layouts are a pure function of (level, seed), so a resize mid-climb
// re-derives the same level at the new viewport size rather than shuffling it.
export function useLevelGeometry(level: number, seed: number): LevelGeometry {
  const [geometry, setGeometry] = useState<LevelGeometry>(() => levelPixelGeometry(level, seed));
  // What the current `geometry` was built from. The initial state already covers the
  // mount, so without this the effect would immediately replace it with an identical
  // object — a wasted render that rebuilds the rAF loop for nothing.
  const builtFor = useRef(`${level}:${seed}`);

  useEffect(() => {
    const key = `${level}:${seed}`;
    if (builtFor.current !== key) {
      builtFor.current = key;
      setGeometry(levelPixelGeometry(level, seed));
    }
    const onResize = () => setGeometry(levelPixelGeometry(level, seed));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [level, seed]);

  return geometry;
}
