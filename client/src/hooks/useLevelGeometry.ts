import { useEffect, useState } from 'react';
import { levelPixelGeometry, type LevelGeometry } from './platformGeometry';

// Recomputed on resize so the level (and the desktop/mobile variant choice inside
// levelPixelGeometry) tracks the viewport. The returned object identity is stable
// between resizes, which matters because usePlatformerLoop lists it as an effect
// dependency — a new identity every render would rebuild the rAF loop constantly.
export function useLevelGeometry(): LevelGeometry {
  const [level, setLevel] = useState<LevelGeometry>(() => levelPixelGeometry());

  useEffect(() => {
    const onResize = () => setLevel(levelPixelGeometry());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return level;
}
