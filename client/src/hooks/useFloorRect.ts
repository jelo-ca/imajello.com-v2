import { useCallback, useEffect, useState } from 'react';
import type { PixelRect } from './platformGeometry';

// PlayerBar is the climb's ground floor. On desktop its whole bar is one strip
// (registered as 'bar'); below 768px that bar collapses to zero height and its pieces
// become separately fixed-positioned, so the floor there is the union of 'nav' and
// 'familiar' (which sit flush against each other and together span the full width).
// Nothing else in the HUD is a platform any more.
const FLOOR_KEYS = ['bar', 'nav', 'familiar'];

export function useFloorRect(
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>,
  recomputeDeps: unknown[],
): PixelRect | null {
  const [floor, setFloor] = useState<PixelRect | null>(null);

  const recompute = useCallback(() => {
    const rects: DOMRect[] = [];
    for (const key of FLOOR_KEYS) {
      const el = platformRefs.current[key];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // collapsed by CSS at this breakpoint
      rects.push(rect);
    }
    if (rects.length === 0) {
      setFloor(null);
      return;
    }
    const top = Math.min(...rects.map(r => r.top));
    const left = Math.min(...rects.map(r => r.left));
    const right = Math.max(...rects.map(r => r.right));
    // Height runs to the bottom of the viewport so the floor is solid, not a thin ledge
    // the player could clip past.
    setFloor({ top, left, width: right - left, height: Math.max(0, window.innerHeight - top) });
    // platformRefs is a stable ref object; mutating .current doesn't belong in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRefs]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // recomputeDeps is an intentionally dynamic list of values the caller wants to
    // re-measure on (dialogs opening change PlayerBar's mobile layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, ...recomputeDeps]);

  return floor;
}
