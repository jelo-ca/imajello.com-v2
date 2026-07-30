import { useCallback, useEffect, useState } from 'react';
import { decorativePlatformPixelRects } from './platformGeometry';

export interface Platform {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

// Shares its vh/vw-to-px conversion with DecorativePlatforms.tsx (via platformGeometry.ts)
// so the collidable rectangle computed here can never diverge from what's actually drawn.
function decorativePlatforms(): Platform[] {
  return decorativePlatformPixelRects().map((rect, i) => ({ key: `decorative-${i}`, ...rect }));
}

// `platformRefs.current` is a registry keyed by an arbitrary string (see GameScene's
// `setPlatformRef`) — one entry per whole HUD bar/box (the entire PlayerBar strip under
// key 'bar', the entire TopBar row, KeybindsLegend's box, the discoveries trigger), so
// the sprite walks a continuous floor/ledge with no gaps between individual buttons.
export function usePlatformRects(
  platformRefs: React.RefObject<Record<string, HTMLElement | null>>,
  recomputeDeps: unknown[],
): Platform[] {
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const recompute = useCallback(() => {
    const measured: Platform[] = [];
    for (const [key, el] of Object.entries(platformRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // hidden via CSS (e.g. mobile-only/desktop-only elements)
      measured.push({ key, top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    setPlatforms([...measured, ...decorativePlatforms()]);
    // platformRefs is a stable ref object; its .current mutating doesn't need to appear here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRefs]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // recomputeDeps is an intentionally dynamic array of state values the caller wants
    // to force a re-measure on (e.g. a dialog opening changes PlayerBar's mobile layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recompute, ...recomputeDeps]);

  return platforms;
}
