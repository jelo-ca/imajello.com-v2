import { useCallback, useEffect, useState } from 'react';
import type { SectionKey } from '../data/discoveries';
import { decorativePlatformPixelRects } from './platformGeometry';

export interface Platform {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
  sectionKey?: SectionKey;
}

// Shares its vh/vw-to-px conversion with DecorativePlatforms.tsx (via platformGeometry.ts)
// so the collidable rectangle computed here can never diverge from what's actually drawn.
function decorativePlatforms(): Platform[] {
  return decorativePlatformPixelRects().map((rect, i) => ({ key: `decorative-${i}`, ...rect }));
}

// `platformRefs.current` is a registry keyed by an arbitrary string (see GameScene's
// `setPlatformRef`); keys starting with `nav-` carry a SectionKey suffix, used only to
// identify the PlayerBar nav-button row as "the floor" (see floorTop() in
// usePlatformerLoop) — standing on one no longer opens its dialog.
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
      const sectionKey = key.startsWith('nav-') ? (key.slice(4) as SectionKey) : undefined;
      measured.push({ key, top: rect.top, left: rect.left, width: rect.width, height: rect.height, sectionKey });
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
