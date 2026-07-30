import { useEffect, useState } from 'react';
import { decorativePlatformPixelRects, type PixelRect } from '../../hooks/platformGeometry';
import styles from './DecorativePlatforms.module.css';

// Computed in JS px (shared helper, see platformGeometry.ts) rather than CSS vh/vw, so
// these rectangles are always pixel-identical to the ones usePlatformRects.ts collides
// against — CSS vh/vw and window.innerWidth/innerHeight resolve against different
// viewport definitions on mobile (large vs. current, i.e. URL-bar-collapsed vs. -included),
// which used to make the drawn platform visibly disagree with where the sprite actually lands.
export function DecorativePlatforms() {
  const [rects, setRects] = useState<PixelRect[]>(() => decorativePlatformPixelRects());

  useEffect(() => {
    const onResize = () => setRects(decorativePlatformPixelRects());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      {rects.map((r, i) => (
        <div
          key={i}
          className={styles.platform}
          style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
        />
      ))}
    </>
  );
}
